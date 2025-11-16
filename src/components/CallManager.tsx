'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  callLogsList,
  callLogsInitiateCallCreate,
  callLogsLogIncomingCallCreate,
  callLogsEndCallCreate,
  callLogsUpdateStatusPartialUpdate,
  callLogsAddEventCreate,
  callLogsStartRecordingCreate,
  callLogsStopRecordingCreate,
  callLogsToggleHoldCreate,
  callLogsTransferCallCreate,
  callLogsStatisticsRetrieve,
  callLogsRetrieve,
  sipConfigurationsList,
  sipConfigurationsWebrtcConfigRetrieve,
  sipConfigurationsCreate,
  sipConfigurationsUpdate,
  sipConfigurationsDestroy,
  sipConfigurationsSetDefaultCreate,
  sipConfigurationsTestConnectionCreate,
  sipConfigurationsRetrieve,
} from '@/api/generated/api';
import type {
  CallLog,
  CallInitiateRequest,
  CallLogCreate,
  SipConfigurationList,
  SipConfigurationDetail,
  SipConfiguration,
  DirectionEnum,
  CallLogDetail,
  CallEvent,
  CallRecording,
  CallStatusUpdateRequest,
} from '@/api/generated/interfaces';
import { SipService } from '@/services/SipService';
import SipConfigManager from './SipConfigManager';
import CallDebugger from './CallDebugger';
import CallStatsDashboard from './CallStatsDashboard';
import type { Invitation } from 'sip.js';

// Helper functions to handle enum checks
const isIncomingCall = (direction: DirectionEnum | undefined | string): boolean => {
  if (typeof direction === 'string') {
    return direction === 'incoming';
  }
  return !!(direction && typeof direction === 'object' && 'incoming' in direction);
};

const isOutgoingCall = (direction: DirectionEnum | undefined | string): boolean => {
  if (typeof direction === 'string') {
    return direction === 'outgoing';
  }
  return !!(direction && typeof direction === 'object' && 'outgoing' in direction);
};

interface CallManagerProps {
  onCallStatusChange?: (hasActiveCall: boolean) => void;
}

type CallStatus = 'idle' | 'ringing' | 'connecting' | 'active' | 'ending';

interface ActiveCall {
  id: string;
  logId: number; // Database ID for API calls
  callId: string; // UUID for display
  number: string;
  direction: 'incoming' | 'outgoing';
  status: CallStatus;
  startTime?: Date;
  duration: number;
  invitation?: Invitation; // For incoming SIP calls
  isRecording?: boolean;
  isOnHold?: boolean;
  recording?: CallRecording;
  events?: CallEvent[];
}

