import { cn } from "@/lib/utils";

export interface ColorDotProps {
  color: string | null | undefined;
  /** Diameter in px: 6 (label chips, pills), 8 (boards, columns, options). */
  size?: 6 | 8 | 10;
  className?: string;
}

const SIZE: Record<NonNullable<ColorDotProps["size"]>, string> = {
  6: "size-1.5",
  8: "size-2",
  10: "size-2.5",
};

/** A round colour swatch (board, column, label). Decorative: hidden from AT. */
export function ColorDot({ color, size = 8, className }: ColorDotProps) {
  return (
    <span
      aria-hidden="true"
      data-slot="color-dot"
      className={cn("inline-block shrink-0 rounded-full", SIZE[size], className)}
      style={{ background: color || "hsl(var(--muted-foreground))" }}
    />
  );
}
