'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Building2, User, Mail, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Feature, PricingModel } from '@/types/package';
import type { RegistrationFormData } from './RegistrationFlow';

// Define package types locally since they're not in the generated API
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

interface PackageListExtended {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  pricing_model: PricingModel;
  price_gel?: string;
  price_per_user_gel?: string;
  price_unlimited_gel?: string;
  max_users?: number;
  dynamic_features: DynamicFeature[];
  features_list?: string[];
  is_highlighted?: boolean;
}

interface RegistrationFormStepProps {
  formData: RegistrationFormData;
  setFormData: React.Dispatch<React.SetStateAction<RegistrationFormData>>;
  selectedPackage?: PackageListExtended | null; // Optional for backward compat
  features?: Feature[]; // New: selected features
  agentCount?: number; // New: agent count
  loading: boolean;
  error: string;
  onSubmit: (data: RegistrationFormData) => void;
  onBack: () => void;
}

export function RegistrationFormStep({
  formData,
  setFormData,
  selectedPackage,
  features,
  agentCount,
  loading,
  error,
  onSubmit,
  onBack,
}: RegistrationFormStepProps) {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');

  // Calculate monthly cost for feature-based model
  const monthlyTotal = features && agentCount
    ? features.reduce((sum, f) => sum + parseFloat(f.price_per_user_gel || '0'), 0) * agentCount
    : selectedPackage
    ? Number(selectedPackage.price_gel) * formData.agent_count
    : 0;

  // Auto-generate domain from company name
  useEffect(() => {
    if (formData.company_name) {
      const generatedDomain = formData.company_name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      setFormData((prev) => ({
        ...prev,
        domain: generatedDomain,
      }));
    }
  }, [formData.company_name, setFormData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isAgentBased = formData.pricing_model === 'agent';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToPlans')}
        </Button>
        <h1 className="text-4xl font-bold">{t('completeRegistration')}</h1>
        <p className="text-lg text-muted-foreground">
          {features && agentCount ? (
            <>
              Your plan: <span className="font-semibold text-foreground">{features.length} features for {agentCount} agents</span> - {monthlyTotal.toFixed(2)}₾/month
            </>
          ) : selectedPackage ? (
            <>
              {t('youSelected')}: <span className="font-semibold text-foreground">{selectedPackage.display_name}</span> - {selectedPackage.price_gel}₾/{formData.pricing_model === 'agent' ? 'agent/' : ''}month
            </>
          ) : (
            <>Complete your registration</>
          )}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t('companyInformation')}
            </CardTitle>
            <CardDescription>{t('tellUsAbout')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">{t('companyName')} *</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Acme Inc"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">{t('subdomain')} *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="domain"
                    name="domain"
                    value={formData.domain}
                    onChange={handleInputChange}
                    required
                    placeholder="acme"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    .echodesk.ge
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('description')}</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of your company..."
                rows={3}
              />
            </div>

            {/* Show agent count for feature-based OR legacy agent-based */}
            {(features && agentCount) || isAgentBased ? (
              <div className="space-y-2">
                <Label htmlFor="agent_count">{t('numberOfAgents')} *</Label>
                <Input
                  id="agent_count"
                  name="agent_count"
                  type="number"
                  min="5"
                  step="5"
                  max="200"
                  value={formData.agent_count}
                  onChange={handleInputChange}
                  required
                  disabled={!!(features && agentCount)} // Disable if coming from feature selection
                />
                <p className="text-sm text-muted-foreground">
                  {t('totalCost')}: {monthlyTotal.toFixed(2)}₾/month
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Admin Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('administratorAccount')}
            </CardTitle>
            <CardDescription>{t('createAdminCredentials')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin_first_name">{t('firstName')} *</Label>
                <Input
                  id="admin_first_name"
                  name="admin_first_name"
                  value={formData.admin_first_name}
                  onChange={handleInputChange}
                  required
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_last_name">{t('lastName')} *</Label>
                <Input
                  id="admin_last_name"
                  name="admin_last_name"
                  value={formData.admin_last_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_email">
                <Mail className="h-4 w-4 inline mr-1" />
                {t('email')} *
              </Label>
              <Input
                id="admin_email"
                name="admin_email"
                type="email"
                value={formData.admin_email}
                onChange={handleInputChange}
                required
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_password">
                <Lock className="h-4 w-4 inline mr-1" />
                {t('password')} *
              </Label>
              <Input
                id="admin_password"
                name="admin_password"
                type="password"
                value={formData.admin_password}
                onChange={handleInputChange}
                required
                minLength={8}
                placeholder="Minimum 8 characters"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred_language">
                <Globe className="h-4 w-4 inline mr-1" />
                {t('preferredLanguage')}
              </Label>
              <Select
                value={formData.preferred_language}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, preferred_language: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ka">ქართული</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={loading} className="min-w-[200px]">
            {loading ? t('processing') : t('continueToPayment')}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {t('byContinuing')}{' '}
          <a href="/terms-of-service" className="text-primary hover:underline">
            {t('termsOfService')}
          </a>{' '}
          {t('and')}{' '}
          <a href="/privacy-policy" className="text-primary hover:underline">
            {t('privacyPolicy')}
          </a>
        </p>
      </form>
    </div>
  );
}
