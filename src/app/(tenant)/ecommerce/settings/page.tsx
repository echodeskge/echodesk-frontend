"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EcommerceSettingsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings/ecommerce"); }, [router]);
  return null;
}
