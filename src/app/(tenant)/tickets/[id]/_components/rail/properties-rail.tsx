"use client";

/**
 * Properties rail (plan FE-12, §3 Detail → Rail; design B, D176–D196).
 *
 * The shell gives the 300px `<aside>` (left border; full width with a top
 * border when stacked below lg) and the scrolling. This component owns:
 *
 * 1. the picker rows, padding 8px 12px, in the §3 order: Status, Priority,
 *    Assignees, Groups (staff), Labels, Department, Board (transfer),
 *    Customer (when `can_view_customer`), Due date;
 * 2. the fixed rows: Time (FE-13's `<TimeRow/>`), Reporter, Created;
 * 3. the Payment block (orders / payment due date), the Customer section
 *    and the Forms section, each a 12px-padded block with a top border.
 *
 * Every control is gated by `perms` (= `ticket.viewer_permissions`, WS10).
 * The bottom padding keeps the last section clear of the app's floating
 * call / chat buttons (bottom right).
 */
import { useLocale, useTranslations } from "next-intl";
import { PropertyRow } from "../../../_components/primitives/property-row";
import { initials } from "../../../_components/primitives/initials";
import { TimeRow } from "../../../_components/timer/time-row";
import { formatShortDate } from "../../../_lib/format";
import type { TicketDetail } from "../../../_lib/types";
import type { PropertiesRailProps } from "../section-contracts";
import { AssigneesRow } from "./assignees-row";
import { GroupsRow, LabelsRow } from "./apply-rows";
import { BoardRow } from "./board-row";
import { CustomerRow } from "./customer-row";
import { CustomerSection } from "./customer-section";
import { DueDateRow } from "./due-date-row";
import { FormsSection } from "./forms-section";
import { PaymentBlock } from "./payment-block";
import { userName } from "./rail-shared";
import { DepartmentRow, PriorityRow, StatusRow } from "./simple-rows";

function reporterOf(ticket: TicketDetail): { name: string; initials: string } | null {
  if (ticket.reporter?.name) {
    return { name: ticket.reporter.name, initials: ticket.reporter.initials || initials(ticket.reporter.name) };
  }
  const name = userName(ticket.created_by);
  return name ? { name, initials: initials(name) } : null;
}

export function PropertiesRail({ ticket, perms }: PropertiesRailProps) {
  const t = useTranslations("ticketsScreen.rail");
  const locale = useLocale();
  const reporter = reporterOf(ticket);

  return (
    <div data-slot="properties-rail" data-ticket-id={ticket.id} className="flex flex-col pb-24 text-sm">
      <div data-slot="rail-rows" className="flex flex-col px-3 py-2" aria-label={t("properties")} role="group">
        <StatusRow ticket={ticket} perms={perms} />
        <PriorityRow ticket={ticket} perms={perms} />
        <AssigneesRow ticket={ticket} perms={perms} />
        <GroupsRow ticket={ticket} perms={perms} />
        <LabelsRow ticket={ticket} perms={perms} />
        <DepartmentRow ticket={ticket} perms={perms} />
        <BoardRow ticket={ticket} perms={perms} />
        <CustomerRow ticket={ticket} perms={perms} />
        <DueDateRow ticket={ticket} perms={perms} />
        <TimeRow ticketId={ticket.id} />
        <PropertyRow label={t("reporter")} fixed>
          {reporter ? (
            <span className="flex min-w-0 items-center gap-1.5" data-testid="rail-reporter">
              <span
                aria-hidden="true"
                className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[7px] font-semibold leading-none text-primary"
              >
                {reporter.initials}
              </span>
              <span className="truncate">{reporter.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </PropertyRow>
        <PropertyRow label={t("created")} fixed>
          <span className="block tabular-nums" data-testid="rail-created" title={ticket.created_at}>
            {formatShortDate(ticket.created_at, locale, { year: "auto" })}
          </span>
        </PropertyRow>
      </div>
      <PaymentBlock ticket={ticket} perms={perms} />
      <CustomerSection customer={ticket.customer} perms={perms} />
      <FormsSection ticket={ticket} />
    </div>
  );
}
