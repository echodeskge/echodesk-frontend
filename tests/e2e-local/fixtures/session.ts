/**
 * Session helpers for the local e2e suite (plan FE-16).
 *
 * - signIn(): puts a locally minted DRF token and the user's profile into
 *   localStorage the way the app's login does, sets the locale cookie, and
 *   aborts every request that isn't the local web app or API.
 * - resetFixtures(): re-seeds the e2e fixtures (call it in beforeAll of every
 *   spec file, RM8) and reloads `ids`.
 * - waitForWs(): waits until the screen root reports `data-ws-ready="true"`.
 *
 * The token file lives outside the repo (TOKENS_FILE) and is never committed.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import type { BrowserContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { ALLOWED_REQUEST, API_HOST, API_PORT, APP, E2E_IDS_FILE, E2E_RESET_CMD, TENANT, TOKENS_FILE } from "./env";

export type Who = "admin" | "agent" | "agent2" | "manager" | "viewer";
export type Locale = "en" | "ka";

/** Fixture ids written by `prepare_tickets_e2e --json` (BE-05). Shape is owned by that command. */
export type E2EIds = Record<string, unknown>;

export let ids: E2EIds = {};

function readTokens(): Record<string, string> {
  if (!fs.existsSync(TOKENS_FILE)) {
    throw new Error(`Token file not found: ${TOKENS_FILE}. Mint tokens per ~/Echodesk/.wt/tickets-design/ENV.md §3.`);
  }
  return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8"));
}

export function tokenFor(who: Who): string {
  const token = readTokens()[who];
  if (!token) throw new Error(`No token for "${who}" in ${TOKENS_FILE}`);
  return token;
}

/** GET against the local API (127.0.0.1 with the tenant Host header). */
export function apiGet<T = unknown>(who: Who, path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: Number(API_PORT),
        path,
        method: "GET",
        headers: { Host: API_HOST, Authorization: `Token ${tokenFor(who)}`, Accept: "application/json" },
        timeout: 15_000,
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          if ((res.statusCode ?? 500) >= 400) reject(new Error(`GET ${path}: HTTP ${res.statusCode}`));
          else {
            try {
              resolve(JSON.parse(body) as T);
            } catch (e) {
              reject(e);
            }
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error(`GET ${path}: timeout`)));
    req.on("error", reject);
    req.end();
  });
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
 * socket (boards, notifications, chat) dials :80 and fails. Rewrite it to the
 * local API origin, so `data-ws-ready` can turn true (FE-02 note, W1).
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

export async function signIn(context: BrowserContext, who: Who, locale: Locale = "ka", opts: SignInOptions = {}) {
  const user = await apiGet(who, "/api/auth/profile/");
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

/**
 * Re-seed the e2e fixtures and reload `ids`. Runs E2E_RESET_CMD in bash
 * (default: `prepare_tickets_e2e --schema demo --reset --json $E2E_IDS_FILE`,
 * added by BE-05). Set E2E_SKIP_RESET=1 to reuse the current data.
 */
export function resetFixtures(): E2EIds {
  if (process.env.E2E_SKIP_RESET !== "1") {
    execFileSync("bash", ["-lc", E2E_RESET_CMD], { stdio: "inherit", timeout: 180_000 });
  }
  if (!fs.existsSync(E2E_IDS_FILE)) {
    throw new Error(`E2E ids file not found: ${E2E_IDS_FILE} (run prepare_tickets_e2e --json).`);
  }
  ids = JSON.parse(fs.readFileSync(E2E_IDS_FILE, "utf8"));
  return ids;
}

/** Wait for the realtime socket: screen roots set data-ws-ready (RM8). */
export async function waitForWs(page: Page, timeout = 15_000) {
  await expect(page.locator('[data-ws-ready="true"]').first()).toBeAttached({ timeout });
}
