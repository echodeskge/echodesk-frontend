'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PackageSelection } from './PackageSelection';
import { RegistrationFormStep } from './RegistrationFormStep';
import { Footer } from '@/components/landing/Footer';
import { packagesList, registerTenant } from '@/api/generated/api';
import type { PackageList, TenantRegistration } from '@/api/generated/interfaces';
import { PricingModel } from '@/types/package';

export interface RegistrationFormData {
  company_name: string;
  domain: string;
  description: string;
  package_id: number;
  pricing_model: PricingModel;
  agent_count: number;
  admin_email: string;
  admin_password: string;
  admin_first_name: string;
  admin_last_name: string;
  preferred_language: string;
}

export function RegistrationFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('auth');

  const [step, setStep] = useState(1); // 1: Package Selection, 2: Form
  const [packages, setPackages] = useState<PackageList[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageList | null>(null);
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
      setPackages(data.results || []);
    } catch (error) {
      console.error('Failed to load packages:', error);
      setError(t('loadPackagesFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePackageSelect = (packageItem: PackageList) => {
    setSelectedPackage(packageItem);
    const pricingModelValue = String(packageItem.pricing_model) as PricingModel;
    setFormData((prev) => ({
      ...prev,
      package_id: packageItem.id,
      pricing_model: pricingModelValue,
    }));
  };

  const handleFormSubmit = async (data: RegistrationFormData) => {
    try {
      setLoading(true);
      setError('');

      const registrationData: any = {
        company_name: data.company_name,
        domain: data.domain,
        description: data.description || '',
        package_id: data.package_id,
        pricing_model: data.pricing_model,
        agent_count: data.pricing_model === 'agent' ? data.agent_count : undefined,
        admin_email: data.admin_email,
        admin_password: data.admin_password,
        admin_first_name: data.admin_first_name,
        admin_last_name: data.admin_last_name,
        preferred_language: data.preferred_language,
      };

      const response: any = await registerTenant(registrationData);

      // Redirect to payment URL
      if (response.payment_url) {
        window.location.href = response.payment_url;
      } else {
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
            onBack={() => router.push('/')}
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
            onBack={() => setStep(1)}
          />
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
