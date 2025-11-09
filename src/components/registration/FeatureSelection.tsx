'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import type { Feature } from '@/types/package';

interface FeatureSelectionProps {
  features: Feature[];
  loading: boolean;
  selectedFeatureIds: number[];
  agentCount: number;
  onFeatureToggle: (featureId: number) => void;
  onAgentCountChange: (count: number) => void;
  onContinue: () => void;
  onBack: () => void;
}

// Agent count options (10, 20, 30... 200)
const AGENT_COUNT_OPTIONS = Array.from({ length: 20 }, (_, i) => (i + 1) * 10);

export function FeatureSelection({
  features,
  loading,
  selectedFeatureIds,
  agentCount,
  onFeatureToggle,
  onAgentCountChange,
  onContinue,
  onBack,
}: FeatureSelectionProps) {
  const t = useTranslations('landing.pricing');
  const tAuth = useTranslations('auth');

  // Group features by category
  const featuresByCategory = useMemo(() => {
    const grouped: Record<string, Feature[]> = {};

    features.forEach((feature) => {
      const category = feature.category_display || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(feature);
    });

    // Sort features within each category by sort_order
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });

    return grouped;
  }, [features]);

  // Calculate total monthly cost
  const monthlyTotal = useMemo(() => {
    const selectedFeatures = features.filter((f) => selectedFeatureIds.includes(f.id));
    const totalPerAgent = selectedFeatures.reduce(
      (sum, feature) => sum + parseFloat(feature.price_per_user_gel || '0'),
      0
    );
    return totalPerAgent * agentCount;
  }, [features, selectedFeatureIds, agentCount]);

  // Calculate cost breakdown per feature
  const costBreakdown = useMemo(() => {
    return features
      .filter((f) => selectedFeatureIds.includes(f.id))
      .map((feature) => ({
        name: feature.name,
        pricePerAgent: parseFloat(feature.price_per_user_gel || '0'),
        totalPrice: parseFloat(feature.price_per_user_gel || '0') * agentCount,
      }));
  }, [features, selectedFeatureIds, agentCount]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading features...</p>
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
        <h1 className="text-4xl font-bold">Choose Your Features</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Select the features you need and the number of agents for your team
        </p>

        {/* Trial Information Banner */}
        <div className="max-w-3xl mx-auto mt-6 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🎉</div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                Start Your 14-Day Free Trial
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                No payment required now! We'll only charge your card after your trial ends.
                You can cancel anytime before the trial ends with no charge.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Agent Count Selector */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agent Count Card */}
          <Card>
            <CardHeader>
              <CardTitle>Number of Agents</CardTitle>
              <CardDescription>
                How many team members will be using EchoDesk?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-3xl font-bold text-primary">{agentCount}</Label>
                  <span className="text-sm text-muted-foreground">agents</span>
                </div>

                {/* Slider */}
                <Slider
                  value={[agentCount]}
                  onValueChange={([value]) => onAgentCountChange(value)}
                  min={10}
                  max={200}
                  step={10}
                  className="w-full"
                />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10 agents</span>
                  <span>200 agents</span>
                </div>
              </div>

              <Separator />

              {/* Or select from dropdown */}
              <div className="space-y-2">
                <Label>Or choose exact number:</Label>
                <Select value={agentCount.toString()} onValueChange={(v) => onAgentCountChange(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_COUNT_OPTIONS.map((count) => (
                      <SelectItem key={count} value={count.toString()}>
                        {count} agents
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Features Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Features</CardTitle>
              <CardDescription>
                Choose the features your team needs. You can always add more later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h3>
                  <div className="space-y-3">
                    {categoryFeatures.map((feature) => {
                      const isSelected = selectedFeatureIds.includes(feature.id);
                      const pricePerAgent = parseFloat(feature.price_per_user_gel || '0');

                      return (
                        <div
                          key={feature.id}
                          className={`
                            flex items-start gap-3 p-3 rounded-lg border transition-colors
                            ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                          `}
                        >
                          <Checkbox
                            id={`feature-${feature.id}`}
                            checked={isSelected}
                            onCheckedChange={() => onFeatureToggle(feature.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-1">
                            <Label
                              htmlFor={`feature-${feature.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {feature.icon && <span className="mr-2">{feature.icon}</span>}
                              {feature.name}
                            </Label>
                            {feature.description && (
                              <p className="text-sm text-muted-foreground">{feature.description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold">{pricePerAgent}₾</div>
                            <div className="text-xs text-muted-foreground">per agent/mo</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Price Summary (Sticky) */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Price Summary</CardTitle>
              <CardDescription>Your monthly subscription cost</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Features Count */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Selected features:</span>
                <span className="font-medium">{selectedFeatureIds.length}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Agents:</span>
                <span className="font-medium">{agentCount}</span>
              </div>

              <Separator />

              {/* Cost Breakdown */}
              {costBreakdown.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                    Breakdown
                  </div>
                  {costBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between text-sm">
                      <span className="text-muted-foreground flex-1">{item.name}</span>
                      <span className="font-medium shrink-0 ml-2">
                        {item.pricePerAgent}₾ × {agentCount} = {item.totalPrice.toFixed(2)}₾
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Select features to see pricing
                  </p>
                </div>
              )}

              <Separator />

              {/* Total */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">Monthly Total:</span>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {monthlyTotal.toFixed(2)}₾
                    </div>
                    <div className="text-xs text-muted-foreground">per month</div>
                  </div>
                </div>

                {/* Trial Reminder */}
                <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎉</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-green-900 dark:text-green-100">
                        Free for 14 days
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300">
                        Then {monthlyTotal.toFixed(2)}₾/month
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                disabled={selectedFeatureIds.length === 0}
                onClick={onContinue}
              >
                Continue to Registration
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div className="text-center mt-8 text-sm text-muted-foreground">
        You can add or remove features anytime after registration.
      </div>
    </div>
  );
}
