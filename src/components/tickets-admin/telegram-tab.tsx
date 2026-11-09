"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import {
  boardsTelegramConnectionCreate,
  boardsTelegramConnectionDestroy,
  boardsTelegramConnectionRetrieve,
  boardsTelegramConnectionTestCreate,
  boardsTelegramConnectionUpdate,
} from "@/api/generated/api";
import type { BoardTelegramConnection } from "@/api/generated/interfaces";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { boardAdminKeys, httpStatus } from "./admin-api";

/** The connection, or null when the board has none (the API answers 404). */
export async function fetchTelegramConnection(boardId: number): Promise<BoardTelegramConnection | null> {
  try {
    return await boardsTelegramConnectionRetrieve(String(boardId));
  } catch (error) {
    if (httpStatus(error) === 404) return null;
    throw error;
  }
}

interface TelegramTabProps {
  boardId: number;
  /** `edit_boards` or staff; writes and test messages need it on the server. */
  canEdit: boolean;
}

/**
 * Board Telegram notifications (W25). The bot token is write-only: the API
 * only reports `has_token`, so the field stays empty and an empty value on
 * update keeps the saved token.
 */
export function TelegramTab({ boardId, canEdit }: TelegramTabProps) {
  const t = useTranslations("tickets.boardAdmin.telegram");
  const qc = useQueryClient();
  const key = boardAdminKeys.telegram(boardId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchTelegramConnection(boardId),
    staleTime: 30_000,
  });
  const conn = query.data ?? null;

  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState<null | "test" | "save" | "disconnect">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setChatId(conn?.chat_id ?? "");
    setActive(conn?.is_active ?? true);
    setToken("");
  }, [conn]);

  const handleTest = async () => {
    setBusy("test");
    setError(null);
    try {
      await boardsTelegramConnectionTestCreate(String(boardId), {
        ...(token ? { bot_token_raw: token } : {}),
        ...(chatId.trim() ? { chat_id: chatId.trim() } : {}),
      });
      toast.success(t("testOk"));
    } catch {
      setError(t("testFail"));
      toast.error(t("testFail"));
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    if (!chatId.trim()) {
      setError(t("chatIdRequired"));
      return;
    }
    if (!conn && !token) {
      setError(t("botTokenRequired"));
      return;
    }
    setBusy("save");
    setError(null);
    try {
      const saved = conn
        ? await boardsTelegramConnectionUpdate(String(boardId), {
            chat_id: chatId.trim(),
            is_active: active,
            ...(token ? { bot_token_raw: token } : {}),
          })
        : await boardsTelegramConnectionCreate(String(boardId), {
            chat_id: chatId.trim(),
            is_active: active,
            bot_token_raw: token,
          });
      qc.setQueryData(key, saved);
      setToken("");
      toast.success(t("saved"));
    } catch {
      setError(t("saveError"));
      toast.error(t("saveError"));
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async () => {
    setBusy("disconnect");
    setError(null);
    try {
      await boardsTelegramConnectionDestroy(String(boardId));
      qc.setQueryData(key, null);
      toast.success(t("disconnected"));
    } catch {
      setError(t("disconnectError"));
      toast.error(t("disconnectError"));
    } finally {
      setBusy(null);
    }
  };

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-10" aria-busy="true">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <p role="alert" className="py-6 text-center text-[13px] text-destructive">
        {t("loadError")}
      </p>
    );
  }

  const disabled = !canEdit || busy !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[13px]">
        <Send className="size-4 text-muted-foreground" aria-hidden />
        {conn ? (
          <Badge className="bg-green text-white" data-testid="telegram-status">
            {t("connected")}
          </Badge>
        ) : (
          <Badge variant="secondary" data-testid="telegram-status">
            {t("notConnected")}
          </Badge>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-[13px] text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="telegram-token" className="text-[13px]">
          {t("botToken")}
        </Label>
        <Input
          id="telegram-token"
          type="password"
          autoComplete="off"
          value={token}
          disabled={disabled}
          placeholder={conn?.has_token ? t("botTokenKeep") : t("botTokenPlaceholder")}
          className="h-[34px] text-[13px]"
          onChange={(e) => setToken(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{conn?.has_token ? t("botTokenKeep") : t("botTokenHint")}</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="telegram-chat" className="text-[13px]">
          {t("chatId")}
        </Label>
        <Input
          id="telegram-chat"
          value={chatId}
          disabled={disabled}
          placeholder="-1001234567890"
          className="h-[34px] font-mono text-[13px]"
          onChange={(e) => setChatId(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t("chatIdHint")}</p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-[10px] border px-4 py-3">
        <Label htmlFor="telegram-active" className="cursor-pointer text-[13px]">
          {t("active")}
        </Label>
        <Switch id="telegram-active" checked={active} onCheckedChange={setActive} disabled={disabled} />
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={busy !== null || (!token && !conn)}
          >
            {busy === "test" ? <Spinner className="size-3.5" /> : <Send className="size-3.5" />}
            {t("test")}
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={busy !== null}>
            {busy === "save" && <Spinner className="size-3.5" />}
            {t("save")}
          </Button>
          {conn && (
            <Button type="button" variant="destructive" size="sm" onClick={handleDisconnect} disabled={busy !== null}>
              {busy === "disconnect" && <Spinner className="size-3.5" />}
              {t("disconnect")}
            </Button>
          )}
        </div>
      )}

      <section className="rounded-[10px] border bg-muted/40 px-4 py-3 text-[13px]">
        <h4 className="mb-1.5 font-medium">{t("help.title")}</h4>
        <ol className="list-decimal space-y-1 ps-5 text-muted-foreground">
          <li>{t("help.step1")}</li>
          <li>{t("help.step2")}</li>
          <li>{t("help.step3")}</li>
        </ol>
      </section>
    </div>
  );
}
