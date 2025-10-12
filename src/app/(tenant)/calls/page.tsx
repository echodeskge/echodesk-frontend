"use client";

import { useState } from "react";
import CallManager from "@/components/CallManager";

export default function CallsPage() {
  const [isCallActive, setIsCallActive] = useState(false);

  return (
    <CallManager
      onCallStatusChange={(isActive) => setIsCallActive(isActive)}
    />
  );
}
