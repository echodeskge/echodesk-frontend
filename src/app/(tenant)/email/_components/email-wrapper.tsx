"use client";

import type { ReactNode } from "react";

import { EmailProvider } from "../_contexts/email-context";
import { EmailSidebar } from "./email-sidebar";

/** Full-height email screen; the folder Sheet serves mobile (design: header folder picker). */
export function EmailWrapper({ children }: { children: ReactNode }) {
  return (
    <EmailProvider>
      <section className="flex h-full min-h-0 w-full overflow-hidden" data-testid="email-screen">
        <EmailSidebar />
        {children}
      </section>
    </EmailProvider>
  );
}
