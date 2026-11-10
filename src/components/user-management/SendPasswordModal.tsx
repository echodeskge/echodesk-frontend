"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rdButton } from "@/components/redesign/buttons";
import { SettingsNote } from "@/components/redesign/settings";
import { Mail } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface SendPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  userEmail: string;
  isLoading: boolean;
}

export default function SendPasswordModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userEmail,
  isLoading,
}: SendPasswordModalProps) {
  const t = useTranslations("users");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[17px]">
            <Mail className="h-4 w-4 text-primary" />
            {t("sendNewPassword")}
          </DialogTitle>
          <DialogDescription className="pt-1 text-[13px]">
            {t("sendNewPasswordConfirm")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5 rounded-[10px] border bg-muted/35 px-3.5 py-3 text-[13px]">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-muted-foreground">{t("name")}:</span>
              <span className="truncate font-medium">{userName}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-muted-foreground">{t("email")}:</span>
              <span className="truncate font-medium">{userEmail}</span>
            </div>
          </div>

          <SettingsNote tone="warning">{t("sendNewPasswordWarning")}</SettingsNote>
        </div>

        <DialogFooter className="gap-2">
          <button type="button" className={rdButton.outline} onClick={onClose} disabled={isLoading}>
            {t("cancel")}
          </button>
          <button type="button" className={rdButton.primary} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner className="h-3.5 w-3.5" />
                {t("sending")}
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5" />
                {t("sendPassword")}
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
