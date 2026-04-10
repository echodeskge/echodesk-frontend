'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { SipService } from '@/services/SipService';
import type { Invitation } from 'sip.js';
import {
  sipConfigurationsList,
  sipConfigurationsWebrtcConfigRetrieve,
  callLogsInitiateCallCreate,
  callLogsLogIncomingCallCreate,
  callLogsEndCallCreate,
  callLogsUpdateStatusPartialUpdate,
} from '@/api/generated/api';
import type { SipConfigurationDetail } from '@/api/generated/interfaces';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CallStatus = 'idle' | 'ringing' | 'connecting' | 'active' | 'ending';

export interface ActiveCall {
  id: string;
  logId: number;
  number: string;
  direction: 'incoming' | 'outgoing';
  status: CallStatus;
  startTime?: Date;
  duration: number;
  invitation?: Invitation;
  isOnHold?: boolean;
  isMuted?: boolean;
}

export interface CallContextValue {
  activeCall: ActiveCall | null;
  callDuration: number;
  sipRegistered: boolean;
  sipConnecting: boolean;
  activeSipConfig: SipConfigurationDetail | null;
  dialNumber: string;
  error: string;
  loading: boolean;
  isDialpadOpen: boolean;
  setDialNumber: (num: string) => void;
  makeCall: () => Promise<void>;
  handleAcceptCall: () => Promise<void>;
  handleRejectCall: () => Promise<void>;
  handleEndCall: () => Promise<void>;
  handleToggleHold: () => void;
  handleToggleMute: () => void;
  setError: (err: string) => void;
  setIsDialpadOpen: (open: boolean) => void;
  toggleDialpad: () => void;
  callEndedCounter: number;
  sendDTMF: (tone: string) => boolean;
  transferCall: (targetNumber: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CallContext = createContext<CallContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const CallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { hasFeature } = useSubscription();
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();

  // ---- State ----
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [sipRegistered, setSipRegistered] = useState(false);
  const [sipConnecting, setSipConnecting] = useState(false);
  const [activeSipConfig, setActiveSipConfig] = useState<SipConfigurationDetail | null>(null);
  const [dialNumber, setDialNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialpadOpen, setIsDialpadOpen] = useState(false);
  const [callEndedCounter, setCallEndedCounter] = useState(0);

  // ---- Refs ----
  const sipServiceRef = useRef<SipService | null>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRingtonePlayingRef = useRef<boolean>(false);

  // Ref that always mirrors activeCall state – used inside event callbacks
  // to avoid stale closures.
  const activeCallRef = useRef<ActiveCall | null>(null);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Also keep activeSipConfig in a ref for use inside callbacks.
  const activeSipConfigRef = useRef<SipConfigurationDetail | null>(null);
  useEffect(() => {
    activeSipConfigRef.current = activeSipConfig;
  }, [activeSipConfig]);

  // ---------------------------------------------------------------------------
  // Ringtone helpers (Web Audio API – 800 Hz sine wave)
  // ---------------------------------------------------------------------------

  const createRingtone = useCallback(async () => {
    if (!isRingtonePlayingRef.current) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
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

      if (isRingtonePlayingRef.current) {
        ringtoneTimeoutRef.current = setTimeout(createRingtone, 1000);
      }
    } catch (err) {
      console.warn('Could not create ringtone:', err);
    }
  }, []);

  const playRingtone = useCallback(() => {
    if (isRingtonePlayingRef.current) return;
    isRingtonePlayingRef.current = true;
    createRingtone();
  }, [createRingtone]);

