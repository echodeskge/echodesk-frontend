'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FeatureSelection } from './FeatureSelection';
import { RegistrationFormStep } from './RegistrationFormStep';
import { PaymentProviderSelection, type PaymentProviderType } from './PaymentProviderSelection';
import { Footer } from '@/components/landing/Footer';
import { featuresList, registerTenantWithPayment } from '@/api/generated/api';
import type { Feature } from '@/types/package';
import { PricingModel } from '@/types/package';
import type { PackSlug } from '@/data/packs';
import {
  MIN_EMPLOYEES,
  clampEmployees,
  defaultModuleKeys,
  expandSelection,
  keysToIds,
  matchPack,
  parseRegistrationParams,
  priceByKey,
  toggleModule,
} from '@/lib/pricing';
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
  const { openCheckout } = usePaddle();

  // Steps: 1 = Review / build plan, 2 = Payment provider, 3 = Registration form
  const [step, setStep] = useState(1);
  const [features, setFeatures] = useState<Feature[]>([]);
  // Selected module KEYS (workspace + zero-price stubs are added at submit).
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [pack, setPack] = useState<PackSlug | null>(null);
  const [autoNotice, setAutoNotice] = useState<string | null>(null);
  const [employees, setEmployees] = useState(MIN_EMPLOYEES);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProviderType>('bog');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<RegistrationFormData>({
    company_name: '',
    domain: '',
    description: '',
    feature_ids: [],
    pricing_model: 'agent' as PricingModel,
    agent_count: MIN_EMPLOYEES,
    admin_email: '',
    admin_password: '',
    admin_first_name: '',
    admin_last_name: '',
    preferred_language: 'en',
    is_custom: true,
  });

  const prices = useMemo(() => priceByKey(features), [features]);
  const payloadKeys = useMemo(() => expandSelection(selectedKeys, features), [selectedKeys, features]);
  const payloadIds = useMemo(() => keysToIds(payloadKeys, features), [payloadKeys, features]);
  const selectedFeatures = useMemo(
    () => features.filter((f) => payloadKeys.includes(f.key)),
    [features, payloadKeys],
  );

  // Load the catalogue, then apply `?pack=` / `?modules=` / `?employees=`
  // (or the legacy `?features=<ids>&agents=`) from the landing CTAs. A
  // pre-built plan skips straight to the payment-provider step.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await featuresList();
        if (cancelled) return;
        const all = (data.results || []) as Feature[];
        setFeatures(all);
        const parsed = parseRegistrationParams(searchParams, all);
        const keys = parsed.preselected ? parsed.moduleKeys : defaultModuleKeys(all);
        setSelectedKeys(keys);
        setPack(parsed.pack ?? matchPack(keys, all));
        setEmployees(parsed.employees);
        if (parsed.preselected) setStep(2);
      } catch (err) {
        console.error('Failed to load features:', err);
        if (!cancelled) setError('Failed to load features');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // Keep the submit payload in sync with the plan.
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      feature_ids: payloadIds,
      agent_count: employees,
      is_custom: true,
    }));
  }, [payloadIds, employees]);

  const handleFeatureToggle = (key: string) => {
    const { keys, autoEnabled } = toggleModule(selectedKeys, key);
    setSelectedKeys(keys);
    setAutoNotice(autoEnabled[0] ?? null);
    setPack(matchPack(keys, features));
  };

  const handleEmployeesChange = (count: number) => {
    setEmployees(clampEmployees(count));
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
            selectedKeys={selectedKeys}
            prices={prices}
            employees={employees}
            pack={pack}
            autoNotice={autoNotice}
            onToggle={handleFeatureToggle}
            onEmployeesChange={handleEmployeesChange}
            onContinue={() => setStep(2)}
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
              <Button size="lg" onClick={() => setStep(3)} className="min-w-[200px]">
                {t('continue')}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <RegistrationFormStep
            formData={formData}
            setFormData={setFormData}
            features={selectedFeatures}
            agentCount={employees}
            pack={pack}
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
