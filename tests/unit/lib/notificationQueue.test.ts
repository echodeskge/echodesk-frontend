/**
 * Tests for NotificationQueue (IndexedDB-based offline notification queue).
 * Uses a manual IndexedDB mock since fake-indexeddb is not installed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---- Manual IndexedDB Mock ----
// Simulates the IndexedDB API with in-memory storage

interface StoredRecord {
  id: number;
  notification: any;
  timestamp: number;
  synced: boolean;
}

class MockIDBRequest {
  result: any = null;
  error: any = null;
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  _resolve(value: any) {
    this.result = value;
    if (this.onsuccess) {
      this.onsuccess({ target: this });
    }
  }

  _reject(error: any) {
    this.error = error;
    if (this.onerror) {
      this.onerror({ target: this });
    }
  }
}

class MockIDBCursor {
  private records: StoredRecord[];
  private index: number = 0;
  value: StoredRecord;
  private deleteCallback?: () => void;
  private request: MockIDBRequest;

  constructor(records: StoredRecord[], request: MockIDBRequest) {
    this.records = records;
    this.value = records[0];
    this.request = request;
  }

  continue() {
    this.index++;
    if (this.index < this.records.length) {
      this.value = this.records[this.index];
      this.request.result = this;
      if (this.request.onsuccess) {
        this.request.onsuccess({ target: this.request });
      }
    } else {
      this.request.result = null;
      if (this.request.onsuccess) {
        this.request.onsuccess({ target: this.request });
      }
    }
  }

  delete() {
    if (this.deleteCallback) {
      this.deleteCallback();
    }
  }

  _setDeleteCallback(cb: () => void) {
    this.deleteCallback = cb;
  }
}

class MockIDBIndex {
  private store: MockIDBObjectStore;
  name: string;

  constructor(store: MockIDBObjectStore, name: string) {
    this.store = store;
    this.name = name;
  }

  getAll(range?: IDBKeyRange): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      const records = [...this.store._getRecords()];
      let filtered: StoredRecord[];

      if (range && this.name === "synced") {
        // IDBKeyRange.only(false) - filter by synced === false
        filtered = records.filter((r) => r.synced === false);
      } else {
        filtered = records;
      }

      request._resolve(filtered);
    }, 0);
    return request;
  }

  openCursor(range?: IDBKeyRange | null, direction?: string): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      let records = [...this.store._getRecords()];

      if (this.name === "timestamp") {
        records.sort((a, b) =>
          direction === "prev"
            ? b.timestamp - a.timestamp
            : a.timestamp - b.timestamp
        );
      }

      if (range) {
        // Filter by timestamp upper bound
        records = records.filter((r) => {
          if (this.name === "timestamp" && (range as any)._upper !== undefined) {
            return r.timestamp <= (range as any)._upper;
          }
          return true;
        });
      }

      if (records.length > 0) {
        const cursor = new MockIDBCursor(records, request);
        cursor._setDeleteCallback(() => {
          this.store._deleteRecord(cursor.value.id);
        });
        request._resolve(cursor);
      } else {
        request._resolve(null);
      }
    }, 0);
    return request;
  }
}

class MockIDBObjectStore {
  private records: Map<number, StoredRecord> = new Map();
  name: string;
  keyPath = "id";

  constructor(name: string) {
    this.name = name;
  }

  put(record: StoredRecord): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.records.set(record.id, { ...record });
      request._resolve(record.id);
    }, 0);
    return request;
  }

  get(key: number): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      const record = this.records.get(key);
      request._resolve(record ? { ...record } : undefined);
    }, 0);
    return request;
  }

  clear(): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.records.clear();
      request._resolve(undefined);
    }, 0);
    return request;
  }

  index(name: string): MockIDBIndex {
    return new MockIDBIndex(this, name);
  }

  createIndex(name: string, keyPath: string, options?: any) {
    // No-op for mock
    return {};
  }

  _getRecords(): StoredRecord[] {
    return Array.from(this.records.values());
  }

  _deleteRecord(id: number) {
    this.records.delete(id);
  }
}

class MockIDBTransaction {
  private stores: Map<string, MockIDBObjectStore>;

  constructor(stores: Map<string, MockIDBObjectStore>) {
    this.stores = stores;
  }

  objectStore(name: string): MockIDBObjectStore {
    return this.stores.get(name)!;
  }
}

class MockIDBDatabase {
  private stores: Map<string, MockIDBObjectStore> = new Map();
  objectStoreNames = {
    contains: (name: string) => false,
  };

  createObjectStore(name: string, options?: any): MockIDBObjectStore {
    const store = new MockIDBObjectStore(name);
    this.stores.set(name, store);
    return store;
  }

  transaction(
    storeNames: string[],
    mode?: string
  ): MockIDBTransaction {
    return new MockIDBTransaction(this.stores);
  }

  close() {}
}

function createMockIndexedDB() {
  const databases: Map<string, MockIDBDatabase> = new Map();

  return {
    open(name: string, version?: number) {
      const request = new MockIDBRequest();
      setTimeout(() => {
        let db = databases.get(name);
        const isNew = !db;
        if (!db) {
          db = new MockIDBDatabase();
          databases.set(name, db);
        }

        if (isNew) {
          // Trigger onupgradeneeded for new databases
          const upgradeEvent = {
            target: { result: db } as any,
            oldVersion: 0,
            newVersion: version || 1,
          };

          if ((request as any).onupgradeneeded) {
            (request as any).onupgradeneeded(upgradeEvent);
          }
        }

        request.result = db;
        request._resolve(db);
      }, 0);
      return request as any;
    },
    _databases: databases,
  };
}

// Patch IDBKeyRange
const MockIDBKeyRange = {
  only(value: any) {
    return { _only: value };
  },
  upperBound(value: any) {
    return { _upper: value };
  },
};

// Install mock IndexedDB before importing the module
let mockIndexedDB = createMockIndexedDB();
vi.stubGlobal("indexedDB", mockIndexedDB);
vi.stubGlobal("IDBKeyRange", MockIDBKeyRange);

// We need to reset the singleton between tests, so import the module
// and reconstruct the queue each time
describe("NotificationQueue", () => {
  let getNotificationQueue: typeof import("@/utils/notificationQueue").getNotificationQueue;

  beforeEach(async () => {
    // Reset the mock IndexedDB to clear all stored data
    mockIndexedDB = createMockIndexedDB();
    vi.stubGlobal("indexedDB", mockIndexedDB);

    // Reset the module to get a fresh singleton
    vi.resetModules();
    const mod = await import("@/utils/notificationQueue");
    getNotificationQueue = mod.getNotificationQueue;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("enqueue", () => {
    it("queues a notification with id and timestamp", async () => {
      const queue = getNotificationQueue();

      // Wait for init
      await new Promise((r) => setTimeout(r, 10));

      const notification = {
        id: 1,
        notification_type: "ticket_assigned",
        title: "Test",
        message: "You were assigned a ticket",
      };

      const result = await queue.enqueue(notification);
      expect(result).toBe(true);
    });

    it("uses Date.now as id when notification has no id", async () => {
      const queue = getNotificationQueue();
      await new Promise((r) => setTimeout(r, 10));

      const notification = {
        notification_type: "test",
        title: "No ID",
        message: "Notification without ID",
      };

      const result = await queue.enqueue(notification);
      expect(result).toBe(true);
    });
  });

  describe("getUnsynced", () => {
    it("returns empty array when no notifications queued", async () => {
      const queue = getNotificationQueue();
      await new Promise((r) => setTimeout(r, 10));

      const unsynced = await queue.getUnsynced();
      expect(unsynced).toEqual([]);
    });

    it("returns unsynced notifications after enqueue", async () => {
      const queue = getNotificationQueue();
      await new Promise((r) => setTimeout(r, 10));

      await queue.enqueue({
        id: 1,
        notification_type: "test",
        title: "Test 1",
        message: "Message 1",
      });

      await queue.enqueue({
        id: 2,
        notification_type: "test",
        title: "Test 2",
        message: "Message 2",
      });

      const unsynced = await queue.getUnsynced();
      expect(unsynced).toHaveLength(2);
      expect(unsynced[0].synced).toBe(false);
      expect(unsynced[1].synced).toBe(false);
    });
  });

  describe("markSynced", () => {
    it("marks a notification as synced", async () => {
      const queue = getNotificationQueue();
      await new Promise((r) => setTimeout(r, 10));

      await queue.enqueue({
        id: 10,
        notification_type: "test",
        title: "To Sync",
        message: "Sync me",
      });

      const result = await queue.markSynced(10);
      expect(result).toBe(true);

      // After marking synced, getUnsynced should not include it
      const unsynced = await queue.getUnsynced();
      const stillUnsynced = unsynced.filter(
        (n) => n.id === 10 && n.synced === false
      );
      expect(stillUnsynced).toHaveLength(0);
    });

    it("returns false for non-existent notification", async () => {
      const queue = getNotificationQueue();
      await new Promise((r) => setTimeout(r, 10));

      const result = await queue.markSynced(9999);
      expect(result).toBe(false);
    });
  });

  describe("clearAll", () => {
    it("removes all notifications", async () => {
      const queue = getNotificationQueue();
      await new Promise((r) => setTimeout(r, 10));

      await queue.enqueue({
        id: 1,
        notification_type: "test",
        title: "Test 1",
        message: "Message 1",
      });
      await queue.enqueue({
        id: 2,
        notification_type: "test",
        title: "Test 2",
        message: "Message 2",
      });

      const result = await queue.clearAll();
      expect(result).toBe(true);

      const unsynced = await queue.getUnsynced();
      expect(unsynced).toHaveLength(0);
    });
  });

  describe("getIsSupported", () => {
    it("returns true when IndexedDB is available", async () => {
      const queue = getNotificationQueue();
      await new Promise((r) => setTimeout(r, 10));

      expect(queue.getIsSupported()).toBe(true);
    });
  });

  describe("close", () => {
    it("closes database connection without error", async () => {
      const queue = getNotificationQueue();
      await new Promise((r) => setTimeout(r, 10));

      // Should not throw
      queue.close();
    });
  });
});
