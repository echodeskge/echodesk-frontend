/**
 * Drag and drop (plan FE-16 §5.2), against the local B2 backend. Turned on by
 * FE-INT in W1 (FE-02 realtime, FE-07 board). Runs on an open scratch board
 * (Todo / Doing / Done-closed), so the shared E2E fixtures keep their order.
 *
 * RM8: keyboard DnD drives @hello-pangea; exactly one test uses a stepped mouse
 * drag. Two-context checks wait for `data-ws-ready` in both pages first and
 * assert with polling, never fixed sleeps.
 */
import { expect, test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";
import {
  card,
  cardSel,
  column,
  createScratchBoard,
  deleteBoardQuietly,
  domColumn,
  kanban,
  keyboardMove,
  openBoard,
  openBoardIn,
  serverColumn,
  waitBoardWs,
  waitDragIdle,
} from "./fixtures/board";

test.describe.serial("Drag and drop", () => {
  let scratch: Awaited<ReturnType<typeof createScratchBoard>>;
  let todo: number, doing: number, done: number;

  test.beforeAll(async () => {
    resetFixtures();
    scratch = await createScratchBoard(
      `E2E DnD ${Date.now().toString(36)}`,
      ["Todo", "Doing", "Done"],
      [
        { title: "DnD T1", priority: "high", column: 0 },
        { title: "DnD T2", priority: "low", column: 0 },
        { title: "DnD T3", priority: "high", column: 0 },
        { title: "DnD T4", priority: "medium", column: 0 },
        { title: "DnD T5", priority: "high", column: 1 },
      ],
      { closedColumns: [2] },
    );
    [todo, doing, done] = scratch.cols.map((c) => c.id);
  });

  test.afterAll(async () => {
    await deleteBoardQuietly(scratch?.board.id);
  });

  test("keyboard-drag a card to another column; the position persists after reload", async ({ context }) => {
    const page = await openBoardIn(context, "admin", scratch.board.id);
    const mover = (await domColumn(page, todo))[0];

    await keyboardMove(page, mover, ["ArrowRight"]);

    await expect.poll(async () => serverColumn(await kanban(scratch.board.id), doing)[0]).toBe(mover);
    await page.reload();
    await expect(card(page, mover)).toBeVisible();
    expect((await domColumn(page, doing))[0]).toBe(mover);
  });

  test("keyboard-drag within a column to index 0; persists after reload", async ({ context }) => {
    const page = await openBoardIn(context, "admin", scratch.board.id);
    const before = await domColumn(page, todo);
    const mover = before[before.length - 1];

    await keyboardMove(page, mover, Array(before.length - 1).fill("ArrowUp"));

    await expect.poll(async () => serverColumn(await kanban(scratch.board.id), todo)[0]).toBe(mover);
    await page.reload();
    await expect(card(page, mover)).toBeVisible();
    expect((await domColumn(page, todo))[0]).toBe(mover);
  });

  test("one mouse drag across columns (stepped mouse.move, waits for the drop animation)", async ({ context }) => {
    const page = await openBoardIn(context, "admin", scratch.board.id);
    const mover = (await domColumn(page, todo))[0];
    const from = (await card(page, mover).boundingBox())!;
    const to = (await column(page, doing).getByTestId("kanban-column-list").boundingBox())!;

    await page.mouse.move(from.x + 40, from.y + 20);
    await page.mouse.down();
    await page.mouse.move(from.x + 50, from.y + 25, { steps: 5 });
    await page.mouse.move(to.x + 60, to.y + 20, { steps: 10 });
    await expect(column(page, doing).getByTestId("kanban-column-list")).toHaveAttribute("data-drag-over", "true");
    await page.mouse.up();
    await waitDragIdle(page);

    await expect.poll(async () => serverColumn(await kanban(scratch.board.id), doing)).toContain(mover);
    expect(await domColumn(page, doing)).toContain(mover);
  });

  test("a drag with a filter active lands at the right absolute position", async ({ context }) => {
    const page = await openBoardIn(context, "admin", scratch.board.id, { query: "&priority=high" });
    await expect(page.getByTestId("kanban-board")).toHaveAttribute("data-filtered", "true");
    const visTodo = await domColumn(page, todo);
    const visDoing = await domColumn(page, doing);
    expect(visTodo.length).toBeGreaterThan(0);
    expect(visDoing.length).toBeGreaterThan(1);

    // Drop the first visible Todo card into Doing just above its last visible card.
    const mover = visTodo[0];
    const neighbour = visDoing[visDoing.length - 1];
    await keyboardMove(page, mover, ["ArrowRight", ...Array(visDoing.length - 1).fill("ArrowDown")]);

    await expect
      .poll(async () => {
        const after = serverColumn(await kanban(scratch.board.id), doing);
        return after.indexOf(mover) === after.indexOf(neighbour) - 1;
      })
      .toBe(true);
  });

  test("a server 500 on move refetches the board to server state and shows a toast", async ({ context }) => {
    const page = await openBoardIn(context, "admin", scratch.board.id);
    await page.route("**/move_to_column/", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: '{"detail":"boom"}' }),
    );
    const before = serverColumn(await kanban(scratch.board.id), todo);
    const victim = before[0];

    await keyboardMove(page, victim, ["ArrowRight"]);

    await expect(page.getByText("Couldn't move the ticket")).toBeVisible();
    await expect.poll(() => domColumn(page, todo)).toEqual(before);
    expect(serverColumn(await kanban(scratch.board.id), todo)).toEqual(before);
  });

  test("two contexts (agent, agent2): a move in A appears in B without reload and A doesn't double-apply", async ({ browser }) => {
    const A = await openBoard(browser, "agent", scratch.board.id);
    const B = await openBoard(browser, "agent2", scratch.board.id);
    try {
      await waitBoardWs(A.page);
      await waitBoardWs(B.page);
      const mover = (await domColumn(A.page, todo))[0];

      await keyboardMove(A.page, mover, ["ArrowRight"]);

      await expect(column(B.page, doing).locator(cardSel(mover))).toBeVisible();
      await expect.poll(async () => (await domColumn(B.page, doing))[0]).toBe(mover);
      const aDoing = await domColumn(A.page, doing);
      expect(aDoing.filter((id) => id === mover)).toHaveLength(1);
      expect(aDoing[0]).toBe(mover);
      await expect(column(A.page, doing).getByTestId("kanban-column-count")).toHaveText(String(aDoing.length));
    } finally {
      await A.context.close();
      await B.context.close();
    }
  });

  test("B shows a presence ring while A drags", async ({ browser }) => {
    const A = await openBoard(browser, "agent", scratch.board.id);
    const B = await openBoard(browser, "agent2", scratch.board.id);
    try {
      await waitBoardWs(A.page);
      await waitBoardWs(B.page);
      const target = (await domColumn(A.page, doing))[0];
      expect(target, "Doing has a card to lift").toBeTruthy();

      await card(A.page, target).focus();
      await A.page.keyboard.press("Space");
      await expect(card(B.page, target)).toHaveAttribute("data-presence", "moving");
      await expect(card(B.page, target).getByTestId("card-presence")).toBeVisible();
      await A.page.keyboard.press("Escape");
      await waitDragIdle(A.page);
    } finally {
      await A.context.close();
      await B.context.close();
    }
  });

  test("sidebar open_count updates after a move into a closed column", async ({ context }) => {
    const page = await openBoardIn(context, "admin", scratch.board.id);
    await waitBoardWs(page);
    const row = page.getByTestId(`sidebar-board-${scratch.board.id}`);
    const openBefore = Number((await row.locator("span").last().textContent())?.trim());
    expect(openBefore).toBeGreaterThan(0);

    const mover = (await domColumn(page, doing))[0];
    await keyboardMove(page, mover, ["ArrowRight"]);
    await expect.poll(async () => serverColumn(await kanban(scratch.board.id), done)).toContain(mover);

    // The wrapper refetches the lite boards ~1s after the move (F19).
    await expect(row.locator("span").last()).toHaveText(String(openBefore - 1));
  });
});

