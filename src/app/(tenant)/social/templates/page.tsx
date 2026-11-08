import { redirect } from "next/navigation";

// Templates moved to Settings → Templates.
export default function TemplatesRedirect() {
  redirect("/settings/templates");
}
