"use client";

/**
 * Tickets realtime context (plan §4.5, FE-02).
 *
 * One board socket per tickets route. The screen that knows the board calls
 * `setBoardId(id)` (the wrapper does it for the board and detail pages);
 * `setBoardId(null)` disconnects.
 *
 * - `subscribe(handler)` receives every board event of §4.3 (moved, updated,
 *   created, deleted, commented, activity), own echoes included: consumers
 *   decide with `isOwnEvent(e)` from `_lib/mutation-id`.
 * - `wsReady` turns true on the server's `connection` frame (not on open), so
 *   e2e can wait for `[data-ws-ready="true"]` (RM8).
 * - `beingMoved` entries expire 3s after the last `ticket_being_moved`;
 *   `beingEdited` entries are cleared by `ticket_editing_stopped` or when that
 *   user leaves the board.
 * - Close code 4403 sets `accessDenied` and calls the provider's
 *   `onAccessDenied`; the socket does not reconnect.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTicketBoardWebSocket } from "@/hooks/useTicketBoardWebSocket";
import type { BoardEvent } from "../_lib/types";

export interface RealtimeUser {
  user_id: number;
  user_name: string;
  user_email?: string;
}

export interface PresenceMark {
  userId: number;
  userName: string;
  /** Only for `beingEdited`: the field named by `sendTicketEditing`, if the server relays it. */
  field?: string;
}

export type BoardEventHandler = (event: BoardEvent) => void;

export interface TicketsRealtimeValue {
  boardId: number | null;
  activeUsers: RealtimeUser[];
  beingMoved: ReadonlyMap<number, PresenceMark>;
  beingEdited: ReadonlyMap<number, PresenceMark>;
  wsReady: boolean;
  accessDenied: boolean;
  setBoardId: (id: number | null) => void;
  subscribe: (handler: BoardEventHandler) => () => void;
  sendTicketMoving: (ticketId: number, fromColumnId: number | null) => void;
  sendTicketEditing: (ticketId: number, field?: string) => void;
  sendTicketEditingStopped: (ticketId: number) => void;
  onAccessDenied?: () => void;
}

export const BEING_MOVED_TTL_MS = 3000;

const BOARD_EVENT_TYPES: ReadonlySet<string> = new Set([
  "ticket_moved",
  "ticket_updated",
  "ticket_created",
  "ticket_deleted",
  "ticket_commented",
  "ticket_activity",
]);

export function isBoardEvent(data: unknown): data is BoardEvent {
  return (
    !!data &&
    typeof data === "object" &&
    typeof (data as { type?: unknown }).type === "string" &&
    BOARD_EVENT_TYPES.has((data as { type: string }).type)
  );
}

/** Frames the socket hook already handles (presence, keep-alive, errors). */
const SOCKET_FRAME_TYPES: ReadonlySet<string> = new Set([
  "connection",
  "pong",
  "error",
  "active_users",
  "user_joined",
  "user_left",
  "ticket_being_moved",
  "ticket_being_edited",
  "ticket_editing_stopped",
]);

const EMPTY_MAP: ReadonlyMap<number, PresenceMark> = new Map();
const noop = () => {};

/** Inert value for components rendered outside the tickets routes (and tests). */
const INERT: TicketsRealtimeValue = {
  boardId: null,
  activeUsers: [],
  beingMoved: EMPTY_MAP,
  beingEdited: EMPTY_MAP,
  wsReady: false,
  accessDenied: false,
  setBoardId: noop,
  subscribe: () => noop,
  sendTicketMoving: noop,
  sendTicketEditing: noop,
  sendTicketEditingStopped: noop,
};

const TicketsRealtimeContext = createContext<TicketsRealtimeValue | null>(null);

