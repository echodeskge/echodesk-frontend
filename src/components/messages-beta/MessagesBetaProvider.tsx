"use client";

import { useEffect, useRef } from "react";

import { useMessagesWebSocket } from "@/hooks/useMessagesWebSocket";

import { dispatchWsFrame } from "./store/ws-handlers";
import { fetchInitialConversations, fetchMessagesForChat } from "./store/rest-bootstrap";
import { useMessagesBetaStore } from "./store/useMessagesBetaStore";
import type { BetaPlatform } from "./store/types";

interface Props {
  platforms: BetaPlatform[];
  children: React.ReactNode;
}

/**
 * Orchestrates the beta page's data layer.
 *
 *   1. One-shot REST bootstrap on mount → seeds `conversations`,
 *      `assignmentByChatId`, `archivedByChatId`.
 *   2. Subscribes to /ws/messages/<tenant>/ and dispatches every frame
 *      through `dispatchWsFrame` into the store.
 *   3. On WS reconnect after a > 15 s gap, does ONE refresh of the
 *      conversation list (no continuous polling).
 *
 * Everything else — selecting chats, fetching individual threads — happens
 * via direct calls to the store from child components.
 */
export function MessagesBetaProvider({ platforms, children }: Props) {
  const setBootstrapState = useMessagesBetaStore((s) => s.setBootstrapState);
  const hydrateConversations = useMessagesBetaStore((s) => s.hydrateConversations);
  const patchAssignment = useMessagesBetaStore((s) => s.patchAssignment);
  const patchArchive = useMessagesBetaStore((s) => s.patchArchive);
  const setWsState = useMessagesBetaStore((s) => s.setWsState);
  const lastWsActivityAt = useMessagesBetaStore((s) => s.lastWsActivityAt);

  // Capture platforms in a ref so the WS handlers see the latest list without
  // having to re-bind the message dispatcher.
  const platformsRef = useRef<BetaPlatform[]>(platforms);
  useEffect(() => {
    platformsRef.current = platforms;
  }, [platforms]);

  // Tracks the last time we were happily on a WS connection. Used by the
  // reconnect-fallback heuristic to decide whether a one-shot REST refresh
  // is needed when we come back online.
  const lastConnectedAtRef = useRef<number>(0);
  const RECONNECT_RESYNC_THRESHOLD_MS = 15_000;

  const runBootstrap = async () => {
    setBootstrapState("loading");
    try {
      const { rows, assignments, archives } = await fetchInitialConversations({
        platforms: platformsRef.current,
      });
      hydrateConversations(rows);
      for (const [chatId, slice] of assignments) patchAssignment(chatId, slice);
      for (const [chatId, meta] of archives) patchArchive(chatId, meta);
      setBootstrapState("ready");
    } catch (err) {
      console.error("[messages-beta] bootstrap failed:", err);
      setBootstrapState("error");
    }
  };

  // Initial bootstrap. Runs once per mount; subsequent updates come over WS.
  useEffect(() => {
    void runBootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useMessagesWebSocket({
    onNewMessage: (data) => {
      dispatchWsFrame(useMessagesBetaStore.getState(), { type: "new_message", ...data }, platformsRef.current);
    },
    onConversationUpdate: (data) => {
      dispatchWsFrame(
        useMessagesBetaStore.getState(),
        { type: data?.type || "conversation_update", ...data },
        platformsRef.current
      );
    },
    onSessionEnded: (data) => {
      dispatchWsFrame(useMessagesBetaStore.getState(), { type: "session_ended", ...data }, platformsRef.current);
    },
    onConnectionChange: (connected) => {
      const now = Date.now();
      if (connected) {
        // Reconnect resync window: if we were disconnected long enough to
        // miss frames the Channels layer might not have queued, refresh the
        // list once. (When/if we add cursor replay this branch is deleted.)
        const lastActivity = useMessagesBetaStore.getState().lastWsActivityAt;
        const wasConnectedAt = lastConnectedAtRef.current;
        const referenceTs = Math.max(lastActivity, wasConnectedAt);
        const gap = referenceTs ? now - referenceTs : 0;
        if (referenceTs && gap > RECONNECT_RESYNC_THRESHOLD_MS) {
          void runBootstrap();
        }
        lastConnectedAtRef.current = now;
        setWsState("open");
      } else {
        setWsState("down");
      }
    },
    autoReconnect: true,
    reconnectInterval: 3000,
  });

  // Surface lastWsActivityAt to React so child components can subscribe
  // (e.g. a debug "WS healthy" pill). Keep this prop-drilled or via a
  // selector — never poll.
  void lastWsActivityAt;

  return <>{children}</>;
}
