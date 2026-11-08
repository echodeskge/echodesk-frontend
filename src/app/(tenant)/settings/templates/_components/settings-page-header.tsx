import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Design settings page header: 40px icon tile, 20px title, 13px description, optional action. */
export function SettingsPageHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
        <h2 className="text-xl font-semibold leading-[26px] tracking-[-0.02em]">{title}</h2>
        {description && <p className="text-[13px] text-muted-foreground [text-wrap:pretty]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
