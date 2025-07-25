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
import { SipService } from '@/services/SipService';
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
  callId: string;
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
        
        // Initialize SIP service
        await initializeSipService(webrtcConfig);
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
      console.warn('Audio elements not ready yet');
      return;
    }

    try {
      // Create new SIP service
      sipServiceRef.current = new SipService(
        localAudioRef.current,
        remoteAudioRef.current
      );

      // Set up event handlers
      sipServiceRef.current.on('onRegistered', () => {
        setSipRegistered(true);
        setError('');
        console.log('✅ SIP registered successfully');
      });

      sipServiceRef.current.on('onUnregistered', () => {
        setSipRegistered(false);
        console.log('📴 SIP unregistered');
      });

      sipServiceRef.current.on('onRegistrationFailed', (error: string) => {
        setSipRegistered(false);
        setError(`SIP registration failed: ${error}`);
        console.error('❌ SIP registration failed:', error);
      });

      sipServiceRef.current.on('onIncomingCall', (invitation: Invitation) => {
        handleIncomingCall(invitation);
      });

      sipServiceRef.current.on('onCallProgress', () => {
        setActiveCall(prev => prev ? { ...prev, status: 'connecting' } : null);
      });

      sipServiceRef.current.on('onCallAccepted', () => {
        setActiveCall(prev => prev ? { 
          ...prev, 
          status: 'active', 
          startTime: new Date() 
        } : null);
      });

      sipServiceRef.current.on('onCallRejected', () => {
        setActiveCall(null);
        fetchCallLogs();
      });

      sipServiceRef.current.on('onCallEnded', () => {
        setActiveCall(null);
        fetchCallLogs();
      });

      sipServiceRef.current.on('onCallFailed', (error: string) => {
        setError(`Call failed: ${error}`);
        setActiveCall(null);
      });

      // Initialize the SIP service
      await sipServiceRef.current.initialize(sipConfig);

    } catch (err) {
      console.error('Failed to initialize SIP service:', err);
      setError(`SIP initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleIncomingCall = (invitation: Invitation) => {
    const callerNumber = invitation.remoteIdentity.uri.user || 'Unknown';
    
    setActiveCall({
      id: `incoming-${Date.now()}`,
      callId: '',
      number: callerNumber,
      direction: 'incoming',
      status: 'ringing',
      duration: 0,
      invitation
    });

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
      setActiveCall({
        id: `call-${Date.now()}`,
        callId: '',
        number,
        direction: 'outgoing',
        status: 'connecting',
        duration: 0,
      });

      // Use SIP service to make the call
      await sipServiceRef.current.makeCall(number);

      // Also log to backend
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

    } catch (err: unknown) {
      console.error('Failed to initiate call:', err);
      setError('Failed to initiate call');
      setActiveCall(null);
    }
  };

  const answerCall = async () => {
    if (!activeCall?.invitation || !sipServiceRef.current) return;

    try {
      await sipServiceRef.current.acceptCall();
      
      // Update backend
      if (activeCall.callId) {
        await callLogsUpdateStatusPartialUpdate(activeCall.callId, {
          status: 'answered' as any,
        });
      }

    } catch (err: unknown) {
      console.error('Failed to answer call:', err);
      setError('Failed to answer call');
    }
  };

  const endCall = async () => {
    if (!activeCall || !sipServiceRef.current) return;

    try {
      setActiveCall(prev => prev ? { ...prev, status: 'ending' } : null);

      // End SIP call
      await sipServiceRef.current.endCall();

      // Update backend
      if (activeCall.callId) {
        await callLogsEndCallCreate(activeCall.callId, {
          status: { completed: true } as any,
        });
      }

      setActiveCall(null);
      setCallDuration(0);
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

  // Test SIP connection
  const testSipConnection = async () => {
    if (!activeSipConfig || !sipServiceRef.current) {
      setError('No SIP configuration available');
      return;
    }

    try {
      setError('');
      console.log('🧪 Testing SIP connection...');
      
      const isConnected = await sipServiceRef.current.testConnection(activeSipConfig);
      
      if (isConnected) {
        setError('');
        alert('✅ SIP connection test successful!');
      } else {
        setError('❌ SIP connection test failed');
      }
      
    } catch (err) {
      console.error('❌ SIP test failed:', err);
      setError(`SIP test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
                SIP Connected
              </span>
            </div>
          ) : (
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
        </div>
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
    </div>
  );
}
