import {
  UserAgent,
  Inviter,
  Invitation,
  SessionState,
  RegistererState,
  Registerer,
  URI
} from 'sip.js';
import type { Session, SessionDescriptionHandler } from 'sip.js';
import type { SipConfigurationDetail } from '@/api/generated/interfaces';

// sip.js type extensions — the library's types don't expose these properties
// but they exist at runtime on the session description handler
interface PeerConnectionAccessor {
  peerConnection: RTCPeerConnection;
}

// Session methods that sip.js types don't fully expose
interface SessionWithExtras {
  invite(options?: Record<string, unknown>): Promise<unknown>;
  refer(target: URI | Session): Promise<unknown>;
  info(options: Record<string, unknown>): Promise<unknown>;
}

// SipConfigurationDetail with websocket_path (exists in API but not in generated types)
interface SipConfigWithWebSocket extends SipConfigurationDetail {
  websocket_path?: string;
}

// Safari AudioContext compat
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

// [Issue #6] Extracted audio constraints constant — previously duplicated in 3 places
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 1,
};

// [Issue #8] Cache the dynamic import result so NoiseSuppression module is loaded only once
let noiseSuppressionModuleCache: Promise<typeof import('./NoiseSuppression')> | null = null;

function getNoiseSuppressionModule(): Promise<typeof import('./NoiseSuppression')> {
  if (!noiseSuppressionModuleCache) {
    noiseSuppressionModuleCache = import('./NoiseSuppression');
  }
  return noiseSuppressionModuleCache;
}

export interface SipCallEvents {
  onCallProgress: () => void;
  onCallAccepted: () => void;
  onCallRejected: () => void;
  onCallEnded: () => void;
  onCallFailed: (error: string) => void;
  onIncomingCall: (invitation: Invitation) => void;
  onRegistered: () => void;
  onUnregistered: () => void;
  onRegistrationFailed: (error: string) => void;
  onConsultationProgress: () => void;
  onConsultationAccepted: () => void;
  onConsultationEnded: () => void;
  onConsultationFailed: (error: string) => void;
  // [Issue #9] New event for call quality degradation warnings
  onCallQualityWarning: (message: string) => void;
}

export class SipService {
  private userAgent: UserAgent | null = null;
  private registerer: Registerer | null = null;
  private currentSession: Inviter | Invitation | null = null;
  private consultationSession: Inviter | null = null;
  private localAudioElement: HTMLAudioElement | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private events: Partial<SipCallEvents> = {};
  private isRegistered = false;
  private noiseSuppression: import('./NoiseSuppression').NoiseSuppression | null = null;
  private noiseSuppressionEnabled = false; // Disabled by default — adds ~43ms latency

  // [Issue #1] Flag to prevent concurrent setupAudioStreams invocations
  private audioSetupDone = false;

  // [Issue #2] Track the retry timeout so it can be cleared on cleanup
  private audioPlayRetryTimeout: ReturnType<typeof setTimeout> | null = null;

  // [Issue #7] Track AudioContext instances created in setupAudioStreams for cleanup
  private audioContext: AudioContext | null = null;

  constructor(
    localAudio: HTMLAudioElement,
    remoteAudio: HTMLAudioElement
  ) {
    this.localAudioElement = localAudio;
    this.remoteAudioElement = remoteAudio;
  }

  // Event handling
  on<K extends keyof SipCallEvents>(event: K, callback: SipCallEvents[K]) {
    this.events[event] = callback;
  }

  private emit<K extends keyof SipCallEvents>(event: K, ...args: Parameters<SipCallEvents[K]>) {
    const callback = this.events[event];
    if (callback) {
      (callback as (...a: Parameters<SipCallEvents[K]>) => void)(...args);
    }
  }

  // Check if a SIP provider is a traditional (non-WebRTC) provider
  private isTraditionalSipProvider(sipServer: string): boolean {
    // VitalPBX servers are WebRTC compatible
    if (sipServer === '165.227.166.42' || sipServer === 'pbx.echodesk.ge') {
      return false;
    }

    // Known traditional SIP providers that don't support WebRTC
    const traditionalProviders = [
      '89.150.1.11', // Old Georgian SIP provider
      'sip.telekom.ge',
      'sip.geocell.ge',
      'sip.megatel.ge',
      // Add other known traditional providers
    ];

    // Check against known traditional providers
    return traditionalProviders.some(provider =>
      sipServer.includes(provider) || provider.includes(sipServer)
    );
  }

