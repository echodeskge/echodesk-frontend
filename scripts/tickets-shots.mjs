#!/usr/bin/env node
/**
 * Paired screenshots of the tickets screens against the design reference
 * (plan FE-16, "Visual comparison"). LOCAL STACK ONLY: every request that is
 * not the local web app, the local API or a file:// design page is aborted.
 *
 * Usage (local stack running, see ~/Echodesk/.wt/tickets-design/ENV.md):
 *   node scripts/tickets-shots.mjs --wave w1 [--screens board,detail] [--who admin,agent]
 *        [--locales en,ka] [--themes light,dark] [--widths 1440,390]
 *        [--board 1] [--ticket 1] [--no-reference]
 *
 * Output: ~/Echodesk/.wt/front-tickets-shots/<wave>/
 *   app/<screen>-<who>-<locale>-<theme>-<width>.png   the app
 *   ref/<screen>-<theme>-<width>.png                  the design reference
 *   pair/<screen>-<who>-<locale>-<theme>-<width>.png  side by side (app | reference)
 *   index.json                                        what was captured, page errors
 *
 * Reference per RENDER_MODE (~/Echodesk/.wt/tickets-design/RENDER_MODE):
 *   A+measurements  board/list -> A.html (screens "1a Board view" / "1b List view");
 *                   detail -> B-detail.rendered.html for the picture, but detail
 *                   sizes are checked with computed styles against
 *                   detail-measurements.json in the e2e suite, not by pixels.
 *   B | B.rendered  the B file for every screen.
 * Later waves add more screens (switcher open, filter popover, checklist, ...)
 * to SCREENS below; the plumbing stays the same.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { chromium } from "@playwright/test";

const HOME = os.homedir();
const WEB_PORT = process.env.TICKETS_WEB_PORT || "3110";
const API_PORT = process.env.TICKETS_API_PORT || "8010";
const TENANT = process.env.E2E_TENANT || "demo";
const APP = process.env.E2E_WEB_URL || `http://localhost:${WEB_PORT}`;
const API_HOST = `${TENANT}.api.lvh.me:${API_PORT}`;
const DESIGN_DIR = process.env.TICKETS_DESIGN_DIR || path.join(HOME, "Echodesk/.wt/tickets-design");
const SHOTS_ROOT = process.env.TICKETS_SHOTS_DIR || path.join(HOME, "Echodesk/.wt/front-tickets-shots");
const TOKENS_FILE =
  process.env.TOKENS_FILE || path.join(HOME, "Echodesk/.wt/front-tickets-shots/localdev/tokens.json");
const LAUNCH = { args: ["--host-resolver-rules=MAP *.lvh.me 127.0.0.1, MAP lvh.me 127.0.0.1"] };
const ALLOWED = new RegExp(
  `^(https?:\\/\\/(localhost:${WEB_PORT}|[a-z0-9.-]*lvh\\.me:${API_PORT})\\/|wss?:\\/\\/[a-z0-9.-]*lvh\\.me:${API_PORT}\\/|data:|blob:|about:|file:)`,
);

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}
const list = (v) => String(v).split(",").map((s) => s.trim()).filter(Boolean);

const wave = arg("wave", null);
if (!wave || wave === true) {
  console.error("usage: node scripts/tickets-shots.mjs --wave <name> [options]");
  process.exit(2);
}
const boardId = arg("board", "1");
const ticketId = arg("ticket", "1");
const withReference = !process.argv.includes("--no-reference");

/** App screens: url + an optional "ready" selector + design reference. */
const SCREENS = {
  board: { url: `/tickets?board=${boardId}`, ref: { a: "1a Board view" } },
  // W1: the board with the switcher open (menu on desktop, Sheet below sm) and
  // with the Assignee filter popover open.
  switcher: {
    url: `/tickets?board=${boardId}`,
    ref: { a: "1a Board view" },
    act: async (page) => {
      await page.locator('[data-testid="board-switcher"]').click();
      await page.waitForSelector('[data-testid="board-switcher-menu"], [data-testid="board-switcher-sheet"]');
      await page.waitForTimeout(400);
    },
  },
  filters: {
    url: `/tickets?board=${boardId}&priority=high`,
    ref: { a: "1a Board view" },
    act: async (page) => {
      await page.locator('button[data-filter="assignee"]').click();
      await page.waitForSelector('[data-filter-menu="assignee"]');
      await page.waitForTimeout(300);
    },
  },
  list: { url: `/tickets?board=${boardId}&view=list`, ref: { a: "1b List view" } },
  // W2: a saved view landing (sidebar "Urgent": list + priority chip active).
  "list-view": { url: `/tickets?board=${boardId}&view=list&priority=critical%2Chigh`, ref: { a: "1b List view" } },
  detail: { url: `/tickets/${ticketId}`, ref: { file: "B-detail.rendered.html" }, ready: '[data-testid="ticket-detail"][data-state="ready"]' },
  // W3: the detail with the ⋮ menu, a rail picker, the feed, the Time tab and the lower main column.
  "detail-menu": {
    url: `/tickets/${ticketId}`,
    ref: { file: "B-detail.rendered.html", query: { menu: "true" } },
    ready: '[data-testid="ticket-detail"][data-state="ready"]',
    act: async (page) => {
      await page.locator('[data-testid="detail-more"]').click();
      await page.waitForSelector('[data-testid="detail-menu"]');
      await page.waitForTimeout(400);
    },
  },
  "detail-picker": {
    url: `/tickets/${ticketId}`,
    ref: { file: "B-detail.rendered.html", query: { picker: "Status" } },
    ready: '[data-testid="ticket-detail"][data-state="ready"]',
    act: async (page) => {
      const trigger = page.locator('[data-slot="rail-rows"] > [data-slot="property-row"]').nth(2).locator('[data-slot="property-picker-trigger"]');
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      await page.waitForSelector('[data-slot="property-picker-content"]');
      await page.waitForTimeout(400);
    },
  },
  "detail-sections": {
    url: `/tickets/${ticketId}`,
    ref: { file: "B-detail.rendered.html", query: { files: "true" } },
    ready: '[data-testid="ticket-detail"][data-state="ready"]',
    act: async (page) => {
      await page.locator('[data-slot="checklist-card"], [data-testid="checklist-card"]').first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    },
  },
  "detail-feed": {
    url: `/tickets/${ticketId}`,
    ref: { file: "B-detail.rendered.html" },
    ready: '[data-testid="ticket-detail"][data-state="ready"]',
    act: async (page) => {
      await page.locator('[data-slot="activity-feed"]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    },
  },
  "detail-time": {
    url: `/tickets/${ticketId}`,
    ref: { file: "B-detail.rendered.html" },
    ready: '[data-testid="ticket-detail"][data-state="ready"]',
    act: async (page) => {
      const feed = page.locator('[data-slot="activity-feed"]');
      await feed.scrollIntoViewIfNeeded();
      await feed.getByRole("tab").last().click();
      await page.waitForSelector('[data-slot="time-tab"]');
      await page.waitForTimeout(400);
    },
  },
};

const screens = list(arg("screens", "board,detail"));
const whos = list(arg("who", "admin,agent"));
const locales = list(arg("locales", "en,ka"));
const themes = list(arg("themes", "light,dark"));
const widths = list(arg("widths", "1440,390")).map(Number);

const OUT = path.join(SHOTS_ROOT, String(wave));
for (const d of ["app", "ref", "pair"]) fs.mkdirSync(path.join(OUT, d), { recursive: true });

const renderMode = fs.existsSync(path.join(DESIGN_DIR, "RENDER_MODE"))
  ? fs.readFileSync(path.join(DESIGN_DIR, "RENDER_MODE"), "utf8").trim()
  : "A+measurements";
const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8"));

function apiGet(who, p) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port: Number(API_PORT), path: p, headers: { Host: API_HOST, Authorization: `Token ${tokens[who]}` } },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => (res.statusCode >= 400 ? reject(new Error(`${p}: ${res.statusCode}`)) : resolve(JSON.parse(buf))));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function newAppContext(browser, who, locale, theme, width) {
  const ctx = await browser.newContext({ viewport: { width, height: width <= 400 ? 844 : 900 }, deviceScaleFactor: 1, locale });
  const user = await apiGet(who, "/api/auth/profile/");
  await ctx.addCookies([{ name: "NEXT_LOCALE", value: locale, url: APP }]);
  await ctx.route("**/*", (r) => (ALLOWED.test(r.request().url()) ? r.continue() : r.abort()));
  // The local tenant reports api_url without the port; point the app's sockets at the local API.
  await ctx.route("**/api/tenant/config/**", async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    try {
      const json = JSON.parse(body);
      const fix = (o) => {
        if (o && typeof o === "object") for (const k of Object.keys(o)) k === "api_url" ? (o[k] = `http://${API_HOST}`) : fix(o[k]);
      };
      fix(json);
      body = JSON.stringify(json);
    } catch {
      // not JSON
    }
    await route.fulfill({ response: res, body });
  });
  await ctx.addInitScript(
    ([token, profile, tenant, mode]) => {
      localStorage.setItem("dev_tenant", tenant);
      localStorage.setItem(
        "echodesk.consent.v1",
        JSON.stringify({ status: "rejected", categories: { analytics: false, marketing: false }, timestamp: Date.now() }),
      );
      localStorage.setItem("echodesk_auth_token", token);
      localStorage.setItem("echodesk_user_data", JSON.stringify(profile));
      localStorage.setItem("theme-mode", mode);
      const hide = () => {
        const s = document.createElement("style");
        s.textContent = "nextjs-portal{display:none!important}";
        (document.head || document.documentElement).append(s);
      };
      if (document.documentElement) hide();
      else addEventListener("DOMContentLoaded", hide);
    },
    [tokens[who], user, TENANT, theme],
  );
  return ctx;
}

