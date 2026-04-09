"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CallsSettingsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings/calls"); }, [router]);
  return null;
}
