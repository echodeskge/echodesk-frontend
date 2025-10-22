'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, Loader2, CreditCard, Users } from 'lucide-react';
import axios from '@/api/axios';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';

interface Package {
  id: number;
  name: string;
  display_name: string;
  description: string;
  pricing_model: 'agent' | 'crm';
  price_gel: string;
  max_users?: number;
  max_whatsapp_messages: number;
  max_storage_gb: number;
  is_highlighted: boolean;
  features_list: string[];
}

interface UpgradeDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  packages?: Package[];
}

export const UpgradeDialog: React.FC<UpgradeDialogProps> = ({
  open,
  isOpen,
  onClose,
  packages: propPackages
}) => {
  const { subscription, refreshSubscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packages, setPackages] = useState<Package[]>(propPackages || []);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [agentCount, setAgentCount] = useState(1);

  const isDialogOpen = open ?? isOpen ?? false;

  // Fetch packages if not provided
  React.useEffect(() => {
    if (isDialogOpen && !propPackages && packages.length === 0) {
      fetchPackages();
    }
  }, [isDialogOpen, propPackages]);

  const fetchPackages = async () => {
    try {
      setPackagesLoading(true);
      const response = await axios.get('/api/packages/');
      setPackages(response.data || []);
    } catch (error) {
      console.error('Failed to fetch packages:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setPackagesLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPackage) return;

    try {
      setLoading(true);

      // Create payment session
      const response = await axios.post('/api/payments/create/', {
        package_id: selectedPackage.id,
        agent_count: selectedPackage.pricing_model === 'agent' ? agentCount : 1,
      });

      const { payment_url } = response.data;

      // Redirect to payment page
      if (payment_url) {
        window.location.href = payment_url;
      } else {
        toast.error('Failed to initialize payment');
      }
    } catch (error: any) {
      console.error('Payment creation failed:', error);
      toast.error(error.response?.data?.error || 'Failed to create payment session');
      setLoading(false);
    }
  };

  const calculatePrice = (pkg: Package) => {
    if (pkg.pricing_model === 'agent') {
      return parseFloat(pkg.price_gel) * agentCount;
    }
    return parseFloat(pkg.price_gel);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {subscription?.has_subscription ? 'Upgrade Your Subscription' : 'Choose a Plan'}
          </DialogTitle>
          <DialogDescription>
            {subscription?.has_subscription
              ? 'Choose a plan that fits your needs. You can upgrade or downgrade at any time.'
              : 'Select a subscription plan to unlock all features and start using EchoDesk.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {packagesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No subscription plans available at the moment.</p>
              <p className="text-sm mt-2">Please contact support for assistance.</p>
            </div>
          ) : (
            <>
              {/* Package Selection */}
              <RadioGroup
                value={selectedPackage?.id.toString()}
                onValueChange={(value) => {
                  const pkg = packages.find((p) => p.id.toString() === value);
                  if (pkg) setSelectedPackage(pkg);
                }}
              >
                <div className="grid gap-4">
                  {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPackage?.id === pkg.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${pkg.is_highlighted ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <RadioGroupItem value={pkg.id.toString()} id={`pkg-${pkg.id}`} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Label htmlFor={`pkg-${pkg.id}`} className="text-lg font-semibold cursor-pointer">
                            {pkg.display_name}
                          </Label>
                          {pkg.is_highlighted && (
                            <Badge className="bg-blue-500">Recommended</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>

                        {/* Features */}
                        <div className="grid grid-cols-2 gap-2">
                          {pkg.features_list.slice(0, 6).map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {pkg.pricing_model === 'agent' ? (
                          <div className="flex items-baseline gap-1">
                            <span>{pkg.price_gel}₾</span>
                            <span className="text-sm font-normal text-muted-foreground">/agent/month</span>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span>{pkg.price_gel}₾</span>
                            <span className="text-sm font-normal text-muted-foreground">/month</span>
                          </div>
                        )}
                      </div>
                      {pkg.max_users && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Up to {pkg.max_users} users
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                  ))}
                </div>
              </RadioGroup>

              {/* Agent Count Input (for agent-based pricing) */}
              {selectedPackage?.pricing_model === 'agent' && (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <Label htmlFor="agent-count" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Number of Agents
                  </Label>
                  <Input
                    id="agent-count"
                    type="number"
                    min="1"
                    value={agentCount}
                    onChange={(e) => setAgentCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="max-w-xs"
                  />
                  <p className="text-sm text-muted-foreground">
                    Total: <span className="font-semibold">{calculatePrice(selectedPackage)}₾/month</span>
                  </p>
                </div>
              )}

              {/* Total Amount */}
              {selectedPackage && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">You will be charged</p>
                      <p className="text-2xl font-bold">{calculatePrice(selectedPackage)}₾</p>
                      <p className="text-sm text-muted-foreground">Billed monthly</p>
                    </div>
                    <CreditCard className="h-12 w-12 text-blue-600 opacity-50" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpgrade} disabled={!selectedPackage || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Processing...' : 'Proceed to Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
