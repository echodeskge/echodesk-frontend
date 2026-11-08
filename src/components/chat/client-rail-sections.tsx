"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { usePatchSocialClient } from "@/hooks/api/useSocialClients";
import { cn } from "@/lib/utils";

/** Design rail section: 11px uppercase label, then content. */
export function RailSection({
  title,
  children,
  className,
  testId,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2", className)} data-testid={testId}>
      <h4 className="text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}

/** Key / value row in the Contact section. */
export function RailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="break-words text-[13px]">{value}</span>
    </div>
  );
}

function normaliseTags(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((t): t is string => typeof t === "string" && t.trim() !== "") : [];
}

/** Editable client tags (PATCH `tags` on the client). */
export function ClientTagsEditor({ clientId, tags: rawTags }: { clientId: number; tags: unknown }) {
  const t = useTranslations("messagesBeta.rail");
  const patch = usePatchSocialClient();
  const [tags, setTags] = useState<string[]>(() => normaliseTags(rawTags));
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setTags(normaliseTags(rawTags));
  }, [rawTags]);

  const save = (next: string[]) => {
    const previous = tags;
    setTags(next);
    setError(false);
    patch.mutate(
      // `tags` is newer than the generated client types.
      { id: clientId, data: { tags: next } as never },
      {
        onError: () => {
          setTags(previous);
          setError(true);
        },
      }
    );
  };

  const commit = () => {
    const value = draft.trim();
    setDraft("");
    setAdding(false);
    if (!value || tags.some((x) => x.toLowerCase() === value.toLowerCase())) return;
    save([...tags, value]);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex h-5 items-center gap-1 rounded border px-1.5 text-[11px]">
          {tag}
          <button
            type="button"
            onClick={() => save(tags.filter((x) => x !== tag))}
            aria-label={t("removeTag", { tag })}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setDraft("");
              setAdding(false);
            }
          }}
          placeholder={t("tagPlaceholder")}
          aria-label={t("tagPlaceholder")}
          maxLength={40}
          className="h-5 w-24 rounded border border-input bg-background px-1.5 text-[11px] outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex h-5 items-center gap-0.5 rounded border border-dashed px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-2.5 w-2.5" />
          {t("addTag")}
        </button>
      )}
      {error && <span className="w-full text-[11px] text-destructive">{t("saveFailed")}</span>}
    </div>
  );
}

const NOTES_DEBOUNCE_MS = 800;

/** Client notes, saved automatically (debounced, and on blur). */
export function ClientNotesEditor({ clientId, notes }: { clientId: number; notes: string | null | undefined }) {
  const t = useTranslations("messagesBeta.rail");
  const patch = usePatchSocialClient();
  const [value, setValue] = useState(notes ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const savedRef = useRef(notes ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(notes ?? "");
    savedRef.current = notes ?? "";
  }, [clientId, notes]);

  const flush = (text: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (text === savedRef.current) return;
    patch.mutate(
      { id: clientId, data: { notes: text } },
      {
        onSuccess: () => {
          savedRef.current = text;
          setStatus("saved");
        },
        onError: () => setStatus("error"),
      }
    );
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return (
    <div className="flex flex-col gap-1">
      <textarea
        value={value}
        rows={3}
        onChange={(e) => {
          const text = e.target.value;
          setValue(text);
          setStatus("idle");
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => flush(text), NOTES_DEBOUNCE_MS);
        }}
        onBlur={() => flush(value)}
        placeholder={t("notesPlaceholder")}
        aria-label={t("notes")}
        className="resize-y rounded-md border border-input bg-background px-2.5 py-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
      />
      {status !== "idle" && (
        <span className={cn("text-[11px]", status === "error" ? "text-destructive" : "text-muted-foreground")}>
          {status === "error" ? t("saveFailed") : t("notesSaved")}
        </span>
      )}
    </div>
  );
}
