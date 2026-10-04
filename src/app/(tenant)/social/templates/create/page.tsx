"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useWhatsAppStatus, useCreateWhatsAppTemplate } from "@/hooks/api/useSocial";
import { WhatsAppTemplateCreateRequest } from "@/api/generated";
import TemplateForm from "@/components/social/TemplateForm";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

interface WhatsAppStatus {
  connected: boolean;
  accounts_count: number;
  accounts: Array<{
    id: number;
    waba_id: string;
    business_name: string;
    phone_number: string;
    display_phone_number: string;
    quality_rating: string;
    is_active: boolean;
  }>;
}

export default function CreateTemplatePage() {
  const router = useRouter();
  const t = useTranslations("social.templates");
  const tCommon = useTranslations("common");
  const [error, setError] = useState("");

  // Fetch WhatsApp status to get WABA ID
  const { data: whatsappStatusData, isLoading: statusLoading } = useWhatsAppStatus();
  const whatsappStatus = whatsappStatusData as WhatsAppStatus | undefined;

  // Get the first available WABA ID
  const wabaId = whatsappStatus?.accounts?.[0]?.waba_id || "";
  const businessName = whatsappStatus?.accounts?.[0]?.business_name || "";

  const createTemplate = useCreateWhatsAppTemplate();

  const handleSubmit = async (data: WhatsAppTemplateCreateRequest) => {
    try {
      setError("");
      await createTemplate.mutateAsync(data);
      router.push("/social/templates");
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || t("create.createFailed");
      setError(errorMessage);
      console.error("Failed to create template:", err);
    }
  };

  const handleCancel = () => {
    router.push("/social/templates");
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!whatsappStatus?.connected || !wabaId) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("create.connectFirst")}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/social/connections">
            <Button>{t("goToConnections")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/social/templates">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("create.backToTemplates")}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{t("create.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("create.subtitle", { businessName })}
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-2">{t("create.importantNotes")}</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>{t("create.noteApproval")}</li>
            <li>{t("create.noteNameImmutable")}</li>
            <li>{t("create.noteParameters")}</li>
            <li>{t("create.noteMarketingOptIn")}</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Template Form */}
      <TemplateForm
        wabaId={wabaId}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={createTemplate.isPending}
        error={error}
      />
    </div>
  );
}
