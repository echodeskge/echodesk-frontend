/**
 * Local-stack settings for the e2e-calls suite. Adapted from
 * `tests/e2e-local/fixtures/env.ts` (the tickets harness) with the calls
 * stack's ports and the local Asterisk websocket allowed. Everything is
 * overridable by environment variables; nothing here points at production.
 */
import os from "node:os";
import path from "node:path";

const HOME = os.homedir();

export const WEB_PORT = process.env.CALLS_WEB_PORT || "3190";
export const API_PORT = process.env.CALLS_API_PORT || "8020";
/** Asterisk's HTTP/websocket port (`transport-ws`, `http.conf`). */
export const ASTERISK_WS_PORT = process.env.CALLS_ASTERISK_WS_PORT || "8088";
export const TENANT = process.env.E2E_TENANT || "demo";
export const APP = process.env.E2E_WEB_URL || `http://localhost:${WEB_PORT}`;
/** The tenant API host the web app calls: <tenant>.api.lvh.me:<port>. */
export const API_HOST = `${TENANT}.api.lvh.me:${API_PORT}`;
export const API_ORIGIN = `http://${API_HOST}`;

/** `$E2E` in the briefs: the harness root outside the repo. */
export const E2E_DIR = process.env.E2E_DIR || path.join(HOME, "Echodesk/.wt/calls-e2e");
export const LOCALDEV = process.env.E2E_LOCALDEV_DIR || path.join(E2E_DIR, "localdev");
export const TOKENS_FILE = process.env.TOKENS_FILE || path.join(LOCALDEV, "tokens.json");
/** `docker-compose.yml` mounts this at /var/spool/asterisk/recording. */
export const ASTERISK_RECORDINGS_DIR = process.env.E2E_ASTERISK_RECORDINGS_DIR || path.join(E2E_DIR, "asterisk/recordings");
/** `*99` appends the digits it read to this file (BK-05 dialplan). */
export const DTMF_LOG = path.join(ASTERISK_RECORDINGS_DIR, "dtmf.log");

/** Extension owned by each login (seed_local_pbx: admin 101, agent 102, agent2 103). */
export const EXTENSIONS = { admin: "101", agent: "102", agent2: "103" } as const;

/** Dialplan test numbers (BK-05 `extensions.conf`). */
export const NUMBERS = {
  /** Answer, MixMonitor, Playback, hangup handler -> recording webhook. */
  recording: "*100",
  /** `Queue(support)` ringall 101-103. */
  queue: "*200",
  /** `Read(DIGITS,beep,8)` then append to dtmf.log and SayDigits. */
  dtmf: "*99",
} as const;

/** Requests the browser may make; everything else is aborted. */
export const ALLOWED_REQUEST = new RegExp(
  `^(https?:\\/\\/(localhost:${WEB_PORT}|127\\.0\\.0\\.1:${WEB_PORT}|[a-z0-9.-]*lvh\\.me:${API_PORT})\\/` +
    `|wss?:\\/\\/[a-z0-9.-]*lvh\\.me:${API_PORT}\\/|wss?:\\/\\/localhost:${WEB_PORT}\\/` +
    `|ws:\\/\\/localhost:${ASTERISK_WS_PORT}\\/|http:\\/\\/localhost:${ASTERISK_WS_PORT}\\/` +
    `|data:|blob:|about:)`,
);

export function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "lvh.me" || hostname.endsWith(".lvh.me");
}
