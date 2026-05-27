import { redirect } from "next/navigation";

// The socket inbox is now the default at /social/messages. This route is kept
// only so old "Messages (Beta)" bookmarks/links land on the new default
// (preserving the open chat id when present).
export default async function SocialMessagesBetaRedirect({
  params,
}: {
  params: Promise<{ id?: string[] }>;
}) {
  const { id } = await params;
  const chat = id?.[0];
  redirect(chat ? `/social/messages/${chat}` : "/social/messages");
}
