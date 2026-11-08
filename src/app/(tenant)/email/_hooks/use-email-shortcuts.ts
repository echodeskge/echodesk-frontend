"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { isTypingTarget, neighbourId } from "@/lib/email-ui";
import { useEmailContext } from "./use-email-context";

/**
 * Design keyboard shortcuts: J / K next / previous conversation, E archive,
 * R reply, C compose. Ignored while typing in a field or with a modifier key
 * (⌘K stays the global search).
 */
export function useEmailShortcuts({ filter, openId }: { filter: string; openId: number | null }) {
  const router = useRouter();
  const { listOrder, paneActions } = useEmailContext();
  const state = useRef({ filter, openId, listOrder });
  state.current = { filter, openId, listOrder };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      // Dialogs / menus own their keys.
      if (document.querySelector('[role="dialog"], [role="menu"], [role="alertdialog"]')) return;
      const { filter: f, openId: id, listOrder: order } = state.current;
      const key = e.key.toLowerCase();
      const open = (target: number | null) => {
        if (target != null) router.push(`/email/${encodeURIComponent(f)}/${target}`);
      };
      if (key === "j") {
        e.preventDefault();
        open(neighbourId(order, id, 1));
      } else if (key === "k") {
        e.preventDefault();
        open(neighbourId(order, id, -1));
      } else if (key === "e" && id != null && paneActions.current.archive) {
        e.preventDefault();
        paneActions.current.archive();
      } else if (key === "r" && id != null && paneActions.current.reply) {
        e.preventDefault();
        paneActions.current.reply();
      } else if (key === "c") {
        e.preventDefault();
        router.push("/email/compose");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, paneActions]);
}
