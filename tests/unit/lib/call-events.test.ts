/**
 * Module emitter for backend `call_event` frames.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  onCallEvent,
  publishCallEvent,
  isCallEventPayload,
  __resetCallEventsForTests,
  type CallEventPayload,
} from "@/lib/call-events";

const payload: CallEventPayload = {
  id: 1,
  call_id: "c1",
  sip_call_id: "sip-1",
  pbx_call_id: "pbx-1",
  status: "answered",
  handled_by: 3,
};

describe("call-events", () => {
  beforeEach(() => {
    __resetCallEventsForTests();
  });

  it("delivers to every listener and honours unsubscribe", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = onCallEvent(a);
    onCallEvent(b);

    publishCallEvent(payload);
    expect(a).toHaveBeenCalledWith(payload);
    expect(b).toHaveBeenCalledWith(payload);

    offA();
    publishCallEvent(payload);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it("keeps delivering when one listener throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    onCallEvent(bad);
    onCallEvent(good);

    expect(() => publishCallEvent(payload)).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("validates the payload shape", () => {
    expect(isCallEventPayload(payload)).toBe(true);
    expect(isCallEventPayload(null)).toBe(false);
    expect(isCallEventPayload({ id: "1", status: "x" })).toBe(false);
    expect(isCallEventPayload({ id: 1 })).toBe(false);
  });
});
