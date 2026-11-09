/** FE-09 J/K hotkeys. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { fireEvent, render, renderHook } from "@testing-library/react";
import { useTicketHotkeys, isTypingTarget } from "@/app/(tenant)/tickets/[id]/_hooks/use-ticket-hotkeys";

const onNext = vi.fn();
const onPrev = vi.fn();

beforeEach(() => {
  onNext.mockClear();
  onPrev.mockClear();
  document.body.innerHTML = "";
});

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) {
  fireEvent.keyDown(target, { key, ...init });
}

describe("useTicketHotkeys", () => {
  it("J = next, K = previous", () => {
    renderHook(() => useTicketHotkeys({ onNext, onPrev }));
    press("j");
    press("k");
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("works on a Georgian layout (physical J/K keys)", () => {
    renderHook(() => useTicketHotkeys({ onNext, onPrev }));
    press("ჯ", { code: "KeyJ" });
    press("კ", { code: "KeyK" });
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it.each([["shiftKey"], ["ctrlKey"], ["metaKey"], ["altKey"]])("ignores the keys with %s", (mod) => {
    renderHook(() => useTicketHotkeys({ onNext, onPrev }));
    press("j", { [mod]: true });
    press("k", { [mod]: true });
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrev).not.toHaveBeenCalled();
  });

  it("ignores typing in inputs, textareas and contenteditable", () => {
    render(
      <div>
        <input data-testid="i" />
        <textarea data-testid="t" />
        <div data-testid="c" contentEditable suppressContentEditableWarning />
        <select data-testid="s" />
      </div>,
    );
    renderHook(() => useTicketHotkeys({ onNext, onPrev }));
    for (const id of ["i", "t", "c", "s"]) {
      const el = document.querySelector(`[data-testid="${id}"]`)!;
      press("j", {}, el);
    }
    expect(onNext).not.toHaveBeenCalled();
    expect(isTypingTarget(document.querySelector('[data-testid="c"]'))).toBe(true);
  });

  it("ignores the keys while a dialog or menu is open", () => {
    const { rerender } = render(<div role="dialog" data-state="open" />);
    renderHook(() => useTicketHotkeys({ onNext, onPrev }));
    press("j");
    expect(onNext).not.toHaveBeenCalled();
    rerender(<div role="menu" data-state="open" />);
    press("k");
    expect(onPrev).not.toHaveBeenCalled();
    rerender(<div role="dialog" data-state="closed" />);
    press("j");
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("ignores events another handler already took, and does nothing when disabled", () => {
    const { rerender } = renderHook(({ enabled }) => useTicketHotkeys({ onNext, onPrev, enabled }), {
      initialProps: { enabled: true },
    });
    const e = new KeyboardEvent("keydown", { key: "j", bubbles: true, cancelable: true });
    e.preventDefault();
    document.body.dispatchEvent(e);
    expect(onNext).not.toHaveBeenCalled();
    rerender({ enabled: false });
    press("j");
    expect(onNext).not.toHaveBeenCalled();
  });

  it("uses the latest handlers", () => {
    const later = vi.fn();
    const { rerender } = renderHook(({ next }) => useTicketHotkeys({ onNext: next }), { initialProps: { next: onNext } });
    rerender({ next: later });
    press("j");
    expect(later).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });
});
