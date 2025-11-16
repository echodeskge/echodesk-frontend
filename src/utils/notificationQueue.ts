/**
 * IndexedDB-based offline notification queue
 *
 * Stores notifications when offline and syncs them when connection is restored.
 * Also provides persistence for notification history.
 */

interface QueuedNotification {
  id: number;
  notification: any;
  timestamp: number;
  synced: boolean;
}

const DB_NAME = 'echodesk_notifications';
const DB_VERSION = 1;
const STORE_NAME = 'notification_queue';

class NotificationQueue {
  private db: IDBDatabase | null = null;
  private isSupported: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Check if IndexedDB is supported
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.isSupported = true;
      this.initPromise = this.init();
    } else {
      console.warn('[NotificationQueue] IndexedDB not supported');
    }
  }

  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('[NotificationQueue] Failed to open database:', request.error);
          this.isSupported = false;
          reject(request.error);
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Create object store if it doesn't exist
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const objectStore = db.createObjectStore(STORE_NAME, {
              keyPath: 'id',
              autoIncrement: false
            });

            // Create indexes
            objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            objectStore.createIndex('synced', 'synced', { unique: false });
          }
        };
      } catch (error) {
        console.error('[NotificationQueue] Initialization error:', error);
        this.isSupported = false;
        reject(error);
      }
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInit(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    if (this.initPromise) {
      try {
        await this.initPromise;
        return true;
      } catch (error) {
        console.error('[NotificationQueue] Failed to initialize:', error);
        return false;
      }
    }

    return !!this.db;
  }

  /**
   * Add a notification to the queue
   */
  public async enqueue(notification: any): Promise<boolean> {
    if (!(await this.ensureInit())) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const queuedNotification: QueuedNotification = {
          id: notification.id || Date.now(),
          notification,
          timestamp: Date.now(),
          synced: false
        };

        const request = store.put(queuedNotification);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error('[NotificationQueue] Failed to queue notification:', request.error);
          resolve(false);
        };
      } catch (error) {
        console.error('[NotificationQueue] Enqueue error:', error);
        resolve(false);
      }
    });
  }

  /**
   * Get all unsynced notifications
   */
  public async getUnsynced(): Promise<QueuedNotification[]> {
    if (!(await this.ensureInit())) {
      return [];
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('synced');
        const request = index.getAll(IDBKeyRange.only(false));

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.error('[NotificationQueue] Failed to get unsynced:', request.error);
          resolve([]);
        };
      } catch (error) {
        console.error('[NotificationQueue] Get unsynced error:', error);
        resolve([]);
      }
    });
  }

  /**
   * Mark a notification as synced
   */
  public async markSynced(id: number): Promise<boolean> {
    if (!(await this.ensureInit())) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          const notification = request.result;
          if (notification) {
            notification.synced = true;
            const updateRequest = store.put(notification);

            updateRequest.onsuccess = () => {
              resolve(true);
            };

            updateRequest.onerror = () => {
              console.error('[NotificationQueue] Failed to mark as synced:', updateRequest.error);
              resolve(false);
            };
          } else {
            resolve(false);
          }
        };

        request.onerror = () => {
          console.error('[NotificationQueue] Failed to get notification:', request.error);
          resolve(false);
        };
      } catch (error) {
        console.error('[NotificationQueue] Mark synced error:', error);
        resolve(false);
      }
    });
  }

  /**
   * Get all notifications (for history)
   */
  public async getAll(limit: number = 100): Promise<QueuedNotification[]> {
    if (!(await this.ensureInit())) {
      return [];
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev'); // Most recent first

        const results: QueuedNotification[] = [];

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;

          if (cursor && results.length < limit) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };

        request.onerror = () => {
          console.error('[NotificationQueue] Failed to get all:', request.error);
          resolve([]);
        };
      } catch (error) {
        console.error('[NotificationQueue] Get all error:', error);
        resolve([]);
      }
    });
  }

  /**
   * Clear old synced notifications (older than X days)
   */
  public async clearOld(daysOld: number = 30): Promise<number> {
    if (!(await this.ensureInit())) {
      return 0;
    }

    return new Promise((resolve) => {
      try {
        const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

        let deletedCount = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;

          if (cursor) {
            const notification = cursor.value;

            // Only delete if synced
            if (notification.synced) {
              cursor.delete();
              deletedCount++;
            }

            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };

        request.onerror = () => {
          console.error('[NotificationQueue] Failed to clear old:', request.error);
          resolve(0);
        };
      } catch (error) {
        console.error('[NotificationQueue] Clear old error:', error);
        resolve(0);
      }
    });
  }

  /**
   * Clear all notifications
   */
  public async clearAll(): Promise<boolean> {
    if (!(await this.ensureInit())) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error('[NotificationQueue] Failed to clear all:', request.error);
          resolve(false);
        };
      } catch (error) {
        console.error('[NotificationQueue] Clear all error:', error);
        resolve(false);
      }
    });
  }

  /**
   * Check if IndexedDB is supported
   */
  public getIsSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Close the database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
let queueInstance: NotificationQueue | null = null;

export function getNotificationQueue(): NotificationQueue {
  if (!queueInstance) {
    queueInstance = new NotificationQueue();
  }
  return queueInstance;
}

export type { QueuedNotification };
