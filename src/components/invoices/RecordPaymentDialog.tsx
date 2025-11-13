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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecordPayment } from "@/hooks/useInvoices";
import { useToast } from "@/hooks/use-toast";
import type { InvoicePaymentRequest } from "@/api/generated";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number;
  balance: number;
  currency: string;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  balance,
  currency,
}: RecordPaymentDialogProps) {
  const t = useTranslations("invoices");
  const { toast } = useToast();
  const recordPaymentMutation = useRecordPayment();

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      amount: balance,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "bank_transfer",
      reference_number: "",
      notes: "",
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const payload: InvoicePaymentRequest = {
        invoice: invoiceId,
        amount: data.amount.toString(),
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        reference_number: data.reference_number || undefined,
        notes: data.notes || undefined,
      };

      await recordPaymentMutation.mutateAsync(payload);

      toast({
        title: t("success.paymentRecorded"),
        description: t("success.paymentRecordedDesc"),
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("errors.paymentFailed"),
        description: error.message || t("errors.paymentFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const paymentAmount = watch("amount");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("actions.recordPayment")}</DialogTitle>
          <DialogDescription>{t("actions.recordPaymentDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">{t("form.paymentAmount")} *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register("amount", {
                required: t("form.required"),
                min: {
                  value: 0.01,
                  message: t("form.minAmount"),
                },
                max: {
                  value: balance,
                  message: t("form.maxAmount", { max: balance }),
                },
              })}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("form.remainingBalance")}: {balance.toFixed(2)} {currency}
            </p>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="payment_date">{t("form.paymentDate")} *</Label>
            <Input
              id="payment_date"
              type="date"
              {...register("payment_date", { required: t("form.required") })}
            />
            {errors.payment_date && (
              <p className="text-sm text-destructive">{errors.payment_date.message}</p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment_method">{t("form.paymentMethod")} *</Label>
            <Select
              defaultValue="bank_transfer"
              onValueChange={(value) => setValue("payment_method", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">{t("paymentMethods.card")}</SelectItem>
                <SelectItem value="cash">{t("paymentMethods.cash")}</SelectItem>
                <SelectItem value="bank_transfer">{t("paymentMethods.bankTransfer")}</SelectItem>
                <SelectItem value="check">{t("paymentMethods.check")}</SelectItem>
                <SelectItem value="other">{t("paymentMethods.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="reference_number">{t("form.referenceNumber")}</Label>
            <Input
              id="reference_number"
              type="text"
              {...register("reference_number")}
              placeholder={t("form.referenceNumberPlaceholder")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("form.paymentNotes")}</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder={t("form.paymentNotesPlaceholder")}
              rows={3}
            />
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
              {isSubmitting ? t("actions.recording") : t("actions.recordPayment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
