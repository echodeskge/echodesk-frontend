"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CallsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard by default
    router.replace("/calls/dashboard");
  }, [router]);

  return null;
}
