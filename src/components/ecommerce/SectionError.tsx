"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

/** Shared error boundary body for the ecommerce section's route error.tsx files. */
export function SectionError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">{t("somethingWentWrong")}</h2>
      <p className="text-muted-foreground text-sm">{error.message}</p>
      <Button onClick={reset}>{t("tryAgain")}</Button>
    </div>
  );
}
