'use client';

import { useRef } from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import type { GuideStep } from '@/hooks/useHelpCenter';
import { useEnhanceCodeBlocks } from './useEnhanceCodeBlocks';

interface StepByStepGuideProps {
  steps: GuideStep[];
  className?: string;
}

export function StepByStepGuide({ steps, className }: StepByStepGuideProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEnhanceCodeBlocks(ref, [steps]);

  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className={cn('space-y-10', className)}>
      {steps.map((step, index) => (
        <div
          key={index}
          className="flex gap-5 border-b border-border/50 last:border-0 pb-10 last:pb-0"
        >
          {/* Step Number — pinned size so DB content never stretches it */}
          <div className="flex-shrink-0">
            <div
              className="rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-md"
              style={{ width: 44, height: 44, fontSize: '1.125rem' }}
            >
              {step.step || index + 1}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 pt-1 min-w-0">
            <h3 className="text-xl font-semibold mb-3 text-foreground">
              {step.title}
            </h3>

            <div
              className={cn(
                'prose prose-sm dark:prose-invert max-w-none',
                // Foreground body text (prose default is too muted on dark bg).
                'prose-p:text-foreground/90 prose-li:text-foreground/90',
                // Inner headings shouldn't compete with the step title.
                'prose-h3:text-base prose-h3:font-semibold prose-h3:mt-5 prose-h3:mb-2 prose-h3:text-foreground',
                'prose-h4:text-sm prose-h4:font-semibold prose-h4:mt-4 prose-h4:mb-2 prose-h4:text-foreground',
                // Code blocks: visible contrast in dark mode.
                'prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800',
                'prose-pre:text-zinc-100 prose-pre:rounded-md prose-pre:text-xs',
                // Inline code chips.
                'prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-code:text-xs',
                // List bullets.
                'prose-li:marker:text-muted-foreground prose-li:my-1',
                // Links.
                'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
                // Strong in body should pop.
                'prose-strong:text-foreground'
              )}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(step.content) }}
            />

            {step.image && (
              <div className="mt-4">
                <img
                  src={step.image}
                  alt={`Step ${step.step || index + 1}: ${step.title}`}
                  className="rounded-lg border shadow-sm max-w-full h-auto"
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
