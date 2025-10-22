"use client";

import UserStatistics from "@/components/UserStatistics";
import { FeatureGate } from "@/components/subscription/FeatureGate";

export default function UserStatisticsPage() {
  return (
    <FeatureGate feature="advanced_analytics" showUpgrade={true}>
      <UserStatistics />
    </FeatureGate>
  );
}
