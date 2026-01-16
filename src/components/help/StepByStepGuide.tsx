'use client';

import { cn } from '@/lib/utils';
import type { GuideStep } from '@/hooks/useHelpCenter';

interface StepByStepGuideProps {
  steps: GuideStep[];
  className?: string;
}

export function StepByStepGuide({ steps, className }: StepByStepGuideProps) {
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-8', className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex gap-4">
          {/* Step Number */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-md">
              {step.step || index + 1}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 pt-1">
            <h3 className="text-lg font-semibold mb-2 text-foreground">
              {step.title}
            </h3>

            <div
              className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: step.content }}
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
