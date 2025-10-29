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

export function Pricing() {
  const t = useTranslations("landing.pricing");
  const [pricingModel, setPricingModel] = useState<PricingModel>("crm");
  const [packages, setPackages] = useState<PackageList[]>([]);
  const [loading, setLoading] = useState(true);

  // Load packages on mount
  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await packagesList();
      setPackages(data.results || []);
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
      <div className="text-center mx-auto space-y-2 max-w-3xl">
        <h2 className="text-4xl font-bold">{t("title")}</h2>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
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
                      <div className="mt-4">
                        <span className="text-4xl font-bold">{pkg.price_gel}₾</span>
                        <span className="text-muted-foreground ml-2">
                          / {pricingModel === 'agent' ? t('periods.perAgentMonth') : t('periods.perMonth')}
                        </span>
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
