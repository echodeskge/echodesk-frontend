/**
 * Column add / edit sheets (plan FE-07, regressions for WS3 / W32): every flag
 * is sent explicitly, so renaming a column no longer turns off track_time.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import { ColumnSheet, columnFormValues } from "@/app/(tenant)/tickets/_components/board/column-sheet";
import { makeColumn } from "./fixtures";

const api = vi.hoisted(() => ({ columnsCreate: vi.fn(), columnsUpdate: vi.fn() }));
vi.mock("@/api/generated/api", () => api);
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

function renderSheet(props: Partial<React.ComponentProps<typeof ColumnSheet>> = {}) {
  const qc = new QueryClient();
  const invalidate = vi.spyOn(qc, "invalidateQueries");
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Tbilisi">
        <ColumnSheet open onClose={onClose} boardId={7} boardName="Support" column={null} nextPosition={3} {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return { invalidate, onClose };
}

describe("columnFormValues", () => {
  it("pre-fills every flag from the column and defaults a new one", () => {
    const col = makeColumn(5, 2, { name: "Done", is_default: true, is_closed_status: true, track_time: true, color: "#22c55e" });
    expect(columnFormValues(col, 9)).toMatchObject({
      name: "Done",
      color: "#22c55e",
      position: 2,
      is_default: true,
      is_closed_status: true,
      track_time: true,
    });
    expect(columnFormValues(null, 4)).toMatchObject({
      name: "",
      position: 4,
      is_default: false,
      is_closed_status: false,
      track_time: false,
    });
  });
});

describe("ColumnSheet", () => {
  it("add sends name, colour, board, position, is_default, is_closed_status and track_time", async () => {
    const user = userEvent.setup();
    api.columnsCreate.mockResolvedValue({ id: 99 });
    const { invalidate, onClose } = renderSheet();
    expect(screen.getByRole("heading", { name: "Add column" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Name *"), "  Review ");
    await user.click(screen.getByLabelText(/Closed Status/));
    await user.click(screen.getByLabelText(/Track Time/));
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(api.columnsCreate).toHaveBeenCalledTimes(1));
    expect(api.columnsCreate).toHaveBeenCalledWith({
      name: "Review",
      description: "",
      color: "#6b7280",
      position: 3,
      is_default: false,
      is_closed_status: true,
      track_time: true,
      board: 7,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith("Column added");
    const keys = invalidate.mock.calls.map((c) => (c[0] as { queryKey: unknown }).queryKey);
    expect(keys).toContainEqual(["kanbanBoard", 7]);
  });

  it("edit sends every flag", async () => {
    const user = userEvent.setup();
    api.columnsUpdate.mockResolvedValue({ id: 5 });
    const column = makeColumn(5, 1, { name: "Doing", is_default: true, is_closed_status: false, track_time: true, color: "#f59e0b" });
    renderSheet({ column });
    expect(screen.getByRole("heading", { name: "Edit column" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Default Status/)).toBeChecked();
    expect(screen.getByLabelText(/Track Time/)).toBeChecked();
    await user.click(screen.getByLabelText(/Default Status/));
    await user.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => expect(api.columnsUpdate).toHaveBeenCalled());
    expect(api.columnsUpdate).toHaveBeenCalledWith(5, {
      name: "Doing",
      description: "",
      color: "#f59e0b",
      position: 1,
      is_default: false,
      is_closed_status: false,
      track_time: true,
    });
  });

  it("renaming does not turn off track_time", async () => {
    const user = userEvent.setup();
    api.columnsUpdate.mockResolvedValue({ id: 5 });
    renderSheet({ column: makeColumn(5, 1, { name: "Doing", track_time: true }) });
    const name = screen.getByLabelText("Name *");
    await user.clear(name);
    await user.type(name, "In progress");
    await user.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => expect(api.columnsUpdate).toHaveBeenCalled());
    expect(api.columnsUpdate.mock.calls[0][1]).toMatchObject({ name: "In progress", track_time: true });
  });

  it("a failed save keeps the sheet open and toasts", async () => {
    const user = userEvent.setup();
    api.columnsCreate.mockRejectedValue(new Error("500"));
    const { onClose } = renderSheet();
    await user.type(screen.getByLabelText("Name *"), "X");
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't save the column"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Create is disabled without a name", () => {
    renderSheet();
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });
});
