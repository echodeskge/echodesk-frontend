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
    
    // VitalPBX specific configuration (SSL domain)
    if (sipConfig.sip_server === 'pbx.echodesk.ge') {
      // VitalPBX with SSL uses standard HTTPS port with /ws path
      return `wss://pbx.echodesk.ge:8089/ws`;
    }
    
    // VitalPBX specific configuration (IP address - fallback)
    if (sipConfig.sip_server === '165.227.166.42') {
      // VitalPBX uses /ws path on WebSocket port
      return `wss://165.227.166.42:8089/ws`;
    }
    
    // Default WebSocket path for different servers
    let wsPath = '';
    let port = sipConfig.sip_port;
    const server = sipConfig.sip_server.toLowerCase();
    
    if (server.includes('vitalpbx') || server.includes('echodesk.ge')) {
      wsPath = '/ws';
      port = port || (isSecure ? 8089 : 8088);
    } else if (server.includes('asterisk') || server.includes('freepbx') || server.includes('issabel')) {
      wsPath = '/ws';
      port = port || (isSecure ? 8089 : 8088);
    } else if (server.includes('freeswitch')) {
      wsPath = '/';
      port = port || (isSecure ? 7443 : 5066);
    } else if (server.includes('opensips') || server.includes('kamailio')) {
      wsPath = '/ws';
      port = port || (isSecure ? 443 : 80);
    } else if (server.includes('3cx')) {
      wsPath = '/webclient';
      port = port || (isSecure ? 5001 : 5000);
    } else {
      // Default path for unknown WebRTC servers
      wsPath = '/ws';
      port = port || (isSecure ? 8089 : 8088);
    }
    
    return `${wsProtocol}://${sipConfig.sip_server}:${port}${wsPath}`;
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
      
      console.log('🔍 SIP Provider Analysis:', {
        server: sipConfig.sip_server,
        isTraditional: isTraditionalProvider,
        isWebRtcCompatible: isWebRtcCompatible
      });
      
      if (isTraditionalProvider && !isWebRtcCompatible) {
        const errorMessage = `WebRTC Compatibility Issue: The SIP provider "${sipConfig.sip_server}" appears to be a traditional SIP server that only supports UDP/TCP protocols. Browser-based calling requires WebSocket (WSS) transport. 

Solutions:
1. Contact your SIP provider about WebRTC/WebSocket support
2. Use a WebRTC gateway (FreeSWITCH, Asterisk) to bridge the connection
3. Switch to a WebRTC-native provider (Twilio, Vonage, Janus)
4. Set up an Asterisk/FreeSWITCH server with WebRTC support as a proxy

Traditional SIP providers work with desktop softphones (like Zoiper) but not web browsers due to security restrictions.`;
        
        console.error('❌ SIP Provider Compatibility Issue:', errorMessage);
        throw new Error(errorMessage);
      }

      // Get the appropriate WebSocket URL for this provider
      const sipServerUri = this.getWebSocketUrl(sipConfig);
      
      console.log('🌐 WebSocket Configuration:', {
        originalServer: sipConfig.sip_server,
        originalPort: sipConfig.sip_port,
        websocketUrl: sipServerUri,
        protocol: window.location.protocol
      });
      
      const sipUri = new URI('sip', sipConfig.username, sipConfig.realm || sipConfig.sip_server);
      
      console.log('🔧 Initializing SIP with config:', {
        server: sipServerUri,
        username: sipConfig.username,
        realm: sipConfig.realm,
        provider: sipConfig.sip_server,
        isWebRtcCompatible: this.isWebRtcCompatibleProvider(sipConfig.sip_server)
      });

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
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            },
            video: false
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
      
      console.log('📞 Making call to:', {
        original: phoneNumber,
        cleaned: cleanNumber,
        uri: targetUri.toString(),
        realm: realm
      });

      // Request user media first to ensure audio is available
      console.log('🎤 Requesting user media...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: false
      });

      console.log('✅ User media obtained:', stream.getAudioTracks().length, 'audio tracks');

      // Create inviter with enhanced options
      this.currentSession = new Inviter(this.userAgent, targetUri, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000
            },
            video: false
          }
        }
      });

      // Handle session state changes with more detailed logging
      this.currentSession.stateChange.addListener((state: SessionState) => {
        console.log('📞 Call state changed:', state, 'at', new Date().toISOString());
        
        switch (state) {
          case SessionState.Initial:
            console.log('📞 Call initialized');
            break;
          case SessionState.Establishing:
            console.log('📞 Call establishing...');
            this.emit('onCallProgress');
            // Start setting up audio early
            setTimeout(() => this.setupAudioStreams(), 1000);
            break;
          case SessionState.Established:
            console.log('✅ Call established - setting up audio');
            this.emit('onCallAccepted');
            this.setupAudioStreams();
            break;
          case SessionState.Terminating:
            console.log('📞 Call terminating...');
            break;
          case SessionState.Terminated:
            console.log('📞 Call terminated');
            this.emit('onCallEnded');
            this.currentSession = null;
            break;
        }
      });

      // Send the invite with enhanced error handling
      console.log('📤 Sending call invitation...');
      await this.currentSession.invite({
        requestDelegate: {
          onAccept: (response) => {
            console.log('✅ Call accepted:', response.message.statusCode);
          },
          onProgress: (response) => {
            console.log('📞 Call progress:', response.message.statusCode, response.message.reasonPhrase);
          },
          onRedirect: (response) => {
            console.log('🔄 Call redirected:', response.message.statusCode);
          },
          onReject: (response) => {
            console.log('❌ Call rejected with status:', response.message.statusCode, response.message.reasonPhrase);
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
              default:
                errorMessage = `Call failed (${response.message.statusCode}: ${response.message.reasonPhrase})`;
            }
            
            this.emit('onCallFailed', errorMessage);
            this.currentSession = null;
          },
          onTrying: (response) => {
            console.log('📞 Call trying:', response.message.statusCode);
          }
        }
      });
      
      console.log('✅ Call invitation sent successfully');

    } catch (error) {
      console.error('❌ Failed to make call:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown call error';
      
      // Specific error handling for common WebRTC issues
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          this.emit('onCallFailed', 'Microphone access denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          this.emit('onCallFailed', 'No microphone found. Please connect a microphone and try again.');
        } else if (error.message.includes('getUserMedia')) {
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
      console.warn('⚠️ Cannot setup audio streams - missing session or audio elements');
      return;
    }

    try {
      console.log('🎵 Setting up audio streams...');
      
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

      console.log('🔗 Peer connection state:', peerConnection.connectionState);
      console.log('🔗 ICE connection state:', peerConnection.iceConnectionState);
      console.log('🔗 Signaling state:', peerConnection.signalingState);

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('🎵 Remote audio track received:', event.track.kind, event.track.id);
        const [remoteStream] = event.streams;
        if (this.remoteAudioElement && remoteStream) {
          console.log('🎵 Setting remote audio source');
          this.remoteAudioElement.srcObject = remoteStream;
          
          // Ensure audio element properties are set correctly
          this.remoteAudioElement.autoplay = true;
          this.remoteAudioElement.controls = false;
          this.remoteAudioElement.muted = false;
          
          this.remoteAudioElement.play().then(() => {
            console.log('✅ Remote audio playing');
          }).catch(e => {
            console.warn('❌ Failed to play remote audio:', e);
            // Try to play again after user interaction
            setTimeout(() => {
              this.remoteAudioElement?.play().catch(console.warn);
            }, 1000);
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state changed:', peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
          console.log('✅ Peer connection established');
          // Verify audio streams
          this.verifyAudioStreams(peerConnection);
        } else if (peerConnection.connectionState === 'failed') {
          console.error('❌ Peer connection failed');
          this.emit('onCallFailed', 'Connection failed');
        }
      };

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', peerConnection.iceConnectionState);
        
        if (peerConnection.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed');
          this.emit('onCallFailed', 'Network connection failed');
        }
      };

      // Get local stream
      const senders = peerConnection.getSenders();
      const audioSender = senders.find(sender => 
        sender.track && sender.track.kind === 'audio'
      );

      if (audioSender && audioSender.track && this.localAudioElement) {
        console.log('🎵 Setting up local audio stream');
        const localStream = new MediaStream([audioSender.track]);
        this.localAudioElement.srcObject = localStream;
        // Note: Local audio should be muted to prevent feedback
        this.localAudioElement.muted = true;
        this.localAudioElement.autoplay = true;
      }

      // Check if we already have tracks
      const receivers = peerConnection.getReceivers();
      console.log('📡 Existing receivers:', receivers.length);
      
      receivers.forEach((receiver, index) => {
        if (receiver.track && receiver.track.kind === 'audio') {
          console.log(`🎵 Found existing audio track ${index}:`, receiver.track.id);
          const stream = new MediaStream([receiver.track]);
          if (this.remoteAudioElement) {
            this.remoteAudioElement.srcObject = stream;
            this.remoteAudioElement.play().catch(console.warn);
          }
        }
      });

    } catch (error) {
      console.error('❌ Failed to setup audio streams:', error);
    }
  }

  // Verify audio streams are working
  private verifyAudioStreams(peerConnection: RTCPeerConnection) {
    console.log('🔍 Verifying audio streams...');
    
    const senders = peerConnection.getSenders();
    const receivers = peerConnection.getReceivers();
    
    console.log('📤 Senders:', senders.length);
    senders.forEach((sender, index) => {
      const track = sender.track;
      if (track) {
        console.log(`  Sender ${index}: ${track.kind} track, enabled: ${track.enabled}, muted: ${track.muted}`);
      }
    });
    
    console.log('📥 Receivers:', receivers.length);
    receivers.forEach((receiver, index) => {
      const track = receiver.track;
      if (track) {
        console.log(`  Receiver ${index}: ${track.kind} track, enabled: ${track.enabled}, muted: ${track.muted}`);
      }
    });

    // Check audio elements
    if (this.localAudioElement && this.localAudioElement.srcObject) {
      const localStream = this.localAudioElement.srcObject as MediaStream;
      console.log('🎤 Local audio tracks:', localStream.getAudioTracks().length);
    }

    if (this.remoteAudioElement && this.remoteAudioElement.srcObject) {
      const remoteStream = this.remoteAudioElement.srcObject as MediaStream;
      console.log('🔊 Remote audio tracks:', remoteStream.getAudioTracks().length);
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
