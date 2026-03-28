'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FeatureSelection } from './FeatureSelection';
import { RegistrationFormStep } from './RegistrationFormStep';
import { PaymentProviderSelection, type PaymentProviderType } from './PaymentProviderSelection';
import { Footer } from '@/components/landing/Footer';
import { featuresList, registerTenantWithPayment } from '@/api/generated/api';
import type { TenantRegistrationRequest } from '@/api/generated/interfaces';
import type { Feature } from '@/types/package';
import { PricingModel } from '@/types/package';
import { usePaddle } from '@/hooks/usePaddle';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

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
  const tSub = useTranslations('subscription');
  const { openCheckout, isLoaded: paddleLoaded } = usePaddle();

  // Required features that cannot be unchecked
  const REQUIRED_FEATURE_KEYS = ['user_management', 'settings'];

  // Steps: 1 = Feature Selection, 2 = Payment Provider, 3 = Registration Form
  const [step, setStep] = useState(1);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<number[]>([]);
  const [agentCount, setAgentCount] = useState(5);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProviderType>('bog');
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
    is_custom: true,
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
      const featureIds = featuresParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      const agents = parseInt(agentsParam, 10);

      if (featureIds.length > 0 && agents >= 5 && agents <= 200) {
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

  const handleProviderContinue = () => {
    setStep(3);
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
        is_custom: true,
        feature_ids: data.feature_ids,
        payment_provider: paymentProvider,
      };

      const response: any = await registerTenantWithPayment(registrationData);

      if (response.requires_redirect && response.payment_url) {
        // BOG: redirect to hosted payment page
        window.location.href = response.payment_url;
      } else if (response.checkout_data?.transaction_id) {
        // Paddle: open overlay checkout
        openCheckout({
          transactionId: response.checkout_data.transaction_id,
          successUrl: `${window.location.origin}/registration/success`,
        });
      } else if (response.payment_url) {
        // Fallback: redirect
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
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <Button variant="ghost" onClick={() => setStep(1)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('backToPlans')}
              </Button>
              <h1 className="text-3xl font-bold">{tSub('paymentProvider')}</h1>
              <p className="text-muted-foreground">
                {tSub('choosePaymentProvider')}
              </p>
            </div>

            <PaymentProviderSelection
              selected={paymentProvider}
              onSelect={setPaymentProvider}
            />

            <div className="flex justify-end">
              <Button size="lg" onClick={handleProviderContinue} className="min-w-[200px]">
                {t('continue')}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <RegistrationFormStep
            formData={formData}
            setFormData={setFormData}
            selectedPackage={null}
            features={features.filter((f) => selectedFeatureIds.includes(f.id))}
            agentCount={agentCount}
            loading={loading}
            error={error}
            onSubmit={handleFormSubmit}
            onBack={() => setStep(2)}
          />
        )}
      </div>

      <Footer />
    </div>
  );
}