export function TicketsRealtimeProvider({
  children,
  onAccessDenied,
  onUnknownFrame,
  initialBoardId = null,
}: {
  children: ReactNode;
  onAccessDenied?: () => void;
  /** A frame type this client doesn't know yet (a newer backend). */
  onUnknownFrame?: (frame: Record<string, unknown>, boardId: number | null) => void;
  initialBoardId?: number | null;
}) {
  const [boardId, setBoardIdState] = useState<number | null>(initialBoardId);
  const [wsReady, setWsReady] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [beingMoved, setBeingMoved] = useState<ReadonlyMap<number, PresenceMark>>(EMPTY_MAP);
  const [beingEdited, setBeingEdited] = useState<ReadonlyMap<number, PresenceMark>>(EMPTY_MAP);

  const handlersRef = useRef(new Set<BoardEventHandler>());
  const movedTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const onAccessDeniedRef = useRef(onAccessDenied);
  const onUnknownFrameRef = useRef(onUnknownFrame);
  const boardIdRef = useRef(boardId);
  useEffect(() => {
    onAccessDeniedRef.current = onAccessDenied;
    onUnknownFrameRef.current = onUnknownFrame;
    boardIdRef.current = boardId;
  });

  const clearMovedTimers = useCallback(() => {
    for (const timer of movedTimersRef.current.values()) clearTimeout(timer);
    movedTimersRef.current.clear();
  }, []);

  const setBoardId = useCallback((id: number | null) => {
    const next = typeof id === "number" && Number.isInteger(id) && id > 0 ? id : null;
    setBoardIdState((prev) => (prev === next ? prev : next));
  }, []);

  // Board switch (or disconnect): per-board state starts over.
  useEffect(() => {
    setWsReady(false);
    setAccessDenied(false);
    setBeingMoved(EMPTY_MAP);
    setBeingEdited(EMPTY_MAP);
    clearMovedTimers();
  }, [boardId, clearMovedTimers]);

  useEffect(() => clearMovedTimers, [clearMovedTimers]);

  const dispatch = useCallback((event: BoardEvent) => {
    for (const handler of Array.from(handlersRef.current)) {
      try {
        handler(event);
      } catch (error) {
        console.error("[TicketsRealtime] subscriber failed:", error);
      }
    }
  }, []);

  const handleMessage = useCallback(
    (data: Record<string, unknown>) => {
      if (data.type === "connection") {
        setWsReady(true);
        return;
      }
      if (isBoardEvent(data)) {
        dispatch(data);
        return;
      }
      if (typeof data.type === "string" && !SOCKET_FRAME_TYPES.has(data.type)) {
        onUnknownFrameRef.current?.(data, boardIdRef.current);
      }
    },
    [dispatch],
  );

  const socket = useTicketBoardWebSocket({
    boardId: boardId ?? "none",
    onMessage: handleMessage,
    onConnectionChange: (connected) => {
      if (!connected) setWsReady(false);
    },
    onAccessDenied: () => {
      setAccessDenied(true);
      setWsReady(false);
      onAccessDeniedRef.current?.();
    },
    onTicketBeingMoved: (e) => {
      const ticketId = e.ticket_id;
      setBeingMoved((prev) => new Map(prev).set(ticketId, { userId: e.user_id, userName: e.user_name }));
      const timers = movedTimersRef.current;
      const existing = timers.get(ticketId);
      if (existing) clearTimeout(existing);
      timers.set(
        ticketId,
        setTimeout(() => {
          timers.delete(ticketId);
          setBeingMoved((prev) => {
            if (!prev.has(ticketId)) return prev;
            const next = new Map(prev);
            next.delete(ticketId);
            return next;
          });
        }, BEING_MOVED_TTL_MS),
      );
    },
    onTicketBeingEdited: (e) => {
      const field = (e as { field?: unknown }).field;
      setBeingEdited((prev) =>
        new Map(prev).set(e.ticket_id, {
          userId: e.user_id,
          userName: e.user_name,
          ...(typeof field === "string" ? { field } : {}),
        }),
      );
    },
    onTicketEditingStopped: (ticketId, userId) => {
      setBeingEdited((prev) => {
        const mark = prev.get(ticketId);
        if (!mark || (userId != null && mark.userId !== userId)) return prev;
        const next = new Map(prev);
        next.delete(ticketId);
        return next;
      });
    },
    onUserLeft: (userId) => {
      setBeingEdited((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [ticketId, mark] of prev) {
          if (mark.userId === userId) {
            next.delete(ticketId);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    },
  });

  const subscribe = useCallback((handler: BoardEventHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const { notifyTicketMoving, notifyTicketEditing, notifyTicketEditingStopped, activeUsers } = socket;

  const sendTicketMoving = useCallback(
    (ticketId: number, fromColumnId: number | null) => notifyTicketMoving(ticketId, fromColumnId as number),
    [notifyTicketMoving],
  );

  const value = useMemo<TicketsRealtimeValue>(
    () => ({
      boardId,
      activeUsers,
      beingMoved,
      beingEdited,
      wsReady,
      accessDenied,
      setBoardId,
      subscribe,
      sendTicketMoving,
      sendTicketEditing: notifyTicketEditing,
      sendTicketEditingStopped: notifyTicketEditingStopped,
      onAccessDenied,
    }),
    [
      boardId,
      activeUsers,
      beingMoved,
      beingEdited,
      wsReady,
      accessDenied,
      setBoardId,
      subscribe,
      sendTicketMoving,
      notifyTicketEditing,
      notifyTicketEditingStopped,
      onAccessDenied,
    ],
  );

  return <TicketsRealtimeContext.Provider value={value}>{children}</TicketsRealtimeContext.Provider>;
}

/** The tickets realtime API; an inert value outside `TicketsRealtimeProvider`. */
export function useTicketsRealtime(): TicketsRealtimeValue {
  return useContext(TicketsRealtimeContext) ?? INERT;
}

/** Subscribe to board events for the lifetime of the calling component. */
export function useBoardEvents(handler: BoardEventHandler): void {
  const { subscribe } = useTicketsRealtime();
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => subscribe((e) => ref.current(e)), [subscribe]);
}
