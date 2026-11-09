"use client";

import { useTranslations } from "next-intl";
import { ErrorBlock } from "@/components/redesign/states";

/**
 * Shared error boundary body for the ecommerce section's route error.tsx
 * files: the redesign error state (translated title and hint, the raw
 * message only as a tooltip, "Try again" calls `reset`).
 */
export function SectionError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("common");
  const ui = useTranslations("ecommerceUi");
  return (
    <div className="flex min-h-[400px] items-center justify-center" data-testid="ec-section-error">
      <ErrorBlock
        error={error}
        onRetry={reset}
        testId="ec-route-error"
        labels={{
          errorTitle: t("somethingWentWrong"),
          errorHint: ui("errorHint"),
          noAccessTitle: ui("noAccessTitle"),
          noAccessHint: ui("noAccessHint"),
          retry: t("tryAgain"),
        }}
      />
    </div>
  );
}
