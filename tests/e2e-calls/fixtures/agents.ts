/**
 * The `agents` fixture: three signed-in browser contexts, one per extension.
 *
 *   a101  admin@demo.ge   ext 101
 *   a102  agent@demo.ge   ext 102
 *   a103  staff1@demo.ge  ext 103 (tokens.json key `agent2`)
 *
 * Each context is locked down to the local stack, opens `/calls`, opens the
 * call rail and waits until the SIP pill reports `registered`, so a spec can
 * dial straight away. Teardown hangs up whatever is still ringing or active
 * (specs also do this in `afterEach`) and closes the contexts.
 */
import { test as base, type Browser, type BrowserContext, type BrowserContextOptions, type Page } from "@playwright/test";
import { EXTENSIONS } from "./env";
import { hangUp, openRail, waitRegistered } from "./rail";
import { signIn, type Profile, type Who } from "./session";

export interface Agent {
  who: Who;
  /** PJSIP extension of this login (`101`, `102`, `103`). */
  ext: string;
  context: BrowserContext;
  page: Page;
  /** `/api/auth/profile/` of the login; `user.id` matches `CallLog.handled_by`. */
  user: Profile;
  /** Requests the network lock-down aborted (nothing should reach a real host). */
  blocked: string[];
}

export interface Agents {
  a101: Agent;
  a102: Agent;
  a103: Agent;
  /** The three agents in order. */
  all: Agent[];
}

async function bringUp(browser: Browser, who: Who, contextOptions: BrowserContextOptions): Promise<Agent> {
  const context = await browser.newContext(contextOptions);
  const { user, blocked } = await signIn(context, who, "en");
  const page = await context.newPage();
  await page.goto("/calls");
  await openRail(page);
  await waitRegistered(page);
  return { who, ext: EXTENSIONS[who], context, page, user, blocked };
}

export const test = base.extend<{ agents: Agents }>({
  agents: async ({ browser, baseURL, viewport, hasTouch, isMobile, permissions }, provide) => {
    // Contexts created by hand get the project's options explicitly, so the
    // mobile project really runs at 390x844 with touch.
    const contextOptions: BrowserContextOptions = {
      baseURL: baseURL ?? undefined,
      viewport: viewport ?? undefined,
      hasTouch,
      isMobile,
      permissions: permissions ?? ["microphone"],
    };
    const a101 = await bringUp(browser, "admin", contextOptions);
    const a102 = await bringUp(browser, "agent", contextOptions);
    const a103 = await bringUp(browser, "agent2", contextOptions);
    const agents: Agents = { a101, a102, a103, all: [a101, a102, a103] };

    await provide(agents);

    for (const a of agents.all) await hangUp(a.page);
    for (const a of agents.all) await a.context.close();
  },
});

export { expect } from "@playwright/test";

/** Best-effort hang-up on every agent; call it from `afterEach`. */
export async function hangUpAll(agents: Agents) {
  for (const a of agents.all) await hangUp(a.page);
}
