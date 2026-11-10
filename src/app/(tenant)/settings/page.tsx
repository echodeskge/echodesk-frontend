"use client";

import { SettingsHome } from "./_components/settings-home";

/**
 * /settings: the design HOME grid (desktop) / the full nav list (phones),
 * built from the same filtered nav as the sidebar. It used to redirect to
 * /settings/general; deep links are unchanged.
 */
export default function SettingsPage() {
  return <SettingsHome />;
}
