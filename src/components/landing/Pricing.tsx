"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
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

export function Pricing() {
  const t = useTranslations("landing.pricing");
  const [pricingModel, setPricingModel] = useState<"agent" | "crm">("crm");

  const agentPlans = [
    {
      name: "essential",
      price: "5",
      period: "perAgentMonth" as const,
      features: [
        "tickets",
        "email",
        "basicReporting",
        "teamCollaboration",
        "mobileApp",
        "emailSupport",
      ],
      highlighted: false,
    },
    {
      name: "professional",
      price: "15",
      period: "perAgentMonth" as const,
      features: [
        "allEssential",
        "sipPhone",
        "callRecording",
        "facebookMessenger",
        "advancedWorkflows",
        "prioritySupport",
      ],
      highlighted: true,
    },
    {
      name: "enterprise",
      price: "25",
      period: "perAgentMonth" as const,
      features: [
        "allProfessional",
        "instagramDM",
        "whatsappAPI",
        "advancedAnalytics",
        "apiAccess",
        "customIntegrations",
        "dedicatedManager",
      ],
      highlighted: false,
    },
  ];

  const crmPlans = [
    {
      name: "starter",
      price: "50",
      users: "5" as const,
      period: "perMonth" as const,
      features: [
        "tickets",
        "email",
        "users5",
        "basicReporting",
        "mobileApp",
        "emailSupport",
      ],
      highlighted: false,
    },
    {
      name: "business",
      price: "150",
      users: "20" as const,
      period: "perMonth" as const,
      features: [
        "allStarter",
        "sipPhone",
        "facebookMessenger",
        "users20",
        "advancedWorkflows",
        "prioritySupport",
      ],
      highlighted: true,
    },
    {
      name: "enterprise",
      price: "350",
      users: "unlimited" as const,
      period: "perMonth" as const,
      features: [
        "allBusiness",
        "instagramDM",
        "whatsappAPI",
        "usersUnlimited",
        "advancedAnalytics",
        "apiAccess",
        "dedicatedManager",
      ],
      highlighted: false,
    },
  ];

  const plans = pricingModel === "agent" ? agentPlans : crmPlans;

  return (
    <section id="pricing" className="container py-16 space-y-8">
      <div className="text-center mx-auto space-y-2 max-w-3xl">
        <h2 className="text-4xl font-bold">{t("title")}</h2>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs
        value={pricingModel}
        onValueChange={(v) => setPricingModel(v as "agent" | "crm")}
        className="mt-12"
      >
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-1 md:grid-cols-2">
          <TabsTrigger value="crm">{t("tabs.crmBased")}</TabsTrigger>
          <TabsTrigger value="agent">{t("tabs.agentBased")}</TabsTrigger>
        </TabsList>

        <TabsContent value={pricingModel} className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted ? "border-secondary shadow-lg scale-105" : ""
                }
              >
                <CardHeader>
                  {plan.highlighted && (
                    <div className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
                      {t("popular")}
                    </div>
                  )}
                  <CardTitle className="text-2xl">
                    {t(`plans.${plan.name}.name`)}
                  </CardTitle>
                  <CardDescription>
                    {t(`plans.${plan.name}.description`)}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}₾</span>
                    <span className="text-muted-foreground ml-2">
                      / {t(`periods.${plan.period}`)}
                    </span>
                    {pricingModel === "crm" && "users" in plan && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {t("users")}:{" "}
                        {plan.users === "unlimited"
                          ? t("unlimited")
                          : plan.users}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                        <span className="text-sm">
                          {t(`features.${feature}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                    asChild
                  >
                    <Link href="/registration">{t("getStarted")}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="text-center mt-8 text-sm text-muted-foreground">
        {t("paymentNote")}
      </div>
    </section>
  );
}