/** Reference screenshot for a screen, cached per theme+width. */
async function captureReference(browser, screen, theme, width) {
  const ref = SCREENS[screen].ref;
  const out = path.join(OUT, "ref", `${screen}-${theme}-${width}.png`);
  if (fs.existsSync(out)) return out;
  const useB = renderMode !== "A+measurements" && fs.existsSync(path.join(DESIGN_DIR, `${renderMode}.html`));
  const file = ref.file || (useB ? `${renderMode}.html` : "A.html");
  const query = new URLSearchParams(ref.query || {});
  if (theme === "dark") query.set("theme", "dark");
  if (width <= 400 && file.startsWith("B-detail")) query.set("mobile", "true");
  const ctx = await browser.newContext({ viewport: { width: Math.max(width, 1440), height: 1000 }, deviceScaleFactor: 1 });
  await ctx.route("**/*", (r) => (r.request().url().startsWith("file:") ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  await page.goto(`file://${path.join(DESIGN_DIR, file)}${query.size ? `?${query}` : ""}`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  const target = ref.a ? page.locator(`[data-screen-label="${ref.a}"]`).first() : null;
  if (target && (await target.count())) await target.screenshot({ path: out });
  else await page.screenshot({ path: out, fullPage: false });
  await ctx.close();
  return out;
}

/** Side-by-side composite rendered in a blank page (no image libraries needed). */
async function composite(browser, left, right, out, caption) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const img = (p) => `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
  await page.setContent(
    `<body style="margin:0;font:12px system-ui;background:#f4f4f5">
      <div style="padding:6px 10px">${caption}</div>
      <div style="display:flex;gap:12px;align-items:flex-start;padding:0 10px 10px">
        <figure style="margin:0"><figcaption>app</figcaption><img style="max-width:780px;border:1px solid #ddd" src="${img(left)}"></figure>
        ${right ? `<figure style="margin:0"><figcaption>reference</figcaption><img style="max-width:780px;border:1px solid #ddd" src="${img(right)}"></figure>` : ""}
      </div></body>`,
  );
  await page.screenshot({ path: out, fullPage: true });
  await ctx.close();
}

const browser = await chromium.launch(LAUNCH);
const index = { wave, renderMode, app: APP, captured: [], errors: [] };
try {
  for (const screen of screens) {
    if (!SCREENS[screen]) {
      index.errors.push(`unknown screen ${screen}`);
      continue;
    }
    for (const who of whos)
      for (const locale of locales)
        for (const theme of themes)
          for (const width of widths) {
            const name = `${screen}-${who}-${locale}-${theme}-${width}`;
            const ctx = await newAppContext(browser, who, locale, theme, width);
            const page = await ctx.newPage();
            page.on("pageerror", (e) => index.errors.push(`${name}: ${e.message.slice(0, 200)}`));
            await page
              // Screens with a ready selector wait for it instead of network idle (sockets and polling keep the network busy).
              .goto(APP + SCREENS[screen].url, { waitUntil: SCREENS[screen].ready ? "load" : "networkidle", timeout: 120_000 })
              .catch(() => index.errors.push(`${name}: networkidle timeout`));
            if (SCREENS[screen].ready)
              await page
                .waitForSelector(SCREENS[screen].ready, { timeout: 45_000 })
                .catch(() => index.errors.push(`${name}: not ready`));
            await page.waitForTimeout(1500);
            if (SCREENS[screen].act) await SCREENS[screen].act(page).catch((e) => index.errors.push(`${name}: act failed (${e.message.slice(0, 120)})`));
            const appShot = path.join(OUT, "app", `${name}.png`);
            await page.screenshot({ path: appShot });
            await ctx.close();
            let refShot = null;
            if (withReference) {
              refShot = await captureReference(browser, screen, theme, width).catch((e) => {
                index.errors.push(`${name}: reference failed (${e.message})`);
                return null;
              });
            }
            await composite(browser, appShot, refShot, path.join(OUT, "pair", `${name}.png`), name);
            index.captured.push({ name, app: appShot, ref: refShot });
            console.log("shot", name);
          }
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
}
console.log(index.errors.length ? `errors:\n${index.errors.join("\n")}` : "no page errors");
console.log(`written to ${OUT}`);