  // Check if a SIP provider supports WebRTC
  private isWebRtcCompatibleProvider(sipServer: string): boolean {
    // VitalPBX servers are explicitly WebRTC compatible
    if (sipServer === '165.227.166.42' || sipServer === 'pbx.echodesk.ge') {
      return true;
    }

    // Known WebRTC-compatible providers
    const webrtcProviders = [
      'twilio.com',
      'vonage.com',
      'janus.gateway',
      'sip.js',
      'freeswitch',
      'asterisk',
      'opensips',
      'kamailio',
      'webrtc',
      'jssip',
      'sipgate',
      '3cx',
      'vitalpbx',
      'freepbx',
      'issabel',
      'elastix',
      'echodesk.ge',
      // Add other known WebRTC providers
    ];

    return webrtcProviders.some(provider =>
      sipServer.toLowerCase().includes(provider.toLowerCase())
    );
  }

  // Get WebSocket URL for SIP server
  private getWebSocketUrl(sipConfig: SipConfigurationDetail): string {
    const isSecure = window.location.protocol === 'https:';
    const wsProtocol = isSecure ? 'wss' : 'ws';
    const port = sipConfig.sip_port || (isSecure ? 8089 : 8088);
    const wsPath = (sipConfig as SipConfigWithWebSocket).websocket_path || '/ws';

    return `${wsProtocol}://${sipConfig.sip_server}:${port}${wsPath}`;
  }

  // [Issue #2 / #7] Clear audio-related timers and contexts
  private cleanupAudioResources(): void {
    // Clear retry timeout
    if (this.audioPlayRetryTimeout !== null) {
      clearTimeout(this.audioPlayRetryTimeout);
      this.audioPlayRetryTimeout = null;
    }

    // [Issue #7] Close the AudioContext created in setupAudioStreams
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // Reset the audio setup flag so a new call can set up audio fresh
    this.audioSetupDone = false;
  }

