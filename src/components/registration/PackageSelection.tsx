'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PackageList } from '@/api/generated/interfaces';
import { PricingModel } from '@/types/package';

interface PackageSelectionProps {
  packages: PackageList[];
  loading: boolean;
  selectedPackage: PackageList | null;
  onPackageSelect: (pkg: PackageList) => void;
  onCustomPackage: () => void;
  onBack: () => void;
}

export function PackageSelection({
  packages,
  loading,
  selectedPackage,
  onPackageSelect,
  onCustomPackage,
  onBack,
}: PackageSelectionProps) {
  const t = useTranslations('landing.pricing');
  const tAuth = useTranslations('auth');
  const [pricingModel, setPricingModel] = useState<PricingModel>('agent');

  const getPackagesByModel = (model: PricingModel) => {
    return packages.filter((pkg) => String(pkg.pricing_model) === model);
  };

  const displayPackages = getPackagesByModel(pricingModel);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">{tAuth('loadingPackages')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tAuth('backToHome')}
        </Button>
        <h1 className="text-4xl font-bold">{tAuth('choosePlan')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {tAuth('selectPackageDesc')}
        </p>
      </div>

      {/* Pricing Model Tabs */}
      <Tabs
        value={pricingModel}
        onValueChange={(v) => setPricingModel(v as PricingModel)}
        className="mt-8"
      >
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="agent">{t('tabs.agentBased')}</TabsTrigger>
          <TabsTrigger value="crm">{t('tabs.crmBased')}</TabsTrigger>
        </TabsList>

        <TabsContent value={pricingModel} className="mt-8">
          {displayPackages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {tAuth('noPackagesAvailable')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayPackages.map((pkg) => {
                const isHighlighted = pkg.is_highlighted;
                const isSelected = selectedPackage?.id === pkg.id;

                return (
                  <Card
                    key={pkg.id}
                    className={`
                      ${isHighlighted ? 'border-primary shadow-lg scale-105' : ''}
                      ${isSelected ? 'ring-2 ring-primary' : ''}
                      transition-all hover:shadow-md
                    `}
                  >
                    <CardHeader>
                      {isHighlighted && (
                        <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                          {t('popular')}
                        </div>
                      )}
                      <CardTitle className="text-2xl">{pkg.display_name}</CardTitle>
                      <CardDescription>{pkg.description}</CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">{pkg.price_gel}₾</span>
                        <span className="text-muted-foreground ml-2">
                          / {pricingModel === 'agent' ? t('periods.perAgentMonth') : t('periods.perMonth')}
                        </span>
                        {pricingModel === 'crm' && pkg.max_users && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {t('users')}: {pkg.max_users === 999999 ? t('unlimited') : pkg.max_users}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {/* Show dynamic features if available */}
                        {pkg.dynamic_features && pkg.dynamic_features.length > 0 ? (
                          pkg.dynamic_features.map((feature) => (
                            <li key={feature.id} className="flex items-start gap-2">
                              {feature.icon ? (
                                <span className="text-lg shrink-0">{feature.icon}</span>
                              ) : (
                                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              )}
                              <span className="text-sm">{feature.name}</span>
                            </li>
                          ))
                        ) : (
                          /* Fallback to legacy features_list */
                          pkg.features_list && Array.isArray(pkg.features_list) && pkg.features_list.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full"
                        variant={isHighlighted || isSelected ? 'default' : 'outline'}
                        onClick={() => onPackageSelect(pkg)}
                      >
                        {isSelected ? tAuth('selected') : tAuth('selectPlan')}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Custom Package Option */}
      <Card className="border-2 border-dashed border-primary/50 bg-primary/5 mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {tAuth('customPackage') || 'Custom Package'}
          </CardTitle>
          <CardDescription>
            {tAuth('customPackageDesc') || 'Build a package tailored to your specific needs. Select only the features you want and pay for what you use.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 mb-4">
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span>{tAuth('customFeature1') || 'Choose exactly what you need'}</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span>{tAuth('customFeature2') || 'Flexible pricing based on features'}</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span>{tAuth('customFeature3') || '10% discount on CRM-based pricing'}</span>
            </li>
          </ul>
          <Button className="w-full" variant="default" onClick={onCustomPackage}>
            <Sparkles className="mr-2 h-4 w-4" />
            {tAuth('buildCustomPackage') || 'Build Custom Package'}
          </Button>
        </CardContent>
      </Card>

      <div className="text-center mt-8 text-sm text-muted-foreground">
        {t('paymentNote')}
      </div>
    </div>
  );
}
