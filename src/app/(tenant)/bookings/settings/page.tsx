"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BookingsSettingsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings/bookings"); }, [router]);
  return null;
}