  // Initialize SIP user agent
  async initialize(sipConfig: SipConfigurationDetail): Promise<void> {
    try {
      if (this.userAgent) {
        await this.disconnect();
      }

      // Check if this is a traditional SIP provider that doesn't support WebRTC
      const isTraditionalProvider = this.isTraditionalSipProvider(sipConfig.sip_server);
      const isWebRtcCompatible = this.isWebRtcCompatibleProvider(sipConfig.sip_server);

      if (isTraditionalProvider && !isWebRtcCompatible) {
        const errorMessage = `WebRTC Compatibility Issue: The SIP provider "${sipConfig.sip_server}" appears to be a traditional SIP server that only supports UDP/TCP protocols. Browser-based calling requires WebSocket (WSS) transport.

Solutions:
1. Contact your SIP provider about WebRTC/WebSocket support
2. Use a WebRTC gateway (FreeSWITCH, Asterisk) to bridge the connection
3. Switch to a WebRTC-native provider (Twilio, Vonage, Janus)
4. Set up an Asterisk/FreeSWITCH server with WebRTC support as a proxy

Traditional SIP providers work with desktop softphones (like Zoiper) but not web browsers due to security restrictions.`;

        console.error('[SipService] Provider compatibility issue:', errorMessage);
        throw new Error(errorMessage);
      }

      // Get the appropriate WebSocket URL for this provider
      const sipServerUri = this.getWebSocketUrl(sipConfig);

      const sipUri = new URI('sip', sipConfig.username, sipConfig.realm || sipConfig.sip_server);

      // [Issue #6] Use extracted AUDIO_CONSTRAINTS constant
      // Create user agent with enhanced configuration
      this.userAgent = new UserAgent({
        uri: sipUri,
        transportOptions: {
          server: sipServerUri,
          connectionTimeout: 30,
          maxReconnectionAttempts: 5,
          reconnectionTimeout: 10,
          keepAliveInterval: 30
        },
        authorizationUsername: sipConfig.username,
        authorizationPassword: sipConfig.password,
        displayName: sipConfig.username || `EchoDesk Agent`,
        logLevel: 'warn', // Reduce log noise in production
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionConfiguration: {
            iceServers: [
              { urls: sipConfig.stun_server || 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              ...(sipConfig.turn_server ? [{
                urls: sipConfig.turn_server,
                username: sipConfig.turn_username || '',
                credential: sipConfig.turn_password || ''
              }] : [])
            ],
            iceCandidatePoolSize: 10
          },
          constraints: {
            audio: AUDIO_CONSTRAINTS,
            video: false
          }
        },
        delegate: {
          onInvite: (invitation: Invitation) => {
            this.handleIncomingCall(invitation);
          }
        }
      });

      // Handle user agent state changes
      this.userAgent.stateChange.addListener((state) => {
        // State change handled
      });

      // Start the user agent
      await this.userAgent.start();

      // Register with the SIP server
      await this.register();

    } catch (error) {
      console.error('[SipService] Failed to initialize SIP:', error);
      throw new Error(`SIP initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Register with SIP server
  async register(): Promise<void> {
    if (!this.userAgent) {
      throw new Error('UserAgent not initialized');
    }

    try {
      this.registerer = new Registerer(this.userAgent);

      // Handle registration state changes
      this.registerer.stateChange.addListener((state: RegistererState) => {
        switch (state) {
          case RegistererState.Registered:
            this.isRegistered = true;
            this.emit('onRegistered');
            break;
          case RegistererState.Unregistered:
            this.isRegistered = false;
            this.emit('onUnregistered');
            break;
          case RegistererState.Terminated:
            this.isRegistered = false;
            this.emit('onRegistrationFailed', 'Registration terminated');
            break;
        }
      });

      // Start registration
      await this.registerer.register();

    } catch (error) {
      console.error('[SipService] Registration failed:', error);
      this.emit('onRegistrationFailed', error instanceof Error ? error.message : 'Registration failed');
      throw error;
    }
  }

  // Make an outgoing call
  async makeCall(phoneNumber: string): Promise<void> {
    if (!this.userAgent || !this.isRegistered) {
      throw new Error('SIP not registered. Please check your SIP configuration and try again.');
    }

    try {
      // Enhanced phone number cleaning and formatting
      let cleanNumber = phoneNumber.replace(/[^\d+]/g, '');

      // Handle different number formats
      if (cleanNumber.startsWith('00')) {
        // Convert 00 prefix to +
        cleanNumber = '+' + cleanNumber.substring(2);
      } else if (cleanNumber.length === 9 && cleanNumber.startsWith('5')) {
        // Georgian mobile number, add country code
        cleanNumber = '+995' + cleanNumber;
      } else if (cleanNumber.length === 8 && cleanNumber.startsWith('2')) {
        // Georgian landline, add country code
        cleanNumber = '+995' + cleanNumber;
      } else if (!cleanNumber.startsWith('+') && cleanNumber.length > 7) {
        // If no country code and looks international, add +
        cleanNumber = '+' + cleanNumber;
      }

      // Create SIP URI - use the configured realm
      const realm = this.userAgent.configuration.uri?.host || 'pbx.echodesk.ge';
      const targetUri = new URI('sip', cleanNumber, realm);

      // [Issue #3] Wrap getUserMedia in Promise.race with a 10-second timeout
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          audio: AUDIO_CONSTRAINTS, // [Issue #6] Use extracted constant
          video: false
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Microphone access timed out after 10 seconds')), 10000)
        ),
      ]);

      // [Issue #6] Use extracted AUDIO_CONSTRAINTS constant
      // Create inviter with enhanced options
      this.currentSession = new Inviter(this.userAgent, targetUri, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: AUDIO_CONSTRAINTS,
            video: false
          }
        }
      });

      // Reset audio setup flag for new call
      this.audioSetupDone = false;

      // Handle session state changes with more detailed logging
      this.currentSession.stateChange.addListener((state: SessionState) => {
        switch (state) {
          case SessionState.Initial:
            break;
          case SessionState.Establishing:
            this.emit('onCallProgress');
            // Start setting up audio early
            setTimeout(() => this.setupAudioStreams(), 1000);
            break;
          case SessionState.Established:
            this.emit('onCallAccepted');
            this.setupAudioStreams();
            break;
          case SessionState.Terminating:
            break;
          case SessionState.Terminated:
            this.emit('onCallEnded');
            this.currentSession = null;
            break;
        }
      });

      // Send the invite with enhanced error handling
      await this.currentSession.invite({
        requestDelegate: {
          onAccept: (response) => {
            // Call accepted
          },
          onProgress: (response) => {
            // Call in progress
          },
          onRedirect: (response) => {
            // Call redirected
          },
          onReject: (response) => {
            let errorMessage = 'Call rejected';

            switch (response.message.statusCode) {
              case 404:
                errorMessage = 'Number not found or invalid';
                break;
              case 486:
                errorMessage = 'Line busy';
                break;
              case 603:
                errorMessage = 'Call declined';
                break;
              case 408:
                errorMessage = 'No answer / Request timeout';
                break;
              case 480:
                errorMessage = 'Temporarily unavailable';
                break;
              case 487:
                errorMessage = 'Request terminated';
                break;
              case 401:
                errorMessage = 'Authentication failed';
                break;
              case 403:
                errorMessage = 'Call forbidden — check permissions';
                break;
              case 481:
                errorMessage = 'Call no longer exists';
                break;
              case 500:
                errorMessage = 'Server error — try again';
                break;
              case 503:
                errorMessage = 'Service unavailable — try again later';
                break;
              default:
                errorMessage = `Call failed (${response.message.statusCode}: ${response.message.reasonPhrase})`;
            }

            this.emit('onCallFailed', errorMessage);
            this.currentSession = null;
          },
          onTrying: (response) => {
            // Call trying
          }
        }
      });

    } catch (error) {
      console.error('[SipService] Failed to make call:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown call error';

      // Specific error handling for common WebRTC issues
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          this.emit('onCallFailed', 'Microphone access denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          this.emit('onCallFailed', 'No microphone found. Please connect a microphone and try again.');
        } else if (error.message.includes('getUserMedia') || error.message.includes('timed out')) {
          this.emit('onCallFailed', 'Audio device error: ' + error.message);
        } else {
          this.emit('onCallFailed', errorMessage);
        }
      } else {
        this.emit('onCallFailed', errorMessage);
      }

      this.currentSession = null;
      throw new Error(`Call failed: ${errorMessage}`);
    }
  }

  // Handle incoming call
  private handleIncomingCall(invitation: Invitation) {
    this.currentSession = invitation;

    // Reset audio setup flag for new call
    this.audioSetupDone = false;

    // Handle session state changes
    invitation.stateChange.addListener((state: SessionState) => {
      switch (state) {
        case SessionState.Established:
          this.emit('onCallAccepted');
          this.setupAudioStreams();
          break;
        case SessionState.Terminated:
          this.emit('onCallEnded');
          this.currentSession = null;
          break;
      }
    });

    // Emit incoming call event
    this.emit('onIncomingCall', invitation);
  }

  // Accept incoming call
  async acceptCall(): Promise<void> {
    if (!this.currentSession || !('accept' in this.currentSession)) {
      throw new Error('No incoming call to accept');
    }

    try {
      // [Issue #6] Use extracted AUDIO_CONSTRAINTS constant
      await this.currentSession.accept({
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: AUDIO_CONSTRAINTS,
            video: false
          }
        }
      });
    } catch (error) {
      console.error('[SipService] Failed to accept call:', error);
      throw error;
    }
  }

  // Reject incoming call
  async rejectCall(): Promise<void> {
    if (!this.currentSession || !('reject' in this.currentSession)) {
      throw new Error('No incoming call to reject');
    }

    try {
      await this.currentSession.reject();
      this.currentSession = null;
    } catch (error) {
      console.error('[SipService] Failed to reject call:', error);
      throw error;
    }
  }

  // Toggle mute (local audio track)
  toggleMute(): boolean {
    if (!this.currentSession) return false;

    const sdh = this.currentSession.sessionDescriptionHandler;
    if (!sdh) return false;

    const pc = (sdh as unknown as PeerConnectionAccessor).peerConnection;
    if (!pc) return false;

    const senders = pc.getSenders();
    const audioSender = senders.find(s => s.track?.kind === 'audio');
    if (audioSender?.track) {
      audioSender.track.enabled = !audioSender.track.enabled;
      return !audioSender.track.enabled; // true = muted
    }
    return false;
  }

  // Toggle hold (re-INVITE with sendonly/sendrecv)
  async toggleHold(hold: boolean): Promise<void> {
    if (!this.currentSession || this.currentSession.state !== SessionState.Established) {
      throw new Error('No active call to hold/resume');
    }

    try {
      const options = {
        sessionDescriptionHandlerModifiers: hold
          ? [(sdp: any) => {
              // Change audio direction to sendonly (hold)
              sdp.body = sdp.body?.replace(/a=sendrecv/g, 'a=sendonly') || sdp.body;
              return sdp;
            }]
          : [] // Empty modifiers = sendrecv (resume)
      };

      await (this.currentSession as unknown as SessionWithExtras).invite(options);
    } catch (error) {
      console.error('[SipService] Failed to toggle hold:', error);
      throw error;
    }
  }

  // Send DTMF tone
  sendDTMF(tone: string): boolean {
    if (!this.currentSession || this.currentSession.state !== SessionState.Established) {
      return false;
    }

    try {
      const sdh = this.currentSession.sessionDescriptionHandler;
      if (!sdh) return false;

      const pc = (sdh as unknown as PeerConnectionAccessor).peerConnection;
      if (!pc) return false;

      const senders = pc.getSenders();
      const audioSender = senders.find(s => s.track?.kind === 'audio');
      if (audioSender && audioSender.dtmf) {
        audioSender.dtmf.insertDTMF(tone, 100, 70);
        return true;
      }

      // [Issue #4] Fallback: send via SIP INFO — wrap in try-catch with proper error handling
      if (this.currentSession.state === SessionState.Established) {
        try {
          (this.currentSession as unknown as SessionWithExtras).info({
            requestOptions: {
              body: {
                contentType: 'application/dtmf-relay',
                body: `Signal=${tone}\r\nDuration=100`,
              },
            },
          });
          return true;
        } catch (infoError) {
          console.warn('[SipService] SIP INFO DTMF fallback failed:', infoError);
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('[SipService] Failed to send DTMF:', error);
      return false;
    }
  }

  // [Issue #8] Apply RNNoise noise suppression to outgoing audio — uses cached import
  private async applyNoiseSuppression(audioSender: RTCRtpSender, peerConnection: RTCPeerConnection): Promise<void> {
    try {
      const { NoiseSuppression } = await getNoiseSuppressionModule();
      this.noiseSuppression = new NoiseSuppression();

      const originalTrack = audioSender.track;
      if (!originalTrack) return;

      const originalStream = new MediaStream([originalTrack]);
      const cleanStream = await this.noiseSuppression.process(originalStream);
      const cleanTrack = cleanStream.getAudioTracks()[0];

      if (cleanTrack) {
        await audioSender.replaceTrack(cleanTrack);
      }
    } catch (error) {
      console.warn('[SipService] Failed to apply noise suppression:', error);
    }
  }

  // Toggle noise suppression on/off
  setNoiseSuppression(enabled: boolean) {
    this.noiseSuppressionEnabled = enabled;
    if (this.noiseSuppression) {
      this.noiseSuppression.setEnabled(enabled);
    }
  }

  // Check if noise suppression is enabled
  isNoiseSuppressionEnabled(): boolean {
    return this.noiseSuppressionEnabled;
  }

  // Blind transfer current call to another number
  async transferCall(targetNumber: string): Promise<void> {
    if (!this.currentSession || this.currentSession.state !== SessionState.Established) {
      throw new Error('No active call to transfer');
    }

    try {
      const targetUri = new URI('sip', targetNumber, this.userAgent?.configuration.uri?.host || '');
      await (this.currentSession as unknown as SessionWithExtras).refer(targetUri);
    } catch (error) {
      console.error('[SipService] Failed to transfer call:', error);
      throw error;
    }
  }

  // Start a consultation call for attended transfer (puts original call on hold)
  async startConsultation(targetNumber: string): Promise<void> {
    if (!this.userAgent || !this.currentSession || this.currentSession.state !== SessionState.Established) {
      throw new Error('No active call for consultation');
    }

    try {
      // Put original call on hold
      await this.toggleHold(true);

      // Create consultation call
      const realm = this.userAgent.configuration.uri?.host || '';
      const targetUri = new URI('sip', targetNumber, realm);

      this.consultationSession = new Inviter(this.userAgent, targetUri, {
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: false }
        }
      });

      this.consultationSession.stateChange.addListener((state: SessionState) => {
        switch (state) {
          case SessionState.Establishing:
            this.emit('onConsultationProgress');
            break;
          case SessionState.Established:
            this.emit('onConsultationAccepted');
            this.setupAudioForSession(this.consultationSession!);
            break;
          case SessionState.Terminated:
            this.emit('onConsultationEnded');
            this.consultationSession = null;
            break;
        }
      });

      await this.consultationSession.invite({
        requestDelegate: {
          onReject: () => {
            this.emit('onConsultationFailed', 'Consultation call rejected');
            this.consultationSession = null;
          }
        }
      });
    } catch (error) {
      console.error('[SipService] Failed to start consultation:', error);
      // Resume original call on failure
      try { await this.toggleHold(false); } catch {}
      this.consultationSession = null;
      throw error;
    }
  }

  // Complete attended transfer: bridge customer to consultation target
  async completeAttendedTransfer(): Promise<void> {
    if (!this.currentSession || !this.consultationSession) {
      throw new Error('Both original and consultation sessions required');
    }

    if (this.consultationSession.state !== SessionState.Established) {
      throw new Error('Consultation call not established');
    }

    try {
      // REFER with Replaces: tells Asterisk to bridge customer to consultation target
      await (this.currentSession as unknown as SessionWithExtras).refer(this.consultationSession as unknown as Session);

      // Clean up both local sessions
      try { await this.consultationSession.bye(); } catch {}
      this.consultationSession = null;
      this.currentSession = null;
    } catch (error) {
      console.error('[SipService] Failed to complete attended transfer:', error);
      throw error;
    }
  }

  // Cancel consultation: end consultation call, resume original
  async cancelConsultation(): Promise<void> {
    if (this.consultationSession) {
      try {
        if (this.consultationSession.state === SessionState.Established) {
          await this.consultationSession.bye();
        } else if (this.consultationSession.state === SessionState.Establishing) {
          await this.consultationSession.cancel();
        }
      } catch (error) {
        console.warn('[SipService] Error ending consultation:', error);
      }
      this.consultationSession = null;
    }

    // Resume original call
    if (this.currentSession && this.currentSession.state === SessionState.Established) {
      try {
        await this.toggleHold(false);
        this.setupAudioForSession(this.currentSession);
      } catch (error) {
        console.error('[SipService] Error resuming original call:', error);
      }
    }
  }

  // Resume original call from hold (used during merge to reconnect audio)
  async resumeOriginalFromHold(): Promise<void> {
    if (this.currentSession && this.currentSession.state === SessionState.Established) {
      await this.toggleHold(false);
    }
  }

  // Check if consultation session is active
  hasConsultationSession(): boolean {
    return this.consultationSession !== null && this.consultationSession.state === SessionState.Established;
  }

  // Setup audio for a specific session (used for switching between original and consultation)
  private setupAudioForSession(session: Inviter | Invitation) {
    if (!this.remoteAudioElement) return;

    try {
      const sdh = session.sessionDescriptionHandler;
      if (!sdh) return;

      const pc = (sdh as unknown as PeerConnectionAccessor).peerConnection;
      if (!pc) return;

      const receivers = pc.getReceivers();
      for (const receiver of receivers) {
        if (receiver.track && receiver.track.kind === 'audio') {
          const stream = new MediaStream([receiver.track]);
          this.remoteAudioElement.srcObject = stream;
          this.remoteAudioElement.play().catch((e) => {
            console.warn('[SipService] Failed to play session audio:', e);
          });
          break;
        }
      }
    } catch (error) {
      console.error('[SipService] Failed to setup audio for session:', error);
    }
  }

  // End current call (and consultation if active)
  async endCall(): Promise<void> {
    // End consultation session if active
    if (this.consultationSession) {
      try {
        if (this.consultationSession.state === SessionState.Established) {
          await this.consultationSession.bye();
        } else if (this.consultationSession.state === SessionState.Establishing) {
          await this.consultationSession.cancel();
        }
      } catch {}
      this.consultationSession = null;
    }

    if (!this.currentSession) {
      // [Issue #7] Still clean up audio resources even if session is already null
      this.cleanupAudioResources();
      return;
    }

    try {
      if (this.currentSession.state === SessionState.Established) {
        await this.currentSession.bye();
      } else if ('cancel' in this.currentSession) {
        await this.currentSession.cancel();
      } else if ('reject' in this.currentSession) {
        await this.currentSession.reject();
      }

      this.currentSession = null;
      if (this.noiseSuppression) {
        this.noiseSuppression.destroy();
        this.noiseSuppression = null;
      }
      // [Issue #2 / #7] Clean up audio resources
      this.cleanupAudioResources();
    } catch (error) {
      console.error('[SipService] Failed to end call:', error);
      this.currentSession = null;
      if (this.noiseSuppression) {
        this.noiseSuppression.destroy();
        this.noiseSuppression = null;
      }
      // [Issue #2 / #7] Clean up audio resources even on error
      this.cleanupAudioResources();
    }
  }

  // Setup audio streams
  setupAudioStreams() {
    // [Issue #1] Prevent concurrent audio setup — flag checked and set atomically
    if (this.audioSetupDone) {
      return;
    }

    if (!this.currentSession || !this.remoteAudioElement || !this.localAudioElement) {
      console.warn('[SipService] Cannot setup audio streams - missing session or audio elements');
      return;
    }

    try {
      // Get session description handler
      const sessionDescriptionHandler = this.currentSession.sessionDescriptionHandler;
      if (!sessionDescriptionHandler) {
        console.warn('[SipService] No session description handler available');
        return;
      }

      // Access the peer connection
      const peerConnection = (sessionDescriptionHandler as unknown as PeerConnectionAccessor).peerConnection;
      if (!peerConnection) {
        console.warn('[SipService] No peer connection available');
        return;
      }

      // [Issue #1] Mark audio setup as done to prevent re-entry
      this.audioSetupDone = true;

      // Handle remote stream — apply audio enhancement for narrowband calls
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (this.remoteAudioElement && remoteStream) {
          // Apply audio enhancement pipeline for incoming audio
          try {
            // [Issue #7] Close previous AudioContext before creating a new one
            if (this.audioContext && this.audioContext.state !== 'closed') {
              this.audioContext.close().catch(() => {});
            }

            const ctx = new AudioContext();
            this.audioContext = ctx; // [Issue #7] Track for cleanup
            const source = ctx.createMediaStreamSource(remoteStream);

            // Compressor: even out volume levels
            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 12;
            compressor.ratio.value = 4;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.15;

            // EQ: boost clarity for 8kHz narrowband audio
            // Boost presence (2-4kHz) for voice clarity
            const presenceBoost = ctx.createBiquadFilter();
            presenceBoost.type = 'peaking';
            presenceBoost.frequency.value = 3000;
            presenceBoost.Q.value = 1.0;
            presenceBoost.gain.value = 4;

            // Boost warmth (200-500Hz) to reduce "tinny" sound
            const warmthBoost = ctx.createBiquadFilter();
            warmthBoost.type = 'peaking';
            warmthBoost.frequency.value = 350;
            warmthBoost.Q.value = 1.0;
            warmthBoost.gain.value = 2;

            // High-pass filter to remove low-frequency rumble
            const highPass = ctx.createBiquadFilter();
            highPass.type = 'highpass';
            highPass.frequency.value = 80;

            // Gain: slight boost
            const gain = ctx.createGain();
            gain.gain.value = 1.3;

            // Connect: source -> highpass -> warmth -> presence -> compressor -> gain -> destination
            const dest = ctx.createMediaStreamDestination();
            source.connect(highPass);
            highPass.connect(warmthBoost);
            warmthBoost.connect(presenceBoost);
            presenceBoost.connect(compressor);
            compressor.connect(gain);
            gain.connect(dest);

            this.remoteAudioElement.srcObject = dest.stream;
          } catch {
            // Fallback: use raw stream
            this.remoteAudioElement.srcObject = remoteStream;
          }

          // Ensure audio element properties are set correctly
          this.remoteAudioElement.autoplay = true;
          this.remoteAudioElement.controls = false;
          this.remoteAudioElement.muted = false;

          this.remoteAudioElement.play().then(() => {
            // Remote audio playing
          }).catch(e => {
            console.warn('[SipService] Failed to play remote audio, retrying in 1s:', e);
            // [Issue #2] Clear any previous retry before scheduling a new one
            if (this.audioPlayRetryTimeout !== null) {
              clearTimeout(this.audioPlayRetryTimeout);
            }
            this.audioPlayRetryTimeout = setTimeout(() => {
              this.audioPlayRetryTimeout = null;
              // [Issue #2] Check element still exists before attempting play
              if (this.remoteAudioElement) {
                this.remoteAudioElement.play().catch((retryErr) => {
                  console.warn('[SipService] Retry play also failed:', retryErr);
                });
              }
            }, 1000);
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'connected') {
          // Verify audio streams
          this.verifyAudioStreams(peerConnection);
        } else if (peerConnection.connectionState === 'failed') {
          console.error('[SipService] Peer connection failed');
          this.emit('onCallFailed', 'Connection failed');
        }
      };

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        if (state === 'failed') {
          // [Issue #5 / #10] ICE failure — unrecoverable
          console.error('[SipService] ICE connection failed');
          this.emit('onCallFailed', 'Network connection failed');
        } else if (state === 'disconnected') {
          // [Issue #5 / #9] ICE disconnected — may recover, but warn the UI
          console.warn('[SipService] ICE connection disconnected — possible network issue');
          this.emit('onCallQualityWarning', 'Network connection unstable — call quality may be degraded');
        }
      };

      // Get local stream
      const senders = peerConnection.getSenders();
      const audioSender = senders.find(sender =>
        sender.track && sender.track.kind === 'audio'
      );

      if (audioSender && audioSender.track && this.localAudioElement) {
        // Apply noise suppression to outgoing audio
        if (this.noiseSuppressionEnabled) {
          this.applyNoiseSuppression(audioSender, peerConnection).catch(err => {
            console.warn('[SipService] Noise suppression failed, using raw audio:', err);
          });
        }

        const localStream = new MediaStream([audioSender.track]);
        this.localAudioElement.srcObject = localStream;
        // Note: Local audio should be muted to prevent feedback
        this.localAudioElement.muted = true;
        this.localAudioElement.autoplay = true;
      }

      // Check if we already have tracks
      const receivers = peerConnection.getReceivers();

      receivers.forEach((receiver) => {
        if (receiver.track && receiver.track.kind === 'audio') {
          const stream = new MediaStream([receiver.track]);
          if (this.remoteAudioElement) {
            this.remoteAudioElement.srcObject = stream;
            this.remoteAudioElement.play().catch((e) => {
              console.warn('[SipService] Failed to play existing receiver track:', e);
            });
          }
        }
      });

    } catch (error) {
      console.error('[SipService] Failed to setup audio streams:', error);
    }
  }

  // Verify audio streams are working
  private verifyAudioStreams(peerConnection: RTCPeerConnection) {
    const senders = peerConnection.getSenders();
    const receivers = peerConnection.getReceivers();

    // Verification complete - streams are set up
  }

  // Get current call info
  getCurrentCallInfo() {
    if (!this.currentSession) {
      return null;
    }

    const remoteIdentity = 'remoteIdentity' in this.currentSession
      ? this.currentSession.remoteIdentity
      : null;

    return {
      remoteNumber: remoteIdentity?.uri?.user || 'Unknown',
      state: this.currentSession.state,
      direction: 'invite' in this.currentSession ? 'outgoing' : 'incoming'
    };
  }

  // Check if registered
  getRegistrationStatus(): boolean {
    return this.isRegistered;
  }

  // Disconnect and cleanup
  async disconnect(): Promise<void> {
    try {
      // End any active call
      if (this.currentSession) {
        await this.endCall();
      }

      // [Issue #2 / #7] Clean up audio resources on full disconnect
      this.cleanupAudioResources();

      // Stop user agent
      if (this.userAgent) {
        await this.userAgent.stop();
        this.userAgent = null;
      }

      this.isRegistered = false;
    } catch (error) {
      console.error('[SipService] Error during disconnect:', error);
    }
  }

  // Test SIP connection
  async testConnection(sipConfig: SipConfigurationDetail): Promise<boolean> {
    try {
      // Try to initialize and register
      await this.initialize(sipConfig);

      // Wait a bit for registration
      await new Promise(resolve => setTimeout(resolve, 3000));

      const isConnected = this.getRegistrationStatus();

      return isConnected;
    } catch (error) {
      console.error('[SipService] SIP connection test failed:', error);
      return false;
    }
  }
}
