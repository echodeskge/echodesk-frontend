/**
 * Notification sound utility
 * Plays different notification sounds using audio files per platform
 */

// Available sound files in /public/notifications/
export const NOTIFICATION_SOUNDS = [
  { value: 'mixkit-bell-notification-933.wav', label: 'Bell' },
  { value: 'mixkit-bubble-pop-up-alert-notification-2357.wav', label: 'Bubble Pop' },
  { value: 'mixkit-confirmation-tone-2867.wav', label: 'Confirmation' },
  { value: 'mixkit-positive-notification-951.wav', label: 'Positive' },
  { value: 'mixkit-magic-notification-ring-2344.wav', label: 'Magic Ring' },
  { value: 'mixkit-happy-bells-notification-937.wav', label: 'Happy Bells' },
  { value: 'mixkit-light-button-2580.wav', label: 'Light Button' },
  { value: 'mixkit-elevator-tone-2863.wav', label: 'Elevator' },
  { value: 'mixkit-doorbell-tone-2864.wav', label: 'Doorbell' },
  { value: 'mixkit-guitar-notification-alert-2320.wav', label: 'Guitar' },
  { value: 'mixkit-dry-pop-up-notification-alert-2356.wav', label: 'Dry Pop' },
  { value: 'mixkit-interface-hint-notification-911.wav', label: 'Interface Hint' },
  { value: 'mixkit-game-notification-wave-alarm-987.wav', label: 'Wave Alarm' },
  { value: 'mixkit-arabian-mystery-harp-notification-2489.wav', label: 'Mystery Harp' },
  { value: 'mixkit-clear-announce-tones-2861.wav', label: 'Clear Announce' },
  { value: 'mixkit-interface-option-select-2573.wav', label: 'Option Select' },
  { value: 'mixkit-software-interface-remove-2576.wav', label: 'Interface Remove' },
  { value: 'mixkit-urgent-simple-tone-loop-2976.wav', label: 'Urgent Tone' },
  { value: 'mixkit-gaming-lock-2848.wav', label: 'Gaming Lock' },
  { value: 'mixkit-melodical-flute-music-notification-2310.wav', label: 'Melodical Flute' },
  { value: 'mixkit-software-interface-back-2575.wav', label: 'Interface Back' },
  { value: 'mixkit-sci-fi-confirmation-914.wav', label: 'Sci-Fi Confirm' },
  { value: 'mixkit-software-interface-start-2574.wav', label: 'Interface Start' },
  { value: 'mixkit-sci-fi-click-900.wav', label: 'Sci-Fi Click' },
  { value: 'mixkit-long-pop-2358.wav', label: 'Long Pop' },
  { value: 'mixkit-correct-answer-tone-2870.wav', label: 'Correct Answer' },
  { value: 'mixkit-correct-answer-reward-952.wav', label: 'Answer Reward' },
  { value: 'mixkit-sci-fi-reject-notification-896.wav', label: 'Sci-Fi Reject' },
] as const;

export type NotificationPlatform = 'facebook' | 'instagram' | 'whatsapp' | 'email' | 'team_chat' | 'system';

// Legacy type for backwards compatibility
export type SoundType = 'message' | 'teamChat' | 'notification';

// Default sounds per platform
const DEFAULT_SOUNDS: Record<NotificationPlatform, string> = {
  facebook: 'mixkit-bubble-pop-up-alert-notification-2357.wav',
  instagram: 'mixkit-magic-notification-ring-2344.wav',
  whatsapp: 'mixkit-positive-notification-951.wav',
  email: 'mixkit-bell-notification-933.wav',
  team_chat: 'mixkit-happy-bells-notification-937.wav',
  system: 'mixkit-confirmation-tone-2867.wav',
};

interface NotificationSoundSettings {
  notification_sound_facebook: string;
  notification_sound_instagram: string;
  notification_sound_whatsapp: string;
  notification_sound_email: string;
  notification_sound_team_chat: string;
  notification_sound_system: string;
}

