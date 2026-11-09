"use client";

/**
 * A toolbar filter: a `FilterChip` trigger and a Command popover (D46).
 * Multi-select keeps the popover open after each toggle; single-select closes
 * it, and picking the selected value again clears it. Options can carry a
 * colour dot (labels), an icon (priority) or an initials avatar (users).
 */
import { useState, type ReactNode } from "react";
import { Check, type LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ColorDot } from "../primitives/color-dot";
import { FilterChip } from "../primitives/filter-chip";
import { initials } from "../primitives/initials";

/** cmdk's active row: `muted` instead of `accent` (see the FilterChip note below). */
export const ITEM_HIGHLIGHT = "data-[selected=true]:bg-muted data-[selected=true]:text-foreground";

export interface FilterOption {
  value: string;
  label: string;
  color?: string | null;
  icon?: ReactNode;
  avatarName?: string;
}

export interface FilterMenuProps {
  /** Stable id for tests (`data-filter`). */
  id: string;
  icon: LucideIcon;
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multi?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Rows after a separator (e.g. "More filters"). */
  footer?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FilterMenu({
  id,
  icon,
  label,
  options,
  selected,
  onChange,
  multi = true,
  searchable,
  searchPlaceholder,
  emptyText,
  footer,
  open: openProp,
  onOpenChange,
}: FilterMenuProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => {
    if (openProp === undefined) setOpenState(v);
    onOpenChange?.(v);
  };

  const chosen = options.filter((o) => selected.includes(o.value));
  const active = chosen.length > 0;

  const toggle = (value: string) => {
    if (multi) {
      onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      onChange(selected.includes(value) ? [] : [value]);
      setOpen(false);
    }
  };

  const showSearch = searchable ?? options.length > 8;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterChip
          icon={icon}
          label={label}
          active={active}
          valueLabel={chosen[0]?.label}
          extraCount={Math.max(0, chosen.length - 1)}
          data-filter={id}
          aria-haspopup="dialog"
          aria-expanded={open}
          // `muted`, not the primitive's `accent`: ThemeContext keeps --accent light in dark mode.
          className={cn("hover:bg-muted", active && "bg-muted")}
        />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-[240px] p-0 shadow-popover-lg" data-filter-menu={id}>
        <Command>
          {showSearch && <CommandInput placeholder={searchPlaceholder} className="h-9 text-[13px]" />}
          <CommandList className="max-h-[280px]">
            {emptyText && <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">{emptyText}</CommandEmpty>}
            <CommandGroup className="p-1">
              {options.map((o) => {
                const isSelected = selected.includes(o.value);
                return (
                  <CommandItem
                    key={o.value}
                    value={`${o.label} ${o.value}`}
                    onSelect={() => toggle(o.value)}
                    aria-selected={isSelected}
                    data-option={o.value}
                    data-checked={isSelected ? "true" : "false"}
                    className={cn("h-[30px] cursor-pointer gap-2 px-2 text-[13px]", ITEM_HIGHLIGHT)}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border",
                        multi ? "" : "rounded-full",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50",
                      )}
                    >
                      {isSelected && <Check size={10} strokeWidth={3} />}
                    </span>
                    {o.icon}
                    {o.color !== undefined && <ColorDot color={o.color} size={8} />}
                    {o.avatarName && (
                      <span
                        aria-hidden="true"
                        className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-[8px] font-semibold text-primary"
                      >
                        {initials(o.avatarName)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {footer && (
              <>
                <CommandSeparator />
                <CommandGroup className="p-1">{footer}</CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
