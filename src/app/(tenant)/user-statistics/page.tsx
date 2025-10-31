"use client";

import UserStatistics from "@/components/UserStatistics";
import { FeatureGate } from "@/components/subscription/FeatureGate";

export default function UserStatisticsPage() {
  return (
    <FeatureGate feature="advanced_analytics" showUpgrade={true}>
      <div className="container mx-auto py-6">
        <UserStatistics />
      </div>
    </FeatureGate>
  );
}
