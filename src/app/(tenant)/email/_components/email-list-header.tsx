"use client";

import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";

import { useSyncEmail } from "@/hooks/api/useSocial";
import { useEmailContext } from "../_hooks/use-email-context";
import { Button } from "@/components/ui/button";
import { CardHeader } from "@/components/ui/card";
import { EmailListSearchForm } from "./email-list-search-form";
import { EmailMenuButton } from "./email-menu-button";

interface EmailListHeaderProps {
  filter: string;
}

export function EmailListHeader({ filter }: EmailListHeaderProps) {
  const { currentConnectionId } = useEmailContext();
  const syncEmail = useSyncEmail();
  const t = useTranslations("email.list");

  function handleSync() {
    syncEmail.mutate(currentConnectionId ?? undefined);
  }

  return (
    <CardHeader className="flex-row justify-between items-center gap-x-1.5 space-y-0 px-3 pb-0">
      <EmailMenuButton isIcon />
      <EmailListSearchForm />
      <Button
        variant="ghost"
        size="icon"
        className="ms-auto"
        onClick={handleSync}
        disabled={syncEmail.isPending}
        aria-label={t("syncEmails")}
      >
        <RefreshCw
          className={`h-4 w-4 ${syncEmail.isPending ? "animate-spin" : ""}`}
        />
      </Button>
    </CardHeader>
  );
}
