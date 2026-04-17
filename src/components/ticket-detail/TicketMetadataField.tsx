"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface MetadataFieldProps {
  label: string;
  children: React.ReactNode;
  editing?: React.ReactNode;
  className?: string;
  /** If true, clicking the value area won't toggle edit mode (for components that handle their own interaction) */
  selfManaged?: boolean;
}

export function TicketMetadataField({
  label,
  children,
  editing,
  className,
  selfManaged,
}: MetadataFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsEditing(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing]);

  // Auto-activate the editing control on first click — without this, the
  // user has to click the value to enter edit mode and *then* click the
  // Select trigger to open the dropdown (a confusing double-click). We
  // find the first interactive child and either click it (Select / button)
  // or focus it (Input / textarea) so a single click opens the editor.
  useEffect(() => {
    if (!isEditing) return;
    // Defer to next frame so React commits the editing JSX first.
    const id = window.requestAnimationFrame(() => {
      const root = wrapperRef.current;
      if (!root) return;
      const trigger = root.querySelector<HTMLElement>(
        '[role="combobox"], [data-state][role="combobox"], button[type="button"], input, textarea, select'
      );
      if (!trigger) return;
      const tag = trigger.tagName;
      const role = trigger.getAttribute("role");
      if (role === "combobox" || tag === "BUTTON" || tag === "SELECT") {
        trigger.click();
      } else {
        trigger.focus();
        if (trigger instanceof HTMLInputElement || trigger instanceof HTMLTextAreaElement) {
          // Place caret at end so the user can keep typing.
          const len = trigger.value.length;
          try { trigger.setSelectionRange(len, len); } catch { /* type=tel etc. */ }
        }
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [isEditing]);

  if (selfManaged) {
    return (
      <div className={cn("flex items-start justify-between gap-4 py-2 group", className)}>
        <span className="text-xs text-muted-foreground whitespace-nowrap pt-1 min-w-[90px]">
          {label}
        </span>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={cn("flex items-start justify-between gap-4 py-2 group", className)}>
      <span className="text-xs text-muted-foreground whitespace-nowrap pt-1 min-w-[90px]">
        {label}
      </span>
      <div className="flex-1 min-w-0">
        {isEditing && editing ? (
          editing
        ) : (
          <div
            className={cn(
              "rounded-md transition-colors",
              editing && "cursor-pointer hover:bg-muted/60 -mx-1.5 px-1.5 py-0.5"
            )}
            onClick={() => {
              if (editing) setIsEditing(true);
            }}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
