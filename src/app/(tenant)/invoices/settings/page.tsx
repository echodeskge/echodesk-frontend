"use client";

/**
 * Invoice Settings Page
 * Configure company information, branding, and invoice defaults
 */

import { useTranslations } from "next-intl";

export default function InvoiceSettingsPage() {
  const t = useTranslations("invoices");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      {/* Placeholder content */}
      <div className="text-center py-12 text-muted-foreground">
        <p>Invoice settings page coming soon...</p>
        <p className="text-sm mt-2">Configure company info, branding, and defaults</p>
      </div>
    </div>
  );
}
