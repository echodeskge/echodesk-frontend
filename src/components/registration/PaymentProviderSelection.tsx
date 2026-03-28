'use client';

import { useTranslations } from 'next-intl';
import { CreditCard, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type PaymentProviderType = 'bog' | 'paddle';

interface PaymentProviderSelectionProps {
  selected: PaymentProviderType;
  onSelect: (provider: PaymentProviderType) => void;
}

export function PaymentProviderSelection({
  selected,
  onSelect,
}: PaymentProviderSelectionProps) {
  const t = useTranslations('subscription');

  const providers: {
    id: PaymentProviderType;
    name: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'bog',
      name: t('bog'),
      description: t('bogDescription'),
      icon: <CreditCard className="h-6 w-6" />,
    },
    {
      id: 'paddle',
      name: t('paddle'),
      description: t('paddleDescription'),
      icon: <Globe className="h-6 w-6" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {providers.map((provider) => (
        <Card
          key={provider.id}
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            selected === provider.id
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border',
          )}
          onClick={() => onSelect(provider.id)}
        >
          <CardContent className="flex items-start gap-4 p-6">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
                selected === provider.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {provider.icon}
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">{provider.name}</h3>
              <p className="text-sm text-muted-foreground">
                {provider.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
