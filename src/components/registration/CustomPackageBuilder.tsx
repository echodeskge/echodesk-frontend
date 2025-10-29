'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Info, Calculator, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { listAvailableFeatures, calculateCustomPackagePrice } from '@/api/generated/api';
import type { PricingModel } from '@/types/package';

interface Feature {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  price_per_user_gel: string;
  price_unlimited_gel: string;
  sort_order: number;
}

interface Category {
  category: string;
  category_display: string;
  features: Feature[];
}

interface CustomPackageBuilderProps {
  onComplete: (packageData: {
    feature_ids: number[];
    pricing_model: PricingModel;
    user_count?: number;
    max_users?: number;
    total_price: string;
  }) => void;
  onBack: () => void;
}

export function CustomPackageBuilder({ onComplete, onBack }: CustomPackageBuilderProps) {
  const t = useTranslations('auth');
  const tPricing = useTranslations('landing.pricing');

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<number>>(new Set());
  const [pricingModel, setPricingModel] = useState<PricingModel>('agent');
  const [userCount, setUserCount] = useState<number>(1);
  const [maxUsers, setMaxUsers] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [totalPrice, setTotalPrice] = useState<string>('0');
  const [subtotal, setSubtotal] = useState<string>('0');
  const [discount, setDiscount] = useState<string>('0');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadFeatures();
  }, []);

  useEffect(() => {
    if (selectedFeatures.size > 0) {
      calculatePrice();
    } else {
      setTotalPrice('0');
      setSubtotal('0');
      setDiscount('0');
    }
  }, [selectedFeatures, pricingModel, userCount, maxUsers]);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const data = await listAvailableFeatures();
      setCategories((data.categories as Category[]) || []);
    } catch (error) {
      console.error('Failed to load features:', error);
      setError(t('loadFeaturesFailed') || 'Failed to load features');
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = async () => {
    try {
      setCalculating(true);
      const data: any = await calculateCustomPackagePrice({
        feature_ids: Array.from(selectedFeatures),
        pricing_model: pricingModel,
        user_count: pricingModel === 'agent' ? userCount : undefined,
        max_users: pricingModel === 'crm' ? maxUsers : undefined,
      } as any);
      setTotalPrice(data.total_price || '0');
      setSubtotal(data.subtotal || '0');
      setDiscount(data.discount || '0');
    } catch (error) {
      console.error('Failed to calculate price:', error);
    } finally {
      setCalculating(false);
    }
  };

  const toggleFeature = (featureId: number) => {
    const newSelected = new Set(selectedFeatures);
    if (newSelected.has(featureId)) {
      newSelected.delete(featureId);
    } else {
      newSelected.add(featureId);
    }
    setSelectedFeatures(newSelected);
  };

  const handleComplete = () => {
    if (selectedFeatures.size === 0) {
      setError(t('selectAtLeastOneFeature') || 'Please select at least one feature');
      return;
    }

    onComplete({
      feature_ids: Array.from(selectedFeatures),
      pricing_model: pricingModel,
      user_count: pricingModel === 'agent' ? userCount : undefined,
      max_users: pricingModel === 'crm' ? maxUsers : undefined,
      total_price: totalPrice,
    });
  };

  const getFeaturePrice = (feature: Feature) => {
    if (pricingModel === 'agent') {
      return `${parseFloat(feature.price_per_user_gel) * userCount}₾`;
    }
    return `${feature.price_unlimited_gel}₾`;
  };

  const getFeaturePriceDescription = (feature: Feature) => {
    if (pricingModel === 'agent') {
      return `${feature.price_per_user_gel}₾ × ${userCount} ${t('users') || 'users'}`;
    }
    return t('unlimitedUsers') || 'Unlimited users';
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">{t('loadingFeatures') || 'Loading features...'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToPlans')}
        </Button>
        <h1 className="text-4xl font-bold">{t('buildCustomPackage') || 'Build Your Custom Package'}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('customPackageDesc') || 'Select the features you need and create a package tailored to your business'}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Pricing Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t('selectPricingModel') || 'Select Pricing Model'}</CardTitle>
          <CardDescription>
            {t('pricingModelDesc') || 'Choose how you want to be billed'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={pricingModel}
            onValueChange={(v) => setPricingModel(v as PricingModel)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="agent">{tPricing('tabs.agentBased')}</TabsTrigger>
              <TabsTrigger value="crm">{tPricing('tabs.crmBased')}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-4">
            {pricingModel === 'agent' ? (
              <div className="space-y-2">
                <Label htmlFor="user_count">{t('numberOfUsers') || 'Number of Users'}</Label>
                <Input
                  id="user_count"
                  type="number"
                  min="1"
                  value={userCount}
                  onChange={(e) => setUserCount(parseInt(e.target.value) || 1)}
                />
                <p className="text-sm text-muted-foreground">
                  {t('agentPricingNote') || 'Pay per user - Scale as you grow'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="max_users">{t('maxUsers') || 'Maximum Users'}</Label>
                <Input
                  id="max_users"
                  type="number"
                  min="1"
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(parseInt(e.target.value) || 10)}
                />
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {t('crmPricingNote') || 'Flat rate pricing with 10% discount - Unlimited growth potential'}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {categories.map((category) => (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle className="text-xl">{category.category_display}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category.features.map((feature) => {
                    const isSelected = selectedFeatures.has(feature.id);

                    return (
                      <div
                        key={feature.id}
                        className={`
                          flex items-start gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer
                          ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                        `}
                        onClick={() => toggleFeature(feature.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleFeature(feature.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {feature.icon && <span className="text-lg">{feature.icon}</span>}
                              <h4 className="font-semibold">{feature.name}</h4>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-primary">{getFeaturePrice(feature)}</div>
                              <div className="text-xs text-muted-foreground">
                                {getFeaturePriceDescription(feature)}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Price Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {t('priceSummary') || 'Price Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{t('selectedFeatures') || 'Selected Features'}</span>
                  <Badge variant="secondary">{selectedFeatures.size}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{t('pricingModel') || 'Pricing Model'}</span>
                  <span className="font-medium">
                    {pricingModel === 'agent' ? tPricing('tabs.agentBased') : tPricing('tabs.crmBased')}
                  </span>
                </div>
                {pricingModel === 'agent' && (
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{t('users') || 'Users'}</span>
                    <span className="font-medium">{userCount}</span>
                  </div>
                )}
                {pricingModel === 'crm' && (
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{t('maxUsers') || 'Max Users'}</span>
                    <span className="font-medium">{maxUsers}</span>
                  </div>
                )}
              </div>

              {/* Trial Information */}
              <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-lg">🎉</span>
                  <div>
                    <div className="font-semibold text-green-900 dark:text-green-100">14-Day Free Trial</div>
                    <div className="text-xs text-green-700 dark:text-green-300">No charge now, only after trial ends</div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('subtotal') || 'Subtotal'}</span>
                  <span>{calculating ? '...' : `${subtotal}₾`}</span>
                </div>
                {pricingModel === 'crm' && parseFloat(discount) > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>{t('discount') || 'Discount (10%)'}</span>
                    <span>-{discount}₾</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-lg font-bold pt-2 border-t">
                  <span>{t('totalPerMonth') || 'After Trial'}</span>
                  <span className="text-primary">{calculating ? '...' : `${totalPrice}₾/month`}</span>
                </div>
                <div className="flex items-center justify-between text-xl font-bold pt-2 border-t text-green-600">
                  <span>Today's Charge</span>
                  <span>0₾</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleComplete}
                disabled={selectedFeatures.size === 0 || calculating}
              >
                {t('continueWithCustom') || 'Continue with Custom Package'}
              </Button>

              {selectedFeatures.size === 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  {t('selectFeaturesNote') || 'Select features to continue'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
