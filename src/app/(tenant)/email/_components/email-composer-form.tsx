"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DOMPurify from "dompurify";
import { Send, Loader2, ChevronDown, ChevronUp, X, ListRestart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import axios from "@/api/axios";

import type { EmailMessage } from "@/hooks/api/useSocial";
import {
  useSendEmail,
  useEmailStatus,
  useEmailSignature,
} from "@/hooks/api/useSocial";
import { useEmailContext } from "../_hooks/use-email-context";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const emailSchema = z.object({
  to_emails: z
    .array(z.string().email("Invalid email address"))
    .min(1, "At least one recipient is required"),
  cc_emails: z.array(z.string().email("Invalid email address")).optional(),
  bcc_emails: z.array(z.string().email("Invalid email address")).optional(),
  subject: z.string().min(1, "Subject is required"),
  body_text: z.string().min(1, "Message is required"),
  connection_id: z.number().optional(),
});

type EmailFormData = z.infer<typeof emailSchema>;

export function EmailComposerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentConnectionId } = useEmailContext();
  const t = useTranslations("email.compose");
  const { data: emailStatus } = useEmailStatus();
  const { data: signature } = useEmailSignature();
  const sendEmail = useSendEmail();

  const replyToId = searchParams.get("reply_to");
  const forwardId = searchParams.get("forward");

  // Fetch the original email if replying/forwarding
  const { data: originalEmail } = useQuery<EmailMessage>({
    queryKey: ["email-message", replyToId || forwardId],
    queryFn: async () => {
      const id = replyToId || forwardId;
      const response = await axios.get(`/api/social/email-messages/${id}/`);
      return response.data;
    },
    enabled: !!(replyToId || forwardId),
  });

  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showQuoted, setShowQuoted] = useState(true);
  const [quotedText, setQuotedText] = useState("");
  const [toInput, setToInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");

  const connections = emailStatus?.connections || [];

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

  // Reset form when navigating to fresh compose (no reply/forward params)
  useEffect(() => {
    if (!replyToId && !forwardId) {
      form.reset({
        to_emails: [],
        cc_emails: [],
        bcc_emails: [],
        subject: "",
        body_text: "",
        connection_id: currentConnectionId ?? connections[0]?.id,
      });
      setToInput("");
      setCcInput("");
      setBccInput("");
      setShowCcBcc(false);
      setQuotedText("");
    }
  }, [replyToId, forwardId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill form when replying or forwarding
  useEffect(() => {
    if (!originalEmail) return;

    const quoted = `On ${new Date(originalEmail.timestamp).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}, ${originalEmail.from_name} <${originalEmail.from_email}> wrote:\n\n${originalEmail.body_text}`;

    if (replyToId) {
      form.setValue("to_emails", [originalEmail.from_email]);
      form.setValue(
        "subject",
        originalEmail.subject.startsWith("Re:")
          ? originalEmail.subject
          : `Re: ${originalEmail.subject}`
      );
      form.setValue("body_text", "");
      setQuotedText(quoted);
      setShowQuoted(true);
      if (originalEmail.connection_id) {
        form.setValue("connection_id", originalEmail.connection_id);
      }
    } else if (forwardId) {
      form.setValue(
        "subject",
        originalEmail.subject.startsWith("Fwd:")
          ? originalEmail.subject
          : `Fwd: ${originalEmail.subject}`
      );
      form.setValue("body_text", "");
      setQuotedText(`---------- Forwarded message ----------\nFrom: ${originalEmail.from_name} <${originalEmail.from_email}>\nDate: ${new Date(originalEmail.timestamp).toLocaleDateString()}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body_text}`);
      setShowQuoted(true);
      if (originalEmail.connection_id) {
        form.setValue("connection_id", originalEmail.connection_id);
      }
    }
  }, [originalEmail, replyToId, forwardId, form]);

  // Set default connection when data loads
  useEffect(() => {
    if (!form.getValues("connection_id") && connections.length > 0) {
      form.setValue(
        "connection_id",
        currentConnectionId ?? connections[0]?.id
      );
    }
  }, [connections, currentConnectionId, form]);

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

  const onSubmit = async (data: EmailFormData) => {
    try {
      const fullText = quotedText
        ? `${data.body_text}\n\n${quotedText}`
        : data.body_text;
      const bodyHtml = `<div>${fullText.replace(/\n/g, "<br/>")}</div>`;

      await sendEmail.mutateAsync({
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
        body_text: fullText,
        body_html: bodyHtml,
        connection_id: data.connection_id,
        reply_to_message_id: replyToId ? Number(replyToId) : undefined,
      });

      toast({
        title: t("sent"),
        description: t("sentDescription"),
      });

      router.push("/email/INBOX");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast({
        title: t("sendFailed"),
        description:
          err.response?.data?.error || t("sendError"),
        variant: "destructive",
      });
    }
  };

  const toEmails = form.watch("to_emails") || [];
  const ccEmails = form.watch("cc_emails") || [];
  const bccEmails = form.watch("bcc_emails") || [];

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="h-full flex flex-col justify-between gap-3"
      >
        <div className="px-3 space-y-3">
          {/* From (Connection Select) */}
          {connections.length > 1 && (
            <FormField
              control={form.control}
              name="connection_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("from")}</FormLabel>
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) =>
                      field.onChange(parseInt(value, 10))
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
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
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* To */}
          <FormField
            control={form.control}
            name="to_emails"
            render={() => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>{t("to")}</FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground h-auto py-0"
                    onClick={() => setShowCcBcc(!showCcBcc)}
                  >
                    {showCcBcc ? (
                      <ChevronUp className="h-3 w-3 mr-1" />
                    ) : (
                      <ChevronDown className="h-3 w-3 mr-1" />
                    )}
                    {showCcBcc ? t("hideCcBcc") : t("showCcBcc")}
                  </Button>
                </div>
                <FormControl>
                  <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[40px] focus-within:ring-2 focus-within:ring-ring">
                    {toEmails.map((email) => (
                      <Badge key={email} variant="secondary" className="gap-1">
                        {email}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeEmail("to_emails", email)}
                        />
                      </Badge>
                    ))}
                    <input
                      type="text"
                      className="flex-1 min-w-[200px] outline-none bg-transparent text-sm"
                      placeholder={
                        toEmails.length === 0 ? t("recipientPlaceholder") : ""
                      }
                      value={toInput}
                      onChange={(e) => setToInput(e.target.value)}
                      onKeyDown={(e) =>
                        handleKeyDown(e, "to_emails", toInput, setToInput)
                      }
                      onBlur={() =>
                        handleBlur("to_emails", toInput, setToInput)
                      }
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* CC */}
          {showCcBcc && (
            <>
              <FormField
                control={form.control}
                name="cc_emails"
                render={() => (
                  <FormItem>
                    <FormLabel>{t("cc")}</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[40px] focus-within:ring-2 focus-within:ring-ring">
                        {ccEmails.map((email) => (
                          <Badge
                            key={email}
                            variant="secondary"
                            className="gap-1"
                          >
                            {email}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeEmail("cc_emails", email)}
                            />
                          </Badge>
                        ))}
                        <input
                          type="text"
                          className="flex-1 min-w-[200px] outline-none bg-transparent text-sm"
                          placeholder={
                            ccEmails.length === 0 ? t("ccPlaceholder") : ""
                          }
                          value={ccInput}
                          onChange={(e) => setCcInput(e.target.value)}
                          onKeyDown={(e) =>
                            handleKeyDown(e, "cc_emails", ccInput, setCcInput)
                          }
                          onBlur={() =>
                            handleBlur("cc_emails", ccInput, setCcInput)
                          }
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* BCC */}
              <FormField
                control={form.control}
                name="bcc_emails"
                render={() => (
                  <FormItem>
                    <FormLabel>{t("bcc")}</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[40px] focus-within:ring-2 focus-within:ring-ring">
                        {bccEmails.map((email) => (
                          <Badge
                            key={email}
                            variant="secondary"
                            className="gap-1"
                          >
                            {email}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeEmail("bcc_emails", email)}
                            />
                          </Badge>
                        ))}
                        <input
                          type="text"
                          className="flex-1 min-w-[200px] outline-none bg-transparent text-sm"
                          placeholder={
                            bccEmails.length === 0 ? t("bccPlaceholder") : ""
                          }
                          value={bccInput}
                          onChange={(e) => setBccInput(e.target.value)}
                          onKeyDown={(e) =>
                            handleKeyDown(
                              e,
                              "bcc_emails",
                              bccInput,
                              setBccInput
                            )
                          }
                          onBlur={() =>
                            handleBlur("bcc_emails", bccInput, setBccInput)
                          }
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
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
              <FormItem>
                <FormControl>
                  <Input type="text" placeholder={t("subject")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Body */}
          <FormField
            control={form.control}
            name="body_text"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder={t("messagePlaceholder")}
                    className={quotedText ? "min-h-[120px] resize-y" : "min-h-[200px] resize-y"}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Quoted original message */}
          {quotedText && (
            <div className="space-y-1">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowQuoted(!showQuoted)}
              >
                {showQuoted ? t("hideQuoted") : t("showQuoted")}
              </button>
              {showQuoted && (
                <div className="rounded-md border border-border bg-muted p-3">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                    {quotedText}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Signature Preview */}
          {signature?.is_enabled && signature.signature_html && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">{t("signatureNote")}</span>
              <div
                className="mt-1 p-2 bg-muted rounded text-foreground"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(signature.signature_html),
                }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center p-3 border-t border-border">
          <Button
            type="reset"
            variant="ghost"
            size="icon"
            onClick={() => {
              form.reset();
              setToInput("");
              setCcInput("");
              setBccInput("");
            }}
          >
            <ListRestart className="h-4 w-4" />
          </Button>

          <Button type="submit" disabled={sendEmail.isPending}>
            {sendEmail.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("sending")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t("send")}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
