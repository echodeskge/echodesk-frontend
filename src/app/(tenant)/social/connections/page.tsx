"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConnectionsRedirect() {
  const router = useRouter();
  // Keep the OAuth callback's ?facebook_status=…&message=… for the settings page.
  useEffect(() => { router.replace(`/settings/social/connections${window.location.search}`); }, [router]);
  return null;
}
