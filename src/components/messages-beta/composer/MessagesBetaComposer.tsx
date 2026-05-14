"use client";

import { useRef, useState, useCallback, KeyboardEvent } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";

import axios from "@/api/axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

import type { ConversationRow } from "../store/types";

interface Props {
  conversation: ConversationRow;
}

/**
 * Minimal /messages-beta composer: text + single attachment, four platforms.
 *
 * Reply, emoji picker, WhatsApp templates, email CC/BCC, file previews, and
 * the bulk attachment gallery from the legacy composer are deliberately
 * out of scope for PR4. They're additive on top of this and we'll port them
 * one at a time as the beta page graduates toward parity.
 *
 * No optimistic add — every sent message lands in the thread via the WS
 * `new_message` echo. That uniformity is the whole point of the rewrite:
 * the same code path handles incoming + outgoing messages, so there's no
 * REST↔reducer reconciliation seam where the legacy page's "duplicate
 * bubble" bugs lived.
 */
export function MessagesBetaComposer({ conversation }: Props) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Widget sessions that have been closed by either side are a special
  // disabled state — the legacy page hides the composer entirely. Mirror
  // that here so agents can't type into a dead conversation.
  const widgetClosed = conversation.platform === "widget" && !!conversation.sessionEndedAt;

  const submit = useCallback(async () => {
    const message = text.trim();
    if (!message && !file) return;
    if (sending) return;

    setSending(true);
    try {
      await sendForPlatform(conversation, message, file);
      setText("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || "Failed to send message";
      console.error("[messages-beta] send failed:", err);
      toast.error(errMsg);
    } finally {
      setSending(false);
    }
  }, [conversation, text, file, sending]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl+Enter sends; plain Enter inserts a newline. Matches the
      // legacy composer behaviour so the muscle memory carries over.
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void submit();
      }
    },
    [submit]
  );

  const handlePickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // 25 MB Facebook / Instagram / WhatsApp cap — surface it locally so the
    // user gets a fast error instead of a 400 from the platform API.
    if (f.size > 25 * 1024 * 1024) {
      toast.error("Files must be 25 MB or smaller.");
      return;
    }
    setFile(f);
  }, []);

  if (widgetClosed) {
    return (
      <div className="shrink-0 border-t p-3 text-center">
        <p className="text-xs text-muted-foreground">
          This conversation has ended. New messages will start a fresh session.
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t p-3 flex flex-col gap-2">
      {file && (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1 text-xs">
          <span className="truncate">📎 {file.name}</span>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Remove attachment"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || conversation.platform === "widget"}
          aria-label="Attach file"
          title={
            conversation.platform === "widget"
              ? "Sending files to website visitors isn't supported yet"
              : "Attach file"
          }
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handlePickFile}
          accept="image/*,video/*,audio/*,application/pdf"
        />

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…  (Cmd/Ctrl+Enter to send)"
          className="resize-none min-h-[40px] max-h-[160px]"
          rows={1}
          disabled={sending}
        />

        <Button
          type="button"
          onClick={() => void submit()}
          disabled={sending || (!text.trim() && !file)}
          className="shrink-0"
          aria-label="Send message"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

/**
 * Per-platform dispatch table. Kept exported for unit testing without
 * having to spin up the full component.
 */
export async function sendForPlatform(
  conversation: ConversationRow,
  message: string,
  file: File | null
): Promise<void> {
  const parts = conversation.id.split("_");
  if (parts.length < 2) throw new Error("Invalid chat ID format");
  const prefix = parts[0];
  const accountId = parts[1];
  const targetId = parts.slice(2).join("_");

  if (prefix === "fb") {
    if (file) {
      const form = new FormData();
      form.append("recipient_id", targetId);
      form.append("page_id", accountId);
      form.append("message", message);
      form.append("media", file);
      await axios.post("/api/social/facebook/send-message/", form);
    } else {
      await axios.post("/api/social/facebook/send-message/", {
        recipient_id: targetId,
        page_id: accountId,
        message,
      });
    }
    return;
  }

  if (prefix === "ig") {
    if (file) {
      const form = new FormData();
      form.append("recipient_id", targetId);
      form.append("instagram_account_id", accountId);
      form.append("message", message);
      form.append("media", file);
      await axios.post("/api/social/instagram/send-message/", form);
    } else {
      await axios.post("/api/social/instagram/send-message/", {
        recipient_id: targetId,
        instagram_account_id: accountId,
        message,
      });
    }
    return;
  }

  if (prefix === "wa") {
    const phone = targetId.startsWith("+") ? targetId : `+${targetId}`;
    if (file) {
      const form = new FormData();
      form.append("to_number", phone);
      form.append("waba_id", accountId);
      form.append("message", message);
      form.append("media", file);
      await axios.post("/api/social/whatsapp/send-message/", form);
    } else {
      await axios.post("/api/social/whatsapp/send-message/", {
        to_number: phone,
        waba_id: accountId,
        message,
      });
    }
    return;
  }

  if (prefix === "widget") {
    if (file) {
      // Visitor-direction file sends aren't supported by the legacy page
      // either; surface a clear error rather than a misleading 400.
      throw new Error("Sending files to website visitors is not yet supported");
    }
    await axios.post("/api/widget/admin/messages/send/", {
      connection_id: Number(accountId),
      session_id: targetId,
      message_text: message,
    });
    return;
  }

  throw new Error(`Unsupported platform: ${prefix}`);
}
