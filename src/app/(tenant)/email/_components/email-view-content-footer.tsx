"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Forward, Reply } from "lucide-react";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";

interface EmailViewContentFooterProps {
  email: EmailMessage;
  filter: string;
}

export function EmailViewContentFooter({
  email,
  filter,
}: EmailViewContentFooterProps) {
  const router = useRouter();
  const t = useTranslations("email.view");

  function handleReply() {
    router.push(`/email/compose?reply_to=${email.id}`);
  }

  function handleForward() {
    router.push(`/email/compose?forward=${email.id}`);
  }

  return (
    <CardFooter className="p-3 pt-0 gap-1.5">
      <Button variant="outline" onClick={handleReply}>
        <Reply className="me-2 h-4 w-4" />
        <span>{t("reply")}</span>
      </Button>
      <Button variant="outline" onClick={handleForward}>
        <Forward className="me-2 h-4 w-4" />
        <span>{t("forward")}</span>
      </Button>
    </CardFooter>
  );
}
