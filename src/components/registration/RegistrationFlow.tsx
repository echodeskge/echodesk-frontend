'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FeatureSelection } from './FeatureSelection';
import { RegistrationFormStep } from './RegistrationFormStep';
import { Footer } from '@/components/landing/Footer';
import { featuresList, registerTenantWithPayment } from '@/api/generated/api';
import type { TenantRegistrationRequest } from '@/api/generated/interfaces';
import type { Feature } from '@/types/package';
import { PricingModel } from '@/types/package';

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

  // Required features that cannot be unchecked
  const REQUIRED_FEATURE_KEYS = ['user_management', 'settings'];

  const [step, setStep] = useState(1); // 1: Feature Selection, 2: Form
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<number[]>([]);
  const [agentCount, setAgentCount] = useState(5); // Default 5 agents
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<RegistrationFormData>({
    company_name: '',
    domain: '',
    description: '',
    feature_ids: [],
    pricing_model: 'agent' as PricingModel,
    agent_count: 5,
    admin_email: '',
    admin_password: '',
    admin_first_name: '',
    admin_last_name: '',
    preferred_language: 'en',
    is_custom: true, // Always feature-based now
  });

  // Load features on mount
  useEffect(() => {
    loadFeatures();
  }, []);

  // Check for pre-selected features from URL params (from homepage pricing)
  useEffect(() => {
    const featuresParam = searchParams.get('features');
    const agentsParam = searchParams.get('agents');

    if (featuresParam && agentsParam) {
      // Parse feature IDs from comma-separated string
      const featureIds = featuresParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      const agents = parseInt(agentsParam, 10);

      if (featureIds.length > 0 && agents >= 5 && agents <= 200) {
        // Ensure required features are always included
        const requiredIds = features
          .filter(f => REQUIRED_FEATURE_KEYS.includes(f.key))
          .map(f => f.id);
        const allFeatureIds = [...new Set([...requiredIds, ...featureIds])];

        setSelectedFeatureIds(allFeatureIds);
        setAgentCount(agents);
        setFormData(prev => ({
          ...prev,
          feature_ids: allFeatureIds,
          agent_count: agents,
        }));
        // Skip to form step
        setStep(2);
      }
    }
  }, [searchParams]);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const data = await featuresList();
      const allFeatures = (data.results || []) as Feature[];
      setFeatures(allFeatures);

      // Pre-select required features
      const requiredIds = allFeatures
        .filter(f => REQUIRED_FEATURE_KEYS.includes(f.key))
        .map(f => f.id);
      setSelectedFeatureIds(requiredIds);
    } catch (error) {
      console.error('Failed to load features:', error);
      setError('Failed to load features');
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = (featureId: number) => {
    // Don't allow toggling required features
    const feature = features.find(f => f.id === featureId);
    if (feature && REQUIRED_FEATURE_KEYS.includes(feature.key)) {
      return;
    }

    setSelectedFeatureIds((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    );
  };

  const handleAgentCountChange = (count: number) => {
    setAgentCount(count);
  };

  const handleFeatureSelectionContinue = () => {
    setFormData((prev) => ({
      ...prev,
      feature_ids: selectedFeatureIds,
      agent_count: agentCount,
      is_custom: true,
    }));
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
        agent_count: data.agent_count,
        admin_email: data.admin_email,
        admin_password: data.admin_password,
        admin_first_name: data.admin_first_name,
        admin_last_name: data.admin_last_name,
        preferred_language: data.preferred_language,
        // Always use feature-based registration
        is_custom: true,
        feature_ids: data.feature_ids,
      };

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
          <FeatureSelection
            features={features}
            loading={loading}
            selectedFeatureIds={selectedFeatureIds}
            agentCount={agentCount}
            onFeatureToggle={handleFeatureToggle}
            onAgentCountChange={handleAgentCountChange}
            onContinue={handleFeatureSelectionContinue}
            onBack={() => router.push('/')}
          />
        )}

        {step === 2 && (
          <RegistrationFormStep
            formData={formData}
            setFormData={setFormData}
            selectedPackage={null}
            features={features.filter((f) => selectedFeatureIds.includes(f.id))}
            agentCount={agentCount}
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
