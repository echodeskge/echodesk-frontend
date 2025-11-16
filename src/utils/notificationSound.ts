/**
 * Notification sound utility
 * Plays notification sounds with volume control
 */

class NotificationSoundManager {
  private audio: HTMLAudioElement | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5; // Default volume 50%

  constructor() {
    if (typeof window !== 'undefined') {
      // Load settings from localStorage
      const settings = this.loadSettings();
      this.enabled = settings.enabled;
      this.volume = settings.volume;

      // Pre-create audio element for faster playback
      this.createAudioElement();
    }
  }

  private createAudioElement() {
    try {
      // Use a simple notification sound data URL (short beep)
      // This is a base64 encoded short notification sound
      const soundDataUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltvy0YMzBSN7x/DdlUELEFu06+yoVxILR6Df8rxrIgU2jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELElqy6+yoVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELE1uy6+2pVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELE1uy6+2pVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELE1uy6+2pVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELE1uy6+2pVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELE1uy6+2pVxILSKDe8r1sIgU3jdXy04MzBSF5x/DdlUELE1uy6+2pVxILSKDe8r1sIgU=';

      this.audio = new Audio(soundDataUrl);
      this.audio.volume = this.volume;
      this.audio.preload = 'auto';
    } catch (error) {
      console.error('[NotificationSound] Failed to create audio element:', error);
    }
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
   * Play notification sound
   */
  public play(): void {
    if (!this.enabled || !this.audio) {
      return;
    }

    try {
      // Reset audio to beginning
      this.audio.currentTime = 0;

      // Play sound (returns a promise)
      const playPromise = this.audio.play();

      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Auto-play was prevented - this is common in browsers
        });
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
    if (this.audio) {
      this.audio.volume = this.volume;
    }
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
