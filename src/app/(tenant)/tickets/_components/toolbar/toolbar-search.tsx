"use client";

/**
 * Toolbar search (D41, D46): a 220px input that writes `?q` 300ms after the
 * last keystroke. Below `sm` it collapses behind a Search icon that expands
 * the input; the input collapses again when it loses focus while empty.
 */
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const SEARCH_URL_DEBOUNCE_MS = 300;

export interface ToolbarSearchProps {
  value: string;
  onChange: (q: string) => void;
  placeholder: string;
  openLabel: string;
  clearLabel: string;
}

export function ToolbarSearch({ value, onChange, placeholder, openLabel, clearLabel }: ToolbarSearchProps) {
  const [text, setText] = useState(value);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Follow outside changes (Clear filters, back navigation).
  const lastSent = useRef(value);
  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const schedule = (next: string, delay = SEARCH_URL_DEBOUNCE_MS) => {
    setText(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      lastSent.current = next;
      onChangeRef.current(next);
    }, delay);
  };

  const expand = () => {
    setExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const open = expanded || text.length > 0;

  return (
    <div className="relative flex items-center" data-testid="toolbar-search">
      <button
        type="button"
        onClick={expand}
        aria-label={openLabel}
        title={openLabel}
        data-testid="toolbar-search-open"
        className={cn(
          "inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden",
          open && "hidden",
        )}
      >
        <Search aria-hidden="true" size={14} />
      </button>
      <div className={cn("relative", open ? "block" : "hidden sm:block")}>
        <Search
          aria-hidden="true"
          size={13}
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          type="search"
          value={text}
          placeholder={placeholder}
          aria-label={placeholder}
          data-testid="toolbar-search-input"
          onChange={(e) => schedule(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && text) {
              e.preventDefault();
              schedule("", 0);
            }
          }}
          onBlur={() => {
            if (!text) setExpanded(false);
          }}
          className="h-7 w-[160px] rounded-md border border-input bg-background pl-[26px] pr-7 text-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 xl:w-[220px] [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              schedule("", 0);
              inputRef.current?.focus();
            }}
            aria-label={clearLabel}
            title={clearLabel}
            className="absolute right-1 top-1/2 inline-flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
