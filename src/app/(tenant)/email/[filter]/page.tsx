import { EmailList } from "../_components/email-list";

export default async function EmailFilterPage(props: {
  params: Promise<{ filter: string }>;
}) {
  const params = await props.params;
  // Decode in case the filter contains URL-encoded characters (e.g. spaces in "Sent Items")
  const filter = decodeURIComponent(params.filter);
  return <EmailList filter={filter} />;
}
