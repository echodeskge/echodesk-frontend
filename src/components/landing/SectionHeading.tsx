import { cn } from '@/lib/utils';

/** Eyebrow + h2 + lead, per the design's section headers. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex max-w-[640px] flex-col gap-2.5', className)}>
      <span className="text-xs font-bold uppercase tracking-[.08em] text-secondary">{eyebrow}</span>
      <h2 className="text-[clamp(30px,3.6vw,42px)] font-extrabold leading-[1.08] tracking-[-.03em]">{title}</h2>
      {subtitle && <p className="text-[17px] leading-[26px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** The design's 1152 px container with 24 px gutters. */
export const CONTAINER = 'mx-auto w-full max-w-[1152px] px-6';
