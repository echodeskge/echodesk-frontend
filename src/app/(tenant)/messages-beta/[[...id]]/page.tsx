import { redirect } from "next/navigation";

// Old beta route — redirect to the canonical default inbox.
export default async function MessagesBetaRedirect({
  params,
}: {
  params: Promise<{ id?: string[] }>;
}) {
  const { id } = await params;
  const chat = id?.[0];
  redirect(chat ? `/social/messages/${chat}` : "/social/messages");
}
