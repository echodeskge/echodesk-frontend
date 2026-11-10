"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type SinkMediaElement = HTMLMediaElement & { setSinkId: (sinkId: string) => Promise<void> };

/** Chromium / Edge / Firefox 116+ expose `HTMLMediaElement.setSinkId`; Safari does not. */
export function isSinkSelectionSupported(): boolean {
  return typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;
}

interface OutputDevice {
  deviceId: string;
  label: string;
}

/**
 * Applies the chosen output to every audible `<audio>` element on the page.
 * The remote-party audio element lives inside CallProvider and is not exposed
 * through the context, so the rail addresses it through the DOM.
 */
export async function applyOutputDevice(deviceId: string, root: ParentNode = document): Promise<void> {
  const elements = Array.from(root.querySelectorAll("audio")).filter((el) => !el.muted) as SinkMediaElement[];
  await Promise.all(elements.map((el) => el.setSinkId(deviceId)));
}

/** Output device picker opened by the Speaker control. */
export function SpeakerPicker() {
  const t = useTranslations("calls.rail");
  const [devices, setDevices] = useState<OutputDevice[] | null>(null);
  const [selected, setSelected] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!media?.enumerateDevices) {
      setDevices([]);
      return;
    }
    media
      .enumerateDevices()
      .then((list) => {
        if (cancelled) return;
        setDevices(
          list
            .filter((d) => d.kind === "audiooutput")
            .map((d, i) => ({ deviceId: d.deviceId, label: d.label || t("outputN", { n: i + 1 }) }))
        );
      })
      .catch(() => {
        if (!cancelled) setDevices([]);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const choose = (deviceId: string) => {
    setSelected(deviceId);
    setFailed(false);
    applyOutputDevice(deviceId).catch(() => setFailed(true));
  };

  const options: OutputDevice[] = [{ deviceId: "", label: t("defaultOutput") }, ...(devices ?? []).filter((d) => d.deviceId !== "default")];

  return (
    <div className="mt-2.5 rounded-lg border bg-background p-2.5" data-testid="call-rail-speaker-panel">
      <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">{t("outputDevice")}</p>
      <ul className="flex max-h-40 flex-col overflow-y-auto" role="radiogroup" aria-label={t("outputDevice")}>
        {options.map((d) => (
          <li key={d.deviceId || "default"}>
            <button
              type="button"
              role="radio"
              aria-checked={selected === d.deviceId}
              onClick={() => choose(d.deviceId)}
              data-testid="call-rail-output-device"
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-md px-1.5 text-left text-[13px] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected === d.deviceId && "bg-muted font-medium"
              )}
            >
              <span className={cn("h-[7px] w-[7px] shrink-0 rounded-full", selected === d.deviceId ? "bg-primary" : "bg-muted-foreground/40")} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{d.label}</span>
            </button>
          </li>
        ))}
      </ul>
      {failed && (
        <p className="px-1 pt-1 text-xs text-destructive" role="alert">
          {t("outputChangeFailed")}
        </p>
      )}
    </div>
  );
}
