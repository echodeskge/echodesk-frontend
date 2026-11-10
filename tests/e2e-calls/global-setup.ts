/**
 * Refuses to run unless every end of the stack is local and up:
 * the API origin must be an lvh.me/localhost host and answer with the admin
 * token, the web app must respond, and Asterisk must accept a TCP connection
 * on its websocket port. Aborts the whole run otherwise (not for `--list`).
 */
import http from "node:http";
import net from "node:net";
import { API_HOST, API_ORIGIN, API_PORT, APP, ASTERISK_WS_PORT, isLocalHost } from "./fixtures/env";
import { tokenFor } from "./fixtures/session";

function probe(options: http.RequestOptions, timeout = 10_000): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.request({ timeout, ...options }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode ?? 0));
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

function tcpOpen(port: number, timeout = 5_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.setTimeout(timeout);
    socket.once("connect", () => {
      socket.destroy();
      resolve();
    });
    socket.once("timeout", () => socket.destroy(new Error("timeout")));
    socket.once("error", reject);
  });
}

export default async function globalSetup() {
  const api = new URL(API_ORIGIN);
  const web = new URL(APP);
  if (!isLocalHost(api.hostname) || !isLocalHost(web.hostname)) {
    throw new Error(`e2e-calls refuses non-local targets: API ${API_ORIGIN}, web ${APP}`);
  }

  let apiStatus: number;
  try {
    apiStatus = await probe({
      host: "127.0.0.1",
      port: Number(API_PORT),
      path: "/api/auth/profile/",
      headers: { Host: API_HOST, Authorization: `Token ${tokenFor("admin")}` },
    });
  } catch (e) {
    throw new Error(`Local API ${API_ORIGIN} is not reachable (${(e as Error).message}). Start $E2E/localdev/backend.sh.`);
  }
  if (apiStatus !== 200) {
    throw new Error(`Local API ${API_ORIGIN} answered ${apiStatus} for the admin profile. Re-mint tokens (mint-tokens.sh).`);
  }

  try {
    // `next dev` compiles a route on first hit, which can take well over 10s.
    const webStatus = await probe({ host: web.hostname, port: Number(web.port || 80), path: "/", method: "GET" }, 120_000);
    if (webStatus >= 500) throw new Error(`HTTP ${webStatus}`);
  } catch (e) {
    throw new Error(`Local web app ${APP} is not reachable (${(e as Error).message}). Start $E2E/localdev/frontend.sh.`);
  }

  try {
    await tcpOpen(Number(ASTERISK_WS_PORT));
  } catch (e) {
    throw new Error(
      `Local Asterisk websocket :${ASTERISK_WS_PORT} is not reachable (${(e as Error).message}). ` +
        `Run docker compose up -d in $E2E/asterisk.`,
    );
  }
}
