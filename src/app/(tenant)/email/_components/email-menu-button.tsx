"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";

import { useEmailContext } from "../_hooks/use-email-context";
import { Button } from "@/components/ui/button";

interface EmailMenuButtonProps extends ComponentProps<typeof Button> {
  isIcon?: boolean;
}

export function EmailMenuButton({
  isIcon = false,
  ...props
}: EmailMenuButtonProps) {
  const { setIsEmailSidebarOpen } = useEmailContext();
  const t = useTranslations("email.sidebar");

  if (isIcon) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setIsEmailSidebarOpen(true)}
        aria-label={t("menu")}
        {...props}
      >
        <Menu className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      className="md:hidden"
      onClick={() => setIsEmailSidebarOpen(true)}
      {...props}
    >
      {t("menu")}
    </Button>
  );
}
