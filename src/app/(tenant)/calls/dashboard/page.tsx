"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CallsDashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/calls"); }, [router]);
  return null;
}
