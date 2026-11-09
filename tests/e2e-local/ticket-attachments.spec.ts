/**
 * Attachments (plan FE-16 §5.2) on the new detail page, against the local B2
 * backend. Uses the E2E-005 fixture (brief.pdf by agent, pixel.png by admin).
 * Turned on with FE-10; needs `flags.detailRedesignEnabled` (FE-INT flips it
 * in W3).
 *
 * Uploads are answered in the browser (`stubAttachmentUploads`): the local
 * backend stores media in the production Spaces bucket, which a test must
 * never write to. Deletes are real (they only remove the row).
 */
import { expect, test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";
import { api, fx } from "./fixtures/board";
import { fixtureTicketId, getTicket, openDetailIn, stubbedUploads } from "./fixtures/detail-main";

let ticketId = () => fx().tickets["E2E-005"].id;
type Page = import("@playwright/test").Page;
const tiles = (page: Page) => page.locator('[data-slot="attachment-tile"]');

async function openCard(page: Page) {
  const header = page.getByRole("button", { name: /^Attachments/ });
  if ((await header.getAttribute("aria-expanded")) !== "true") await header.click();
  await expect(header).toHaveAttribute("aria-expanded", "true");
}

test.describe("Attachments", () => {
  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(() => {
    resetFixtures();
  });
  test.beforeEach(async () => {
    const id = await fixtureTicketId("E2E-005");
    ticketId = () => id;
    stubbedUploads.length = 0;
  });

  test("Upload button", async ({ context }) => {
    const page = await openDetailIn(context, "admin", ticketId(), { stubUploadsAs: fx().users.admin });
    await expect(page.getByRole("button", { name: /^Attachments/ })).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator('[data-slot="attachments-count"]')).toHaveText("2");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload" }).click();
    await (await chooser).setFiles([
      { name: "e2e-notes.txt", mimeType: "text/plain", buffer: Buffer.from("notes") },
      { name: "e2e-log.txt", mimeType: "text/plain", buffer: Buffer.from("log") },
    ]);
    await expect(page.getByRole("button", { name: /^Attachments/ })).toHaveAttribute("aria-expanded", "true");
    await expect(tiles(page)).toHaveCount(4);
    await expect(tiles(page).filter({ hasText: "e2e-notes.txt" })).toBeVisible();
    await expect(page.locator('[data-slot="attachments-count"]')).toHaveText("4");
    expect([...stubbedUploads].sort()).toEqual(["e2e-log.txt", "e2e-notes.txt"]);
  });

  test("page drop (synthetic DataTransfer)", async ({ context }) => {
    const page = await openDetailIn(context, "admin", ticketId(), { stubUploadsAs: fx().users.admin });
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(["dropped"], "e2e-dropped.txt", { type: "text/plain" }));
      (window as unknown as { __dt: DataTransfer }).__dt = dt;
      document.body.dispatchEvent(new DragEvent("dragenter", { dataTransfer: dt, bubbles: true, cancelable: true }));
    });
    await expect(page.getByTestId("page-drop-overlay")).toBeVisible();
    await page.evaluate(() => {
      const dt = (window as unknown as { __dt: DataTransfer }).__dt;
      document.body.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
    });
    await expect(page.getByTestId("page-drop-overlay")).toBeHidden();
    await expect(tiles(page).filter({ hasText: "e2e-dropped.txt" })).toBeVisible();
    expect(stubbedUploads).toEqual(["e2e-dropped.txt"]);
  });

  test("a tile click opens a new tab", async ({ context }) => {
    const page = await openDetailIn(context, "admin", ticketId());
    await openCard(page);
    const server = await getTicket(ticketId());
    const png = server.attachments.find((a) => a.filename === "pixel.png")!;
    const link = tiles(page).filter({ hasText: "pixel.png" }).getByRole("link");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    // The file host is outside the local allowlist, so the new tab's request is
    // aborted (it never reaches the remote host); the tab and its request still show.
    const fileName = new URL(png.file_url).pathname.split("/").pop()!;
    const request = context.waitForEvent("request", (r) => r.url().includes(fileName) && r.isNavigationRequest());
    const popup = context.waitForEvent("page");
    await link.click();
    const tab = await popup;
    expect((await request).url()).toBe(png.file_url);
    await tab.close();
    // Non-previewable types would download instead; a PDF previews.
    await expect(tiles(page).filter({ hasText: "brief.pdf" }).getByRole("link")).not.toHaveAttribute("download", /.+/);
  });

  test("delete", async ({ context }) => {
    const page = await openDetailIn(context, "admin", ticketId());
    await openCard(page);
    const before = await tiles(page).count();
    await tiles(page).filter({ hasText: "brief.pdf" }).getByRole("button", { name: "Remove" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Remove brief.pdf?");
    await dialog.getByRole("button", { name: "Remove" }).click();
    await expect(tiles(page)).toHaveCount(before - 1);
    await expect.poll(async () => (await getTicket(ticketId())).attachments.map((a) => a.filename)).not.toContain("brief.pdf");
  });

  test("agent cannot delete admin's file", async ({ context }) => {
    // agent2 (staff1, non-staff) sees the ticket without can_edit and uploaded nothing:
    // no remove control, and the server refuses the delete.
    const page = await openDetailIn(context, "agent2", ticketId());
    await openCard(page);
    const png = tiles(page).filter({ hasText: "pixel.png" });
    await expect(png).toBeVisible();
    await expect(png.getByRole("button", { name: "Remove" })).toHaveCount(0);
    const server = await getTicket(ticketId());
    const adminFile = server.attachments.find((a) => a.uploaded_by.id === fx().users.admin.id)!;
    await expect(api("DELETE", `/api/attachments/${adminFile.id}/`, undefined, "agent2")).rejects.toThrow(/HTTP 403/);
    expect((await getTicket(ticketId())).attachments.map((a) => a.id)).toContain(adminFile.id);
  });
});
