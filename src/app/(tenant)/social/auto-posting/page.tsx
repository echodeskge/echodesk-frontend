"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoPostingRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings/social/auto-posting"); }, [router]);
  return null;
}
