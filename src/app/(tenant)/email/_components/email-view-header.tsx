"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { EmailMenuButton } from "./email-menu-button";

interface EmailViewHeaderProps {
  email: EmailMessage;
  filter: string;
}

export function EmailViewHeader({ email, filter }: EmailViewHeaderProps) {
  const router = useRouter();
  const t = useTranslations("email");

  return (
    <CardHeader className="flex-row items-center gap-x-1.5 space-y-0 border-b">
      <div className="flex items-center gap-1.5">
        <EmailMenuButton isIcon />
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex"
          onClick={() => router.push(`/email/${encodeURIComponent(filter)}`)}
          aria-label={t("view.backToList")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <CardTitle className="line-clamp-2 break-all">
          {email.subject || t("list.noSubject")}
        </CardTitle>
      </div>
    </CardHeader>
  );
}
