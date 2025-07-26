'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  callLogsList,
  callLogsInitiateCallCreate,
  callLogsLogIncomingCallCreate,
  callLogsEndCallCreate,
  callLogsUpdateStatusPartialUpdate,
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
  CallInitiate,
  SipConfigurationList,
  SipConfigurationDetail,
  SipConfiguration,
  DirectionEnum,
  StatusC94enum,
} from '@/api/generated/interfaces';
import { SipService } from '@/services/SipService';
import SipConfigManager from './SipConfigManager';
import CallDebugger from './CallDebugger';
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

  // Audio and SIP refs
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const sipServiceRef = useRef<SipService | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchInitialData();
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (sipServiceRef.current) {
        sipServiceRef.current.disconnect();
      }
    };
  }, []);

  // Separate effect for SIP initialization after audio elements are ready
  useEffect(() => {
    if (activeSipConfig && localAudioRef.current && remoteAudioRef.current && !sipServiceRef.current) {
      console.log('🔧 Initializing SIP service with config:', activeSipConfig.name);
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
        console.log('📞 Found default SIP config:', defaultSipConfig.name);
        const webrtcConfig = await sipConfigurationsWebrtcConfigRetrieve(defaultSipConfig.id);
        setActiveSipConfig(webrtcConfig);
        console.log('✅ SIP config loaded, will initialize service when audio elements are ready');
      } else {
        console.warn('⚠️ No default SIP configuration found');
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
      console.warn('⚠️ Audio elements not ready yet, retrying in 1 second...');
      setTimeout(() => initializeSipService(sipConfig), 1000);
      return;
    }

    try {
      console.log('🔧 Starting SIP service initialization...');
      console.log('📞 SIP Config:', {
        name: sipConfig.name,
        server: sipConfig.sip_server,
        port: sipConfig.sip_port,
        username: sipConfig.username,
        realm: sipConfig.realm
      });

      // Disconnect existing service if any
      if (sipServiceRef.current) {
        console.log('🔌 Disconnecting existing SIP service...');
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
        console.log('✅ SIP registered successfully with', sipConfig.sip_server);
      });

      sipServiceRef.current.on('onUnregistered', () => {
        setSipRegistered(false);
        console.log('📴 SIP unregistered from', sipConfig.sip_server);
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
        console.log('📞 Call progress - updating to ringing state');
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
        console.log('✅ Call accepted - updating to active state');
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
        console.log('❌ Call rejected');
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
        console.log('📞 Call ended normally');
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
      console.log('🚀 Initializing SIP connection...');
      await sipServiceRef.current.initialize(sipConfig);
      console.log('📞 SIP service initialized, waiting for registration...');

    } catch (err) {
      console.error('❌ Failed to initialize SIP service:', err);
      setError(`SIP initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSipRegistered(false);
    }
  };

  const handleIncomingCall = async (invitation: Invitation) => {
    const callerNumber = invitation.remoteIdentity.uri.user || 'Unknown';
    console.log('📞 Handling incoming call from:', callerNumber);
    
    try {
      // Create call log for incoming call
      const callLog = await callLogsInitiateCallCreate({
        recipient_number: '', // Current user/extension
        call_type: 'voice' as any,
        sip_configuration: activeSipConfig?.id || 0,
      });
      
      // Update the call log with correct direction and caller info
      await callLogsUpdateStatusPartialUpdate(callLog.id, {
        status: 'ringing' as any,
      });
      
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

      console.log('📋 Incoming call logged with ID:', callLog.call_id);
      
    } catch (error) {
      console.error('Failed to log incoming call:', error);
      // Still set the call state even if logging fails
      setActiveCall({
        id: `incoming-${Date.now()}`,
        logId: 0,
        callId: '',
        number: callerNumber,
        direction: 'incoming',
        status: 'ringing',
        duration: 0,
        invitation
      });
    }

    // Play ringtone (you can add audio file here)
    console.log('📞 Incoming call from:', callerNumber);
  };

  const initiateCall = async (number: string) => {
    if (!activeSipConfig || !sipServiceRef.current || !sipRegistered) {
      setError('SIP service not ready');
      return;
    }

    try {
      setError('');
      
      // First create the call log in backend
      const callData: CallInitiate = {
        recipient_number: number,
        call_type: 'voice' as any,
        sip_configuration: activeSipConfig.id,
      };

      const callLog = await callLogsInitiateCallCreate(callData);
      console.log('📋 Call log created:', callLog.call_id);
      
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
      console.log('📞 SIP call initiated successfully');

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
      console.log('📞 Answering incoming call');
      await sipServiceRef.current.acceptCall();
      
      // Update backend status to answered
      if (activeCall.logId) {
        await callLogsUpdateStatusPartialUpdate(activeCall.logId, {
          status: 'answered' as any,
        });
        console.log('📋 Call status updated to answered');
      }

    } catch (err: unknown) {
      console.error('Failed to answer call:', err);
      setError('Failed to answer call');
      
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
      console.log('📞 Ending call, current status:', activeCall.status);
      setActiveCall(prev => prev ? { ...prev, status: 'ending' } : null);

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
        
        console.log(`📋 Call status updated to ${finalStatus}`);
      }

      setActiveCall(null);
      setCallDuration(0);
      fetchCallLogs();

    } catch (err: unknown) {
      console.error('Failed to end call:', err);
      
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
        setError('✅ SIP configuration test successful');
        console.log('✅ SIP test successful:', testResult);
      } else {
        setError('❌ SIP test failed: No response from server');
      }
      
    } catch (err) {
      console.error('❌ SIP test failed:', err);
      setError(`❌ SIP test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      console.log('🔄 Manually reconnecting SIP...');
      
      await initializeSipService(activeSipConfig);
      
    } catch (err) {
      console.error('❌ SIP reconnect failed:', err);
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
            {activeCall.status === 'active' ? `${formatCallDuration(callDuration)}` : activeCall.status}
          </div>

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
            {callLogs.map((call) => (
              <div
                key={call.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  background: '#f8f9fa'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '20px' }}>
                    {getDirectionIcon(call.direction)}
                  </span>
                  
                  <div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      {isIncomingCall(call.direction) ? call.caller_number : call.recipient_number}
                    </div>
                    
                    <div style={{
                      fontSize: '14px',
                      color: '#6c757d'
                    }}>
                      {formatCallTime(call.created_at)}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: getStatusColor(call.status),
                      textTransform: 'capitalize'
                    }}>
                      {String(call.status)}
                    </span>
                    
                    {call.duration_display && (
                      <span style={{
                        fontSize: '12px',
                        color: '#6c757d'
                      }}>
                        {call.duration_display}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setDialNumber(isIncomingCall(call.direction) ? call.caller_number : call.recipient_number)}
                    style={{
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    📞 Call Back
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
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
