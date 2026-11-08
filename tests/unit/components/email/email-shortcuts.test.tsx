import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import React from "react";

const push = vi.fn();
const archive = vi.fn();
const reply = vi.fn();
let listOrder: number[] = [];

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/app/(tenant)/email/_hooks/use-email-context", () => ({
  useEmailContext: () => ({ listOrder, paneActions: { current: { archive, reply } } }),
}));

import { useEmailShortcuts } from "@/app/(tenant)/email/_hooks/use-email-shortcuts";

function Harness({ openId, composing = false }: { openId: number | null; composing?: boolean }) {
  useEmailShortcuts({ filter: "INBOX", openId, composing });
  return <input aria-label="field" />;
}

describe("useEmailShortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listOrder = [3, 7, 9];
  });

  it("J / K move through the list", () => {
    render(<Harness openId={7} />);
    fireEvent.keyDown(window, { key: "j" });
    expect(push).toHaveBeenLastCalledWith("/email/INBOX/9");
    fireEvent.keyDown(window, { key: "k" });
    expect(push).toHaveBeenLastCalledWith("/email/INBOX/3");
  });

  it("J opens the first conversation when none is open", () => {
    render(<Harness openId={null} />);
    fireEvent.keyDown(window, { key: "j" });
    expect(push).toHaveBeenCalledWith("/email/INBOX/3");
  });

  it("E archives and R replies to the open conversation, C composes", () => {
    render(<Harness openId={7} />);
    fireEvent.keyDown(window, { key: "e" });
    expect(archive).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "r" });
    expect(reply).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "c" });
    expect(push).toHaveBeenCalledWith("/email/compose");
  });

  it("ignores keys while typing or with modifiers", () => {
    const { getByLabelText } = render(<Harness openId={7} />);
    fireEvent.keyDown(getByLabelText("field"), { key: "j" });
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(push).not.toHaveBeenCalled();
  });

  it("does nothing while the composer is open", () => {
    render(<Harness openId={7} composing />);
    for (const key of ["j", "k", "e", "r", "c"]) fireEvent.keyDown(window, { key });
    expect(push).not.toHaveBeenCalled();
    expect(archive).not.toHaveBeenCalled();
    expect(reply).not.toHaveBeenCalled();
  });
});
