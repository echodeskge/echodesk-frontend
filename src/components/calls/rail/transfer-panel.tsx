"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PhoneForwarded } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeDial } from "../call-format";
import { useCallActions } from "./use-rail-call";
import { useTransferAgents } from "./use-transfer-agents";

type TransferType = "attended" | "blind";
type TransferMode = "agent" | "external";

/**
 * Transfer box (spec: bordered box titled TRANSFER TO AGENT, 32px agent rows
 * with an online dot, offline agents disabled). Keeps today's attended /
 * blind toggle and the external-number input. Failures are reported by
 * CallContext through `error`; the promises are not awaited here.
 */
export function TransferPanel({ onDone }: { onDone: () => void }) {
  const t = useTranslations("calls.rail");
  const { transferCall, startAttendedTransfer } = useCallActions();
  const [type, setType] = useState<TransferType>("attended");
  const [mode, setMode] = useState<TransferMode>("agent");
  const [number, setNumber] = useState("");
  const agents = useTransferAgents(true);

  const transferTo = (target: string, name?: string) => {
    if (!target) return;
    if (type === "attended") {
      startAttendedTransfer(target, name).catch(() => {});
    } else {
      transferCall(target).catch(() => {});
    }
    setNumber("");
    onDone();
  };

  return (
    <div className="mt-2.5 rounded-lg border bg-background p-2.5" data-testid="call-rail-transfer-panel">
      <div className="mb-2 flex h-7 gap-0.5 rounded-md bg-muted p-0.5" role="radiogroup" aria-label={t("transferType")}>
        {(["attended", "blind"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={type === option}
            onClick={() => setType(option)}
            data-testid={`call-rail-transfer-${option}`}
            className={cn(
              "flex-1 rounded px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              type === option ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]" : "text-muted-foreground"
            )}
          >
            {t(option)}
          </button>
        ))}
      </div>

      {mode === "agent" ? (
        <>
          <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">{t("transferToAgent")}</p>
          {agents.isPending ? (
            <p className="px-1 py-1 text-xs text-muted-foreground" role="status">
              {t("agentsLoading")}
            </p>
          ) : agents.isError ? (
            <p className="px-1 py-1 text-xs text-destructive" role="alert" data-testid="call-rail-transfer-error">
              {t("agentsLoadFailed")}
            </p>
          ) : agents.data && agents.data.length > 0 ? (
            <ul className="flex max-h-40 flex-col overflow-y-auto">
              {agents.data.map((agent) => (
                <li key={agent.id}>
                  <button
                    type="button"
                    disabled={!agent.online}
                    onClick={() => transferTo(agent.extension, agent.name)}
                    className="flex h-8 w-full items-center gap-2 rounded-md px-1.5 text-left text-[13px] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    data-testid="call-rail-transfer-agent"
                    data-online={agent.online ? "true" : "false"}
                  >
                    <span className={cn("h-[7px] w-[7px] shrink-0 rounded-full", agent.online ? "bg-ed-green" : "bg-muted-foreground/50")} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{agent.name}</span>
                    <span className="sr-only">{agent.online ? t("online") : t("offline")}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{t("ext", { ext: agent.extension })}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 py-1 text-xs text-muted-foreground">{t("noAgents")}</p>
          )}
          <button
            type="button"
            onClick={() => setMode("external")}
            className="mt-1 h-7 w-full rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("transferToNumber")}
          </button>
        </>
      ) : (
        <>
          <div className="flex gap-1.5">
            <input
              type="tel"
              inputMode="tel"
              autoFocus
              value={number}
              onChange={(e) => setNumber(sanitizeDial(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && number) transferTo(number);
              }}
              placeholder={t("numberPlaceholder")}
              aria-label={t("numberPlaceholder")}
              data-testid="call-rail-transfer-number"
              className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={() => transferTo(number)}
              disabled={!number}
              aria-label={t("transfer")}
              title={t("transfer")}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              data-testid="call-rail-transfer-submit"
            >
              <PhoneForwarded className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setMode("agent")}
            className="mt-1 h-7 w-full rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("transferToAgent")}
          </button>
        </>
      )}
    </div>
  );
}