export default function CallManager({ onCallStatusChange }: CallManagerProps) {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [sipConfigs, setSipConfigs] = useState<SipConfigurationList[]>([]);
  const [activeSipConfig, setActiveSipConfig] = useState<SipConfigurationDetail | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialNumber, setDialNumber] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [testMode, setTestMode] = useState(false);
  const [sipRegistered, setSipRegistered] = useState(false);
  const [currentView, setCurrentView] = useState<'calls' | 'sip-config'>('calls');
  const [showDebugger, setShowDebugger] = useState(false);
  const [callStatistics, setCallStatistics] = useState<any>(null);
  const [detailedCallView, setDetailedCallView] = useState<CallLogDetail | null>(null);
  const [showCallDetails, setShowCallDetails] = useState(false);
  const [showStatsDashboard, setShowStatsDashboard] = useState(false);

  // Audio and SIP refs
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement>(null);
  const sipServiceRef = useRef<SipService | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRingtonePlayingRef = useRef<boolean>(false);

  // Create ringtone sound programmatically
  const createRingtone = async () => {
    if (!isRingtonePlayingRef.current) return; // Stop if ringtone was disabled
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Schedule next ring only if still playing
      if (isRingtonePlayingRef.current) {
        ringtoneTimeoutRef.current = setTimeout(createRingtone, 1000);
      }
      
    } catch (error) {
      console.warn('Could not create ringtone:', error);
    }
  };

  const playRingtone = () => {
    if (isRingtonePlayingRef.current) return; // Already playing
    
    isRingtonePlayingRef.current = true;
    createRingtone();
  };

  const stopRingtone = () => {
    isRingtonePlayingRef.current = false;
    
    // Clear any pending ringtone timeout
    if (ringtoneTimeoutRef.current) {
      clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.warn);
      audioContextRef.current = null;
    }
  };

  useEffect(() => {
    fetchInitialData();
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (sipServiceRef.current) {
        sipServiceRef.current.disconnect();
      }
      // Stop ringtone on cleanup
      stopRingtone();
    };
  }, []);

  // Separate effect for SIP initialization after audio elements are ready
  useEffect(() => {
    if (activeSipConfig && localAudioRef.current && remoteAudioRef.current && !sipServiceRef.current) {
      initializeSipService(activeSipConfig).catch(err => {
        console.error('Failed to initialize SIP service:', err);
      });
    }
  }, [activeSipConfig]);

  useEffect(() => {
    onCallStatusChange?.(activeCall !== null);
  }, [activeCall, onCallStatusChange]);

  useEffect(() => {
    if (activeCall?.status === 'active' && activeCall.startTime) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - activeCall.startTime!.getTime()) / 1000));
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [activeCall?.status, activeCall?.startTime]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch call logs and SIP configurations
      const [callLogsResponse, sipConfigsResponse] = await Promise.all([
        callLogsList('-created_at', 1),
        sipConfigurationsList(),
      ]);

      setCallLogs(callLogsResponse.results);
      setSipConfigs(sipConfigsResponse.results);

      // Get the default SIP configuration for WebRTC
      const defaultSipConfig = sipConfigsResponse.results.find(config => config.is_default);
      if (defaultSipConfig) {
        const webrtcConfig = await sipConfigurationsWebrtcConfigRetrieve(defaultSipConfig.id);
        setActiveSipConfig(webrtcConfig);
      } else {
        console.warn('No default SIP configuration found');
        setError('No SIP configuration found. Please add a SIP configuration.');
      }

      setError('');
    } catch (err: unknown) {
      console.error('Failed to fetch call data:', err);
      setError('Failed to load call data');
    } finally {
      setLoading(false);
    }
  };

  const initializeSipService = async (sipConfig: SipConfigurationDetail) => {
    if (!localAudioRef.current || !remoteAudioRef.current) {
      console.warn('Audio elements not ready yet, retrying in 1 second...');
      setTimeout(() => initializeSipService(sipConfig), 1000);
      return;
    }

    try {
      // Disconnect existing service if any
      if (sipServiceRef.current) {
        await sipServiceRef.current.disconnect();
        sipServiceRef.current = null;
      }

      // Create new SIP service
      sipServiceRef.current = new SipService(
        localAudioRef.current,
        remoteAudioRef.current
      );

      // Set up event handlers
      sipServiceRef.current.on('onRegistered', () => {
        setSipRegistered(true);
        setError('');
      });

      sipServiceRef.current.on('onUnregistered', () => {
        setSipRegistered(false);
      });

      sipServiceRef.current.on('onRegistrationFailed', (error: string) => {
        setSipRegistered(false);
        console.error('❌ SIP registration failed:', error);
        
        // Check if it's a WebRTC compatibility issue
        if (error.includes('WebRTC Compatibility Issue') || error.includes('traditional SIP server')) {
          setError(`🚫 Traditional SIP Provider Detected

Your Georgian SIP provider (${sipConfig.sip_server}) uses traditional SIP protocols (UDP/TCP) that don't work in web browsers. Browsers require WebSocket (WSS) transport for security reasons.

✅ Working Solutions:
1. 🏆 WebRTC Gateway: Set up FreeSWITCH or Asterisk to bridge your provider
2. 🔄 Provider Upgrade: Ask your provider for WebRTC/WebSocket support  
3. 🌐 Alternative Provider: Use Twilio, Vonage, or other WebRTC providers

💡 Why this happens: Desktop apps like Zoiper can use UDP/TCP directly, but web browsers cannot due to security restrictions.`);
        } else if (error.includes('WebSocket') || error.includes('CORS') || error.includes('network')) {
          setError(`❌ Connection Failed: ${error}

This usually means your SIP provider doesn't support WebRTC calls from browsers. Traditional SIP providers work with desktop softphones but not web browsers.

Consider using a WebRTC-compatible provider or setting up a SIP gateway.`);
        } else {
          setError(`SIP registration failed: ${error}`);
        }
        
        // Don't auto-retry for compatibility issues
        if (!error.includes('WebRTC Compatibility') && !error.includes('WebSocket') && !error.includes('CORS')) {
          setTimeout(() => {
            console.log('🔄 Retrying SIP registration...');
            if (sipServiceRef.current) {
              sipServiceRef.current.initialize(sipConfig).catch(console.error);
            }
          }, 10000); // Longer retry interval
        }
      });

      sipServiceRef.current.on('onIncomingCall', (invitation: Invitation) => {
        handleIncomingCall(invitation);
      });

      sipServiceRef.current.on('onCallProgress', () => {
        setActiveCall(prev => {
          if (prev) {
            // Update backend status to ringing
            if (prev.logId) {
              callLogsUpdateStatusPartialUpdate(prev.logId, {
                status: 'ringing' as any,
              }).catch(err => console.error('Failed to update call status to ringing:', err));
            }
            return { ...prev, status: 'ringing' };
          }
          return null;
        });
      });

      sipServiceRef.current.on('onCallAccepted', () => {
        stopRingtone(); // Stop ringtone when call is accepted
        setActiveCall(prev => {
          if (prev) {
            const updatedCall = { 
              ...prev, 
              status: 'active' as CallStatus, 
              startTime: new Date() 
            };
            
            // Update backend status to answered
            if (prev.logId) {
              callLogsUpdateStatusPartialUpdate(prev.logId, {
                status: 'answered' as any,
              }).catch(err => console.error('Failed to update call status to answered:', err));
            }
            
            return updatedCall;
          }
          return null;
        });
      });

      sipServiceRef.current.on('onCallRejected', () => {
        stopRingtone(); // Stop ringtone when call is rejected
        setActiveCall(prev => {
          if (prev?.logId) {
            // Update backend status based on call direction and state
            const status = prev.direction === 'incoming' ? 'missed' : 'busy';
            callLogsUpdateStatusPartialUpdate(prev.logId, {
              status: status as any,
              notes: 'Call was rejected'
            }).catch(err => console.error('Failed to update call status to rejected:', err));
          }
          return null;
        });
        fetchCallLogs();
      });

      sipServiceRef.current.on('onCallEnded', () => {
        stopRingtone(); // Stop ringtone when call ends
        setActiveCall(prev => {
          if (prev?.logId) {
            // Update backend status to ended
            callLogsUpdateStatusPartialUpdate(prev.logId, {
              status: 'ended' as any,
              notes: prev.status === 'active' ? 'Call completed normally' : 'Call ended before connection'
            }).catch(err => console.error('Failed to update call status to ended:', err));
          }
          return null;
        });
        fetchCallLogs();
      });

      sipServiceRef.current.on('onCallFailed', (error: string) => {
        console.error('❌ Call failed:', error);
        stopRingtone(); // Stop ringtone when call fails
        setError(`Call failed: ${error}`);
        setActiveCall(prev => {
          if (prev?.logId) {
            // Update backend status to failed
            callLogsUpdateStatusPartialUpdate(prev.logId, {
              status: 'failed' as any,
              notes: `Call failed: ${error}`
            }).catch(err => console.error('Failed to update call status to failed:', err));
          }
          return null;
        });
        fetchCallLogs();
      });

      // Initialize the SIP service
      await sipServiceRef.current.initialize(sipConfig);

    } catch (err) {
      console.error('Failed to initialize SIP service:', err);
      setError(`SIP initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSipRegistered(false);
    }
  };

  const handleIncomingCall = async (invitation: Invitation) => {
    const callerNumber = invitation.remoteIdentity.uri.user || 'Unknown';
    const callerDomain = invitation.remoteIdentity.uri.host || '';
    const fullCallerInfo = `${callerNumber}${callerDomain ? `@${callerDomain}` : ''}`;

    // Play ringtone sound
    try {
      playRingtone();
    } catch (error) {
      console.warn('Could not play ringtone:', error);
    }
    
    try {
      // Create incoming call log with proper direction and caller info
      const callLogData: CallLogCreate = {
        caller_number: callerNumber,
        recipient_number: activeSipConfig?.username || 'Unknown',
        direction: 'incoming' as any,
        call_type: 'voice' as any,
        sip_call_id: invitation.id || '',
        sip_configuration: activeSipConfig?.id || 0,
        notes: `Incoming call from ${fullCallerInfo}`
      };

      const callLog = await callLogsLogIncomingCallCreate(callLogData);
      
      setActiveCall({
        id: `incoming-${Date.now()}`,
        logId: callLog.id,
        callId: callLog.call_id,
        number: callerNumber,
        direction: 'incoming',
        status: 'ringing',
        duration: 0,
        invitation
      });

      // Refresh call logs to show the incoming call immediately
      fetchCallLogs();
      
    } catch (error) {
      console.error('Failed to log incoming call:', error);
      // Still set the call state even if logging fails
      setActiveCall({
        id: `incoming-${Date.now()}`,
        logId: 0,
        callId: `call-${Date.now()}`,
        number: callerNumber,
        direction: 'incoming',
        status: 'ringing',
        duration: 0,
        invitation
      });
    }
  };

  const initiateCall = async (number: string) => {
    if (!activeSipConfig || !sipServiceRef.current || !sipRegistered) {
      setError('SIP service not ready');
      return;
    }

    try {
      setError('');
      
      // First create the call log in backend
      const callData: CallInitiateRequest = {
        recipient_number: number,
        call_type: 'voice' as any,
        sip_configuration: activeSipConfig.id,
      };

      const callLog = await callLogsInitiateCallCreate(callData);

      // Set initial call state
      setActiveCall({
        id: `call-${Date.now()}`,
        logId: callLog.id,
        callId: callLog.call_id,
        number,
        direction: 'outgoing',
        status: 'connecting',
        duration: 0,
      });

      // Use SIP service to make the call
      await sipServiceRef.current.makeCall(number);

    } catch (err: unknown) {
      console.error('Failed to initiate call:', err);
      setError('Failed to initiate call');
      setActiveCall(null);
      
      // If we created a call log but SIP failed, update it to failed
      if (activeCall?.logId) {
        try {
          await callLogsUpdateStatusPartialUpdate(activeCall.logId, {
            status: 'failed' as any,
            notes: `Call initiation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
          });
        } catch (logError) {
          console.error('Failed to update call log:', logError);
        }
      }
    }
  };

  const answerCall = async () => {
    if (!activeCall?.invitation || !sipServiceRef.current) return;

    try {
      // Stop ringtone
      stopRingtone();

      await sipServiceRef.current.acceptCall();

      // Update backend status to answered
      if (activeCall.logId) {
        await callLogsUpdateStatusPartialUpdate(activeCall.logId, {
          status: 'answered' as any,
        });
      }

    } catch (err: unknown) {
      console.error('Failed to answer call:', err);
      setError('Failed to answer call');
      
      // Stop ringtone on error too
      stopRingtone();
      
      // Update call log to failed if answer attempt failed
      if (activeCall?.logId) {
        try {
          await callLogsUpdateStatusPartialUpdate(activeCall.logId, {
            status: 'failed' as any,
            notes: `Failed to answer call: ${err instanceof Error ? err.message : 'Unknown error'}`
          });
        } catch (logError) {
          console.error('Failed to update call log:', logError);
        }
      }
    }
  };

  const endCall = async () => {
    if (!activeCall || !sipServiceRef.current) return;

    try {
      setActiveCall(prev => prev ? { ...prev, status: 'ending' } : null);

      // Stop ringtone if it's playing
      stopRingtone();

      // End SIP call
      await sipServiceRef.current.endCall();

      // Update backend with appropriate status
      if (activeCall.logId) {
        let finalStatus: string;
        let notes: string;

        if (activeCall.status === 'active') {
          finalStatus = 'ended';
          notes = 'Call completed normally';
        } else if (activeCall.status === 'ringing' && activeCall.direction === 'incoming') {
          finalStatus = 'missed';
          notes = 'Incoming call declined';
        } else if (activeCall.status === 'ringing' && activeCall.direction === 'outgoing') {
          finalStatus = 'cancelled';
          notes = 'Outgoing call cancelled';
        } else {
          finalStatus = 'ended';
          notes = 'Call ended';
        }

        await callLogsUpdateStatusPartialUpdate(activeCall.logId, {
          status: finalStatus as any,
          notes: notes
        });
      }

      setActiveCall(null);
      setCallDuration(0);
      fetchCallLogs();

    } catch (err: unknown) {
      console.error('Failed to end call:', err);
      
      // Stop ringtone even if ending failed
      stopRingtone();
      
      // Still clean up the UI state
      setActiveCall(null);
      setCallDuration(0);
      
      // Try to update the call log even if SIP end failed
      if (activeCall?.logId) {
        try {
          await callLogsUpdateStatusPartialUpdate(activeCall.logId, {
            status: 'failed' as any,
            notes: `Call end failed: ${err instanceof Error ? err.message : 'Unknown error'}`
          });
        } catch (logError) {
          console.error('Failed to update call log after end failure:', logError);
        }
      }
      
      fetchCallLogs();
    }
  };

  const fetchCallLogs = async () => {
    try {
      const response = await callLogsList('-created_at', 1);
      setCallLogs(response.results);
    } catch (err: unknown) {
      console.error('Failed to fetch call logs:', err);
    }
  };

  const fetchCallStatistics = async (period: 'today' | 'week' | 'month' = 'today') => {
    try {
      const stats = await callLogsStatisticsRetrieve(period);
      setCallStatistics(stats);
    } catch (err: unknown) {
      console.error('Failed to fetch call statistics:', err);
    }
  };

  const fetchCallDetails = async (callId: number) => {
    try {
      const details = await callLogsRetrieve(callId);
      setDetailedCallView(details);
      setShowCallDetails(true);
    } catch (err: unknown) {
      console.error('Failed to fetch call details:', err);
    }
  };

  const addCallEvent = async (eventType: string, metadata: any = {}) => {
    if (!activeCall?.logId) return;

    try {
      await callLogsAddEventCreate(activeCall.logId, {
        event_type: eventType as any,
        metadata: metadata,
        user: undefined
      });
    } catch (err: unknown) {
      console.error('Failed to add call event:', err);
    }
  };

  const startRecording = async () => {
    if (!activeCall?.logId) return;

    try {
      const recording = await callLogsStartRecordingCreate(activeCall.logId, {
        caller_number: activeCall.direction === 'incoming' ? activeCall.number : '',
        recipient_number: activeCall.direction === 'outgoing' ? activeCall.number : '',
        direction: activeCall.direction as any,
        call_type: 'voice' as any,
        answered_at: activeCall.startTime?.toISOString(),
        status: 'recording' as any,
        notes: '',
        sip_call_id: '',
        sip_configuration: 0,
        recording_url: '',
        call_quality_score: 0
      });

      setActiveCall(prev => prev ? { ...prev, isRecording: true, recording } : null);
      await addCallEvent('recording_started', { recording_id: recording.recording_id });
    } catch (err: unknown) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!activeCall?.logId || !activeCall.isRecording) return;

    try {
      const recording = await callLogsStopRecordingCreate(activeCall.logId, {
        caller_number: activeCall.direction === 'incoming' ? activeCall.number : '',
        recipient_number: activeCall.direction === 'outgoing' ? activeCall.number : '',
        direction: activeCall.direction as any,
        call_type: 'voice' as any,
        answered_at: activeCall.startTime?.toISOString(),
        status: 'recording' as any,
        notes: '',
        sip_call_id: '',
        sip_configuration: 0,
        recording_url: '',
        call_quality_score: 0
      });

      setActiveCall(prev => prev ? { ...prev, isRecording: false, recording } : null);
      await addCallEvent('recording_stopped', { recording_id: recording.recording_id });
    } catch (err: unknown) {
      console.error('Failed to stop recording:', err);
      setError('Failed to stop recording');
    }
  };

  const toggleHold = async () => {
    if (!activeCall?.logId) return;

    try {
      await callLogsToggleHoldCreate(activeCall.logId, {
        caller_number: activeCall.direction === 'incoming' ? activeCall.number : '',
        recipient_number: activeCall.direction === 'outgoing' ? activeCall.number : '',
        direction: activeCall.direction as any,
        call_type: 'voice' as any,
        answered_at: activeCall.startTime?.toISOString(),
        status: activeCall.isOnHold ? 'answered' : 'on_hold' as any,
        notes: '',
        sip_call_id: '',
        sip_configuration: 0,
        recording_url: '',
        call_quality_score: 0
      });

      const newHoldState = !activeCall.isOnHold;
      setActiveCall(prev => prev ? { ...prev, isOnHold: newHoldState } : null);
      await addCallEvent(newHoldState ? 'hold' : 'unhold');
    } catch (err: unknown) {
      console.error('Failed to toggle hold:', err);
      setError('Failed to toggle hold');
    }
  };

  const transferCall = async (transferNumber: string) => {
    if (!activeCall?.logId || !transferNumber.trim()) return;

    try {
      await callLogsTransferCallCreate(activeCall.logId, {
        caller_number: activeCall.direction === 'incoming' ? activeCall.number : '',
        recipient_number: transferNumber,
        direction: activeCall.direction as any,
        call_type: 'voice' as any,
        answered_at: activeCall.startTime?.toISOString(),
        ended_at: new Date().toISOString(),
        status: 'transferred' as any,
        notes: `Call transferred to ${transferNumber}`,
        sip_call_id: '',
        sip_configuration: 0,
        recording_url: '',
        call_quality_score: 0
      });

      await addCallEvent('transfer_completed', { transfer_to: transferNumber });
      setActiveCall(null);
      setCallDuration(0);
      fetchCallLogs();
    } catch (err: unknown) {
      console.error('Failed to transfer call:', err);
      setError('Failed to transfer call');
    }
  };

  const formatCallDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Test SIP connection
  const testSipConnection = async () => {
    if (!activeSipConfig) {
      setError('No SIP configuration available');
      return;
    }

    try {
      setError('');
      console.log('🧪 Testing SIP connection...');
      
      // Use the backend API to test the connection
      const now = new Date().toISOString();
      const testData: SipConfiguration = {
        id: activeSipConfig.id,
        name: activeSipConfig.name,
        sip_server: activeSipConfig.sip_server,
        sip_port: activeSipConfig.sip_port,
        username: activeSipConfig.username,
        realm: activeSipConfig.realm,
        proxy: activeSipConfig.proxy,
        stun_server: activeSipConfig.stun_server,
        turn_server: activeSipConfig.turn_server,
        turn_username: activeSipConfig.turn_username,
        is_active: activeSipConfig.is_active,
        is_default: activeSipConfig.is_default,
        max_concurrent_calls: activeSipConfig.max_concurrent_calls,
        created_at: now,
        updated_at: now
      };
      
      const testResult = await sipConfigurationsTestConnectionCreate(activeSipConfig.id, testData);

      if (testResult) {
        setError('SIP configuration test successful');
      } else {
        setError('SIP test failed: No response from server');
      }

    } catch (err) {
      console.error('SIP test failed:', err);
      setError(`SIP test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Manual reconnect function
  const reconnectSip = async () => {
    if (!activeSipConfig) {
      setError('No SIP configuration available');
      return;
    }

    try {
      setError('');
      setSipRegistered(false);

      await initializeSipService(activeSipConfig);

    } catch (err) {
      console.error('SIP reconnect failed:', err);
      setError(`SIP reconnect failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const formatCallTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: any): string => {
    const statusStr = String(status).toLowerCase();
    switch (statusStr) {
      case 'answered': return '#28a745';
      case 'missed': return '#dc3545';
      case 'ringing': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getDirectionIcon = (direction: any): string => {
    return isIncomingCall(direction) ? '📞' : '📱';
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span>Loading call system...</span>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hidden audio elements for SIP calling */}
      <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#721c24',
              cursor: 'pointer',
              float: 'right',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '600',
          margin: 0,
          color: '#333'
        }}>
          Call Manager
        </h1>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {sipRegistered ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#d4edda',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #c3e6cb'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#28a745'
              }}></div>
              <span style={{ fontSize: '14px', color: '#155724' }}>
                SIP Connected ({activeSipConfig?.name})
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f8d7da',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #f5c6cb'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#dc3545'
                }}></div>
                <span style={{ fontSize: '14px', color: '#721c24' }}>
                  SIP Disconnected
                </span>
              </div>
              {activeSipConfig?.sip_server === '89.150.1.11' && (
                <div style={{
                  fontSize: '12px',
                  color: '#856404',
                  background: '#fff3cd',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ffeaa7',
                  marginTop: '8px',
                  lineHeight: '1.4'
                }}>
                  ⚠️ <strong>Traditional SIP Provider Detected</strong><br/>
                  Your Georgian provider (89.150.1.11) uses traditional SIP protocols.<br/>
                  Web browsers require WebRTC/WebSocket for calling.<br/>
                  <a href="#" onClick={(e) => {
                    e.preventDefault();
                    setError(`🔧 WebRTC Gateway Setup Guide

To use your Georgian SIP provider with web browsers, you need a WebRTC gateway:

1. 🏆 FreeSWITCH Gateway (Recommended):
   - Install FreeSWITCH on a server
   - Configure SIP trunk to 89.150.1.11
   - Enable mod_verto for WebRTC
   - Point your frontend to the gateway

2. 🔧 Asterisk Gateway:
   - Install Asterisk with chan_pjsip
   - Configure trunk to your provider
   - Enable WebRTC transport
   - Use Asterisk as WebRTC endpoint

3. 🌐 Cloud Solutions:
   - Twilio SIP Trunking with WebRTC
   - Vonage WebRTC SDK
   - JsSIP + WebRTC gateway

4. 📞 Alternative: Desktop Integration
   - Keep web dashboard for management
   - Use desktop softphone for calls
   - Integrate via API hooks

Contact us for gateway setup assistance!`);
                  }} style={{ color: '#856404', textDecoration: 'underline' }}>
                    Setup Guide
                  </a>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={testSipConnection}
            style={{
              background: '#17a2b8',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Test SIP
          </button>
          
          <button
            onClick={reconnectSip}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Reconnect
          </button>
          
          <button
            onClick={() => setShowDebugger(true)}
            style={{
              background: '#6f42c1',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔍 Debug
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: '20px',
        borderBottom: '1px solid #e1e5e9'
      }}>
        <button
          onClick={() => setCurrentView('calls')}
          style={{
            background: currentView === 'calls' ? '#007bff' : 'transparent',
            color: currentView === 'calls' ? 'white' : '#333',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '6px 6px 0 0',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            borderBottom: currentView === 'calls' ? '2px solid #007bff' : '2px solid transparent'
          }}
        >
          📞 Call Interface
        </button>
        <button
          onClick={() => setShowStatsDashboard(true)}
          style={{
            background: 'transparent',
            color: '#333',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '6px 6px 0 0',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            borderBottom: '2px solid transparent'
          }}
        >
          📊 Statistics
        </button>
        <button
          onClick={() => setCurrentView('sip-config')}
          style={{
            background: currentView === 'sip-config' ? '#007bff' : 'transparent',
            color: currentView === 'sip-config' ? 'white' : '#333',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '6px 6px 0 0',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            borderBottom: currentView === 'sip-config' ? '2px solid #007bff' : '2px solid transparent'
          }}
        >
          ⚙️ SIP Configuration
        </button>
      </div>

      {/* SIP Configuration View */}
      {currentView === 'sip-config' && (
        <SipConfigManager onConfigChange={fetchInitialData} />
      )}

      {/* Call Interface View */}
      {currentView === 'calls' && (
        <>
          {/* Active Call Interface */}
      {activeCall && (
        <div style={{
          background: '#fff',
          border: '2px solid #007bff',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0, 123, 255, 0.1)'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '15px',
            color: '#333'
          }}>
            {activeCall.direction === 'incoming' ? '📞 Incoming Call' : '📱 Outgoing Call'}
          </div>
          
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            marginBottom: '15px',
            color: '#007bff'
          }}>
            {activeCall.number}
          </div>
          
          <div style={{
            fontSize: '18px',
            marginBottom: '20px',
            color: '#6c757d',
            textTransform: 'capitalize'
          }}>
            {activeCall.status === 'active' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div>{formatCallDuration(callDuration)}</div>
                {activeCall.isRecording && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#dc3545',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    🔴 RECORDING
                  </div>
                )}
                {activeCall.isOnHold && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#ffc107',
                    color: '#212529',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    ⏸️ ON HOLD
                  </div>
                )}
              </div>
            ) : activeCall.status}
          </div>

          {/* Call Controls for Active Calls */}
          {activeCall.status === 'active' && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '15px',
              marginBottom: '20px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={activeCall.isRecording ? stopRecording : startRecording}
                style={{
                  background: activeCall.isRecording ? '#dc3545' : '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '25px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {activeCall.isRecording ? '⏹️ Stop Recording' : '🎙️ Start Recording'}
              </button>

              <button
                onClick={toggleHold}
                style={{
                  background: activeCall.isOnHold ? '#28a745' : '#ffc107',
                  color: activeCall.isOnHold ? 'white' : '#212529',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '25px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {activeCall.isOnHold ? '▶️ Resume' : '⏸️ Hold'}
              </button>

              <button
                onClick={() => {
                  const transferNumber = prompt('Enter number to transfer to:');
                  if (transferNumber) transferCall(transferNumber);
                }}
                style={{
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '25px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🔄 Transfer
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
            {activeCall.status === 'ringing' && activeCall.direction === 'incoming' && (
              <>
                <button
                  onClick={answerCall}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '50px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  ✅ Answer
                </button>
                <button
                  onClick={endCall}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '50px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  ❌ Decline
                </button>
              </>
            )}

            {(activeCall.status !== 'ringing' || activeCall.direction === 'outgoing') && (
              <button
                onClick={endCall}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '15px 30px',
                  borderRadius: '50px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📞 {activeCall.status === 'ringing' && activeCall.direction === 'incoming' ? 'Decline' : 'End Call'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dial Pad */}
      {!activeCall && (
        <div style={{
          background: '#fff',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '30px'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '20px',
            color: '#333'
          }}>
            Make a Call
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxWidth: '400px'
          }}>
            <input
              type="tel"
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              placeholder="Enter phone number"
              style={{
                padding: '12px 16px',
                border: '2px solid #dee2e6',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#007bff'}
              onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
            />

            <button
              onClick={() => initiateCall(dialNumber)}
              disabled={!dialNumber.trim() || !sipRegistered}
              style={{
                background: dialNumber.trim() && sipRegistered ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: dialNumber.trim() && sipRegistered ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📱 Call
            </button>
          </div>

          {/* Quick Dial Numbers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            maxWidth: '300px'
          }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(digit => (
              <button
                key={digit}
                onClick={() => setDialNumber(prev => prev + digit)}
                style={{
                  background: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  padding: '15px',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              >
                {digit}
              </button>
            ))}
          </div>

          <button
            onClick={() => setDialNumber('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6c757d',
              cursor: 'pointer',
              marginTop: '15px',
              fontSize: '14px'
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Call History */}
      <div style={{
        background: '#fff',
        border: '1px solid #dee2e6',
        borderRadius: '12px',
        padding: '25px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: 0,
            color: '#333'
          }}>
            Recent Calls
          </h3>
          
          <button
            onClick={fetchCallLogs}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {callLogs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#6c757d',
            padding: '40px 20px'
          }}>
            No call history available
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {callLogs.map((call) => {
              const displayNumber = isIncomingCall(call.direction) ? call.caller_number : call.recipient_number;
              const isRecentIncoming = isIncomingCall(call.direction);
              
              return (
                <div
                  key={call.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px',
                    border: '1px solid #e9ecef',
                    borderRadius: '12px',
                    background: '#f8f9fa',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#e9ecef';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flex: 1
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: isRecentIncoming ? '#28a745' : '#007bff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      {isRecentIncoming ? '📞' : '📱'}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#333',
                        marginBottom: '4px'
                      }}>
                        {displayNumber || 'Unknown'}
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '14px',
                        color: '#6c757d'
                      }}>
                        <span>
                          {isRecentIncoming ? 'Incoming' : 'Outgoing'} • {formatCallTime(call.created_at)}
                        </span>
                        
                        {call.duration_display && (
                          <span style={{
                            background: '#e9ecef',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#495057'
                          }}>
                            {call.duration_display}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: getStatusColor(call.status),
                        textTransform: 'capitalize',
                        background: `${getStatusColor(call.status)}20`,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        marginBottom: '8px'
                      }}>
                        {String(call.status)}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <button
                      onClick={() => {
                        setDialNumber(displayNumber);
                        // Auto-initiate call if SIP is connected
                        if (sipRegistered && displayNumber) {
                          initiateCall(displayNumber);
                        }
                      }}
                      disabled={!sipRegistered}
                      style={{
                        background: sipRegistered ? '#28a745' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: sipRegistered ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        if (sipRegistered) {
                          e.currentTarget.style.background = '#218838';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (sipRegistered) {
                          e.currentTarget.style.background = '#28a745';
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                    >
                      📞 Call
                    </button>

                    <button
                      onClick={() => setDialNumber(displayNumber)}
                      style={{
                        background: 'transparent',
                        color: '#007bff',
                        border: '2px solid #007bff',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#007bff';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#007bff';
                      }}
                    >
                      📋 Add to Dial
                    </button>

                    <button
                      onClick={() => fetchCallDetails(call.id)}
                      style={{
                        background: 'transparent',
                        color: '#6c757d',
                        border: '2px solid #6c757d',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#6c757d';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#6c757d';
                      }}
                    >
                      📋 Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
        </>
      )}

      {/* Call Details Modal */}
      {showCallDetails && detailedCallView && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto',
            width: '90%'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
                Call Details
              </h3>
              <button
                onClick={() => setShowCallDetails(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>

            {/* Call Summary */}
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <strong>Call ID:</strong> {detailedCallView.call_id}
                </div>
                <div>
                  <strong>Direction:</strong> {getDirectionIcon(detailedCallView.direction)} {String(detailedCallView.direction)}
                </div>
                <div>
                  <strong>From:</strong> {detailedCallView.caller_number}
                </div>
                <div>
                  <strong>To:</strong> {detailedCallView.recipient_number}
                </div>
                <div>
                  <strong>Status:</strong> <span style={{ color: getStatusColor(detailedCallView.status) }}>
                    {String(detailedCallView.status)}
                  </span>
                </div>
                <div>
                  <strong>Duration:</strong> {detailedCallView.duration_display || 'N/A'}
                </div>
                <div>
                  <strong>Started:</strong> {formatCallTime(detailedCallView.started_at)}
                </div>
                <div>
                  <strong>Quality Score:</strong> {detailedCallView.call_quality_score ? 
                    `${detailedCallView.call_quality_score}/5` : 'N/A'}
                </div>
              </div>
              
              {detailedCallView.notes && (
                <div style={{ marginTop: '15px' }}>
                  <strong>Notes:</strong> {detailedCallView.notes}
                </div>
              )}
            </div>

            {/* Recording Information */}
            {detailedCallView.recording && (
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <h4 style={{ fontSize: '18px', marginBottom: '10px' }}>🎙️ Recording</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><strong>Status:</strong> {String(detailedCallView.recording.status)}</div>
                  <div><strong>Duration:</strong> {detailedCallView.recording.duration_display || 'N/A'}</div>
                  <div><strong>Format:</strong> {detailedCallView.recording.format}</div>
                  <div><strong>Size:</strong> {detailedCallView.recording.file_size_display || 'N/A'}</div>
                </div>
                
                {detailedCallView.recording.file_url && (
                  <div style={{ marginTop: '10px' }}>
                    <a
                      href={detailedCallView.recording.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#007bff',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '14px'
                      }}
                    >
                      🎵 Listen to Recording
                    </a>
                  </div>
                )}

                {detailedCallView.recording.transcript && (
                  <div style={{ marginTop: '15px' }}>
                    <strong>Transcript:</strong>
                    <div style={{
                      background: '#fff',
                      padding: '10px',
                      borderRadius: '4px',
                      marginTop: '5px',
                      fontStyle: 'italic'
                    }}>
                      {detailedCallView.recording.transcript}
                    </div>
                    {detailedCallView.recording.transcript_confidence && (
                      <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                        Confidence: {Math.round(detailedCallView.recording.transcript_confidence * 100)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Call Events Timeline */}
            {detailedCallView.events && detailedCallView.events.length > 0 && (
              <div style={{
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <h4 style={{ fontSize: '18px', marginBottom: '15px' }}>📋 Call Events</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {detailedCallView.events.map((event, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px',
                        background: '#fff',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef'
                      }}
                    >
                      <div>
                        <strong>{String(event.event_type).replace(/_/g, ' ').toUpperCase()}</strong>
                        {event.user_name && (
                          <span style={{ color: '#6c757d', marginLeft: '8px' }}>
                            by {event.user_name}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6c757d' }}>
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Call Statistics Dashboard Modal */}
      {showStatsDashboard && (
        <CallStatsDashboard onClose={() => setShowStatsDashboard(false)} />
      )}

      {/* Debug Component */}
      <CallDebugger
        sipService={sipServiceRef.current}
        isVisible={showDebugger}
        onClose={() => setShowDebugger(false)}
      />
    </div>
  );
}
