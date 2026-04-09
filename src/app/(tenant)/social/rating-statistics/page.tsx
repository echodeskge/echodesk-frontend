"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RatingStatisticsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings/social/rating-statistics"); }, [router]);
  return null;
}
