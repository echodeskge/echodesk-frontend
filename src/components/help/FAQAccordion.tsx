'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import type { FAQItem } from '@/hooks/useHelpCenter';

interface FAQAccordionProps {
  items: FAQItem[];
  className?: string;
}

export function FAQAccordion({ items, className }: FAQAccordionProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Accordion type="single" collapsible className={cn('w-full', className)}>
      {items.map((item, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger className="text-left hover:no-underline">
            <span className="font-medium">{item.question}</span>
          </AccordionTrigger>
          <AccordionContent>
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground pt-2"
              dangerouslySetInnerHTML={{ __html: item.answer }}
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
