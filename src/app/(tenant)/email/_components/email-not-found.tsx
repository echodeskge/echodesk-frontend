"use client";

import { MailX } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { EmailMenuButton } from "./email-menu-button";

interface EmailNotFoundProps {
  inline?: boolean;
}

export function EmailNotFound({ inline }: EmailNotFoundProps) {
  const t = useTranslations("email.list");

  const content = (
    <div className="size-full flex flex-col justify-center items-center gap-2 p-6">
      <MailX className="size-24 text-primary/50" />
      <p className="text-muted-foreground text-center">{t("notFound")}</p>
      <EmailMenuButton />
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <Card className="flex-1 w-full md:w-auto">
      <CardContent className="size-full flex flex-col justify-center items-center gap-2 p-0">
        {content}
      </CardContent>
    </Card>
  );
}
