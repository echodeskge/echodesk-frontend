/** Minimal browser-like WebSocket double shared by the FE-02 tests. */
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];
  static get last(): MockWebSocket | undefined {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }
  static reset() {
    MockWebSocket.instances = [];
  }

  url: string;
  readyState = MockWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: ((e: unknown) => void) | null = null;
  onclose: ((e: { code: number; reason?: string }) => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close(code = 1000, reason = "") {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }
  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({});
  }
  frame(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  serverClose(code: number) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code });
  }
  sentFrames(): Record<string, unknown>[] {
    return this.sent.map((s) => JSON.parse(s));
  }
}

export const TENANT = {
  schema_name: "demo",
  api_url: "http://demo.api.lvh.me:8010",
  tenant_name: "Demo",
};
