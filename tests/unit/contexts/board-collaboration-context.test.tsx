/**
 * Tests for BoardCollaborationContext.
 * Verifies provider rendering, default state, and passive-context behavior (no throw outside provider).
 */
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";

import {
  BoardCollaborationProvider,
  useBoardCollaboration,
} from "@/contexts/BoardCollaborationContext";

// ---------------------------------------------------------------------------
// Wrapper helpers
// ---------------------------------------------------------------------------

function createWrapper(
  props: {
    isConnected?: boolean;
    activeUsers?: Array<{ user_id: number; user_name: string; user_email: string }>;
    boardId?: string | number | null;
    ticketsBeingMoved?: Map<number, string>;
    ticketsBeingEdited?: Map<number, string>;
  } = {}
) {
  const {
    isConnected = false,
    activeUsers = [],
    boardId = null,
    ticketsBeingMoved = new Map(),
    ticketsBeingEdited = new Map(),
  } = props;

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      BoardCollaborationProvider,
      {
        isConnected,
        activeUsers,
        boardId,
        ticketsBeingMoved,
        ticketsBeingEdited,
      },
      children
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BoardCollaborationContext", () => {
  describe("useBoardCollaboration outside provider", () => {
    it("returns default state instead of throwing (graceful fallback)", () => {
      // This context deliberately does NOT throw outside its provider.
      // It returns a safe default so components outside the collaboration page still work.
      const { result } = renderHook(() => useBoardCollaboration());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.activeUsers).toEqual([]);
      expect(result.current.activeUsersCount).toBe(0);
      expect(result.current.boardId).toBeNull();
      expect(result.current.ticketsBeingMoved).toBeInstanceOf(Map);
      expect(result.current.ticketsBeingMoved.size).toBe(0);
      expect(result.current.ticketsBeingEdited).toBeInstanceOf(Map);
      expect(result.current.ticketsBeingEdited.size).toBe(0);
    });
  });

  describe("provider renders children", () => {
    it("renders children without crashing", () => {
      const { result } = renderHook(() => useBoardCollaboration(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
    });
  });

  describe("default state (empty props)", () => {
    it("is not connected by default", () => {
      const { result } = renderHook(() => useBoardCollaboration(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isConnected).toBe(false);
    });

    it("has empty active users by default", () => {
      const { result } = renderHook(() => useBoardCollaboration(), {
        wrapper: createWrapper(),
      });

      expect(result.current.activeUsers).toEqual([]);
      expect(result.current.activeUsersCount).toBe(0);
    });

    it("has null boardId by default", () => {
      const { result } = renderHook(() => useBoardCollaboration(), {
        wrapper: createWrapper(),
      });

      expect(result.current.boardId).toBeNull();
    });

    it("has empty ticketsBeingMoved by default", () => {
      const { result } = renderHook(() => useBoardCollaboration(), {
        wrapper: createWrapper(),
      });

      expect(result.current.ticketsBeingMoved.size).toBe(0);
    });

    it("has empty ticketsBeingEdited by default", () => {
      const { result } = renderHook(() => useBoardCollaboration(), {
        wrapper: createWrapper(),
      });

      expect(result.current.ticketsBeingEdited.size).toBe(0);
    });
  });

  describe("provided values are passed through", () => {
    it("reflects connected state", () => {
      const { result } = renderHook(() => useBoardCollaboration(), {
        wrapper: createWrapper({ isConnected: true }),
      });

      expect(result.current.isConnected).toBe(true);
    });

    it("reflects active users and computes count", () => {
      const users = [
        { user_id: 1, user_name: "Alice", user_email: "alice@test.com" },
        { user_id: 2, user_name: "Bob", user_email: "bob@test.com" },
      ];

      const { result } = renderHook(() => useBoardCollaboration(), {
        wrapper: createWrapper({ activeUsers: users }),
      });

      expect(result.current.activeUsers).toEqual(users);
      expect(result.current.activeUsersCount).toBe(2);
    });

    it("reflects boardId", () => {
      const { result } = renderHook(() => useBoardCollaboration(), {
        wrapper: createWrapper({ boardId: 42 }),
      });

      expect(result.current.boardId).toBe(42);
    });

    it("reflects string boardId", () => {
      const { result } = renderHook(() => useBoardCollaboration(), {
        wrapper: createWrapper({ boardId: "board-abc" }),
      });

      expect(result.current.boardId).toBe("board-abc");
    });

    it("reflects ticketsBeingMoved", () => {
      const movedMap = new Map<number, string>([
        [101, "Alice"],
        [102, "Bob"],
      ]);

      const { result } = renderHook(() => useBoardCollaboration(), {
        wrapper: createWrapper({ ticketsBeingMoved: movedMap }),
      });

      expect(result.current.ticketsBeingMoved.size).toBe(2);
      expect(result.current.ticketsBeingMoved.get(101)).toBe("Alice");
    });

    it("reflects ticketsBeingEdited", () => {
      const editedMap = new Map<number, string>([[201, "Carol"]]);

      const { result } = renderHook(() => useBoardCollaboration(), {
        wrapper: createWrapper({ ticketsBeingEdited: editedMap }),
      });

      expect(result.current.ticketsBeingEdited.size).toBe(1);
      expect(result.current.ticketsBeingEdited.get(201)).toBe("Carol");
    });
  });
});
