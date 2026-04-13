import { EmailView } from "../../_components/email-view";

export default async function EmailViewPage(props: {
  params: Promise<{ filter: string; id: string }>;
}) {
  const params = await props.params;
  const filter = decodeURIComponent(params.filter);
  return <EmailView emailId={Number(params.id)} filter={filter} />;
}
