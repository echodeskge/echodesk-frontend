"use client";

import { useEmailContext } from "../_hooks/use-email-context";
import { EmailComposer } from "./email-composer";
import { EmailSplit } from "./email-split";

/** The composer takes over the reading pane; the list keeps the last folder. */
export function EmailComposeSplit() {
  const { lastFilter } = useEmailContext();
  return (
    <EmailSplit filter={lastFilter} paneOpen>
      <EmailComposer />
    </EmailSplit>
  );
}
