"use client";

import { useState } from "react";
import CallManager from "@/components/CallManager";
import { FeatureGate } from "@/components/subscription/FeatureGate";

export default function CallsDashboardPage() {
  const [isCallActive, setIsCallActive] = useState(false);

  return (
    <FeatureGate feature="sip_calling" showUpgrade={true}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Call Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your SIP calls and view real-time call status
          </p>
        </div>

        <CallManager
          onCallStatusChange={(isActive) => setIsCallActive(isActive)}
        />
      </div>
    </FeatureGate>
  );
}