  const stopRingtone = useCallback(() => {
    isRingtonePlayingRef.current = false;

    if (ringtoneTimeoutRef.current) {
      clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.warn);
      audioContextRef.current = null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // SIP initialisation
  // ---------------------------------------------------------------------------

  const initializeSipService = useCallback(
    async (config: SipConfigurationDetail) => {
      try {
        if (!localAudioRef.current || !remoteAudioRef.current) {
          throw new Error('Audio elements not ready');
        }

        setSipConnecting(true);

        const sipService = new SipService(localAudioRef.current, remoteAudioRef.current);

        // --- event handlers (read from refs, not stale closure) ---

        sipService.on('onRegistered', () => {
          setSipRegistered(true);
          setSipConnecting(false);
          setError('');
          reconnectAttemptsRef.current = 0;
        });

        sipService.on('onUnregistered', () => {
          setSipRegistered(false);
          setSipConnecting(false);

          // Auto-reconnect with backoff (only if no active call)
          if (!activeCallRef.current) {
            const retryCount = (reconnectAttemptsRef.current || 0) + 1;
            reconnectAttemptsRef.current = retryCount;
            if (retryCount <= 3) {
              const delay = retryCount * 5000; // 5s, 10s, 15s
              console.log(`SIP disconnected, retrying in ${delay / 1000}s (attempt ${retryCount}/3)`);
              setTimeout(() => {
                if (activeSipConfigRef.current && sipServiceRef.current) {
                  sipServiceRef.current.register?.().catch(() => {});
                }
              }, delay);
            }
          }
        });

        sipService.on('onRegistrationFailed', (err) => {
          console.error('SIP registration failed:', err);
          setSipRegistered(false);
          setSipConnecting(false);
          setError(`SIP registration failed: ${err || 'Unknown error'}`);
        });

        sipService.on('onIncomingCall', async (invitation: Invitation) => {
          playRingtone();

          const phoneNumber = invitation.remoteIdentity.uri.user || 'Unknown Number';

          try {
            const logResponse = await callLogsLogIncomingCallCreate({
              caller_number: phoneNumber,
              recipient_number: activeSipConfigRef.current?.username || '',
              direction: 'inbound' as any,
            });

            setActiveCall({
              id: invitation.id,
              logId: logResponse.id,
              number: phoneNumber,
              direction: 'incoming',
              status: 'ringing',
              duration: 0,
              invitation,
            });
          } catch (err) {
            console.error('Failed to log incoming call:', err);
          }
        });

        sipService.on('onCallAccepted', async () => {
          stopRingtone();

          const current = activeCallRef.current;
          if (current) {
            setActiveCall((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'active',
                    startTime: new Date(),
                  }
                : null
            );

            try {
              await callLogsUpdateStatusPartialUpdate(current.logId, {
                status: 'answered' as any,
              });
            } catch (err) {
              console.error('Failed to update call status:', err);
            }
          }
        });

        sipService.on('onCallEnded', async () => {
          stopRingtone();

          const current = activeCallRef.current;
          if (current) {
            try {
              await callLogsEndCallCreate(current.logId, {
                status: 'ended' as any,
              });
            } catch (err) {
              console.error('Failed to end call log:', err);
            }
          }

          setActiveCall(null);
          setCallDuration(0);
          setCallEndedCounter(c => c + 1);
        });

        sipService.on('onCallFailed', async (callError) => {
          console.error('Call failed:', callError);
          stopRingtone();

          const current = activeCallRef.current;
          if (current) {
            try {
              await callLogsUpdateStatusPartialUpdate(current.logId, {
                status: 'failed' as any,
              });
            } catch (err) {
              console.error('Failed to update call status:', err);
            }
          }

          setActiveCall(null);
          setCallDuration(0);
          setCallEndedCounter(c => c + 1);
          setError(`Call failed: ${callError || 'Unknown error'}`);
        });

        await sipService.initialize(config);

        sipServiceRef.current = sipService;
      } catch (err: any) {
        console.error('Failed to initialize SIP service:', err);
        setSipConnecting(false);
        setError(`Failed to initialize SIP: ${err.message || 'Unknown error'}`);
      }
    },
    [playRingtone, stopRingtone]
  );

  const loadSipConfiguration = useCallback(async () => {
    try {
      setLoading(true);

      // Try user's personal phone assignment first
      try {
        const { default: axios } = await import('@/api/axios');
        const myConfigRes = await axios.get('/api/sip-configurations/my_config/');
        const myConfig = myConfigRes.data;

        if (myConfig && myConfig.sip_configuration) {
          // User has a personal assignment — use their extension credentials
          const sipConfig = myConfig.sip_configuration;
          // Override username/password with the user's extension credentials
          sipConfig.username = myConfig.extension;
          sipConfig.password = myConfig.extension_password;
          setActiveSipConfig(sipConfig);
          return;
        }
      } catch {
        // No personal assignment, fall back to default config
      }

      // Fallback: use default SIP config
      const response = await sipConfigurationsList();
      const defaultConfig = response.results.find((c: any) => c.is_default);
      if (!defaultConfig) {
        setError('No default SIP configuration found. Please configure SIP settings.');
        setLoading(false);
        return;
      }

      const webrtcConfig = await sipConfigurationsWebrtcConfigRetrieve(defaultConfig.id);
      setActiveSipConfig(webrtcConfig);
    } catch (err: any) {
      console.error('Failed to load SIP configuration:', err);
      setError('Failed to load SIP configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Call action handlers
  // ---------------------------------------------------------------------------

  const makeCall = useCallback(async () => {
    if (!dialNumber || !sipServiceRef.current) return;

    if (!isDialpadOpen) {
      setIsDialpadOpen(true);
    }

    try {
      const logResponse = await callLogsInitiateCallCreate({
        recipient_number: dialNumber,
      });

      setActiveCall({
        id: logResponse.call_id,
        logId: logResponse.id,
        number: dialNumber,
        direction: 'outgoing',
        status: 'connecting',
        duration: 0,
      });

      await sipServiceRef.current.makeCall(dialNumber);

      setActiveCall((prev) => (prev ? { ...prev, status: 'ringing' } : null));

      setDialNumber('');
    } catch (err: any) {
      console.error('Failed to make call:', err);
      setError(`Failed to make call: ${err.message || 'Unknown error'}`);
      setActiveCall(null);
    }
  }, [dialNumber, isDialpadOpen]);

  const handleAcceptCall = useCallback(async () => {
    if (sipServiceRef.current) {
      try {
        await sipServiceRef.current.acceptCall();
        stopRingtone();
      } catch (err: any) {
        console.error('Failed to accept call:', err);
        setError(`Failed to accept call: ${err.message}`);
      }
    }
  }, [stopRingtone]);

  const handleRejectCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (sipServiceRef.current && current) {
      try {
        await sipServiceRef.current.rejectCall();
        stopRingtone();
        setActiveCall(null);
        setCallEndedCounter(c => c + 1);

        await callLogsUpdateStatusPartialUpdate(current.logId, {
          status: 'cancelled' as any,
        });
      } catch (err: any) {
        console.error('Failed to reject call:', err);
      }
    }
  }, [stopRingtone]);

  const handleEndCall = useCallback(async () => {
    if (sipServiceRef.current) {
      try {
        await sipServiceRef.current.endCall();
        stopRingtone();
      } catch (err: any) {
        console.error('Failed to end call:', err);
      }
    }
  }, [stopRingtone]);

  const handleToggleHold = useCallback(async () => {
    if (!sipServiceRef.current || !activeCallRef.current) return;
    const current = activeCallRef.current;
    const newHoldState = !current.isOnHold;
    try {
      await sipServiceRef.current.toggleHold(newHoldState);
      setActiveCall(prev => prev ? { ...prev, isOnHold: newHoldState } : null);
    } catch (err) {
      console.error('Failed to toggle hold:', err);
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!sipServiceRef.current) return;
    const isMuted = sipServiceRef.current.toggleMute();
    setActiveCall(prev => prev ? { ...prev, isMuted } : null);
  }, []);

  const toggleDialpad = useCallback(() => {
    setIsDialpadOpen((prev) => !prev);
  }, []);

  const sendDTMF = useCallback((tone: string): boolean => {
    if (!sipServiceRef.current) return false;
    return sipServiceRef.current.sendDTMF(tone);
  }, []);

  const transferCall = useCallback(async (targetNumber: string) => {
    if (!sipServiceRef.current) throw new Error('No SIP service');
    await sipServiceRef.current.transferCall(targetNumber);
  }, []);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Check user's group-level feature keys (same logic as sidebar)
  const userHasIpCalling = useMemo(() => {
    if (user?.is_staff || user?.is_superuser) return true;
    const profile = userProfile as any;
    if (!profile?.feature_keys) return false;
    let keys: string[] = [];
    if (typeof profile.feature_keys === 'string') {
      try { keys = JSON.parse(profile.feature_keys); } catch { return false; }
    } else if (Array.isArray(profile.feature_keys)) {
      keys = profile.feature_keys;
    }
    return keys.includes('ip_calling');
  }, [user, userProfile]);

  // On mount: check feature & load SIP config
  useEffect(() => {
    if (!userHasIpCalling) {
      setLoading(false);
      return;
    }

    loadSipConfiguration();

    return () => {
      if (sipServiceRef.current) {
        sipServiceRef.current.disconnect();
        sipServiceRef.current = null;
      }
      stopRingtone();
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userHasIpCalling]);

  // When activeSipConfig changes and audio refs are ready, initialise SIP
  useEffect(() => {
    if (
      activeSipConfig &&
      localAudioRef.current &&
      remoteAudioRef.current &&
      !sipServiceRef.current
    ) {
      initializeSipService(activeSipConfig);
    }
  }, [activeSipConfig, initializeSipService]);

  // Call duration timer
  useEffect(() => {
    if (activeCall?.status === 'active' && activeCall.startTime) {
      const startMs = activeCall.startTime.getTime();
      callTimerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startMs) / 1000));
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

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const contextValue: CallContextValue = {
    activeCall,
    callDuration,
    sipRegistered,
    sipConnecting,
    activeSipConfig,
    dialNumber,
    error,
    loading,
    isDialpadOpen,
    setDialNumber,
    makeCall,
    handleAcceptCall,
    handleRejectCall,
    handleEndCall,
    handleToggleHold,
    handleToggleMute,
    setError,
    setIsDialpadOpen,
    toggleDialpad,
    callEndedCounter,
    sendDTMF,
    transferCall,
  };

  return (
    <CallContext.Provider value={contextValue}>
      {children}
      {/* Hidden audio elements for SIP — must live in the provider so they
          persist across page navigations. */}
      <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
    </CallContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useCall = (): CallContextValue => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
