"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { isAxiosError } from "axios";
import { AlertCircle, ChevronLeft, FileText, Loader2 } from "lucide-react";

import type { WhatsAppTemplateCreateRequest } from "@/api/generated";
import { useCreateWhatsAppTemplate, useWhatsAppStatus } from "@/hooks/api/useSocial";
import { Button } from "@/components/ui/button";
import TemplateForm from "@/components/social/TemplateForm";
import { SettingsPageHeader } from "./settings-page-header";

interface WhatsAppStatus {
  connected: boolean;
  accounts?: Array<{ waba_id: string; business_name: string }>;
}

/** Settings → Templates → New template (design form page, max 720px). */
export function NewTemplatePage() {
  const t = useTranslations("settings.templatesPage");
  const tTpl = useTranslations("social.templates");
  const router = useRouter();
  const [error, setError] = useState("");
  const { data: statusData, isLoading } = useWhatsAppStatus();
  const status = statusData as WhatsAppStatus | undefined;
  const wabaId = status?.accounts?.[0]?.waba_id || "";
  const businessName = status?.accounts?.[0]?.business_name || "";
  const create = useCreateWhatsAppTemplate();

  async function handleSubmit(data: WhatsAppTemplateCreateRequest) {
    setError("");
    try {
      await create.mutateAsync(data);
      router.push("/settings/templates");
    } catch (err) {
      const body = isAxiosError(err)
        ? (err.response?.data as { error?: string; message?: string } | undefined)
        : undefined;
      setError(body?.error || body?.message || tTpl("create.createFailed"));
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex max-w-[720px] flex-col gap-5">
        <Link
          href="/settings/templates"
          className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {tTpl("create.backToTemplates")}
        </Link>
        <SettingsPageHeader
          icon={FileText}
          title={tTpl("create.title")}
          description={businessName ? tTpl("create.subtitle", { businessName }) : undefined}
        />

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !status?.connected || !wabaId ? (
          <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-border px-6 py-12 text-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
            <p className="max-w-md text-[13px] text-muted-foreground">{tTpl("create.connectFirst")}</p>
            <Button asChild size="sm">
              <Link href="/settings/social/connections">{tTpl("goToConnections")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-[10px] border border-border bg-card">
              <div className="bg-muted/35 px-4 py-3 text-[13px] font-semibold">{tTpl("create.importantNotes")}</div>
              <ul className="list-disc space-y-1 px-4 py-3.5 ps-8 text-xs text-muted-foreground">
                <li>{tTpl("create.noteApproval")}</li>
                <li>{tTpl("create.noteNameImmutable")}</li>
                <li>{tTpl("create.noteParameters")}</li>
                <li>{tTpl("create.noteMarketingOptIn")}</li>
              </ul>
            </section>
            {/* TemplateForm draws its own section cards. */}
            <section aria-label={t("formSection")}>
              <TemplateForm
                wabaId={wabaId}
                onSubmit={handleSubmit}
                onCancel={() => router.push("/settings/templates")}
                isSubmitting={create.isPending}
                error={error}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
