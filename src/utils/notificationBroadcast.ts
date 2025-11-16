/**
 * Cross-tab notification synchronization using BroadcastChannel API
 *
 * This allows all open tabs to receive notification updates instantly,
 * even if only one tab has the WebSocket connection active (leader election).
 */

interface NotificationBroadcastMessage {
  type: 'notification_received' | 'notification_read' | 'count_updated' | 'ping' | 'pong' | 'claim_leader' | 'leader_announcement';
  notification?: any;
  notificationId?: number;
  count?: number;
  tabId?: string;
  timestamp?: number;
}

class NotificationBroadcastManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isSupported: boolean = false;
  private tabId: string;
  private isLeader: boolean = false;
  private leaderCheckInterval: NodeJS.Timeout | null = null;
  private lastLeaderPing: number = 0;

  constructor() {
    // Generate unique tab ID
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if BroadcastChannel is supported
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.isSupported = true;
      this.init();
    } else {
      console.warn('[NotificationBroadcast] BroadcastChannel API not supported');
    }
  }

  private init() {
    try {
      this.channel = new BroadcastChannel('echodesk_notifications');

      this.channel.onmessage = (event: MessageEvent<NotificationBroadcastMessage>) => {
        const data = event.data;

        // Handle leader election messages
        if (data.type === 'ping' && data.tabId !== this.tabId) {
          // Another tab is checking for leader - respond if we're the leader
          if (this.isLeader) {
            this.sendMessage({
              type: 'pong',
              tabId: this.tabId,
              timestamp: Date.now()
            });
          }
        } else if (data.type === 'pong' && data.tabId !== this.tabId) {
          // Leader is alive
          this.lastLeaderPing = Date.now();
          this.isLeader = false;
        } else if (data.type === 'claim_leader' && data.tabId !== this.tabId) {
          // Another tab is claiming leadership
          this.isLeader = false;
        } else if (data.type === 'leader_announcement' && data.tabId !== this.tabId) {
          // A tab has announced itself as leader
          this.isLeader = false;
          this.lastLeaderPing = Date.now();
        }

        // Don't process our own messages
        if (data.tabId === this.tabId) {
          return;
        }

        // Notify listeners for this message type
        const listenersForType = this.listeners.get(data.type);
        if (listenersForType) {
          listenersForType.forEach(listener => listener(data));
        }

        // Also notify wildcard listeners
        const wildcardListeners = this.listeners.get('*');
        if (wildcardListeners) {
          wildcardListeners.forEach(listener => listener(data));
        }
      };

      // Start leader election
      this.startLeaderElection();
    } catch (error) {
      console.error('[NotificationBroadcast] Failed to initialize:', error);
      this.isSupported = false;
    }
  }

  private startLeaderElection() {
    // Check for existing leader
    this.checkForLeader();

    // Periodically check if we should become leader
    this.leaderCheckInterval = setInterval(() => {
      this.checkForLeader();
    }, 5000);

    // Clean up on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.isLeader) {
          // Give up leadership before closing
          this.isLeader = false;
        }
        this.cleanup();
      });
    }
  }

  private checkForLeader() {
    const now = Date.now();

    // If we haven't heard from leader in 10 seconds, try to become leader
    if (now - this.lastLeaderPing > 10000 && !this.isLeader) {
      // Ping to see if there's a leader
      this.sendMessage({
        type: 'ping',
        tabId: this.tabId,
        timestamp: now
      });

      // Wait a bit for response
      setTimeout(() => {
        const timeSinceCheck = Date.now() - now;
        // If still no leader after 500ms, claim leadership
        if (Date.now() - this.lastLeaderPing > 10000 && timeSinceCheck >= 500) {
          this.claimLeadership();
        }
      }, 500);
    }
  }

  private claimLeadership() {
    this.isLeader = true;

    this.sendMessage({
      type: 'claim_leader',
      tabId: this.tabId,
      timestamp: Date.now()
    });

    // Announce leadership
    setTimeout(() => {
      this.sendMessage({
        type: 'leader_announcement',
        tabId: this.tabId,
        timestamp: Date.now()
      });
    }, 100);
  }

  /**
   * Check if this tab is the leader (should maintain WebSocket connection)
   */
  public isLeaderTab(): boolean {
    return this.isLeader;
  }

  /**
   * Get this tab's unique ID
   */
  public getTabId(): string {
    return this.tabId;
  }

  /**
   * Send a message to all other tabs
   */
  private sendMessage(data: NotificationBroadcastMessage) {
    if (!this.isSupported || !this.channel) {
      return false;
    }

    try {
      this.channel.postMessage({
        ...data,
        tabId: this.tabId,
        timestamp: data.timestamp || Date.now()
      });
      return true;
    } catch (error) {
      console.error('[NotificationBroadcast] Failed to send message:', error);
      return false;
    }
  }

  /**
   * Broadcast that a new notification was received
   */
  public broadcastNotificationReceived(notification: any, count: number) {
    return this.sendMessage({
      type: 'notification_received',
      notification,
      count
    });
  }

  /**
   * Broadcast that a notification was marked as read
   */
  public broadcastNotificationRead(notificationId: number, count: number) {
    return this.sendMessage({
      type: 'notification_read',
      notificationId,
      count
    });
  }

  /**
   * Broadcast unread count update
   */
  public broadcastCountUpdated(count: number) {
    return this.sendMessage({
      type: 'count_updated',
      count
    });
  }

  /**
   * Subscribe to broadcast messages
   */
  public on(type: string, listener: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(type);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  /**
   * Subscribe to all broadcast messages
   */
  public onAll(listener: (data: any) => void) {
    return this.on('*', listener);
  }

  /**
   * Check if BroadcastChannel is supported
   */
  public getIsSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Clean up resources
   */
  public cleanup() {
    if (this.leaderCheckInterval) {
      clearInterval(this.leaderCheckInterval);
      this.leaderCheckInterval = null;
    }

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    this.listeners.clear();
  }
}

// Export singleton instance
let broadcastManager: NotificationBroadcastManager | null = null;

export function getNotificationBroadcast(): NotificationBroadcastManager {
  if (!broadcastManager) {
    broadcastManager = new NotificationBroadcastManager();
  }
  return broadcastManager;
}

export type { NotificationBroadcastMessage };
