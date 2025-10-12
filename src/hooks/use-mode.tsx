"use client"

import { useMedia } from "react-use"
import { useTheme } from "next-themes"

export function useIsDarkMode() {
  const { theme } = useTheme()
  const isDarkModePreferred = useMedia("(prefers-color-scheme: dark)")

  let resolvedMode = theme || "system"

  if (resolvedMode === "system") {
    resolvedMode = isDarkModePreferred ? "dark" : "light"
  }

  return resolvedMode === "dark"
}
