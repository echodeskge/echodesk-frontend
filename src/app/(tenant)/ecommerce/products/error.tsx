"use client";

import { SectionError } from "@/components/ecommerce/SectionError";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <SectionError error={error} reset={reset} />;
}
