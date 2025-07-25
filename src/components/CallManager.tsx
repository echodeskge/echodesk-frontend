'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  callLogsList,
  callLogsInitiateCallCreate,
  callLogsEndCallCreate,
  callLogsUpdateStatusPartialUpdate,
  sipConfigurationsList,
  sipConfigurationsWebrtcConfigRetrieve,
} from '@/api/generated/api';
import type {
  CallLog,
  CallInitiate,
  SipConfigurationList,
  SipConfigurationDetail,
  DirectionEnum,
  StatusC94enum,
} from '@/api/generated/interfaces';

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
  callId: string;
  number: string;
  direction: 'incoming' | 'outgoing';
  status: CallStatus;
  startTime?: Date;
  duration: number;
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

  // WebRTC related refs
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchInitialData();
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
        const webrtcConfig = await sipConfigurationsWebrtcConfigRetrieve(defaultSipConfig.id.toString());
        setActiveSipConfig(webrtcConfig);
      }

      setError('');
    } catch (err: unknown) {
      console.error('Failed to fetch call data:', err);
      setError('Failed to load call data');
    } finally {
      setLoading(false);
    }
  };

  const initializeWebRTC = useCallback(async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: activeSipConfig?.stun_server ? [
          { urls: `stun:${activeSipConfig.stun_server}` }
        ] : [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
      };

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setActiveCall(prev => prev ? { ...prev, status: 'active', startTime: new Date() } : null);
        } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          endCall();
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    } catch (err) {
      console.error('Failed to initialize WebRTC:', err);
      throw new Error('Failed to access microphone or initialize call');
    }
  }, [activeSipConfig]);

  const initiateCall = async (number: string) => {
    if (!activeSipConfig) {
      setError('No SIP configuration available');
      return;
    }

    try {
      setError('');
      setActiveCall({
        id: `call-${Date.now()}`,
        callId: '',
        number,
        direction: 'outgoing',
        status: 'connecting',
        duration: 0,
      });

      // Initialize WebRTC
      await initializeWebRTC();

      // Call backend API to initiate call
      const callData: CallInitiate = {
        recipient_number: number,
        call_type: 'voice' as any,
        sip_configuration: activeSipConfig.id,
      };

      const callLog = await callLogsInitiateCallCreate(callData);
      
      setActiveCall(prev => prev ? { 
        ...prev, 
        callId: callLog.call_id,
        status: 'ringing' 
      } : null);

      // Refresh call logs
      fetchCallLogs();

    } catch (err: unknown) {
      console.error('Failed to initiate call:', err);
      setError('Failed to initiate call');
      setActiveCall(null);
    }
  };

  const answerCall = async () => {
    if (!activeCall) return;

    try {
      await initializeWebRTC();
      
      // Update call status
      await callLogsUpdateStatusPartialUpdate(activeCall.callId, {
        status: 'answered' as any,
      });

      setActiveCall(prev => prev ? { ...prev, status: 'active', startTime: new Date() } : null);
    } catch (err: unknown) {
      console.error('Failed to answer call:', err);
      setError('Failed to answer call');
    }
  };

  const endCall = async () => {
    if (!activeCall) return;

    try {
      setActiveCall(prev => prev ? { ...prev, status: 'ending' } : null);

      // Close WebRTC connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Call backend API to end call
      if (activeCall.callId) {
        await callLogsEndCallCreate(activeCall.callId, {
          status: { completed: true } as any, // Use 'completed' status to end the call
        });
      }

      setActiveCall(null);
      setCallDuration(0);

      // Refresh call logs
      fetchCallLogs();

    } catch (err: unknown) {
      console.error('Failed to end call:', err);
      setActiveCall(null);
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

  const formatCallTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: any): string => {
    const statusStr = String(status).toLowerCase();
    switch (statusStr) {
      case 'answered': return '#28a745';
      case 'missed': return '#dc3545';
      case 'busy': return '#ffc107';
      case 'failed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getDirectionIcon = (direction: any): string => {
    const directionStr = String(direction).toLowerCase();
    switch (directionStr) {
      case 'incoming': return '📞';
      case 'outgoing': return '📱';
      default: return '📞';
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e9ecef',
          borderTop: '4px solid #007bff',
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
      {/* Hidden audio elements for WebRTC */}
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
        
        {activeSipConfig && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#e7f3ff',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #b3d9ff'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#28a745'
            }}></div>
            <span style={{ fontSize: '14px', color: '#0056b3' }}>
              Connected: {activeSipConfig.name}
            </span>
          </div>
        )}
      </div>

      {/* Active Call Interface */}
      {activeCall && (
        <div style={{
          background: '#fff',
          border: '2px solid #007bff',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,123,255,0.1)'
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '20px',
            color: '#333'
          }}>
            {isIncomingCall(activeCall.direction) ? 'Incoming Call' : 'Outgoing Call'}
          </div>

          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            marginBottom: '16px',
            color: '#007bff'
          }}>
            {activeCall.number}
          </div>

          <div style={{
            fontSize: '16px',
            marginBottom: '20px',
            color: '#6c757d',
            textTransform: 'capitalize'
          }}>
            Status: {activeCall.status}
            {activeCall.status === 'active' && (
              <span style={{ marginLeft: '10px', fontWeight: '600' }}>
                {formatCallDuration(callDuration)}
              </span>
            )}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px'
          }}>
            {activeCall.status === 'ringing' && isIncomingCall(activeCall.direction) && (
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
                📞 Answer
              </button>
            )}
            
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
              📞 {activeCall.status === 'ringing' && isIncomingCall(activeCall.direction) ? 'Decline' : 'End Call'}
            </button>
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
            gap: '15px',
            marginBottom: '20px'
          }}>
            <input
              type="tel"
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              placeholder="Enter phone number"
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '2px solid #dee2e6',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#007bff';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#dee2e6';
              }}
            />
            
            <button
              onClick={() => initiateCall(dialNumber)}
              disabled={!dialNumber.trim() || !activeSipConfig}
              style={{
                background: dialNumber.trim() && activeSipConfig ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: dialNumber.trim() && activeSipConfig ? 'pointer' : 'not-allowed',
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
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
              <button
                key={digit}
                onClick={() => setDialNumber(prev => prev + digit)}
                style={{
                  background: '#f8f9fa',
                  border: '2px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '15px',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e9ecef';
                  e.currentTarget.style.borderColor = '#007bff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#dee2e6';
                }}
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
              background: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
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
            {callLogs.slice(0, 10).map((call) => (
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
    </div>
  );
}
