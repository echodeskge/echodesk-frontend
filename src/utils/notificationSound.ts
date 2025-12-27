/**
 * Notification sound utility
 * Plays different notification sounds using Web Audio API
 */

export type SoundType = 'message' | 'teamChat' | 'notification';

class NotificationSoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5; // Default volume 50%

  constructor() {
    if (typeof window !== 'undefined') {
      // Load settings from localStorage
      const settings = this.loadSettings();
      this.enabled = settings.enabled;
      this.volume = settings.volume;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.error('[NotificationSound] Failed to create AudioContext:', error);
        return null;
      }
    }
    return this.audioContext;
  }

  private loadSettings() {
    try {
      const settings = localStorage.getItem('notification_sound_settings');
      if (settings) {
        return JSON.parse(settings);
      }
    } catch (error) {
      console.error('[NotificationSound] Failed to load settings:', error);
    }

    return {
      enabled: true,
      volume: 0.5
    };
  }

  private saveSettings() {
    try {
      localStorage.setItem('notification_sound_settings', JSON.stringify({
        enabled: this.enabled,
        volume: this.volume
      }));
    } catch (error) {
      console.error('[NotificationSound] Failed to save settings:', error);
    }
  }

  /**
   * Play notification sound for external messages (emails, social)
   * Two-tone chime (high pitched, professional)
   */
  private playMessageSound(context: AudioContext): void {
    const now = context.currentTime;

    // First tone - higher pitch
    const osc1 = context.createOscillator();
    const gain1 = context.createGain();
    osc1.connect(gain1);
    gain1.connect(context.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.setValueAtTime(1108, now + 0.08); // C#6
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(this.volume * 0.25, now + 0.015);
    gain1.gain.linearRampToValueAtTime(this.volume * 0.15, now + 0.08);
    gain1.gain.linearRampToValueAtTime(this.volume * 0.2, now + 0.1);
    gain1.gain.linearRampToValueAtTime(0, now + 0.25);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Harmonic overtone
    const osc2 = context.createOscillator();
    const gain2 = context.createGain();
    osc2.connect(gain2);
    gain2.connect(context.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now); // E6
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(this.volume * 0.1, now + 0.015);
    gain2.gain.linearRampToValueAtTime(0, now + 0.2);
    osc2.start(now);
    osc2.stop(now + 0.2);
  }

  /**
   * Play notification sound for team chat (internal messages)
   * Softer, warmer bubble/pop sound
   */
  private playTeamChatSound(context: AudioContext): void {
    const now = context.currentTime;

    // Bubble pop sound - lower, warmer tone
    const osc1 = context.createOscillator();
    const gain1 = context.createGain();
    osc1.connect(gain1);
    gain1.connect(context.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.15); // Slide down to A4
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Soft sub-bass for warmth
    const osc2 = context.createOscillator();
    const gain2 = context.createGain();
    osc2.connect(gain2);
    gain2.connect(context.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(294, now); // D4
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(this.volume * 0.15, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc2.start(now);
    osc2.stop(now + 0.15);
  }

  /**
   * Play notification sound for system notifications (tickets, etc.)
   * Classic notification chime
   */
  private playNotificationSound(context: AudioContext): void {
    const now = context.currentTime;

    // Two-tone notification chime
    const osc1 = context.createOscillator();
    const gain1 = context.createGain();
    osc1.connect(gain1);
    gain1.connect(context.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(830, now); // E5
    osc1.frequency.setValueAtTime(1046, now + 0.1); // C6
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.02);
    gain1.gain.linearRampToValueAtTime(this.volume * 0.2, now + 0.1);
    gain1.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.12);
    gain1.gain.linearRampToValueAtTime(0, now + 0.3);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Higher harmonic
    const osc2 = context.createOscillator();
    const gain2 = context.createGain();
    osc2.connect(gain2);
    gain2.connect(context.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318, now); // E6
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(this.volume * 0.15, now + 0.02);
    gain2.gain.linearRampToValueAtTime(0, now + 0.25);
    osc2.start(now);
    osc2.stop(now + 0.25);
  }

  /**
   * Play notification sound
   * @param type - Type of sound to play: 'message' (emails/social), 'teamChat' (internal), 'notification' (system)
   */
  public play(type: SoundType = 'notification'): void {
    if (!this.enabled) {
      return;
    }

    const context = this.getAudioContext();
    if (!context) return;

    try {
      // Resume context if suspended (browser autoplay policy)
      if (context.state === 'suspended') {
        context.resume();
      }

      switch (type) {
        case 'message':
          this.playMessageSound(context);
          break;
        case 'teamChat':
          this.playTeamChatSound(context);
          break;
        case 'notification':
        default:
          this.playNotificationSound(context);
          break;
      }
    } catch (error) {
      console.error('[NotificationSound] Failed to play sound:', error);
    }
  }

  /**
   * Enable notification sounds
   */
  public enable(): void {
    this.enabled = true;
    this.saveSettings();
  }

  /**
   * Disable notification sounds
   */
  public disable(): void {
    this.enabled = false;
    this.saveSettings();
  }

  /**
   * Toggle notification sounds
   */
  public toggle(): boolean {
    this.enabled = !this.enabled;
    this.saveSettings();
    return this.enabled;
  }

  /**
   * Check if sounds are enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  /**
   * Get current volume
   */
  public getVolume(): number {
    return this.volume;
  }
}

// Export singleton instance
let soundManager: NotificationSoundManager | null = null;

export function getNotificationSound(): NotificationSoundManager {
  if (!soundManager) {
    soundManager = new NotificationSoundManager();
  }
  return soundManager;
}
