"use client";

/**
 * Customer row (FE-12, U2, E23, R13): link the ticket to a client.
 *
 * Only rendered when `can_view_customer` (the server sends `customer: null`
 * and ignores `customer_id` otherwise). Editing also needs `can_edit`. The
 * popover searches `/api/social/clients/` on the server (debounced, first
 * 20 matches) and offers "None" to unlink. Writes `customer_id`.
 */
import { useEffect, useId, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useSocialClients } from "@/hooks/api/useSocialClients";
import { cn } from "@/lib/utils";
import { PICKER_POPOVER, PropertyPill } from "../../../_components/primitives/property-picker";
import { PropertyRow, usePropertyRowLabelId } from "../../../_components/primitives/property-row";
import { initials } from "../../../_components/primitives/initials";
import type { TicketCustomer, TicketDetail, ViewerPermissions } from "../../../_lib/types";
import { railTriggerClass, useEditingPresence, useRailPatch, RailLabel } from "./rail-shared";

const SEARCH_DEBOUNCE_MS = 250;
const RESULT_LIMIT = 20;

interface ClientRow {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
}

function CustomerOptions({
  current,
  onPick,
}: {
  current: TicketCustomer | null;
  onPick: (client: ClientRow | null) => void;
}) {
  const t = useTranslations("ticketsScreen.rail");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const { data, isFetching } = useSocialClients({ search: search || undefined, page: 1, page_size: RESULT_LIMIT });
  const rows = ((data as { results?: ClientRow[] } | undefined)?.results ?? []) as ClientRow[];

  return (
    <Command shouldFilter={false} loop className="bg-transparent">
      <div className="relative">
        <CommandInput
          value={input}
          onValueChange={setInput}
          placeholder={t("searchClients")}
          aria-label={t("searchClients")}
          className="h-8 py-1 text-[13px]"
        />
        {isFetching && (
          <Loader2 aria-hidden="true" className="absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <CommandList className="max-h-[280px] [&_[cmdk-list-sizer]]:flex [&_[cmdk-list-sizer]]:flex-col [&_[cmdk-list-sizer]]:gap-0.5">
        {!isFetching && <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">{t("noResults")}</CommandEmpty>}
        {current && !search && (
          <CommandItem
            value="__none__"
            onSelect={() => onPick(null)}
            data-slot="property-picker-option"
            className="h-[30px] gap-2 rounded-md px-2 py-0 text-[13px] text-muted-foreground"
          >
            <span className="min-w-0 flex-1 truncate">{t("none")}</span>
          </CommandItem>
        )}
        {rows.map((c) => {
          const active = current?.id === c.id;
          const sub = c.email || c.phone || "";
          return (
            <CommandItem
              key={c.id}
              value={`client-${c.id}`}
              onSelect={() => onPick(c)}
              data-slot="property-picker-option"
              data-active={active ? "true" : "false"}
              className="h-[30px] gap-2 rounded-md px-2 py-0 text-[13px]"
            >
              <span
                aria-hidden="true"
                className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-[7px] font-semibold leading-none text-primary"
              >
                {initials(c.name)}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {c.name}
                {sub && <span className="ml-1.5 text-[11px] text-muted-foreground">{sub}</span>}
              </span>
              {active && (
                <>
                  <Check aria-hidden="true" size={14} className="shrink-0" />
                  <span className="sr-only">{t("selected")}</span>
                </>
              )}
            </CommandItem>
          );
        })}
      </CommandList>
    </Command>
  );
}

export function CustomerRow({ ticket, perms }: { ticket: TicketDetail; perms: ViewerPermissions }) {
  const t = useTranslations("ticketsScreen.rail");
  const { patch } = useRailPatch(ticket.id);
  const presence = useEditingPresence(ticket.id, "customer");
  const [open, setOpen] = useState(false);
  const disabled = !perms.can_edit;

  if (!perms.can_view_customer) return null;

  const change = (next: boolean) => {
    if (disabled) return;
    setOpen(next);
    presence(next);
  };

  const pick = (client: ClientRow | null) => {
    change(false);
    if ((client?.id ?? null) === (ticket.customer?.id ?? null)) return;
    const customer: TicketCustomer | null = client
      ? { id: client.id, name: client.name, email: client.email ?? null, phone: client.phone ?? "" }
      : null;
    patch({ customer_id: client?.id ?? null }, (prev) => ({ ...prev, customer }));
  };

  return (
    <PropertyRow label={<RailLabel>{t("customer")}</RailLabel>}>
      <CustomerTrigger
        open={open}
        onOpenChange={change}
        disabled={disabled}
        customer={ticket.customer}
        placeholder={t("none")}
      >
        <CustomerOptions current={ticket.customer} onPick={pick} />
      </CustomerTrigger>
    </PropertyRow>
  );
}

function CustomerTrigger({
  open,
  onOpenChange,
  disabled,
  customer,
  placeholder,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled: boolean;
  customer: TicketCustomer | null;
  placeholder: string;
  children: React.ReactNode;
}) {
  const labelId = usePropertyRowLabelId();
  const id = useId();
  return (
    <Popover open={!disabled && open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          id={id}
          aria-labelledby={labelId ? `${labelId} ${id}` : undefined}
          data-slot="property-picker-trigger"
          data-testid="customer-picker"
          data-state={open ? "open" : "closed"}
          className={railTriggerClass(open, disabled)}
        >
          {customer ? (
            <PropertyPill label={customer.name} avatarName={customer.name} />
          ) : (
            <span className="text-xs text-muted-foreground">{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={PICKER_POPOVER.align}
        alignOffset={PICKER_POPOVER.alignOffset}
        sideOffset={PICKER_POPOVER.sideOffset}
        data-slot="property-picker-content"
        className={cn(PICKER_POPOVER.widthClass, "min-w-[220px] rounded-lg bg-background p-1 shadow-popover-lg")}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
