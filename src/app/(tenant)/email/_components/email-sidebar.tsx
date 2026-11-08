"use client";

import { useTranslations } from "next-intl";

import { useEmailContext } from "../_hooks/use-email-context";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmailConnectionSelector } from "./email-connection-selector";
import { EmailSidebarList } from "./email-sidebar-list";

/**
 * Mobile folder picker (opened from the header folder label). On desktop the
 * folders live in the split's folder column.
 */
export function EmailSidebar() {
  const { isEmailSidebarOpen, setIsEmailSidebarOpen } = useEmailContext();
  const t = useTranslations("email.sidebar");

  return (
    <Sheet open={isEmailSidebarOpen} onOpenChange={setIsEmailSidebarOpen}>
      <SheetContent side="left" className="flex w-[280px] flex-col gap-0 p-0">
        <SheetHeader className="border-b px-3 py-3">
          <SheetTitle className="text-[13px] font-semibold">{t("title")}</SheetTitle>
          <SheetDescription className="sr-only">{t("description")}</SheetDescription>
        </SheetHeader>
        <EmailConnectionSelector />
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <EmailSidebarList />
        </div>
      </SheetContent>
    </Sheet>
  );
}
