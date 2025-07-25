import { 
  UserAgent, 
  Inviter, 
  Invitation, 
  SessionState, 
  RegistererState,
  Registerer,
  URI
} from 'sip.js';
import type { SipConfigurationDetail } from '@/api/generated/interfaces';

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
}

export class SipService {
  private userAgent: UserAgent | null = null;
  private registerer: Registerer | null = null;
  private currentSession: Inviter | Invitation | null = null;
  private localAudioElement: HTMLAudioElement | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private events: Partial<SipCallEvents> = {};
  private isRegistered = false;

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
      (callback as any)(...args);
    }
  }

  // Initialize SIP user agent
  async initialize(sipConfig: SipConfigurationDetail): Promise<void> {
    try {
      if (this.userAgent) {
        await this.disconnect();
      }

      // Build SIP server URI
      const sipServerUri = `sip:${sipConfig.sip_server}:${sipConfig.sip_port}`;
      const sipUri = new URI('sip', sipConfig.username, sipConfig.realm || sipConfig.sip_server);
      
      console.log('🔧 Initializing SIP with config:', {
        server: sipServerUri,
        username: sipConfig.username,
        realm: sipConfig.realm
      });

      // Create user agent
      this.userAgent = new UserAgent({
        uri: sipUri,
        transportOptions: {
          server: sipServerUri,
          // For secure connections, use wss:// instead of ws://
          connectionTimeout: 30
        },
        authorizationUsername: sipConfig.username,
        authorizationPassword: sipConfig.password,
        displayName: sipConfig.username,
        logLevel: 'debug',
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionConfiguration: {
            iceServers: [
              { urls: sipConfig.stun_server || 'stun:stun.l.google.com:19302' },
              ...(sipConfig.turn_server ? [{
                urls: sipConfig.turn_server,
                username: sipConfig.turn_username || '',
                credential: sipConfig.turn_password || ''
              }] : [])
            ]
          }
        },
        delegate: {
          onInvite: (invitation: Invitation) => {
            console.log('📞 Incoming call from:', invitation.remoteIdentity.uri.user);
            this.handleIncomingCall(invitation);
          }
        }
      });

      // Handle user agent state changes
      this.userAgent.stateChange.addListener((state) => {
        console.log('🔄 UserAgent state changed:', state);
      });

      // Start the user agent
      await this.userAgent.start();
      console.log('✅ SIP UserAgent started successfully');

      // Register with the SIP server
      await this.register();

    } catch (error) {
      console.error('❌ Failed to initialize SIP:', error);
      throw new Error(`SIP initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Register with SIP server
  private async register(): Promise<void> {
    if (!this.userAgent) {
      throw new Error('UserAgent not initialized');
    }

    try {
      this.registerer = new Registerer(this.userAgent);
      
      // Handle registration state changes
      this.registerer.stateChange.addListener((state: RegistererState) => {
        console.log('📋 Registration state:', state);
        
        switch (state) {
          case RegistererState.Registered:
            this.isRegistered = true;
            this.emit('onRegistered');
            console.log('✅ Successfully registered with SIP server');
            break;
          case RegistererState.Unregistered:
            this.isRegistered = false;
            this.emit('onUnregistered');
            console.log('📴 Unregistered from SIP server');
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
      console.error('❌ Registration failed:', error);
      this.emit('onRegistrationFailed', error instanceof Error ? error.message : 'Registration failed');
      throw error;
    }
  }

  // Make an outgoing call
  async makeCall(phoneNumber: string): Promise<void> {
    if (!this.userAgent || !this.isRegistered) {
      throw new Error('SIP not registered');
    }

    try {
      // Clean phone number
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      const targetUri = new URI('sip', cleanNumber, this.userAgent.configuration.uri?.host || '');
      
      console.log('📞 Making call to:', targetUri.toString());

      // Create inviter
      this.currentSession = new Inviter(this.userAgent, targetUri, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false
          }
        }
      });

      // Handle session state changes
      this.currentSession.stateChange.addListener((state: SessionState) => {
        console.log('📞 Call state changed:', state);
        
        switch (state) {
          case SessionState.Establishing:
            this.emit('onCallProgress');
            break;
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

      // Handle session delegates - remove unsupported delegate properties
      // Note: SIP.js handles call rejection through the session state

      // Send the invite
      await this.currentSession.invite();
      console.log('✅ Call invitation sent');

    } catch (error) {
      console.error('❌ Failed to make call:', error);
      this.emit('onCallFailed', error instanceof Error ? error.message : 'Call failed');
      throw error;
    }
  }

  // Handle incoming call
  private handleIncomingCall(invitation: Invitation) {
    this.currentSession = invitation;
    
    // Handle session state changes
    invitation.stateChange.addListener((state: SessionState) => {
      console.log('📞 Incoming call state:', state);
      
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
      await this.currentSession.accept({
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false
          }
        }
      });
      console.log('✅ Incoming call accepted');
    } catch (error) {
      console.error('❌ Failed to accept call:', error);
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
      console.log('📞 Incoming call rejected');
      this.currentSession = null;
    } catch (error) {
      console.error('❌ Failed to reject call:', error);
      throw error;
    }
  }

  // End current call
  async endCall(): Promise<void> {
    if (!this.currentSession) {
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
      
      console.log('📞 Call ended');
      this.currentSession = null;
    } catch (error) {
      console.error('❌ Failed to end call:', error);
      this.currentSession = null;
    }
  }

  // Setup audio streams
  private setupAudioStreams() {
    if (!this.currentSession || !this.remoteAudioElement || !this.localAudioElement) {
      return;
    }

    try {
      // Get session description handler
      const sessionDescriptionHandler = this.currentSession.sessionDescriptionHandler;
      if (!sessionDescriptionHandler) {
        console.warn('⚠️ No session description handler available');
        return;
      }

      // Access the peer connection
      const peerConnection = (sessionDescriptionHandler as any).peerConnection as RTCPeerConnection;
      if (!peerConnection) {
        console.warn('⚠️ No peer connection available');
        return;
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('🎵 Remote audio track received');
        const [remoteStream] = event.streams;
        if (this.remoteAudioElement && remoteStream) {
          this.remoteAudioElement.srcObject = remoteStream;
          this.remoteAudioElement.play().catch(e => 
            console.warn('Failed to play remote audio:', e)
          );
        }
      };

      // Get local stream
      const senders = peerConnection.getSenders();
      const audioSender = senders.find(sender => 
        sender.track && sender.track.kind === 'audio'
      );

      if (audioSender && audioSender.track && this.localAudioElement) {
        const localStream = new MediaStream([audioSender.track]);
        this.localAudioElement.srcObject = localStream;
        // Note: Local audio should be muted to prevent feedback
        this.localAudioElement.muted = true;
      }

    } catch (error) {
      console.error('❌ Failed to setup audio streams:', error);
    }
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

      // Stop user agent
      if (this.userAgent) {
        await this.userAgent.stop();
        this.userAgent = null;
      }

      this.isRegistered = false;
      console.log('🔌 SIP service disconnected');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
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
      console.log('🧪 SIP connection test result:', isConnected);
      
      return isConnected;
    } catch (error) {
      console.error('🧪 SIP connection test failed:', error);
      return false;
    }
  }
}
