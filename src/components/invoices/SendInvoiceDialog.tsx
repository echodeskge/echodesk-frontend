"use client";

import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useSendInvoiceEmail } from "@/hooks/useInvoices";
import { useToast } from "@/hooks/use-toast";
import type { SendInvoiceData } from "@/services/invoiceService";

interface SendInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number;
  clientEmail?: string;
  invoiceNumber?: string;
}

export function SendInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  clientEmail,
  invoiceNumber,
}: SendInvoiceDialogProps) {
  const t = useTranslations("invoices");
  const { toast } = useToast();
  const sendMutation = useSendInvoiceEmail();

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      recipient_email: clientEmail || "",
      cc_emails: "",
      subject: `Invoice ${invoiceNumber || "#"}`,
      message: `Dear Customer,\n\nPlease find attached invoice ${invoiceNumber || "#"}.\n\nThank you for your business!`,
      attach_pdf: true,
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const payload: SendInvoiceData = {
        recipient_email: data.recipient_email,
        cc_emails: data.cc_emails || undefined,
        subject: data.subject,
        message: data.message,
        attach_pdf: data.attach_pdf,
      };

      await sendMutation.mutateAsync({ id: invoiceId, data: payload });

      toast({
        title: t("success.invoiceSent"),
        description: t("success.invoiceSentDesc"),
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("errors.sendFailed"),
        description: error.message || t("errors.sendFailedDesc"),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("actions.sendInvoice")}</DialogTitle>
          <DialogDescription>{t("actions.sendInvoiceDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Recipient Email */}
          <div className="space-y-2">
            <Label htmlFor="recipient_email">{t("form.recipientEmail")} *</Label>
            <Input
              id="recipient_email"
              type="email"
              {...register("recipient_email", {
                required: t("form.required"),
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: t("form.invalidEmail"),
                },
              })}
              placeholder="client@example.com"
            />
            {errors.recipient_email && (
              <p className="text-sm text-destructive">{errors.recipient_email.message}</p>
            )}
          </div>

          {/* CC Emails */}
          <div className="space-y-2">
            <Label htmlFor="cc_emails">{t("form.ccEmails")}</Label>
            <Input
              id="cc_emails"
              type="text"
              {...register("cc_emails")}
              placeholder="email1@example.com, email2@example.com"
            />
            <p className="text-xs text-muted-foreground">{t("form.ccEmailsHint")}</p>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">{t("form.subject")} *</Label>
            <Input
              id="subject"
              type="text"
              {...register("subject", { required: t("form.required") })}
            />
            {errors.subject && (
              <p className="text-sm text-destructive">{errors.subject.message}</p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">{t("form.message")} *</Label>
            <Textarea
              id="message"
              {...register("message", { required: t("form.required") })}
              rows={6}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
          </div>

          {/* Attach PDF */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="attach_pdf"
              checked={watch("attach_pdf")}
              onCheckedChange={(checked) => setValue("attach_pdf", checked as boolean)}
            />
            <Label htmlFor="attach_pdf" className="text-sm font-normal cursor-pointer">
              {t("form.attachPdf")}
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("actions.sending") : t("actions.send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
