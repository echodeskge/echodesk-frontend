import type { ReactNode } from "react";

import { EmailSplit } from "../_components/email-split";

/** Folder column + conversation list beside the reading pane (the child route). */
export default async function EmailFilterLayout(props: {
  children: ReactNode;
  params: Promise<{ filter: string }>;
}) {
  const params = await props.params;
  // Decode in case the filter contains URL-encoded characters (e.g. spaces in "Sent Items")
  const filter = decodeURIComponent(params.filter);
  return <EmailSplit filter={filter}>{props.children}</EmailSplit>;
}
