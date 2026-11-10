/**
 * floatingDock: the call rail publishes its width; every dock position hook
 * shifts by it so launchers, bubbles and panels sit left of the rail.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

import {
  DOCK,
  DOCK_PANEL_RIGHT,
  __resetDockForTests,
  getDockState,
  setCallRailWidth,
  useCallRailWidth,
  useDockPanelRight,
  useDockRight,
} from "@/components/TeamChat/floatingDock";

beforeEach(() => __resetDockForTests());

describe("call rail width in the dock store", () => {
  it("starts closed and publishes the rail width", () => {
    expect(getDockState().railWidth).toBe(0);
    setCallRailWidth(DOCK.CALL_RAIL_WIDTH);
    expect(getDockState().railWidth).toBe(320);
    setCallRailWidth(0);
    expect(getDockState().railWidth).toBe(0);
  });

  it("useDockRight / useDockPanelRight shift by the open rail", () => {
    const { result } = renderHook(() => ({
      width: useCallRailWidth(),
      right: useDockRight(),
      panelRight: useDockPanelRight(),
    }));
    expect(result.current).toEqual({ width: 0, right: DOCK.RIGHT, panelRight: DOCK_PANEL_RIGHT });
    act(() => setCallRailWidth(320));
    expect(result.current).toEqual({ width: 320, right: DOCK.RIGHT + 320, panelRight: DOCK_PANEL_RIGHT + 320 });
    act(() => setCallRailWidth(0));
    expect(result.current.right).toBe(DOCK.RIGHT);
  });

  it("does not notify subscribers when nothing changes", () => {
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useCallRailWidth();
    });
    act(() => setCallRailWidth(0));
    expect(renders).toBe(1);
  });
});
