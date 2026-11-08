"use client";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { CallsScreen } from "./_components/calls-screen";

export default function CallsPage() {
  return (
    <FeatureGate feature="ip_calling" showUpgrade={true}>
      <CallsScreen />
    </FeatureGate>
  );
}
