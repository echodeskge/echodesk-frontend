import { BenefitGrid } from './BenefitGrid';
import { Checklist } from './Checklist';
import { FeatureShowcase } from './FeatureShowcase';
import type { LandingContentBlock } from '@/hooks/useLandingPages';
import type { Feature } from '@/types/package';

/**
 * Dispatches each content block to its typed renderer. The backend
 * authors arbitrary ordering of these blocks per page, so we just walk
 * the array in order and pick the right sub-component via discriminated
 * union narrowing.
 */
export function ContentBlocks({
  blocks,
  locale,
  features,
}: {
  blocks: LandingContentBlock[];
  locale: 'ka' | 'en';
  features: Feature[];
}) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  return (
    <>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'benefit_grid':
            return <BenefitGrid key={idx} block={block} locale={locale} />;
          case 'checklist':
            return <Checklist key={idx} block={block} locale={locale} />;
          case 'feature_showcase':
            return (
              <FeatureShowcase
                key={idx}
                block={block}
                locale={locale}
                features={features}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
