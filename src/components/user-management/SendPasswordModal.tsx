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
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail } from "lucide-react";
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
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {t("sendNewPassword")}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {t("sendNewPasswordConfirm")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("name")}:</span>
              <span className="text-sm font-medium">{userName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("email")}:</span>
              <span className="text-sm font-medium">{userEmail}</span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {t("sendNewPasswordWarning")}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                {t("sending")}
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                {t("sendPassword")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
