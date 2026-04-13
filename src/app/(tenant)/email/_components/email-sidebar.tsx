"use client";

import { useMedia } from "react-use";
import { useTranslations } from "next-intl";

import { useEmailContext } from "../_hooks/use-email-context";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmailSidebarHeader } from "./email-sidebar-header";
import { EmailConnectionSelector } from "./email-connection-selector";
import { EmailSidebarList } from "./email-sidebar-list";

export function EmailSidebar() {
  const { isEmailSidebarOpen, setIsEmailSidebarOpen } = useEmailContext();
  const isMediumOrSmaller = useMedia("(max-width: 767px)");
  const t = useTranslations("email.sidebar");

  const sidebarContent = (
    <>
      <EmailSidebarHeader />
      <EmailConnectionSelector />
      <div className="flex-1 overflow-y-auto">
        <EmailSidebarList />
      </div>
    </>
  );

  if (!isMediumOrSmaller) {
    return (
      <aside>
        <Card className="h-full max-h-[calc(100vh-6rem)] w-72 flex flex-col border border-border overflow-hidden">
          {sidebarContent}
        </Card>
      </aside>
    );
  }

  return (
    <Sheet open={isEmailSidebarOpen} onOpenChange={setIsEmailSidebarOpen}>
      <SheetContent side="left" className="p-0 flex flex-col">
        <SheetHeader className="sr-only">
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>
        {sidebarContent}
      </SheetContent>
    </Sheet>
  );
}
