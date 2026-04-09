"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LeaveSettingsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings/leave"); }, [router]);
  return null;
}
