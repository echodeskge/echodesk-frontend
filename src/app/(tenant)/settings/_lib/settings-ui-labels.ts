"use client"

import { useTranslations } from "next-intl"
import type { StickySaveBarLabels } from "@/components/redesign/settings"
import type { ErrorBlockLabels } from "@/components/redesign"

/**
 * Shared settings texts (`settings.ui.*`, owned by ST-01) for the kit pieces
 * that take their labels as props: the sticky save bar and the error / loading
 * blocks. Any settings page may use them.
 */
export function useSettingsSaveBarLabels(): StickySaveBarLabels {
  const t = useTranslations("settings.ui.saveBar")
  return { unsaved: t("unsaved"), discard: t("discard"), save: t("save"), saving: t("saving"), saved: t("saved") }
}

export function useSettingsErrorLabels(): ErrorBlockLabels & { loading: string } {
  const t = useTranslations("settings.ui")
  return {
    errorTitle: t("errorTitle"),
    errorHint: t("errorHint"),
    noAccessTitle: t("noAccessTitle"),
    noAccessHint: t("noAccessHint"),
    retry: t("retry"),
    loading: t("loading"),
  }
}
