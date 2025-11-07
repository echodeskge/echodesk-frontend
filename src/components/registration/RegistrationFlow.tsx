'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PackageSelection } from './PackageSelection';
import { CustomPackageBuilder } from './CustomPackageBuilder';
import { RegistrationFormStep } from './RegistrationFormStep';
import { Footer } from '@/components/landing/Footer';
import { packagesList, registerTenantWithPayment } from '@/api/generated/api';
import type { PackageList, TenantRegistrationRequest } from '@/api/generated/interfaces';
import { PricingModel } from '@/types/package';

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

export interface RegistrationFormData {
  company_name: string;
  domain: string;
  description: string;
  package_id?: number;
  pricing_model: PricingModel;
  agent_count: number;
  admin_email: string;
  admin_password: string;
  admin_first_name: string;
  admin_last_name: string;
  preferred_language: string;
  // Custom package fields
  is_custom?: boolean;
  feature_ids?: number[];
  max_users?: number;
  custom_price?: string;
}

export function RegistrationFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('auth');

  const [step, setStep] = useState(1); // 1: Package Selection, 1.5: Custom Builder, 2: Form
  const [packages, setPackages] = useState<PackageListExtended[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageListExtended | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<RegistrationFormData>({
    company_name: '',
    domain: '',
    description: '',
    package_id: 0,
    pricing_model: 'agent' as PricingModel,
    agent_count: 1,
    admin_email: '',
    admin_password: '',
    admin_first_name: '',
    admin_last_name: '',
    preferred_language: 'en',
    is_custom: false,
  });

  // Load packages on mount
  useEffect(() => {
    loadPackages();
  }, []);

  // Check for pre-selected package from URL
  useEffect(() => {
    const packageId = searchParams.get('package');
    if (packageId && packages.length > 0) {
      const pkg = packages.find((p) => p.id === parseInt(packageId));
      if (pkg) {
        handlePackageSelect(pkg);
        setStep(2); // Skip to form
      }
    }
  }, [searchParams, packages]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await packagesList();
      // Type assertion: API returns dynamic_features as array but TypeScript thinks it's string
      setPackages((data.results || []) as unknown as PackageListExtended[]);
    } catch (error) {
      console.error('Failed to load packages:', error);
      setError(t('loadPackagesFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePackageSelect = (packageItem: PackageListExtended) => {
    setSelectedPackage(packageItem);
    const pricingModelValue = String(packageItem.pricing_model) as PricingModel;
    setFormData((prev) => ({
      ...prev,
      package_id: packageItem.id,
      pricing_model: pricingModelValue,
      is_custom: false,
    }));
  };

  const handleCustomPackage = () => {
    setStep(1.5);
    setSelectedPackage(null);
    setFormData((prev) => ({
      ...prev,
      is_custom: true,
      package_id: undefined,
    }));
  };

  const handleCustomPackageComplete = (packageData: {
    feature_ids: number[];
    pricing_model: PricingModel;
    user_count?: number;
    max_users?: number;
    total_price: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      is_custom: true,
      feature_ids: packageData.feature_ids,
      pricing_model: packageData.pricing_model,
      agent_count: packageData.user_count || 1,
      max_users: packageData.max_users,
      custom_price: packageData.total_price,
    }));

    // Create a mock package object for display
    setSelectedPackage({
      id: 0,
      name: 'custom',
      display_name: t('customPackage') || 'Custom Package',
      description: t('customPackageDesc') || 'Custom package with selected features',
      price_gel: packageData.total_price,
      calculated_price: packageData.total_price,
      pricing_model: packageData.pricing_model,
      is_custom: true,
      max_whatsapp_messages: 0,
      max_storage_gb: 0,
      features_list: [],
      dynamic_features: [],
      pricing_suffix: packageData.pricing_model === 'agent' ? '/agent/month' : '/month',
    } as any as PackageListExtended);

    setStep(2);
  };

  const handleFormSubmit = async (data: RegistrationFormData) => {
    try {
      setLoading(true);
      setError('');

      const registrationData: any = {
        company_name: data.company_name,
        domain: data.domain,
        description: data.description || '',
        pricing_model: data.pricing_model,
        agent_count: data.pricing_model === 'agent' ? data.agent_count : undefined,
        admin_email: data.admin_email,
        admin_password: data.admin_password,
        admin_first_name: data.admin_first_name,
        admin_last_name: data.admin_last_name,
        preferred_language: data.preferred_language,
      };

      // Add package info based on type
      if (data.is_custom) {
        registrationData.is_custom = true;
        registrationData.feature_ids = data.feature_ids;
        registrationData.max_users = data.max_users;
      } else {
        registrationData.package_id = data.package_id;
      }

      const response: any = await registerTenantWithPayment(registrationData);

      // Redirect to payment URL (required for trial with card saving)
      if (response.payment_url) {
        window.location.href = response.payment_url;
      } else {
        // Fallback (should not happen as payment_url is always required)
        router.push('/registration/success');
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      setError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          t('registrationFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="container py-16">
        {step === 1 && (
          <PackageSelection
            packages={packages}
            loading={loading}
            selectedPackage={selectedPackage}
            onPackageSelect={(pkg) => {
              handlePackageSelect(pkg);
              setStep(2);
            }}
            onCustomPackage={handleCustomPackage}
            onBack={() => router.push('/')}
          />
        )}

        {step === 1.5 && (
          <CustomPackageBuilder
            onComplete={handleCustomPackageComplete}
            onBack={() => setStep(1)}
          />
        )}

        {step === 2 && selectedPackage && (
          <RegistrationFormStep
            formData={formData}
            setFormData={setFormData}
            selectedPackage={selectedPackage}
            loading={loading}
            error={error}
            onSubmit={handleFormSubmit}
            onBack={() => {
              if (formData.is_custom) {
                setStep(1.5);
              } else {
                setStep(1);
              }
            }}
          />
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
