"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Check,
  Loader2,
  MessageSquare,
  MessageSquareText,
  Pause,
  Phone,
  PhoneForwarded,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Play,
  Star,
  Ticket,
} from "lucide-react";
import axios from "@/api/axios";
import { cn } from "@/lib/utils";
import { formatCallDateTime, formatMmSs } from "@/components/calls/call-format";
import { agentInitials, callNumber, durationSeconds, isMissedStatus, statusLabelKey, type CallLogRow } from "./calls-utils";

/** Grid columns of a row: agent + duration are hidden below md. */
export const CALL_ROW_COLS =
  "grid-cols-[28px_minmax(0,1fr)_44px_auto] md:grid-cols-[28px_minmax(0,1fr)_150px_72px_56px_96px]";

const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DirectionBadge({ log }: { log: Pick<CallLogRow, "direction" | "status"> }) {
  const missed = isMissedStatus(log.status);
  const Icon = missed ? PhoneMissed : log.direction === "inbound" ? PhoneIncoming : PhoneOutgoing;
  return (
    <span
      aria-hidden
      data-direction={missed ? "missed" : log.direction}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full",
        missed
          ? "bg-destructive/12 text-destructive"
          : log.direction === "inbound"
            ? "bg-ed-green/12 text-ed-green"
            : "bg-[#2563eb1f] text-[#2563eb] dark:text-[#60a5fa]"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

/** Recording bytes go through axios (auth header, API origin) into a blob URL. */
function useRecording(logId: number, active: boolean, onPlay: () => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [length, setLength] = useState(0);
  const pendingPlay = useRef(false);

  useEffect(() => () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  // Another row started playing: pause this one.
  useEffect(() => {
    if (!active && playing) audioRef.current?.pause();
  }, [active, playing]);

  useEffect(() => {
    if (blobUrl && pendingPlay.current && audioRef.current) {
      pendingPlay.current = false;
      audioRef.current.play().catch(() => setPlaying(false));
    }
  }, [blobUrl]);

  const toggle = useCallback(async () => {
    if (playing) {
      audioRef.current?.pause();
      return;
    }
    onPlay();
    if (blobUrl) {
      audioRef.current?.play().catch(() => setPlaying(false));
      return;
    }
    setError(false);
    setLoading(true);
    try {
      const response = await axios.get(`/api/call-logs/${logId}/recording/`, { responseType: "blob" });
      const blob = response.data as Blob;
      // Force the right MIME so Safari doesn't bail on application/octet-stream.
      const audioBlob = blob.type === "audio/wav" ? blob : new Blob([blob], { type: "audio/wav" });
      pendingPlay.current = true;
      setBlobUrl(URL.createObjectURL(audioBlob));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [playing, blobUrl, logId, onPlay]);

  const audio = blobUrl ? (
    <audio
      ref={audioRef}
      src={blobUrl}
      preload="auto"
      className="hidden"
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={() => {
        setPlaying(false);
        setPosition(0);
      }}
      onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => setLength(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
    />
  ) : null;

  return { audio, toggle, loading, error, playing, position, length };
}

interface CallRowProps {
  log: CallLogRow;
  expanded: boolean;
  isNew: boolean;
  /** The row whose recording may play (only one at a time). */
  playingId: number | null;
  onToggle: () => void;
  onPlay: (id: number) => void;
  onCallBack: (number: string) => void;
  onSaveNotes: (id: number, notes: string) => Promise<void>;
  onCreateTicket: () => void;
  savingNotes: boolean;
}

/** One call: the 48px summary row and, when expanded, notes + recording. */
export function CallRow({ log, expanded, isNew, playingId, onToggle, onPlay, onCallBack, onSaveNotes, onCreateTicket, savingNotes }: CallRowProps) {
  const t = useTranslations("calls.page");
  const tl = useTranslations("calls.logs");
  const locale = useLocale();
  const number = callNumber(log);
  const missed = isMissedStatus(log.status);
  const seconds = durationSeconds(log.duration);
  const startedAt = new Date(log.started_at);
  const hasRecording = !!log.recording_url;
  const statusKey = statusLabelKey(log.status);
  const status = statusKey ? tl(statusKey) : log.status;
  const [notes, setNotes] = useState(log.notes || "");
  const panelId = `call-${log.id}-details`;

  useEffect(() => {
    if (!expanded) setNotes(log.notes || "");
  }, [expanded, log.notes]);

  const play = useCallback(() => onPlay(log.id), [onPlay, log.id]);
  const rec = useRecording(log.id, playingId === log.id, play);
  const progress = rec.length > 0 ? Math.min(100, (rec.position / rec.length) * 100) : 0;
  const recLength = rec.length || seconds;

  return (
    <div className={cn("border-b", expanded && "bg-muted/35")} data-testid="call-row" data-call-id={log.id}>
      {rec.audio}
      <div
        onClick={onToggle}
        className={cn("grid h-12 cursor-pointer items-center gap-3 pl-4 pe-fab-safe hover:bg-muted/40", CALL_ROW_COLS)}
      >
        <DirectionBadge log={log} />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={`${log.client_name || number} · ${expanded ? t("hideDetails") : t("showDetails")}`}
          className="min-w-0 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[13px] font-medium leading-4" data-testid="call-name">
              {log.client_name || number}
            </span>
            {isNew && (
              <span className="inline-flex h-4 shrink-0 items-center rounded px-[5px] text-[10px] font-semibold text-ed-green bg-ed-green/12">
                {t("newChip")}
              </span>
            )}
            {log.transferred_to && <PhoneForwarded className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
          </span>
          <span className="block truncate text-[11px] leading-[14px] text-muted-foreground tabular-nums" data-testid="call-sub">
            {log.client_name ? `${number} · ${status}` : status}
          </span>
        </button>

        <span className="hidden min-w-0 items-center gap-1.5 text-xs text-muted-foreground md:flex">
          {log.handled_by_name ? (
            <>
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-[8px] font-semibold text-primary">
                {agentInitials(log.handled_by_name)}
              </span>
              <span className="truncate">{log.handled_by_name}</span>
            </>
          ) : (
            <span className="italic">{t("unanswered")}</span>
          )}
        </span>

        <span className="hidden font-mono text-xs text-muted-foreground md:block">{seconds > 0 ? formatMmSs(seconds) : "—"}</span>

        <span className="text-right text-xs tabular-nums md:text-left">{format(startedAt, "HH:mm")}</span>

        <span className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          {hasRecording && (
            <button
              type="button"
              onClick={() => rec.toggle()}
              disabled={rec.loading}
              className={cn(iconBtn, "hidden md:inline-flex", rec.playing && "text-foreground")}
              aria-label={rec.playing ? t("pauseRecording") : t("playRecording")}
              title={rec.playing ? t("pauseRecording") : t("playRecording")}
              data-testid="row-play"
            >
              {rec.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : rec.playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            className={cn(iconBtn, "hidden md:inline-flex", log.notes && "text-foreground")}
            aria-label={t("notes")}
            title={t("notes")}
            data-testid="row-notes"
          >
            {log.notes ? <MessageSquareText className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onCallBack(number)}
            className={cn(iconBtn, "hover:bg-ed-green/12 hover:text-ed-green", missed && "text-ed-green")}
            aria-label={`${t("callBack")} ${number}`}
            title={t("callBack")}
            data-testid="row-callback"
          >
            <Phone className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>

      {expanded && (
        <div
          id={panelId}
          className="grid grid-cols-1 gap-4 pb-3.5 pl-4 pe-fab-safe pt-1 md:grid-cols-[minmax(0,1fr)_280px] md:pl-14"
          data-testid="call-details"
        >
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${panelId}-notes`} className="text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">
              {t("notes")}
            </label>
            <textarea
              id={`${panelId}-notes`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              className="min-h-14 resize-y rounded-md border border-input bg-background px-2.5 py-2 text-[13px] leading-[18px] outline-none focus-visible:shadow-[0_0_0_3px_hsl(var(--foreground)/0.12)]"
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onSaveNotes(log.id, notes)}
                disabled={savingNotes || notes === (log.notes || "")}
                className="inline-flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                data-testid="save-note"
              >
                {savingNotes ? <Loader2 className="h-[13px] w-[13px] animate-spin" /> : <Check className="h-[13px] w-[13px]" />}
                {t("saveNote")}
              </button>
              <button
                type="button"
                onClick={onCreateTicket}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="create-ticket"
              >
                <Ticket className="h-[13px] w-[13px]" />
                {t("createTicket")}
              </button>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">{t("recording")}</span>
            {hasRecording ? (
              <div className="flex h-9 items-center gap-2 rounded-md border bg-background px-2" data-testid="recording-player">
                <button
                  type="button"
                  onClick={() => rec.toggle()}
                  disabled={rec.loading}
                  aria-label={rec.playing ? t("pauseRecording") : t("playRecording")}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  {rec.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : rec.playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </button>
                <span
                  className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label={t("recordingProgress")}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                >
                  <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progress}%` }} />
                </span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                  {formatMmSs(rec.position)} / {formatMmSs(recLength)}
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("noRecording")}</p>
            )}
            {rec.error && (
              <p className="text-xs text-destructive" role="alert">
                {t("recordingFailed")}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground tabular-nums" data-testid="call-meta">
              {log.direction === "inbound" ? t("inbound") : t("outbound")} · {formatCallDateTime(startedAt, locale)}
              {log.handled_by_name ? ` · ${log.handled_by_name}` : ""}
            </p>
            {log.transferred_to && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <PhoneForwarded className="h-3 w-3" aria-hidden />
                {t("transferredTo", { name: log.transferred_to_user_name || log.transferred_to })}
              </p>
            )}
            {log.call_quality_score != null && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground" data-testid="call-rating">
                <span className="flex" aria-hidden>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn("h-3 w-3", n <= (log.call_quality_score ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
                    />
                  ))}
                </span>
                {t("rating", { score: log.call_quality_score })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