class NotificationSoundManager {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private settings: Record<NotificationPlatform, string> = { ...DEFAULT_SOUNDS };
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    if (typeof window !== 'undefined') {
      // Load local settings from localStorage
      const localSettings = this.loadLocalSettings();
      this.enabled = localSettings.enabled;
      this.volume = localSettings.volume;
    }
  }

  private loadLocalSettings() {
    try {
      const settings = localStorage.getItem('notification_sound_settings');
      if (settings) {
        return JSON.parse(settings);
      }
    } catch (error) {
      console.error('[NotificationSound] Failed to load local settings:', error);
    }
    return { enabled: true, volume: 0.5 };
  }

  private saveLocalSettings() {
    try {
      localStorage.setItem('notification_sound_settings', JSON.stringify({
        enabled: this.enabled,
        volume: this.volume
      }));
    } catch (error) {
      console.error('[NotificationSound] Failed to save local settings:', error);
    }
  }

  /**
   * Update sound settings from backend
   */
  public updateSettings(settings: NotificationSoundSettings) {
    this.settings = {
      facebook: settings.notification_sound_facebook || DEFAULT_SOUNDS.facebook,
      instagram: settings.notification_sound_instagram || DEFAULT_SOUNDS.instagram,
      whatsapp: settings.notification_sound_whatsapp || DEFAULT_SOUNDS.whatsapp,
      email: settings.notification_sound_email || DEFAULT_SOUNDS.email,
      team_chat: settings.notification_sound_team_chat || DEFAULT_SOUNDS.team_chat,
      system: settings.notification_sound_system || DEFAULT_SOUNDS.system,
    };
  }

  /**
   * Get audio element for a sound file, with caching
   */
  private getAudio(soundFile: string): HTMLAudioElement {
    if (!this.audioCache.has(soundFile)) {
      const audio = new Audio(`/notifications/${soundFile}`);
      audio.volume = this.volume;
      this.audioCache.set(soundFile, audio);
    }
    const audio = this.audioCache.get(soundFile)!;
    audio.volume = this.volume;
    return audio;
  }

  /**
   * Play notification sound for a specific platform
   */
  public playForPlatform(platform: NotificationPlatform): void {
    if (!this.enabled) return;
    if (typeof window === 'undefined') return;

    const soundFile = this.settings[platform];
    if (!soundFile) return;

    try {
      const audio = this.getAudio(soundFile);
      audio.currentTime = 0;
      audio.play().catch((error) => {
        console.error('[NotificationSound] Failed to play sound:', error);
      });
    } catch (error) {
      console.error('[NotificationSound] Failed to play sound:', error);
    }
  }

  /**
   * Play notification sound (legacy method for backwards compatibility)
   * Maps old sound types to new platform types
   */
  public play(type: SoundType = 'notification'): void {
    // Map legacy types to new platform types
    const platformMap: Record<SoundType, NotificationPlatform> = {
      message: 'email', // External messages default to email sound
      teamChat: 'team_chat',
      notification: 'system',
    };
    this.playForPlatform(platformMap[type]);
  }

  /**
   * Preview a specific sound file (for settings UI)
   */
  public preview(soundFile: string): void {
    if (typeof window === 'undefined') return;

    try {
      const audio = this.getAudio(soundFile);
      audio.currentTime = 0;
      audio.play().catch((error) => {
        console.error('[NotificationSound] Failed to preview sound:', error);
      });
    } catch (error) {
      console.error('[NotificationSound] Failed to preview sound:', error);
    }
  }

  /**
   * Enable notification sounds
   */
  public enable(): void {
    this.enabled = true;
    this.saveLocalSettings();
  }

  /**
   * Disable notification sounds
   */
  public disable(): void {
    this.enabled = false;
    this.saveLocalSettings();
  }

  /**
   * Toggle notification sounds
   */
  public toggle(): boolean {
    this.enabled = !this.enabled;
    this.saveLocalSettings();
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
    // Update volume on all cached audio elements
    this.audioCache.forEach((audio) => {
      audio.volume = this.volume;
    });
    this.saveLocalSettings();
  }

  /**
   * Get current volume
   */
  public getVolume(): number {
    return this.volume;
  }

  /**
   * Get current sound file for a platform
   */
  public getSoundForPlatform(platform: NotificationPlatform): string {
    return this.settings[platform];
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

// Also export the manager class for typing
export { NotificationSoundManager };
