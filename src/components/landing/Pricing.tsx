"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { featuresList } from "@/api/generated/api";
import type { Feature } from "@/types/package";

export function Pricing() {
  const t = useTranslations("landing.pricing");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<number[]>([]);
  const [agentCount, setAgentCount] = useState(10);
  const [loading, setLoading] = useState(true);

  // Load features on mount
  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const data = await featuresList();
      const allFeatures = (data.results || []) as Feature[];
      setFeatures(allFeatures);

      // Pre-select popular features for demo
      const popularKeys = ['ticket_management', 'user_management', 'settings'];
      const popularIds = allFeatures
        .filter(f => popularKeys.includes(f.key))
        .map(f => f.id);
      setSelectedFeatureIds(popularIds);
    } catch (error) {
      console.error('Failed to load features:', error);
    } finally {
      setLoading(false);
    }
  };

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

    // Sort features within each category
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });

    return grouped;
  }, [features]);

  // Calculate monthly cost
  const monthlyTotal = useMemo(() => {
    const selectedFeatures = features.filter((f) => selectedFeatureIds.includes(f.id));
    const totalPerAgent = selectedFeatures.reduce(
      (sum, feature) => sum + parseFloat(feature.price_per_user_gel || '0'),
      0
    );
    return totalPerAgent * agentCount;
  }, [features, selectedFeatureIds, agentCount]);

  const handleFeatureToggle = (featureId: number) => {
    setSelectedFeatureIds((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    );
  };

  return (
    <section id="pricing" className="container py-16 space-y-8">
      <div className="text-center mx-auto space-y-4 max-w-3xl">
        <h2 className="text-4xl font-bold">{t("title")}</h2>
        <p className="text-lg text-muted-foreground">
          Pay only for what you need. Select features and team size to see your price.
        </p>

        {/* Trial Information Banner */}
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
            <span className="text-2xl">🎉</span>
            <span className="font-semibold">Start your 14-day free trial today - no credit card required upfront!</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading features...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
          {/* Left Column: Agent Count Selector */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Team Size</CardTitle>
                <CardDescription>How many agents will use EchoDesk?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Agent Count Display */}
                <div className="text-center space-y-2">
                  <div className="text-5xl font-bold text-primary">{agentCount}</div>
                  <div className="text-sm text-muted-foreground">agents</div>
                </div>

                {/* Slider */}
                <div className="space-y-4">
                  <Slider
                    value={[agentCount]}
                    onValueChange={([value]) => setAgentCount(value)}
                    min={10}
                    max={200}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10</span>
                    <span>200</span>
                  </div>
                </div>

                <Separator />

                {/* Monthly Total */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Your Monthly Cost</div>
                  <div className="space-y-1">
                    <div className="text-4xl font-bold text-primary">
                      {monthlyTotal.toFixed(2)}₾
                    </div>
                    <div className="text-xs text-muted-foreground">per month after trial</div>
                  </div>

                  {/* Trial Reminder */}
                  <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span>🎉</span>
                      <div className="flex-1 text-xs">
                        <div className="font-semibold text-green-900 dark:text-green-100">
                          Free for 14 days
                        </div>
                        <div className="text-green-700 dark:text-green-300">
                          No payment now
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <Link href="/register" className="block w-full">
                  <Button size="lg" className="w-full">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Feature Selection */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Your Features</CardTitle>
                <CardDescription>
                  Choose the features your team needs. Add or remove anytime.
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
                        const totalPrice = pricePerAgent * agentCount;

                        return (
                          <div
                            key={feature.id}
                            className={`
                              flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer
                              ${isSelected
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-border hover:border-primary/50 hover:bg-accent/50'
                              }
                            `}
                            onClick={() => handleFeatureToggle(feature.id)}
                          >
                            <Checkbox
                              id={`feature-${feature.id}`}
                              checked={isSelected}
                              onCheckedChange={() => handleFeatureToggle(feature.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 space-y-1">
                              <Label
                                htmlFor={`feature-${feature.id}`}
                                className="font-medium cursor-pointer flex items-center gap-2"
                              >
                                {feature.icon && <span>{feature.icon}</span>}
                                {feature.name}
                              </Label>
                              {feature.description && (
                                <p className="text-sm text-muted-foreground">
                                  {feature.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0 space-y-1">
                              <div className="font-semibold text-primary">
                                {pricePerAgent.toFixed(2)}₾
                              </div>
                              <div className="text-xs text-muted-foreground">per agent/mo</div>
                              {isSelected && (
                                <div className="text-xs font-medium text-muted-foreground">
                                  = {totalPrice.toFixed(2)}₾/mo
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {selectedFeatureIds.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Select features to build your custom plan</p>
                    <p className="text-sm">Start by choosing the features your team needs</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Features Summary */}
            {selectedFeatureIds.length > 0 && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    Your Custom Plan
                  </CardTitle>
                  <CardDescription>
                    {selectedFeatureIds.length} feature{selectedFeatureIds.length !== 1 ? 's' : ''} selected for {agentCount} agents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {features
                      .filter((f) => selectedFeatureIds.includes(f.id))
                      .map((feature) => {
                        const pricePerAgent = parseFloat(feature.price_per_user_gel || '0');
                        const totalPrice = pricePerAgent * agentCount;
                        return (
                          <div key={feature.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {feature.icon && <span className="mr-2">{feature.icon}</span>}
                              {feature.name}
                            </span>
                            <span className="font-medium">
                              {pricePerAgent}₾ × {agentCount} = {totalPrice.toFixed(2)}₾
                            </span>
                          </div>
                        );
                      })}
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between font-semibold text-lg">
                      <span>Total per month:</span>
                      <span className="text-primary">{monthlyTotal.toFixed(2)}₾</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href="/register" className="w-full">
                    <Button size="lg" className="w-full">
                      Continue with this plan
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="max-w-4xl mx-auto mt-16">
        <Card>
          <CardHeader>
            <CardTitle>Flexible Pricing</CardTitle>
            <CardDescription>
              Our feature-based pricing grows with your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="text-2xl">💪</div>
                <h3 className="font-semibold">Pay for what you use</h3>
                <p className="text-sm text-muted-foreground">
                  Select only the features you need. No bloated packages.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl">📈</div>
                <h3 className="font-semibold">Scale with confidence</h3>
                <p className="text-sm text-muted-foreground">
                  Add agents or features anytime. Pricing updates automatically.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl">🎁</div>
                <h3 className="font-semibold">14-day free trial</h3>
                <p className="text-sm text-muted-foreground">
                  Try all features free for 14 days. No credit card required upfront.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center mt-8 text-sm text-muted-foreground">
        <p>All prices in Georgian Lari (₾). Billed monthly. Cancel anytime.</p>
      </div>
    </section>
  );
}
