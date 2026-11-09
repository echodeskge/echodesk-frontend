"use client";

import { useLocale, useTranslations } from "next-intl";
import { LabelChip } from "../../../_components/primitives/label-chip";
import { PriorityPill } from "../../../_components/primitives/priority";
import { formatShortDate } from "../../../_lib/format";
import type { TicketDetail } from "../../../_lib/types";
import { userName } from "./main-utils";

/**
 * Meta row (D120–D122): the 22px priority pill, every label as a 22px chip,
 * then "· opened {date} by {reporter}" (12px, muted). Wraps on narrow screens.
 */
export function DetailMeta({ ticket }: { ticket: Pick<TicketDetail, "priority" | "tags" | "created_at" | "reporter" | "created_by"> }) {
  const t = useTranslations("ticketsScreen.detail.main");
  const locale = useLocale();
  const date = formatShortDate(ticket.created_at, locale);
  const name = ticket.reporter?.name || userName(ticket.created_by);
  return (
    <div data-slot="detail-meta" className="flex flex-wrap items-center gap-1.5">
      <PriorityPill priority={ticket.priority} size="md" />
      {(ticket.tags ?? []).map((tag) => (
        <LabelChip key={tag.id} name={tag.name} color={tag.color} size="md" className="max-w-full" />
      ))}
      <span data-slot="detail-opened" className="text-xs leading-5 text-muted-foreground">
        {"· "}
        {name ? t("opened", { date, name }) : t("openedNoName", { date })}
      </span>
    </div>
  );
}
