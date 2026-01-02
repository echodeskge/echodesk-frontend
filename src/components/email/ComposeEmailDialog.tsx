"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useSendEmail, useEmailStatus, useEmailSignature } from "@/hooks/api/useSocial";

const emailSchema = z.object({
  to_emails: z.array(z.string().email("Invalid email address")).min(1, "At least one recipient is required"),
  cc_emails: z.array(z.string().email("Invalid email address")).optional(),
  bcc_emails: z.array(z.string().email("Invalid email address")).optional(),
  subject: z.string().min(1, "Subject is required"),
  body_text: z.string().min(1, "Message is required"),
  connection_id: z.number().optional(),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ComposeEmailDialog({ open, onOpenChange, onSuccess }: ComposeEmailDialogProps) {
  const { toast } = useToast();
  const { data: emailStatus } = useEmailStatus();
  const { data: signature } = useEmailSignature();
  const sendEmail = useSendEmail();

  const [showCcBcc, setShowCcBcc] = useState(false);
  const [toInput, setToInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");

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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
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
    }
  }, [open, emailStatus?.connections, form]);

  const addEmail = (field: "to_emails" | "cc_emails" | "bcc_emails", email: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return false;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast({
        title: "Invalid email",
        description: `"${trimmedEmail}" is not a valid email address`,
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
      // Construct the email body with signature if enabled
      let bodyText = data.body_text;
      let bodyHtml = `<div>${data.body_text.replace(/\n/g, "<br/>")}</div>`;

      if (signature?.is_enabled && signature.signature_html) {
        bodyHtml += `<br/><br/>${signature.signature_html}`;
        if (signature.signature_text) {
          bodyText += `\n\n${signature.signature_text}`;
        }
      }

      await sendEmail.mutateAsync({
        to_emails: data.to_emails,
        cc_emails: data.cc_emails && data.cc_emails.length > 0 ? data.cc_emails : undefined,
        bcc_emails: data.bcc_emails && data.bcc_emails.length > 0 ? data.bcc_emails : undefined,
        subject: data.subject,
        body_text: bodyText,
        body_html: bodyHtml,
        connection_id: data.connection_id,
      });

      toast({
        title: "Email sent",
        description: "Your email has been sent successfully.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Failed to send email",
        description: error.response?.data?.error || "An error occurred while sending the email.",
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
          <DialogTitle>Compose Email</DialogTitle>
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
                    <FormLabel>From</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value, 10))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select email account" />
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
                  <FormLabel>To</FormLabel>
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
                        placeholder={toEmails.length === 0 ? "Enter recipient email..." : ""}
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
              {showCcBcc ? "Hide CC/BCC" : "Add CC/BCC"}
            </Button>

            {/* CC */}
            {showCcBcc && (
              <>
                <FormField
                  control={form.control}
                  name="cc_emails"
                  render={() => (
                    <FormItem>
                      <FormLabel>CC</FormLabel>
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
                            placeholder={ccEmails.length === 0 ? "Enter CC email..." : ""}
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
                      <FormLabel>BCC</FormLabel>
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
                            placeholder={bccEmails.length === 0 ? "Enter BCC email..." : ""}
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
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter subject..." {...field} />
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
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your message..."
                      className="min-h-[200px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Signature Preview */}
            {signature?.is_enabled && signature.signature_html && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Signature will be added:</span>
                <div
                  className="mt-1 p-2 bg-muted rounded text-foreground"
                  dangerouslySetInnerHTML={{ __html: signature.signature_html }}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={sendEmail.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sendEmail.isPending}>
                {sendEmail.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send
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
