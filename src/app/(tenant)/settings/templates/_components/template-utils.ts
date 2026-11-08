import type { WhatsAppMessageTemplate } from "@/api/generated";

interface TemplateComponent {
  type?: string;
  text?: string;
  format?: string;
}

/** The text a template sends (header / body / footer), as the bubble preview shows it. */
export function templatePreviewText(template: Pick<WhatsAppMessageTemplate, "components">): string {
  const components: TemplateComponent[] = Array.isArray(template.components) ? template.components : [];
  const part = (type: string) =>
    components.find((c) => (c.type || "").toUpperCase() === type)?.text?.trim() || "";
  return [part("HEADER"), part("BODY"), part("FOOTER")].filter(Boolean).join("\n\n");
}

/** Status badge colours (design: border, text, tinted background). */
export function templateStatusClass(status?: string | null): string {
  switch (status) {
    case "APPROVED":
      return "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400";
    case "REJECTED":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }
}

export type TemplatesTab = "whatsapp" | "replies";

export function parseTemplatesTab(value: string | null | undefined): TemplatesTab {
  return value === "replies" ? "replies" : "whatsapp";
}
