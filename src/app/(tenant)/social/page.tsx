"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SocialPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to connections page
    router.replace("/social/connections");
  }, [router]);

  return null;
}
