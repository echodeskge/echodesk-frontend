"use client";

import { useState } from "react";
import CallManager from "@/components/CallManager";
import { FeatureGate } from "@/components/subscription/FeatureGate";

export default function CallsPage() {
  const [isCallActive, setIsCallActive] = useState(false);

  return (
    <FeatureGate feature="sip_calling" showUpgrade={true}>
      <CallManager
        onCallStatusChange={(isActive) => setIsCallActive(isActive)}
      />
    </FeatureGate>
  );
}
