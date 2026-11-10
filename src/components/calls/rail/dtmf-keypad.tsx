"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DIAL_KEYS, dialKeyTestId } from "./dial-keys";

const MAX_SHOWN_TONES = 12;

/** In-call DTMF pad (spec: 36px keys, radius 6, mono "Sent: …" readout). */
export function DtmfKeypad({ onSend }: { onSend: (tone: string) => unknown }) {
  const t = useTranslations("calls.rail");
  const [tones, setTones] = useState("");

  const sendTone = (key: string) => {
    onSend(key);
    setTones((prev) => (prev + key).slice(-MAX_SHOWN_TONES));
  };

  return (
    <div className="mt-2.5" data-testid="call-rail-dtmf">
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t("keypad")}>
        {DIAL_KEYS.map(({ key }) => (
          <button
            key={key}
            type="button"
            onClick={() => sendTone(key)}
            className="h-9 rounded-md border bg-background text-[15px] font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[.97]"
            data-dtmf-key={key}
            data-testid={dialKeyTestId(key)}
          >
            {key}
          </button>
        ))}
      </div>
      <p className="mt-2 truncate text-center font-mono text-xs text-muted-foreground" aria-live="polite" data-testid="call-rail-dtmf-sent">
        {tones ? t("tonesSent", { tones }) : t("tonesHint")}
      </p>
    </div>
  );
}
