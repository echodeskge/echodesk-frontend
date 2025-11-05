"use client";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import SipConfigManager from "@/components/SipConfigManager";

export default function CallSettingsPage() {
  return (
    <FeatureGate feature="sip_calling" showUpgrade={true}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SIP Settings</h1>
          <p className="text-muted-foreground">
            Configure your SIP server connections and calling preferences
          </p>
        </div>

        <SipConfigManager />
      </div>
    </FeatureGate>
  );
}
