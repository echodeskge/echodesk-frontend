"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { SettingsPageHeader } from "./settings-page-header";
import { parseTemplatesTab, type TemplatesTab } from "./template-utils";
import { WhatsAppTemplatesTab } from "./whatsapp-templates-tab";
import { SavedRepliesTab } from "./saved-replies-tab";

const primaryBtn =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90";

/**
 * Settings → Templates (design TEMPLATES page): WhatsApp message templates
 * (Meta) and the saved replies agents insert in chats and emails.
 */
export function TemplatesSettings() {
  const t = useTranslations("settings.templatesPage");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTemplatesTab(searchParams.get("tab"));

  function selectTab(next: TemplatesTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "whatsapp") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const tabs: { id: TemplatesTab; label: string }[] = [
    { id: "whatsapp", label: t("tabs.whatsapp") },
    { id: "replies", label: t("tabs.replies") },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="flex max-w-[960px] flex-col gap-4">
        <SettingsPageHeader
          icon={FileText}
          title={t("title")}
          description={tab === "whatsapp" ? t("whatsappDescription") : t("repliesDescription")}
          action={
            tab === "whatsapp" ? (
              <Link href="/settings/templates/new" className={primaryBtn} data-testid="new-template">
                <Plus className="h-3.5 w-3.5" />
                {t("newTemplate")}
              </Link>
            ) : undefined
          }
        />
        <div role="tablist" aria-label={t("title")} className="flex h-8 w-full max-w-sm rounded-md bg-muted p-0.5">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => selectTab(item.id)}
              className={cn(
                "flex-1 rounded text-xs font-medium transition-colors",
                tab === item.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        {tab === "whatsapp" ? <WhatsAppTemplatesTab /> : <SavedRepliesTab />}
      </div>
    </div>
  );
}
