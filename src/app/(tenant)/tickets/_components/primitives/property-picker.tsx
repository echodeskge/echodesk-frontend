"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ColorDot } from "./color-dot";
import { initials } from "./initials";
import { usePropertyRowLabelId } from "./property-row";

export interface PickerOption<T> {
  value: T;
  label: string;
  /** Colour dot (status, labels, boards). */
  color?: string | null;
  /** Name for an initials avatar (users). */
  avatarName?: string;
  /** Text colour of the option and its pill (priority). */
  textColor?: string;
  /** Extra search terms. */
  keywords?: string[];
  disabled?: boolean;
}

/**
 * Popover placement (DC34). The trigger starts 6px left of the value column
 * (−6px margin, width +6px) and the design's popover starts at the 92px label
 * edge with `left:92px; right:0`, so it sits 2px further left than the trigger
 * and is 2px wider; `top: calc(100% − 4px)` of the row = 4px under the trigger.
 */
export const PICKER_POPOVER = {
  align: "start",
  alignOffset: -2,
  sideOffset: 4,
  widthClass: "w-[calc(var(--radix-popover-trigger-width)+2px)]",
} as const;

interface BaseProps<T> {
  options: PickerOption<T>[];
  /** Custom pill for a selected option; defaults to `PropertyPill`. */
  renderPill?: (option: PickerOption<T>) => ReactNode;
  /** Muted text when nothing is selected. */
  placeholder: string;
  disabled?: boolean;
  /** Below the options, after a separator (e.g. "Manage labels…"). */
  footer?: ReactNode;
  /** Show a search box; defaults to more than 8 options. */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Screen-reader text after a selected option (e.g. "selected"). */
  selectedLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export interface SinglePickerProps<T> extends BaseProps<T> {
  multi?: false;
  value: T | null | undefined;
  /** Called with the picked option's value; the popover then closes. */
  onChange: (value: T) => void;
}

export interface MultiPickerProps<T> extends BaseProps<T> {
  multi: true;
  value: T[];
  /** Called with the new selection after each toggle; the popover stays open. */
  onChange: (value: T[]) => void;
}

export type PropertyPickerProps<T> = SinglePickerProps<T> | MultiPickerProps<T>;

export interface PropertyPillProps {
  label: string;
  color?: string | null;
  avatarName?: string;
  textColor?: string;
  className?: string;
}

/** Selected value pill: radius-full, 20px, muted fill, 12/500 (D180); 14px avatar (D181). */
export function PropertyPill({ label, color, avatarName, textColor, className }: PropertyPillProps) {
  return (
    <span
      data-slot="property-pill"
      className={cn(
        "inline-flex h-5 max-w-full items-center gap-[5px] rounded-full bg-muted px-1.5 text-xs font-medium",
        className,
      )}
      style={textColor ? { color: textColor } : undefined}
    >
      {color && <ColorDot color={color} size={6} />}
      {avatarName && (
        <span
          aria-hidden="true"
          data-slot="property-pill-avatar"
          className="-ml-[3px] flex size-3.5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[6px] font-bold leading-none text-primary"
        >
          {initials(avatarName)}
        </span>
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}

function defaultPill<T>(o: PickerOption<T>) {
  return <PropertyPill label={o.label} color={o.color} avatarName={o.avatarName} textColor={o.textColor} />;
}

/**
 * A rail picker: a borderless trigger showing the selected pills, opening a
 * Command list (arrow keys, Enter, type-ahead when searchable). Single mode
 * picks and closes; multi mode toggles and stays open.
 */
export function PropertyPicker<T>(props: PropertyPickerProps<T>) {
  const {
    options,
    renderPill = defaultPill,
    placeholder,
    disabled = false,
    footer,
    searchable,
    searchPlaceholder,
    emptyText,
    selectedLabel,
    open: openProp,
    onOpenChange,
    className,
  } = props;
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };
  const triggerId = useId();
  const rowLabelId = usePropertyRowLabelId();
  const commandRef = useRef<HTMLDivElement>(null);

  const selectedValues: T[] = props.multi ? props.value : props.value == null ? [] : [props.value];
  const isSelected = (v: T) => selectedValues.some((s) => Object.is(s, v));
  const selected = options.filter((o) => isSelected(o.value));
  const showSearch = searchable ?? options.length > 8;

  const pick = (o: PickerOption<T>) => {
    if (props.multi) {
      const next = isSelected(o.value)
        ? props.value.filter((v) => !Object.is(v, o.value))
        : [...props.value, o.value];
      props.onChange(next);
    } else {
      if (!isSelected(o.value)) props.onChange(o.value);
      setOpen(false);
    }
  };

  return (
    <Popover open={disabled ? false : open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          id={triggerId}
          type="button"
          disabled={disabled}
          aria-labelledby={rowLabelId ? `${rowLabelId} ${triggerId}` : undefined}
          data-slot="property-picker-trigger"
          data-state={open ? "open" : "closed"}
          className={cn(
            "-ml-1.5 flex min-h-[26px] w-[calc(100%+6px)] flex-wrap items-center gap-1 rounded-md border px-1.5 py-0.5 text-left",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            open ? "border-ring bg-accent" : "border-transparent",
            disabled ? "cursor-default" : "cursor-pointer hover:border-border hover:bg-muted/40",
            className,
          )}
        >
          {selected.length > 0 ? (
            selected.map((o, i) => <span key={`${String(o.value)}-${i}`} className="contents">{renderPill(o)}</span>)
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
        className={cn(PICKER_POPOVER.widthClass, "min-w-[180px] rounded-lg bg-background p-1 shadow-popover-lg")}
        onOpenAutoFocus={(e) => {
          if (showSearch) return; // the input takes focus itself
          e.preventDefault();
          commandRef.current?.focus();
        }}
      >
        <Command ref={commandRef} tabIndex={-1} loop className="bg-transparent outline-none">
          {showSearch && (
            <CommandInput placeholder={searchPlaceholder} className="h-8 py-1 text-[13px]" />
          )}
          <CommandList className="max-h-[280px]">
            {showSearch && <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">{emptyText}</CommandEmpty>}
            <div role="presentation" className="flex flex-col gap-0.5">
              {options.map((o, i) => {
                const active = isSelected(o.value);
                return (
                  <CommandItem
                    key={`${String(o.value)}-${i}`}
                    value={`${String(o.value)}::${i}`}
                    keywords={[o.label, ...(o.keywords ?? [])]}
                    disabled={o.disabled}
                    onSelect={() => pick(o)}
                    data-active={active ? "true" : "false"}
                    data-slot="property-picker-option"
                    className="h-[30px] gap-2 rounded-md px-2 py-0 text-[13px]"
                    style={o.textColor ? { color: o.textColor } : undefined}
                  >
                    {o.color && <ColorDot color={o.color} size={8} />}
                    {o.avatarName && (
                      <span
                        aria-hidden="true"
                        className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-[7px] font-semibold leading-none text-primary"
                      >
                        {initials(o.avatarName)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {active && (
                      <>
                        <Check aria-hidden="true" data-slot="property-picker-check" size={14} className="shrink-0" />
                        {selectedLabel && <span className="sr-only">{selectedLabel}</span>}
                      </>
                    )}
                  </CommandItem>
                );
              })}
            </div>
          </CommandList>
          {footer && (
            <>
              <CommandSeparator className="mx-0 my-1" />
              <div data-slot="property-picker-footer">{footer}</div>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
