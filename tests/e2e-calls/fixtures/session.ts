/**
 * Session helpers for the e2e-calls suite, adapted from
 * `tests/e2e-local/fixtures/session.ts` (plan FE-16) and
 * `~/Echodesk/.wt/st-shots/int/tools/session.mjs`.
 *
 * - signIn(): puts a locally minted DRF token and the user's profile into
 *   localStorage the way the app's login does, sets the locale cookie, and
 *   aborts every request that isn't the local web app, API or Asterisk.
 * - api(): small typed client for setup and server-side assertions.
 *
 * The token file lives outside the repo (TOKENS_FILE, keys admin/agent/agent2,
 * minted by `$E2E/localdev/mint-tokens.sh`) and is never committed or printed.
 */
import fs from "node:fs";
import http from "node:http";
import type { BrowserContext } from "@playwright/test";
import { ALLOWED_REQUEST, API_HOST, API_PORT, APP, TENANT, TOKENS_FILE } from "./env";

export type Who = "admin" | "agent" | "agent2";
export type Locale = "en" | "ka";

export interface Profile {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
  [key: string]: unknown;
}

function readTokens(): Record<string, string> {
  if (!fs.existsSync(TOKENS_FILE)) {
    throw new Error(`Token file not found: ${TOKENS_FILE}. Run $E2E/localdev/mint-tokens.sh.`);
  }
  return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8"));
}

export function tokenFor(who: Who): string {
  const token = readTokens()[who];
  if (!token) throw new Error(`No token for "${who}" in ${TOKENS_FILE}`);
  return token;
}

/** Request against the local API (127.0.0.1 with the tenant Host header). */
export function api<T = unknown>(method: string, path: string, body?: unknown, who: Who = "admin"): Promise<T> {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const req = http.request(
      {
        host: "127.0.0.1",
        port: Number(API_PORT),
        path,
        method,
        headers: {
          Host: API_HOST,
          Authorization: `Token ${tokenFor(who)}`,
          Accept: "application/json",
          ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
        },
        timeout: 15_000,
      },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          const status = res.statusCode ?? 500;
          if (status >= 400) {
            reject(new Error(`${method} ${path}: HTTP ${status}`));
            return;
          }
          if (!buf) {
            resolve(undefined as T);
            return;
          }
          try {
            resolve(JSON.parse(buf) as T);
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error(`${method} ${path}: timeout`)));
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

export function apiGet<T = unknown>(who: Who, path: string): Promise<T> {
  return api<T>("GET", path, undefined, who);
}

/** Abort anything that isn't the local stack; records what was blocked. */
export async function lockDownNetwork(context: BrowserContext): Promise<string[]> {
  const blocked: string[] = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (ALLOWED_REQUEST.test(url)) return route.continue();
    blocked.push(url);
    return route.abort();
  });
  return blocked;
}

/**
 * The local demo tenant reports `api_url` without the port, so every app
 * socket (notifications, chat) dials :80 and fails. Rewrite it to the local
 * API origin so the notifications socket (call_event) connects.
 */
export async function fixTenantConfig(context: BrowserContext) {
  await context.route("**/api/tenant/config/**", async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    try {
      const json = JSON.parse(body);
      const fix = (o: unknown) => {
        if (!o || typeof o !== "object") return;
        for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
          if (k === "api_url") (o as Record<string, unknown>)[k] = `http://${API_HOST}`;
          else fix(v);
        }
      };
      fix(json);
      body = JSON.stringify(json);
    } catch {
      // not JSON: pass it through unchanged
    }
    await route.fulfill({ response: res, body });
  });
}

export interface SignInOptions {
  theme?: "light" | "dark";
}

export async function signIn(context: BrowserContext, who: Who, locale: Locale = "en", opts: SignInOptions = {}) {
  const user = await apiGet<Profile>(who, "/api/auth/profile/");
  await context.addCookies([{ name: "NEXT_LOCALE", value: locale, url: APP }]);
  const blocked = await lockDownNetwork(context);
  await fixTenantConfig(context);
  await context.addInitScript(
    ([token, profile, tenant, theme]) => {
      localStorage.setItem("dev_tenant", tenant as string);
      localStorage.setItem(
        "echodesk.consent.v1",
        JSON.stringify({ status: "rejected", categories: { analytics: false, marketing: false }, timestamp: Date.now() }),
      );
      localStorage.setItem("echodesk_auth_token", token as string);
      localStorage.setItem("echodesk_user_data", JSON.stringify(profile));
      if (theme) localStorage.setItem("theme-mode", theme as string);
      // Hide the Next.js dev overlay so it never covers a click target.
      const hide = () => {
        const s = document.createElement("style");
        s.textContent = "nextjs-portal{display:none!important}";
        (document.head || document.documentElement).append(s);
      };
      if (document.documentElement) hide();
      else addEventListener("DOMContentLoaded", hide);
    },
    [tokenFor(who), user, TENANT, opts.theme ?? null] as const,
  );
  return { user, blocked };
}
