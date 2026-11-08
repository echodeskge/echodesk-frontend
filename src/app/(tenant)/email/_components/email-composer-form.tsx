"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DOMPurify from "dompurify";
import {
  Send,
  Loader2,
  X,
  Trash2,
  Paperclip,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import axios from "@/api/axios";

import type { EmailMessage } from "@/hooks/api/useSocial";
import {
  useSendEmail,
  useEmailStatus,
  useEmailSignature,
  useEmailDraft,
  useCreateEmailDraft,
  useUpdateEmailDraft,
  useDeleteEmailDraft,
} from "@/hooks/api/useSocial";
import {
  type ComposeMode,
  type ComposeDraftState,
  buildComposedHtml,
  buildComposedText,
  buildQuotedHtml,
  buildQuotedText,
  composeStateToDraftPayload,
  computeReplyRecipients,
  draftToComposeState,
  isComposeStateEmpty,
  prefixSubject,
  resolveComposeSignature,
  sendErrorDescription,
  sendResultProblems,
} from "@/lib/email-compose";
import { prepareEmailHtml } from "@/lib/email-reading";
import { useEmailContext } from "../_hooks/use-email-context";
import { EmailHtmlFrame } from "./email-view-content-body";
import { EmailTemplatePicker } from "./email-template-picker";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { FileDropzone } from "@/components/FileDropzone";
import { EditableSignature } from "@/components/email/EditableSignature";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AUTOSAVE_DELAY_MS = 2000;

function parseId(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmailComposerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentConnectionId, lastFilter } = useEmailContext();
  const t = useTranslations("email.compose");
  const locale = useLocale();
  const { data: emailStatus } = useEmailStatus();
  const { data: legacySignature } = useEmailSignature();
  const sendEmail = useSendEmail();
  const createDraft = useCreateEmailDraft();
  const updateDraft = useUpdateEmailDraft();
  const deleteDraft = useDeleteEmailDraft();

  // ---- Compose context from the URL -------------------------------------
  const replyToParam = parseId(searchParams.get("reply_to"));
  const replyAllParam = parseId(searchParams.get("reply_all"));
  const forwardParam = parseId(searchParams.get("forward"));
  const draftParam = parseId(searchParams.get("draft"));

  const urlMode: ComposeMode = forwardParam
    ? "forward"
    : replyAllParam
      ? "replyAll"
      : replyToParam
        ? "reply"
        : "new";
  const urlOriginalId = forwardParam ?? replyAllParam ?? replyToParam ?? null;
  const sessionKey = `${urlMode}:${urlOriginalId ?? ""}:${draftParam ?? ""}`;

  const { data: draft, isError: draftError } = useEmailDraft(draftParam);

  // A draft decides its own mode/original once loaded.
  const [ctx, setCtx] = useState<{ mode: ComposeMode; originalId: number | null }>({
    mode: urlMode,
    originalId: urlOriginalId,
  });
  useEffect(() => {
    if (draftParam) {
      if (draft) {
        const st = draftToComposeState(draft);
        setCtx({ mode: st.mode, originalId: st.originalId });
      }
    } else {
      setCtx({ mode: urlMode, originalId: urlOriginalId });
    }
  }, [sessionKey, draft]); // eslint-disable-line react-hooks/exhaustive-deps
  const { mode, originalId } = ctx;

  const { data: originalEmail } = useQuery<EmailMessage>({
    queryKey: ["email-message", originalId],
    queryFn: async () => {
      const response = await axios.get(`/api/social/email-messages/${originalId}/`);
      return response.data;
    },
    enabled: originalId !== null,
  });

  // ---- Local state --------------------------------------------------------
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showQuoted, setShowQuoted] = useState(true);
  const [toInput, setToInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [signatureHtml, setSignatureHtml] = useState<string | null>(null);
  const [signatureLegacy, setSignatureLegacy] = useState(false);
  const [signatureKey, setSignatureKey] = useState(0);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const { data: profile } = useUserProfile();

  const connections = useMemo(() => emailStatus?.connections || [], [emailStatus]);

  const emailSchema = useMemo(
    () =>
      z.object({
        to_emails: z
          .array(z.string().email(t("invalidEmail")))
          .min(1, t("recipientRequired")),
        cc_emails: z.array(z.string().email(t("invalidEmail"))).optional(),
        bcc_emails: z.array(z.string().email(t("invalidEmail"))).optional(),
        subject: z.string().min(1, t("subjectRequired")),
        // Required for a new message only — a reply/forward carries the quote.
        body_text: z.string(),
        connection_id: z.number().optional(),
      }),
    [t]
  );
  type EmailFormData = z.infer<typeof emailSchema>;

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      to_emails: [],
      cc_emails: [],
      bcc_emails: [],
      subject: "",
      body_text: "",
      connection_id: currentConnectionId ?? connections[0]?.id,
    },
  });

  // ---- Refs for the autosave closure -------------------------------------
  const hydratedKeyRef = useRef<string | null>(null);
  const baselineRef = useRef<string>("");
  const draftIdRef = useRef<number | null>(null);
  const signatureRef = useRef<string | null>(null);
  const ctxRef = useRef(ctx);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<Promise<void> | null>(null);
  const sendingRef = useRef(false);
  draftIdRef.current = draftId;
  signatureRef.current = signatureHtml;
  ctxRef.current = ctx;

  const snapshot = useCallback((): ComposeDraftState => {
    const v = form.getValues();
    return {
      to: v.to_emails || [],
      cc: v.cc_emails || [],
      bcc: v.bcc_emails || [],
      subject: v.subject || "",
      bodyText: v.body_text || "",
      connectionId: v.connection_id,
      mode: ctxRef.current.mode,
      originalId: ctxRef.current.originalId,
      signatureHtml: signatureRef.current,
    };
  }, [form]);

  const applySignature = useCallback(
    (connectionId: number | undefined, forMode: ComposeMode) => {
      const conn = connections.find((c) => c.id === connectionId);
      const sig = resolveComposeSignature(conn, forMode);
      setSignatureLegacy(sig === undefined && !!conn);
      setSignatureHtml(sig ? sig.html : null);
      signatureRef.current = sig ? sig.html : null;
      setSignatureKey((k) => k + 1);
    },
    [connections]
  );

  // ---- Hydrate once per compose session ----------------------------------
  useEffect(() => {
    if (hydratedKeyRef.current === sessionKey) return;
    if (!emailStatus) return; // need connections to resolve the signature
    if (draftParam && !draft) return;
    if (!draftParam && urlOriginalId !== null && originalEmail?.id !== urlOriginalId) return;

    // A different compose session replaces this one: drop the pending save
    // (unmount flushes it when the user navigates away instead).
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const resetInputs = () => {
      setToInput("");
      setCcInput("");
      setBccInput("");
      setAttachments([]);
      setShowQuoted(true);
      setDraftStatus("idle");
    };

    if (draftParam && draft) {
      const st = draftToComposeState(draft);
      ctxRef.current = { mode: st.mode, originalId: st.originalId };
      form.reset({
        to_emails: st.to,
        cc_emails: st.cc,
        bcc_emails: st.bcc,
        subject: st.subject,
        body_text: st.bodyText,
        connection_id: st.connectionId ?? currentConnectionId ?? connections[0]?.id,
      });
      resetInputs();
      setShowCcBcc(st.cc.length > 0 || st.bcc.length > 0);
      setDraftId(draft.id);
      draftIdRef.current = draft.id;
      if (st.signatureHtml !== null) {
        setSignatureHtml(st.signatureHtml);
        signatureRef.current = st.signatureHtml;
        setSignatureLegacy(false);
        setSignatureKey((k) => k + 1);
      } else if (st.signatureRemoved) {
        // Saved by this composer without a signature (the user removed it):
        // keep it that way instead of re-inserting the mailbox signature.
        const conn = connections.find((c) => c.id === st.connectionId);
        setSignatureLegacy(resolveComposeSignature(conn, st.mode) === undefined && !!conn);
        setSignatureHtml(null);
        signatureRef.current = null;
        setSignatureKey((k) => k + 1);
      } else {
        // Drafts without a signature block (e.g. written by the mobile app)
        // get the mailbox's effective signature, as a fresh message would.
        applySignature(st.connectionId, st.mode);
      }
    } else if (urlOriginalId !== null && originalEmail) {
      const ownAddresses = connections.map((c) => c.email_address);
      const connectionId =
        originalEmail.connection_id ?? currentConnectionId ?? connections[0]?.id;
      if (urlMode === "forward") {
        form.reset({
          to_emails: [],
          cc_emails: [],
          bcc_emails: [],
          subject: prefixSubject(originalEmail.subject, "forward"),
          body_text: "",
          connection_id: connectionId,
        });
        setShowCcBcc(false);
      } else {
        const { to, cc } = computeReplyRecipients(
          originalEmail,
          ownAddresses,
          urlMode === "replyAll"
        );
        form.reset({
          to_emails: to,
          cc_emails: cc,
          bcc_emails: [],
          subject: prefixSubject(originalEmail.subject, "reply"),
          body_text: "",
          connection_id: connectionId,
        });
        setShowCcBcc(cc.length > 0);
      }
      resetInputs();
      setDraftId(null);
      draftIdRef.current = null;
      ctxRef.current = { mode: urlMode, originalId: urlOriginalId };
      applySignature(connectionId, urlMode);
    } else {
      const connectionId = currentConnectionId ?? connections[0]?.id;
      form.reset({
        to_emails: [],
        cc_emails: [],
        bcc_emails: [],
        subject: "",
        body_text: "",
        connection_id: connectionId,
      });
      resetInputs();
      setShowCcBcc(false);
      setDraftId(null);
      draftIdRef.current = null;
      ctxRef.current = { mode: "new", originalId: null };
      applySignature(connectionId, "new");
    }

    hydratedKeyRef.current = sessionKey;
    baselineRef.current = JSON.stringify(snapshot());
  }, [sessionKey, emailStatus, draft, originalEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Draft autosave -----------------------------------------------------
  const saveDraft = useCallback(async () => {
    if (sendingRef.current) return;
    if (inflightRef.current) await inflightRef.current;
    if (sendingRef.current) return;
    const state = snapshot();
    const id = draftIdRef.current;
    if (!id) {
      if (isComposeStateEmpty(state)) return;
      if (JSON.stringify(state) === baselineRef.current) return;
    }
    const payload = composeStateToDraftPayload(state);
    setDraftStatus("saving");
    const run = (async () => {
      try {
        if (id) {
          await updateDraft.mutateAsync({ id, data: payload });
        } else {
          const created = await createDraft.mutateAsync(payload);
          draftIdRef.current = created.id;
          setDraftId(created.id);
        }
        setDraftStatus("saved");
      } catch {
        setDraftStatus("error");
      }
    })();
    inflightRef.current = run;
    await run;
    if (inflightRef.current === run) inflightRef.current = null;
  }, [snapshot, createDraft, updateDraft]);

  const saveDraftRef = useRef(saveDraft);
  saveDraftRef.current = saveDraft;

  const scheduleAutosave = useCallback(() => {
    if (hydratedKeyRef.current === null || sendingRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void saveDraftRef.current();
    }, AUTOSAVE_DELAY_MS);
  }, []);

  useEffect(() => {
    const sub = form.watch(() => scheduleAutosave());
    return () => sub.unsubscribe();
  }, [form, scheduleAutosave]);

  // Flush a pending autosave when leaving the composer.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        void saveDraftRef.current();
      }
    };
  }, []);

  // ---- Quote of the original ---------------------------------------------
  const quoteLabels = useMemo(
    () => ({
      from: t("quoteFrom"),
      sent: t("quoteSent"),
      to: t("quoteTo"),
      cc: t("quoteCc"),
      subject: t("quoteSubject"),
      forwardedMessage: t("forwardedMessage"),
    }),
    [t]
  );
  const showOriginal = mode !== "new" && !!originalEmail && originalEmail.id === originalId;
  const quoteHtml = useMemo(
    () => (showOriginal && originalEmail ? buildQuotedHtml(originalEmail, mode, quoteLabels, locale) : ""),
    [showOriginal, originalEmail, mode, quoteLabels, locale]
  );
  // Preview of the quote: the original is untrusted HTML, so it is shown like
  // in the reading pane — in a sandboxed iframe with remote images blocked —
  // never injected into the app DOM. The outgoing body keeps quoteHtml.
  const quotePreviewDoc = useMemo(
    () =>
      quoteHtml
        ? prepareEmailHtml(quoteHtml, {
            attachments: originalEmail?.attachments,
            extraCss: "body { font-size: 12px; color: #4b5563; }",
          }).srcDoc
        : "",
    [quoteHtml, originalEmail?.attachments]
  );
  const quoteText = useMemo(
    () => (showOriginal && originalEmail ? buildQuotedText(originalEmail, mode, quoteLabels, locale) : ""),
    [showOriginal, originalEmail, mode, quoteLabels, locale]
  );
  const forwardedAttachments =
    mode === "forward" && showOriginal ? originalEmail?.attachments || [] : [];

  // ---- Recipients ---------------------------------------------------------
  const addEmail = (
    field: "to_emails" | "cc_emails" | "bcc_emails",
    email: string
  ) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast({
        title: t("invalidEmail"),
        description: t("invalidEmailDescription", { email: trimmedEmail }),
        variant: "destructive",
      });
      return false;
    }

    const currentEmails = form.getValues(field) || [];
    if (!currentEmails.includes(trimmedEmail)) {
      form.setValue(field, [...currentEmails, trimmedEmail]);
    }
    return true;
  };

  const removeEmail = (
    field: "to_emails" | "cc_emails" | "bcc_emails",
    email: string
  ) => {
    const currentEmails = form.getValues(field) || [];
    form.setValue(
      field,
      currentEmails.filter((e) => e !== email)
    );
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: "to_emails" | "cc_emails" | "bcc_emails",
    inputValue: string,
    setInputValue: (value: string) => void
  ) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      if (addEmail(field, inputValue)) {
        setInputValue("");
      }
    }
  };

  const handleBlur = (
    field: "to_emails" | "cc_emails" | "bcc_emails",
    inputValue: string,
    setInputValue: (value: string) => void
  ) => {
    if (inputValue.trim()) {
      if (addEmail(field, inputValue)) {
        setInputValue("");
      }
    }
  };

  const originalViewHref =
    originalEmail && originalId !== null
      ? `/email/${encodeURIComponent(originalEmail.folder || "INBOX")}/${originalEmail.id}`
      : null;

  // ---- Send ---------------------------------------------------------------
  const onSubmit = async (data: EmailFormData) => {
    if (mode === "new" && !data.body_text.trim()) {
      form.setError("body_text", { message: t("messageRequired") });
      return;
    }
    sendingRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (inflightRef.current) await inflightRef.current;

    try {
      const signatureIncluded = !signatureLegacy;
      const sig = signatureIncluded ? signatureHtml : null;
      const bodyHtml = buildComposedHtml({
        text: data.body_text,
        signatureHtml: sig,
        quoteHtml,
      });
      const bodyText = buildComposedText(data.body_text, sig, quoteText);
      const currentDraftId = draftIdRef.current;

      const result = await sendEmail.mutateAsync({
        to_emails: data.to_emails,
        cc_emails:
          data.cc_emails && data.cc_emails.length > 0
            ? data.cc_emails
            : undefined,
        bcc_emails:
          data.bcc_emails && data.bcc_emails.length > 0
            ? data.bcc_emails
            : undefined,
        subject: data.subject,
        body_text: bodyText,
        body_html: bodyHtml,
        connection_id: data.connection_id,
        reply_to_message_id:
          (mode === "reply" || mode === "replyAll") && originalId !== null
            ? originalId
            : undefined,
        forward_message_id:
          mode === "forward" && originalId !== null ? originalId : undefined,
        signature_included: signatureIncluded ? true : undefined,
        draft_id: currentDraftId ?? undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      const problems = sendResultProblems(result);
      if (problems) {
        // Sent, but not to everyone / not stored: tell the user what failed.
        toast({
          title: t("sentWithProblems"),
          description: [
            problems.refused.length
              ? t("refusedRecipients", { list: problems.refused.join(", ") })
              : "",
            ...problems.warnings,
          ]
            .filter(Boolean)
            .join(" "),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("sent"),
          description: t("sentDescription"),
        });
      }

      setAttachments([]);
      setDraftId(null);
      draftIdRef.current = null;
      // Outlook: after replying/forwarding you stay on the conversation.
      router.push(originalViewHref ?? "/email/INBOX");
    } catch (error: unknown) {
      sendingRef.current = false;
      toast({
        title: t("sendFailed"),
        description: sendErrorDescription(error, t("sendError")),
        variant: "destructive",
      });
    }
  };

  // ---- Discard ------------------------------------------------------------
  const handleDiscard = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const id = draftIdRef.current;
    if (id) {
      deleteDraft.mutate(id);
    }
    setDraftId(null);
    draftIdRef.current = null;
    setDiscardOpen(false);
    setToInput("");
    setCcInput("");
    setBccInput("");
    setAttachments([]);
    setDraftStatus("idle");

    if (originalViewHref) {
      router.push(originalViewHref);
      return;
    }
    const connectionId = currentConnectionId ?? connections[0]?.id;
    form.reset({
      to_emails: [],
      cc_emails: [],
      bcc_emails: [],
      subject: "",
      body_text: "",
      connection_id: connectionId,
    });
    ctxRef.current = { mode: "new", originalId: null };
    setCtx({ mode: "new", originalId: null });
    applySignature(connectionId, "new");
    baselineRef.current = JSON.stringify(snapshot());
    if (draftParam) router.replace("/email/compose");
  };

  const toEmails = form.watch("to_emails") || [];
  const ccEmails = form.watch("cc_emails") || [];
  const bccEmails = form.watch("bcc_emails") || [];

  if (draftParam && draftError) {
    return (
      <div className="p-6 text-sm text-destructive">{t("draftLoadFailed")}</div>
    );
  }

  const composeTitle =
    mode === "forward" ? t("titleForward") : mode === "reply" || mode === "replyAll" ? t("titleReply") : t("title");
  const closeHref = originalViewHref ?? `/email/${encodeURIComponent(lastFilter || "INBOX")}`;
  const fromConnection = connections.find((c) => c.id === form.watch("connection_id")) ?? connections[0];
  const templateVariables = {
    customer_name: originalEmail?.from_name || originalEmail?.from_email || undefined,
    agent_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || undefined,
  };
  const insertTemplate = (text: string) => {
    const current = form.getValues("body_text") || "";
    form.setValue("body_text", current.trim() ? `${current.replace(/\s+$/, "")}\n\n${text}` : text, {
      shouldDirty: true,
    });
    scheduleAutosave();
  };
  const rowClass = "flex min-h-10 items-center gap-2 border-b border-border px-4";
  const labelClass = "min-w-12 shrink-0 whitespace-nowrap pe-1 text-[13px] text-muted-foreground";
  const chipInput = (
    field: "to_emails" | "cc_emails" | "bcc_emails",
    emails: string[],
    value: string,
    setValue: (v: string) => void,
    placeholder: string,
    label: string
  ) => (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-1.5">
      {emails.map((email) => (
        <span key={email} className="inline-flex h-6 items-center gap-1 rounded-md bg-muted px-1.5 text-xs">
          {email}
          <X className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => removeEmail(field, email)} />
        </span>
      ))}
      <input
        type="text"
        aria-label={label}
        className="min-w-[160px] flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
        placeholder={emails.length === 0 ? placeholder : ""}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, field, value, setValue)}
        onBlur={() => handleBlur(field, value, setValue)}
      />
    </div>
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* Header (44px): title + close */}
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border pe-2 ps-4">
          <h2 className="text-[13px] font-semibold">{composeTitle}</h2>
          <span className="text-[11px] text-muted-foreground" aria-live="polite">
            {draftStatus === "saving" && t("draftSaving")}
            {draftStatus === "saved" && t("draftSaved")}
            {draftStatus === "error" && t("draftSaveFailed")}
          </span>
          <button
            type="button"
            onClick={() => router.push(closeHref)}
            className="ms-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t("close")}
            title={t("close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* From */}
          <FormField
            control={form.control}
            name="connection_id"
            render={({ field }) => (
              <FormItem className={rowClass + " space-y-0"}>
                <FormLabel className={labelClass + " font-normal"}>{t("from")}</FormLabel>
                {connections.length > 1 ? (
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => {
                      const id = parseInt(value, 10);
                      field.onChange(id);
                      // Outlook swaps the signature with the From account.
                      applySignature(id, mode);
                      scheduleAutosave();
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8 w-auto max-w-full border-0 px-0 text-[13px] shadow-none focus:ring-0">
                        <SelectValue placeholder={t("selectAccount")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {connections.map((conn) => (
                        <SelectItem key={conn.id} value={conn.id.toString()}>
                          {conn.display_name || conn.email_address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="truncate text-[13px]">
                    {fromConnection
                      ? fromConnection.display_name
                        ? `${fromConnection.display_name} <${fromConnection.email_address}>`
                        : fromConnection.email_address
                      : "—"}
                  </span>
                )}
              </FormItem>
            )}
          />

          {/* To (+ Cc / Bcc toggle) */}
          <FormField
            control={form.control}
            name="to_emails"
            render={() => (
              <FormItem className="space-y-0">
                <div className={rowClass}>
                  <FormLabel className={labelClass + " font-normal"}>{t("to")}</FormLabel>
                  <FormControl>
                    {chipInput("to_emails", toEmails, toInput, setToInput, t("recipientPlaceholder"), t("to"))}
                  </FormControl>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCcBcc(!showCcBcc)}
                    aria-expanded={showCcBcc}
                  >
                    {showCcBcc ? t("hideCcBcc") : t("showCcBcc")}
                  </button>
                </div>
                <FormMessage className="px-4 pt-1 text-xs" />
              </FormItem>
            )}
          />

          {showCcBcc && (
            <>
              <FormField
                control={form.control}
                name="cc_emails"
                render={() => (
                  <FormItem className="space-y-0">
                    <div className={rowClass}>
                      <FormLabel className={labelClass + " font-normal"}>{t("cc")}</FormLabel>
                      <FormControl>
                        {chipInput("cc_emails", ccEmails, ccInput, setCcInput, t("ccPlaceholder"), t("cc"))}
                      </FormControl>
                    </div>
                    <FormMessage className="px-4 pt-1 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bcc_emails"
                render={() => (
                  <FormItem className="space-y-0">
                    <div className={rowClass}>
                      <FormLabel className={labelClass + " font-normal"}>{t("bcc")}</FormLabel>
                      <FormControl>
                        {chipInput("bcc_emails", bccEmails, bccInput, setBccInput, t("bccPlaceholder"), t("bcc"))}
                      </FormControl>
                    </div>
                    <FormMessage className="px-4 pt-1 text-xs" />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Subject */}
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <div className={rowClass}>
                  <FormLabel className={labelClass + " font-normal"}>{t("subjectLabel")}</FormLabel>
                  <FormControl>
                    <input
                      type="text"
                      placeholder={t("subject")}
                      className="h-10 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage className="px-4 pt-1 text-xs" />
              </FormItem>
            )}
          />

          {/* Body: new text, then signature, then the quoted original */}
          <FormField
            control={form.control}
            name="body_text"
            render={({ field }) => (
              <FormItem className="space-y-0 px-4">
                <FormControl>
                  <Textarea
                    placeholder={t("messagePlaceholder")}
                    className="min-h-[200px] resize-y rounded-none border-0 px-0 py-3.5 text-[13px] leading-5 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    {...field}
                  />
                </FormControl>

                {signatureHtml !== null && !signatureLegacy && (
                  <EditableSignature
                    html={signatureHtml}
                    resetKey={signatureKey}
                    label={t("signatureLabel")}
                    removeLabel={t("removeSignature")}
                    onChange={(html) => {
                      signatureRef.current = html;
                      setSignatureHtml(html);
                      scheduleAutosave();
                    }}
                    onRemove={() => {
                      signatureRef.current = null;
                      setSignatureHtml(null);
                      scheduleAutosave();
                    }}
                  />
                )}

                {quoteHtml && (
                  <div className="space-y-1 pb-3">
                    <button
                      type="button"
                      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setShowQuoted(!showQuoted)}
                    >
                      {showQuoted ? t("hideQuoted") : t("showQuoted")}
                    </button>
                    {showQuoted && (
                      <div
                        data-testid="compose-quote"
                        className="max-h-[400px] overflow-auto border-s-2 border-border py-2 ps-3"
                      >
                        <EmailHtmlFrame
                          srcDoc={quotePreviewDoc}
                          title={t("quotedOriginal")}
                        />
                      </div>
                    )}
                  </div>
                )}
                <FormMessage className="pb-2 text-xs" />
              </FormItem>
            )}
          />

          {/* Legacy backend: it appends the workspace signature itself */}
          {signatureLegacy && legacySignature?.is_enabled && legacySignature.signature_html && (
            <div className="px-4 pb-3 text-xs text-muted-foreground">
              <span className="font-medium">{t("signatureNote")}</span>
              <div
                className="mt-1 rounded bg-muted p-2 text-foreground"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(legacySignature.signature_html),
                }}
              />
            </div>
          )}

          {/* Attachments of the forwarded message (re-attached by the backend) */}
          {forwardedAttachments.length > 0 && (
            <div className="space-y-1 px-4 pb-3">
              <p className="text-xs text-muted-foreground">{t("forwardedAttachments")}</p>
              <div className="flex flex-wrap gap-1.5" data-testid="forwarded-attachments">
                {forwardedAttachments.map((att, i) => (
                  <span
                    key={`${att.filename}-${i}`}
                    className="inline-flex h-[30px] items-center gap-1.5 rounded-md border border-border pe-2.5 ps-2 text-xs"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="max-w-[220px] truncate">{att.filename}</span>
                    {att.size ? (
                      <span className="text-[11px] text-muted-foreground">{formatSize(att.size)}</span>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attachments (shown once Attach is pressed or files were added) */}
          {(showAttach || attachments.length > 0) && (
            <div className="space-y-1 px-4 pb-4" data-testid="compose-attachments">
              <p className="text-xs text-muted-foreground">{t("attachments")}</p>
              <FileDropzone
                onFilesSelected={(files) =>
                  setAttachments((prev) => [...prev, ...files])
                }
                files={attachments.map((file) => ({ file }))}
                onRemoveFile={(index) =>
                  setAttachments((prev) => prev.filter((_, i) => i !== index))
                }
                maxFiles={10}
                maxSize={25 * 1024 * 1024}
              />
            </div>
          )}
        </div>

        {/* Footer (52px): Send, Attach, Template · Save draft, Discard */}
        <div className="flex h-[52px] shrink-0 items-center gap-1 border-t border-border ps-3 pe-3 sm:pe-fab-safe">
          <Button type="submit" disabled={sendEmail.isPending} className="h-8 gap-1.5 px-3 text-[13px]">
            {sendEmail.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("sending")}
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                {t("send")}
              </>
            )}
          </Button>
          <button
            type="button"
            onClick={() => setShowAttach((v) => !v)}
            aria-pressed={showAttach}
            aria-label={t("attach")}
            title={t("attach")}
            className="ms-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            data-testid="email-attach"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <EmailTemplatePicker variables={templateVariables} onInsert={insertTemplate} />
          <button
            type="button"
            onClick={() => void saveDraft()}
            className="ms-auto inline-flex h-8 items-center rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            data-testid="email-save-draft"
          >
            {t("saveDraft")}
          </button>
          <button
            type="button"
            aria-label={t("discard")}
            title={t("discard")}
            onClick={() => setDiscardOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </form>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("discardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("discardDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keepEditing")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("discardConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
