/**
 * Detail main column helpers for the e2e-local suite (FE-10): open a ticket
 * detail, read it back from the local API, and stub attachment uploads.
 *
 * Why uploads are stubbed: the local backend's media storage is the
 * production DigitalOcean Spaces bucket (keys blanked by testenv.sh), so a
 * real upload would send an (anonymous) PUT to production. The stub answers
 * `POST /api/attachments/` in the browser with a plausible row; deletes and
 * every other request still go to the local backend (a delete only removes
 * the row, it never touches storage).
 */
import type { BrowserContext, Page, Route } from "@playwright/test";
import { expect } from "@playwright/test";
import { APP } from "./env";
import { api, fx } from "./board";
import { signIn, waitForWs, type Locale, type Who } from "./session";

export interface DetailAttachment {
  id: number;
  filename: string;
  file_url: string;
  content_type: string;
  uploaded_by: { id: number; email: string };
}
export interface DetailChecklistItem {
  id: number;
  text: string;
  is_checked: boolean;
  position: number;
}
export interface DetailTicket {
  id: number;
  title: string;
  description: string;
  rich_description: unknown;
  description_format: string;
  checklist_items: DetailChecklistItem[];
  attachments: DetailAttachment[];
}

export const getTicket = (id: number, who: Who = "admin") => api<DetailTicket>("GET", `/api/tickets/${id}/`, undefined, who);

/** Server order of the checklist texts. */
export async function checklistTexts(id: number): Promise<string[]> {
  const t = await getTicket(id);
  return [...t.checklist_items]
    .sort((a, b) => a.position - b.position || a.id - b.id)
    .map((i) => i.text);
}

/** Navigate to the new detail page and wait until it is ready and live. */
export async function gotoDetail(page: Page, ticketId: number) {
  await page.goto(`${APP}/tickets/${ticketId}`);
  const root = page.getByTestId("ticket-detail");
  await expect(root, "the new detail screen (flags.detailRedesignEnabled must be on)").toBeAttached({ timeout: 60_000 });
  await expect(root).toHaveAttribute("data-state", "ready", { timeout: 30_000 });
  await expect(page.locator('[data-slot="detail-main"]')).toBeVisible();
  await waitForWs(page);
}

/**
 * The id of a fixture ticket ("E2E-004", …) as the server has it now.
 * Other local runs may re-seed the fixtures between this file's beforeAll and
 * a test (shared dev DB), so the id is looked up by its title prefix and
 * `fx()` is only the fallback.
 */
export async function fixtureTicketId(key: string): Promise<number> {
  try {
    const res = await api<{ results: { id: number; title: string }[] }>("GET", `/api/tickets/?search=${encodeURIComponent(key)}&page_size=20`);
    const hit = res.results.filter((t) => t.title.startsWith(`${key} `)).sort((a, b) => b.id - a.id)[0];
    if (hit) return hit.id;
  } catch {
    // fall back to the ids file
  }
  return fx().tickets[key].id;
}

export async function openDetailIn(
  context: BrowserContext,
  who: Who,
  ticketId: number,
  opts: { locale?: Locale; theme?: "light" | "dark"; stubUploadsAs?: { id: number; email: string } } = {},
): Promise<Page> {
  await signIn(context, who, opts.locale ?? "en", { theme: opts.theme ?? "light" });
  // After signIn: its catch-all allowlist route was registered first, so this
  // more specific route (registered later) is consulted before it.
  if (opts.stubUploadsAs) await stubAttachmentUploads(context, opts.stubUploadsAs);
  const page = await context.newPage();
  await gotoDetail(page, ticketId);
  return page;
}

let stubSeq = 900_000;

export const stubbedUploads: string[] = [];

/**
 * Answer attachment uploads in the browser (see the file comment). Register it
 * after signIn() (openDetailIn's `stubUploadsAs` does). Stubbed names are
 * appended to `stubbedUploads`.
 */
export async function stubAttachmentUploads(context: BrowserContext, uploader: { id: number; email: string }) {
  const names = stubbedUploads;
  await context.route("**/api/attachments/", async (route: Route) => {
    const req = route.request();
    if (req.method() !== "POST") return route.fallback();
    const body = req.postDataBuffer()?.toString("latin1") ?? "";
    const name = /filename="([^"]+)"/.exec(body)?.[1] ?? "upload.bin";
    const type = /Content-Type: ([^\r\n]+)\r\n\r\n/.exec(body.slice(body.indexOf("filename=")))?.[1] ?? "application/octet-stream";
    const ticket = Number(/name="ticket"\r\n\r\n(\d+)/.exec(body)?.[1] ?? 0);
    names.push(name);
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": APP, "Access-Control-Allow-Credentials": "true" },
      body: JSON.stringify({
        id: ++stubSeq,
        ticket,
        file: `${APP}/e2e-stub/${encodeURIComponent(name)}`,
        file_url: `${APP}/e2e-stub/${encodeURIComponent(name)}`,
        filename: name,
        file_size: 2048,
        content_type: type,
        uploaded_by: { id: uploader.id, email: uploader.email, first_name: "", last_name: "" },
        uploaded_at: new Date().toISOString(),
      }),
    });
  });
  return names;
}

/**
 * A scratch ticket on the seed board "Customer Support" (not touched by
 * prepare_tickets_e2e), so a spec keeps working while other local runs
 * re-seed the E2E fixtures. Optional checklist items are created in order.
 */
export async function createScratchTicket(title: string, checklist: { text: string; done?: boolean }[] = []): Promise<number> {
  const boards = await api<{ results: { id: number; name: string }[] } | { id: number; name: string }[]>("GET", "/api/boards/?lite=1&page_size=100");
  const list = Array.isArray(boards) ? boards : boards.results;
  const board = list.find((b) => b.name === "Customer Support") ?? list.find((b) => !b.name.startsWith("E2E "))!;
  const cols = await api<{ results: { id: number; position: number; is_closed_status: boolean }[] }>("GET", `/api/columns/?board=${board.id}&page_size=100`);
  const column = [...cols.results].filter((c) => !c.is_closed_status).sort((a, b) => a.position - b.position)[0];
  const ticket = await api<{ id: number }>("POST", "/api/tickets/", {
    title,
    description: "Scratch ticket for the e2e-local detail specs.",
    priority: "medium",
    column_id: column.id,
  });
  for (const [i, item] of checklist.entries()) {
    const row = await api<{ id: number }>("POST", "/api/checklist-items/", { ticket: ticket.id, text: item.text, position: i + 1 });
    if (item.done) await api("PATCH", `/api/checklist-items/${row.id}/toggle_check/`, {});
  }
  return ticket.id;
}

export async function deleteTicketQuietly(id: number | undefined) {
  if (!id) return;
  try {
    await api("DELETE", `/api/tickets/${id}/`);
  } catch {
    // already gone
  }
}
