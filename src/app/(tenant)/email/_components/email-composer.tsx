"use client";

import { EmailComposerForm } from "./email-composer-form";

/** The composer takes over the reading pane (design: not a modal). */
export function EmailComposer() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="email-composer">
      <EmailComposerForm />
    </div>
  );
}
