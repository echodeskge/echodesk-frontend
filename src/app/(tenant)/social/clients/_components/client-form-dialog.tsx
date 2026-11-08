"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateSocialClient,
  useUpdateSocialClient,
  type SocialClientCreateRequest,
} from "@/hooks/api/useSocialClients";
import { getApiErrorMessage } from "@/lib/utils";

export interface EditableClient {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create a new client */
  client: EditableClient | null;
  onSaved?: (id: number) => void;
}

/** Create / edit client dialog (name, email, phone, notes). */
export function ClientFormDialog({ open, onOpenChange, client, onSaved }: Props) {
  const t = useTranslations("socialClients");
  const createClient = useCreateSocialClient();
  const updateClient = useUpdateSocialClient();
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: client?.name ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      notes: client?.notes ?? "",
    });
  }, [open, client]);

  const saving = createClient.isPending || updateClient.isPending;

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error(t("screen.toasts.nameRequired"));
      return;
    }
    const data: SocialClientCreateRequest = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      // Editing never wipes notes the dialog didn't load.
      notes: form.notes.trim() || (client ? client.notes ?? undefined : undefined),
    };
    try {
      if (client) {
        await updateClient.mutateAsync({ id: client.id, data });
        toast.success(t("screen.toasts.updated"));
        onSaved?.(client.id);
      } else {
        const created = (await createClient.mutateAsync(data)) as { id?: number } | undefined;
        toast.success(t("screen.toasts.created"));
        if (created?.id) onSaved?.(created.id);
      }
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t("screen.toasts.saveFailed")));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{client ? t("editClient") : t("createClient")}</DialogTitle>
          <DialogDescription>{client ? t("editClientDescription") : t("createClientDescription")}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="client-name">{t("form.name")} *</Label>
            <Input
              id="client-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("form.namePlaceholder")}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client-email">{t("form.email")}</Label>
            <Input
              id="client-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t("form.emailPlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client-phone">{t("form.phone")}</Label>
            <Input
              id="client-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t("form.phonePlaceholder")}
            />
          </div>
          {!client && (
            <div className="grid gap-2">
              <Label htmlFor="client-notes">{t("form.notes")}</Label>
              <Textarea
                id="client-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("form.notesPlaceholder")}
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t("form.saving") : client ? t("form.save") : t("form.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
