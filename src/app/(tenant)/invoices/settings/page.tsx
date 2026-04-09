"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InvoicesSettingsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings/invoices"); }, [router]);
  return null;
}
