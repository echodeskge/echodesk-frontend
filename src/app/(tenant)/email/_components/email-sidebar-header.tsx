"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { useEmailContext } from "../_hooks/use-email-context";
import { Button } from "@/components/ui/button";

export function EmailSidebarHeader() {
  const { setIsEmailSidebarOpen } = useEmailContext();
  const t = useTranslations("email.sidebar");

  return (
    <div className="p-3">
      <Button className="w-full" size="lg" asChild>
        <Link
          href="/email/compose"
          onClick={() => setIsEmailSidebarOpen(false)}
        >
          {t("compose")}
        </Link>
      </Button>
    </div>
  );
}
