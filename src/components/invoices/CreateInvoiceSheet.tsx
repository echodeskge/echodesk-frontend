"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { X, Plus, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { useCreateInvoice, useInvoiceClients } from "@/hooks/useInvoices";
import { useToast } from "@/hooks/use-toast";
import type { InvoiceCreateUpdate } from "@/api/generated";

interface LineItem {
  tempId: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
}

interface CreateInvoiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInvoiceSheet({ open, onOpenChange }: CreateInvoiceSheetProps) {
  const t = useTranslations("invoices");
  const { toast } = useToast();
  const createMutation = useCreateInvoice();
  const { data: clientsData } = useInvoiceClients();

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      tempId: "1",
      description: "",
      quantity: 1,
      unit: "pcs",
      unit_price: 0,
      tax_rate: 18,
      discount_percent: 0,
    },
  ]);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      client: "",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      currency: "GEL",
      notes: "",
      terms_conditions: "",
    },
  });

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        tempId: Date.now().toString(),
        description: "",
        quantity: 1,
        unit: "pcs",
        unit_price: 0,
        tax_rate: 18,
        discount_percent: 0,
      },
    ]);
  };

  const removeLineItem = (tempId: string) => {
    if (lineItems.length === 1) {
      toast({
        title: t("errors.minimumLineItems"),
        description: t("errors.minimumLineItemsDesc"),
        variant: "destructive",
      });
      return;
    }
    setLineItems(lineItems.filter((item) => item.tempId !== tempId));
  };

  const updateLineItem = (tempId: string, field: keyof LineItem, value: any) => {
    setLineItems(
      lineItems.map((item) =>
        item.tempId === tempId ? { ...item, [field]: value } : item
      )
    );
  };

  const calculateLineTotal = (item: LineItem) => {
    const subtotal = item.quantity * item.unit_price;
    const discount = subtotal * (item.discount_percent / 100);
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * (item.tax_rate / 100);
    return afterDiscount + tax;
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const totalDiscount = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price * (item.discount_percent / 100),
      0
    );
    const afterDiscount = subtotal - totalDiscount;
    const totalTax = lineItems.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unit_price;
      const itemDiscount = itemSubtotal * (item.discount_percent / 100);
      return sum + (itemSubtotal - itemDiscount) * (item.tax_rate / 100);
    }, 0);
    const total = afterDiscount + totalTax;

    return { subtotal, totalDiscount, totalTax, total };
  };

  const onSubmit = async (data: any) => {
    try {
      const payload: InvoiceCreateUpdate = {
        client: parseInt(data.client),
        issue_date: data.issue_date,
        due_date: data.due_date,
        currency: data.currency,
        notes: data.notes || "",
        terms_conditions: data.terms_conditions || "",
        line_items: lineItems.map((item, index) => ({
          item_source: "manual",
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price.toString(),
          tax_rate: item.tax_rate.toString(),
          discount_percent: item.discount_percent.toString(),
          position: index,
        })),
      };

      await createMutation.mutateAsync(payload);

      toast({
        title: t("success.invoiceCreated"),
        description: t("success.invoiceCreatedDesc"),
      });

      // Reset form
      reset();
      setLineItems([
        {
          tempId: "1",
          description: "",
          quantity: 1,
          unit: "pcs",
          unit_price: 0,
          tax_rate: 18,
          discount_percent: 0,
        },
      ]);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("errors.createFailed"),
        description: error.message || t("errors.createFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const totals = calculateTotals();
  const clients = clientsData?.results || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle>{t("createInvoice")}</SheetTitle>
          <SheetDescription>{t("createInvoiceDesc")}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client">{t("form.client")} *</Label>
            <Select onValueChange={(value) => setValue("client", value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("form.selectClient")} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client: any) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.client && (
              <p className="text-sm text-destructive">{errors.client.message}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue_date">{t("form.issueDate")} *</Label>
              <Input
                id="issue_date"
                type="date"
                {...register("issue_date", { required: t("form.required") })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">{t("form.dueDate")} *</Label>
              <Input
                id="due_date"
                type="date"
                {...register("due_date", { required: t("form.required") })}
              />
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="currency">{t("form.currency")} *</Label>
            <Select defaultValue="GEL" onValueChange={(value) => setValue("currency", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GEL">GEL (₾)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t("form.lineItems")}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="w-4 h-4 mr-2" />
                {t("actions.addLine")}
              </Button>
            </div>

            {lineItems.map((item, index) => (
              <div key={item.tempId} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("form.lineItem")} #{index + 1}
                  </span>
                  {lineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.tempId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder={t("form.description")}
                    value={item.description}
                    onChange={(e) => updateLineItem(item.tempId, "description", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder={t("form.quantity")}
                    value={item.quantity}
                    onChange={(e) =>
                      updateLineItem(item.tempId, "quantity", parseFloat(e.target.value) || 0)
                    }
                  />
                  <Input
                    placeholder={t("form.unit")}
                    value={item.unit}
                    onChange={(e) => updateLineItem(item.tempId, "unit", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={t("form.unitPrice")}
                    value={item.unit_price}
                    onChange={(e) =>
                      updateLineItem(item.tempId, "unit_price", parseFloat(e.target.value) || 0)
                    }
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={t("form.taxRate")}
                    value={item.tax_rate}
                    onChange={(e) =>
                      updateLineItem(item.tempId, "tax_rate", parseFloat(e.target.value) || 0)
                    }
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={t("form.discount")}
                    value={item.discount_percent}
                    onChange={(e) =>
                      updateLineItem(
                        item.tempId,
                        "discount_percent",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>

                <div className="text-right text-sm text-muted-foreground">
                  {t("form.lineTotal")}: {calculateLineTotal(item).toFixed(2)} ₾
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t("form.subtotal")}:</span>
              <span>{totals.subtotal.toFixed(2)} ₾</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t("form.discount")}:</span>
              <span>-{totals.totalDiscount.toFixed(2)} ₾</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t("form.tax")}:</span>
              <span>{totals.totalTax.toFixed(2)} ₾</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>{t("form.total")}:</span>
              <span>{totals.total.toFixed(2)} ₾</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("form.notes")}</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder={t("form.notesPlaceholder")}
              rows={3}
            />
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-2">
            <Label htmlFor="terms_conditions">{t("form.termsConditions")}</Label>
            <Textarea
              id="terms_conditions"
              {...register("terms_conditions")}
              placeholder={t("form.termsPlaceholder")}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("actions.creating") : t("createInvoice")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
