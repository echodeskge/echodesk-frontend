"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Calendar, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePackages, useUpgradePreview } from "@/hooks/api/usePayments";
import { UpgradePreviewCard } from "./UpgradePreviewCard";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ChangePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPackageId?: number;
  onConfirmImmediate?: (packageId: number) => void;
  onConfirmScheduled?: (packageId: number) => void;
}

export function ChangePlanDialog({
  open,
  onOpenChange,
  currentPackageId,
  onConfirmImmediate,
  onConfirmScheduled,
}: ChangePlanDialogProps) {
  const t = useTranslations('subscription.changePlanDialog');
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [upgradeType, setUpgradeType] = useState<"immediate" | "scheduled">("scheduled");
  const [showPreview, setShowPreview] = useState(false);

  const { data: packagesData, isLoading: packagesLoading, error: packagesError } = usePackages();
  const {
    data: previewData,
    isLoading: previewLoading,
    refetch: refetchPreview
  } = useUpgradePreview(
    selectedPackageId || undefined,
    showPreview && selectedPackageId !== null
  );

  const packages = packagesData?.results || [];

  useEffect(() => {
    if (open && packagesData) {
      // Packages loaded
    }
  }, [open, packagesData, packages]);

  useEffect(() => {
    if (open) {
      setSelectedPackageId(null);
      setShowPreview(false);
      setUpgradeType("scheduled");
    }
  }, [open]);

  const handlePackageSelect = (packageId: number) => {
    setSelectedPackageId(packageId);
    setShowPreview(false);
  };

  const handlePreviewUpgrade = () => {
    if (!selectedPackageId) {
      toast.error("Please select a package");
      return;
    }
    setShowPreview(true);
    refetchPreview();
  };

  const handleConfirmUpgrade = () => {
    if (!selectedPackageId) {
      toast.error("Please select a package");
      return;
    }

    if (upgradeType === "immediate") {
      onConfirmImmediate?.(selectedPackageId);
    } else {
      onConfirmScheduled?.(selectedPackageId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Package Selection */}
          {!showPreview ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-3">{t('availablePlans')}</h3>
                {packagesLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : packages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {t('noPlans')}
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedPackageId?.toString()}
                    onValueChange={(value) => handlePackageSelect(Number(value))}
                    className="space-y-3"
                  >
                    {packages.map((pkg: any) => {
                      const isCurrentPlan = pkg.id === currentPackageId;
                      const isSelected = pkg.id === selectedPackageId;

                      return (
                        <div key={pkg.id} className="relative">
                          <Label
                            htmlFor={`package-${pkg.id}`}
                            className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            } ${isCurrentPlan ? "opacity-60" : ""}`}
                          >
                            <RadioGroupItem
                              value={pkg.id.toString()}
                              id={`package-${pkg.id}`}
                              disabled={isCurrentPlan}
                              className="mt-1"
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-lg">
                                    {pkg.display_name || pkg.name}
                                  </span>
                                  {isCurrentPlan && (
                                    <Badge variant="secondary">{t('currentPlan')}</Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-blue-600">
                                    {pkg.price_gel} GEL
                                  </p>
                                  <p className="text-xs text-gray-500">{t('perMonth')}</p>
                                </div>
                              </div>
                              {pkg.description && (
                                <p className="text-sm text-gray-600">{pkg.description}</p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {pkg.max_users && (
                                  <Badge variant="outline" className="text-xs">
                                    {pkg.max_users} Users
                                  </Badge>
                                )}
                                {pkg.max_storage_gb && (
                                  <Badge variant="outline" className="text-xs">
                                    {pkg.max_storage_gb} GB Storage
                                  </Badge>
                                )}
                                {pkg.max_whatsapp_messages !== -1 && (
                                  <Badge variant="outline" className="text-xs">
                                    {pkg.max_whatsapp_messages} WhatsApp Messages
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}
              </div>

              {selectedPackageId && (
                <>
                  <Separator />

                  {/* Upgrade Type Selection */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">{t('whenToApply')}</h3>
                    <RadioGroup
                      value={upgradeType}
                      onValueChange={(value: "immediate" | "scheduled") => setUpgradeType(value)}
                      className="space-y-3"
                    >
                      <div>
                        <Label
                          htmlFor="scheduled"
                          className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            upgradeType === "scheduled"
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <RadioGroupItem value="scheduled" id="scheduled" className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">{t('scheduledUpgrade.title')}</span>
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                {t('scheduledUpgrade.badge')}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {t('scheduledUpgrade.description')}
                            </p>
                          </div>
                        </Label>
                      </div>

                      <div>
                        <Label
                          htmlFor="immediate"
                          className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            upgradeType === "immediate"
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <RadioGroupItem value="immediate" id="immediate" className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Zap className="h-4 w-4 text-amber-600" />
                              <span className="font-medium">{t('immediateUpgrade.title')}</span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {t('immediateUpgrade.description')}
                            </p>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Preview View */
            <div className="space-y-4">
              <UpgradePreviewCard
                preview={previewData}
                upgradeType={upgradeType}
                isLoading={previewLoading}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('buttons.cancel')}
          </Button>
          {!showPreview ? (
            <Button
              onClick={handlePreviewUpgrade}
              disabled={!selectedPackageId || packagesLoading}
            >
              {previewLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('loading')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('buttons.previewUpgrade')}
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                {t('buttons.back')}
              </Button>
              <Button onClick={handleConfirmUpgrade}>
                {upgradeType === "immediate" ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    {t('buttons.confirmPayNow')}
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    {t('buttons.scheduleUpgrade')}
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
