"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { packagesList } from "@/api/generated/api";
import type { PackageList } from "@/api/generated/interfaces";
import type { PricingModel } from "@/types/package";

// Extend PackageList to fix dynamic_features type
interface DynamicFeature {
  id: number;
  key: string;
  name: string;
  description: string;
  category: string;
  category_display: string;
  icon?: string;
  price_per_user_gel: string;
  price_unlimited_gel: string;
  sort_order: number;
  is_highlighted: boolean;
}

interface PackageListExtended extends Omit<PackageList, 'dynamic_features'> {
  dynamic_features: DynamicFeature[];
}

export function Pricing() {
  const t = useTranslations("landing.pricing");
  const [pricingModel, setPricingModel] = useState<PricingModel>("crm");
  const [packages, setPackages] = useState<PackageListExtended[]>([]);
  const [loading, setLoading] = useState(true);

  // Load packages on mount
  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await packagesList();
      // Type assertion: API returns dynamic_features as array but TypeScript thinks it's string
      setPackages((data.results || []) as unknown as PackageListExtended[]);
    } catch (error) {
      console.error('Failed to load packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPackagesByModel = (model: PricingModel) => {
    return packages.filter((pkg) => String(pkg.pricing_model) === model);
  };

  const displayPackages = getPackagesByModel(pricingModel);

  return (
    <section id="pricing" className="container py-16 space-y-8">
      <div className="text-center mx-auto space-y-4 max-w-3xl">
        <h2 className="text-4xl font-bold">{t("title")}</h2>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>

        {/* Trial Information Banner */}
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
            <span className="text-2xl">🎉</span>
            <span className="font-semibold">Start your 14-day free trial today - no credit card required upfront!</span>
          </div>
        </div>
      </div>

      <Tabs
        value={pricingModel}
        onValueChange={(v) => setPricingModel(v as PricingModel)}
        className="mt-12"
      >
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-1 md:grid-cols-2">
          <TabsTrigger value="crm">{t("tabs.crmBased")}</TabsTrigger>
          <TabsTrigger value="agent">{t("tabs.agentBased")}</TabsTrigger>
        </TabsList>

        <TabsContent value={pricingModel} className="mt-8">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading packages...</p>
            </div>
          ) : displayPackages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No packages available for this pricing model
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {displayPackages.map((pkg) => {
                const isHighlighted = pkg.is_highlighted;

                return (
                  <Card
                    key={pkg.id}
                    className={
                      isHighlighted ? "border-primary shadow-lg scale-105" : ""
                    }
                  >
                    <CardHeader>
                      {isHighlighted && (
                        <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                          {t("popular")}
                        </div>
                      )}
                      <CardTitle className="text-2xl">{pkg.display_name}</CardTitle>
                      <CardDescription>{pkg.description}</CardDescription>

                      {/* Trial Badge */}
                      <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-full text-xs font-medium">
                        <span>🎉</span>
                        <span>14-Day Free Trial</span>
                      </div>

                      <div className="mt-4">
                        <span className="text-4xl font-bold">{pkg.price_gel}₾</span>
                        <span className="text-muted-foreground ml-2">
                          / {pricingModel === 'agent' ? t('periods.perAgentMonth') : t('periods.perMonth')}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Free for 14 days
                        </p>
                        {pricingModel === 'crm' && pkg.max_users && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {t("users")}: {pkg.max_users === 999999 ? t("unlimited") : pkg.max_users}
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
                                <Check className="size-4 text-success shrink-0 mt-0.5" />
                              )}
                              <span className="text-sm">{feature.name}</span>
                            </li>
                          ))
                        ) : (
                          /* Fallback to legacy features_list */
                          pkg.features_list && Array.isArray(pkg.features_list) && pkg.features_list.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="size-4 text-success shrink-0 mt-0.5" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full"
                        variant={isHighlighted ? "default" : "outline"}
                        asChild
                      >
                        <Link href={`/registration?package=${pkg.id}`}>{t("getStarted")}</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="text-center mt-8 text-sm text-muted-foreground">
        {t("paymentNote")}
      </div>
    </section>
  );
}
