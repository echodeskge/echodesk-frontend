"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DOMPurify from "dompurify";
import { Send, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileDropzone } from "@/components/FileDropzone";
import { useSendEmail, useEmailStatus, useEmailSignature } from "@/hooks/api/useSocial";
import type { EmailConnectionDetail } from "@/hooks/api/useSocial";
import { EditableSignature } from "@/components/email/EditableSignature";
import {
  buildComposedHtml,
  buildComposedText,
  resolveComposeSignature,
  sendErrorDescription,
  sendResultProblems,
} from "@/lib/email-compose";

function buildSchema(t: (key: string) => string) {
  return z.object({
    to_emails: z.array(z.string().email(t("invalidEmail"))).min(1, t("recipientRequired")),
    cc_emails: z.array(z.string().email(t("invalidEmail"))).optional(),
    bcc_emails: z.array(z.string().email(t("invalidEmail"))).optional(),
    subject: z.string().min(1, t("subjectRequired")),
    body_text: z.string().min(1, t("messageRequired")),
    connection_id: z.number().optional(),
  });
}

type EmailFormData = z.infer<ReturnType<typeof buildSchema>>;

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ComposeEmailDialog({ open, onOpenChange, onSuccess }: ComposeEmailDialogProps) {
  const { toast } = useToast();
  const t = useTranslations("chat.composeEmail");
  const emailSchema = useMemo(() => buildSchema(t), [t]);
  // Only fetch email status when dialog is open
  const { data: emailStatus } = useEmailStatus({ enabled: open });
  const { data: signature } = useEmailSignature();
  const sendEmail = useSendEmail();

  const [showCcBcc, setShowCcBcc] = useState(false);
  const [toInput, setToInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  // Signature inserted into the editable body (null = none / removed).
  const [signatureHtml, setSignatureHtml] = useState<string | null>(null);
  // Older backends have no effective_signature and append it themselves.
  const [signatureLegacy, setSignatureLegacy] = useState(true);
  const [signatureKey, setSignatureKey] = useState(0);
  const wasOpenRef = useRef(false);
  const initializedRef = useRef(false);

  const applySignature = (connection: EmailConnectionDetail | undefined) => {
    const sig = resolveComposeSignature(connection, "new");
    setSignatureLegacy(sig === undefined);
    setSignatureHtml(sig ? sig.html : null);
    setSignatureKey((k) => k + 1);
  };

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      to_emails: [],
      cc_emails: [],
      bcc_emails: [],
      subject: "",
      body_text: "",
      connection_id: undefined,
    },
  });

  // Reset only on the closed → open transition (not on every background
  // refetch of the status, which used to wipe a message mid-typing).
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      initializedRef.current = false;
      form.reset({
        to_emails: [],
        cc_emails: [],
        bcc_emails: [],
        subject: "",
        body_text: "",
        connection_id: emailStatus?.connections?.[0]?.id,
      });
      setToInput("");
      setCcInput("");
      setBccInput("");
      setShowCcBcc(false);
      setAttachments([]);
    }
    wasOpenRef.current = open;
  }, [open, form]); // eslint-disable-line react-hooks/exhaustive-deps

  // Once connections are known, pick the default account + its signature.
  useEffect(() => {
    if (!open || initializedRef.current || !emailStatus) return;
    initializedRef.current = true;
    const first = emailStatus.connections?.[0];
    if (!form.getValues("connection_id") && first) {
      form.setValue("connection_id", first.id);
    }
    applySignature(
      emailStatus.connections?.find((c) => c.id === form.getValues("connection_id")) ?? first
    );
  }, [open, emailStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const addEmail = (field: "to_emails" | "cc_emails" | "bcc_emails", email: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return false;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast({
        title: t("invalidEmailTitle"),
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

  const removeEmail = (field: "to_emails" | "cc_emails" | "bcc_emails", email: string) => {
    const currentEmails = form.getValues(field) || [];
    form.setValue(field, currentEmails.filter((e) => e !== email));
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
      // Outlook order: text, then the (editable) signature. User text is
      // HTML-escaped. With a legacy backend the server appends the signature.
      const sig = signatureLegacy ? null : signatureHtml;
      const bodyText = buildComposedText(data.body_text, sig);
      const bodyHtml = buildComposedHtml({ text: data.body_text, signatureHtml: sig });

      const result = await sendEmail.mutateAsync({
        to_emails: data.to_emails,
        cc_emails: data.cc_emails && data.cc_emails.length > 0 ? data.cc_emails : undefined,
        bcc_emails: data.bcc_emails && data.bcc_emails.length > 0 ? data.bcc_emails : undefined,
        subject: data.subject,
        body_text: bodyText,
        body_html: bodyHtml,
        connection_id: data.connection_id,
        signature_included: signatureLegacy ? undefined : true,
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
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: t("sendFailed"),
        description: sendErrorDescription(error, t("sendError")),
        variant: "destructive",
      });
    }
  };

  const connections = emailStatus?.connections || [];
  const toEmails = form.watch("to_emails") || [];
  const ccEmails = form.watch("cc_emails") || [];
  const bccEmails = form.watch("bcc_emails") || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      onValueChange={(value) => {
                        const id = parseInt(value, 10);
                        field.onChange(id);
                        applySignature(connections.find((c) => c.id === id));
                      }}
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
                  <FormLabel>{t("to")}</FormLabel>
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
                        placeholder={toEmails.length === 0 ? t("recipientPlaceholder") : ""}
                        value={toInput}
                        onChange={(e) => setToInput(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, "to_emails", toInput, setToInput)}
                        onBlur={() => handleBlur("to_emails", toInput, setToInput)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CC/BCC Toggle */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setShowCcBcc(!showCcBcc)}
            >
              {showCcBcc ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {showCcBcc ? t("hideCcBcc") : t("showCcBcc")}
            </Button>

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
                            <Badge key={email} variant="secondary" className="gap-1">
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
                            placeholder={ccEmails.length === 0 ? t("ccPlaceholder") : ""}
                            value={ccInput}
                            onChange={(e) => setCcInput(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, "cc_emails", ccInput, setCcInput)}
                            onBlur={() => handleBlur("cc_emails", ccInput, setCcInput)}
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
                            <Badge key={email} variant="secondary" className="gap-1">
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
                            placeholder={bccEmails.length === 0 ? t("bccPlaceholder") : ""}
                            value={bccInput}
                            onChange={(e) => setBccInput(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, "bcc_emails", bccInput, setBccInput)}
                            onBlur={() => handleBlur("bcc_emails", bccInput, setBccInput)}
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
                  <FormLabel>{t("subject")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("subjectPlaceholder")} {...field} />
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
                  <FormLabel>{t("message")}</FormLabel>
                  <div className="rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
                    <FormControl>
                      <Textarea
                        placeholder={t("messagePlaceholder")}
                        className="min-h-[200px] resize-y border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        {...field}
                      />
                    </FormControl>
                    {!signatureLegacy && signatureHtml !== null && (
                      <EditableSignature
                        html={signatureHtml}
                        resetKey={signatureKey}
                        label={t("signatureLabel")}
                        removeLabel={t("removeSignature")}
                        onChange={setSignatureHtml}
                        onRemove={() => setSignatureHtml(null)}
                      />
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Legacy backend: it appends the workspace signature itself */}
            {signatureLegacy && signature?.is_enabled && signature.signature_html && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">{t("signatureNote")}</span>
                <div
                  className="mt-1 p-2 bg-muted rounded text-foreground"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(signature.signature_html) }}
                />
              </div>
            )}

            {/* Attachments */}
            <div className="space-y-2">
              <FormLabel>{t("attachments")}</FormLabel>
              <FileDropzone
                onFilesSelected={(files) => setAttachments((prev) => [...prev, ...files])}
                files={attachments.map((file) => ({ file }))}
                onRemoveFile={(index) =>
                  setAttachments((prev) => prev.filter((_, i) => i !== index))
                }
                maxFiles={10}
                maxSize={25 * 1024 * 1024}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={sendEmail.isPending}
              >
                {t("cancel")}
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
      </DialogContent>
    </Dialog>
  );
}
