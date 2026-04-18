import { CheckCircle2 } from 'lucide-react';
import type { LandingContentBlockChecklist } from '@/hooks/useLandingPages';

/**
 * Tight vertical rhythm bullet list with CheckCircle icons — used for
 * "What you get" style content blocks.
 */
export function Checklist({
  block,
  locale,
}: {
  block: LandingContentBlockChecklist;
  locale: 'ka' | 'en';
}) {
  const heading = locale === 'ka' ? block.heading_ka : block.heading_en;
  return (
    <section className="container py-12 md:py-16 space-y-6">
      {heading && (
        <h2 className="text-3xl md:text-4xl font-bold max-w-3xl">{heading}</h2>
      )}
      <ul className="space-y-3 max-w-3xl">
        {block.items.map((item, idx) => {
          const text = locale === 'ka' ? item.text_ka : item.text_en;
          return (
            <li key={idx} className="flex items-start gap-3">
              <CheckCircle2
                className="h-5 w-5 text-primary shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span className="text-base md:text-lg text-foreground leading-relaxed">
                {text}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
