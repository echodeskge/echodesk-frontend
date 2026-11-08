import { cn } from "@/lib/utils";

/**
 * Shared look of the bottom-right dock launchers (team chat, phone): a
 * 36px primary circle with a visible focus ring. Size and position come
 * from TeamChat/floatingDock.
 */
export function dockLauncherClass(open: boolean) {
  return cn(
    "relative flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-[transform,background-color,opacity] duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    open ? "scale-95 opacity-90" : "hover:scale-105"
  );
}

/** Destructive count badge on a launcher (sidebar badge spec: 18px, 11px/600). */
export function DockBadge({ count, testId }: { count: number; testId?: string }) {
  return (
    <span
      aria-hidden
      data-testid={testId}
      className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-[5px] text-[11px] font-semibold leading-none text-destructive-foreground ring-[1.5px] ring-background"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** 7px status dot with a 1.5px background-coloured border. */
export function DockDot({ className, testId }: { className: string; testId?: string }) {
  return (
    <span
      aria-hidden
      data-testid={testId}
      className={cn("absolute right-0 top-0 h-[10px] w-[10px] rounded-full border-[1.5px] border-background", className)}
    />
  );
}
