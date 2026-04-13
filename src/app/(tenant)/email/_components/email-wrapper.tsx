"use client";

import type { ReactNode } from "react";

import { EmailProvider } from "../_contexts/email-context";
import { EmailSidebar } from "./email-sidebar";

export function EmailWrapper({ children }: { children: ReactNode }) {
  return (
    <EmailProvider>
      <section className="container h-full w-full flex gap-4 p-4">
        <EmailSidebar />
        {children}
      </section>
    </EmailProvider>
  );
}
