"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  useWhatsAppStatus,
  useWhatsAppTemplates,
  useSyncWhatsAppTemplates,
  useDeleteWhatsAppTemplate,
} from "@/hooks/api/useSocial";
import { WhatsAppMessageTemplate } from "@/api/generated";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  Plus,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TemplateCard from "./TemplateCard";
import { cn } from "@/lib/utils";

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

export default function WhatsAppTemplatesList() {
  const t = useTranslations("social");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState("");

  // Fetch WhatsApp status to get WABA ID
  const { data: whatsappStatusData, isLoading: statusLoading } = useWhatsAppStatus();
  const whatsappStatus = whatsappStatusData as WhatsAppStatus | undefined;

  // Get the first available WABA ID
  const wabaId = whatsappStatus?.accounts?.[0]?.waba_id || "";
  const businessName = whatsappStatus?.accounts?.[0]?.business_name || "";

  // Fetch templates for the WABA
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = useWhatsAppTemplates(wabaId);
  const syncTemplates = useSyncWhatsAppTemplates();
  const deleteTemplate = useDeleteWhatsAppTemplate();

  const handleSync = async () => {
    if (!wabaId) return;

    try {
      setError("");
      await syncTemplates.mutateAsync(wabaId);
      await refetchTemplates();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to sync templates");
    }
  };

  const handleDelete = async (templateId: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      setError("");
      await deleteTemplate.mutateAsync(templateId);
      await refetchTemplates();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete template");
    }
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
            Please connect your WhatsApp Business Account first to manage templates.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/social/connections">
            <Button>Go to Connections</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Message Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage message templates for {businessName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncTemplates.isPending}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", syncTemplates.isPending && "animate-spin")} />
            Sync from Meta
          </Button>
          <Link href="/social/templates/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Templates Grid */}
      {templatesLoading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !templates || templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Create your first message template or sync from Meta to get started.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSync} disabled={syncTemplates.isPending}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync from Meta
              </Button>
              <Link href="/social/templates/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template: WhatsAppMessageTemplate) => (
            <TemplateCard
              key={template.id}
              template={template}
              onView={(id) => router.push(`/social/templates/${id}`)}
              onSend={(id) => {
                // TODO: Implement send template message dialog
                console.log("Send template:", id);
              }}
              onDelete={handleDelete}
              isDeleting={deleteTemplate.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
