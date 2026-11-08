import { redirect } from "next/navigation";

// Templates moved to Settings → Templates.
export default function CreateTemplateRedirect() {
  redirect("/settings/templates/new");
}
