/**
 * Local-stack settings for the e2e-local suite. Everything is overridable by
 * environment variables; nothing here points at production.
 */
import os from "node:os";
import path from "node:path";

const HOME = os.homedir();

export const WEB_PORT = process.env.TICKETS_WEB_PORT || "3110";
export const API_PORT = process.env.TICKETS_API_PORT || "8010";
export const TENANT = process.env.E2E_TENANT || "demo";
export const APP = process.env.E2E_WEB_URL || `http://localhost:${WEB_PORT}`;
/** The tenant API host the web app calls: <tenant>.api.lvh.me:<port>. */
export const API_HOST = `${TENANT}.api.lvh.me:${API_PORT}`;
export const API_ORIGIN = `http://${API_HOST}`;

export const LOCALDEV = process.env.E2E_LOCALDEV_DIR || path.join(HOME, "Echodesk/.wt/front-tickets-shots/localdev");
export const TOKENS_FILE = process.env.TOKENS_FILE || path.join(LOCALDEV, "tokens.json");
export const E2E_IDS_FILE = process.env.E2E_IDS_FILE || path.join(LOCALDEV, "e2e-ids.json");
export const BACKEND_DIR = process.env.E2E_BACKEND_DIR || path.join(HOME, "Echodesk/.wt/back-tickets");

export const E2E_RESET_CMD =
  process.env.E2E_RESET_CMD ||
  `cd "${BACKEND_DIR}" && source "${path.join(LOCALDEV, "devenv.sh")}" && ` +
    `python3 manage.py prepare_tickets_e2e --schema ${TENANT} --reset --json "${E2E_IDS_FILE}"`;

/** Requests the browser may make; everything else is aborted. */
export const ALLOWED_REQUEST = new RegExp(
  `^(https?:\\/\\/(localhost:${WEB_PORT}|127\\.0\\.0\\.1:${WEB_PORT}|[a-z0-9.-]*lvh\\.me:${API_PORT})\\/` +
    `|wss?:\\/\\/[a-z0-9.-]*lvh\\.me:${API_PORT}\\/|wss?:\\/\\/localhost:${WEB_PORT}\\/|data:|blob:|about:)`,
);

export function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "lvh.me" || hostname.endsWith(".lvh.me");
}
