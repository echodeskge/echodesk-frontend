'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FeatureSelection } from './FeatureSelection';
import { RegistrationFormStep } from './RegistrationFormStep';
import { Footer } from '@/components/landing/Footer';
import { featuresList, registerTenant } from '@/api/generated/api';
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
import { saveRegistrationResult, trialEndFromResponse } from '@/lib/registration-result';

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

/**
 * Public signup. Two steps: 1 = review / build the plan, 2 = the registration
 * form. Submits to `POST /api/register/` (`registerTenant`), which opens the
 * workspace on a 30-day free trial without a card — exactly what the copy
 * promises. A card is added later from Settings → Subscription.
 */
export function RegistrationFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('auth');

  // Steps: 1 = Review / build plan, 2 = Registration form
  const [step, setStep] = useState(1);
  const [features, setFeatures] = useState<Feature[]>([]);
  // Selected module KEYS (workspace + zero-price stubs are added at submit).
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [pack, setPack] = useState<PackSlug | null>(null);
  const [autoNotice, setAutoNotice] = useState<string | null>(null);
  const [employees, setEmployees] = useState(MIN_EMPLOYEES);
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
  // pre-built plan skips straight to the registration form.
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

      const registrationData = {
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
      };

      // POST /api/register/: creates the workspace on a 30-day free trial.
      // No payment step, no card.
      const response = await registerTenant(registrationData as any);

      saveRegistrationResult({
        company_name: data.company_name,
        admin_email: data.admin_email,
        frontend_url: response?.frontend_url ?? (response?.tenant as any)?.frontend_url ?? null,
        trial_ends_at: trialEndFromResponse(response),
      });
      router.push('/registration/success');
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
          <RegistrationFormStep
            formData={formData}
            setFormData={setFormData}
            features={selectedFeatures}
            agentCount={employees}
            pack={pack}
            loading={loading}
            error={error}
            onSubmit={handleFormSubmit}
            onBack={() => setStep(1)}
          />
        )}
      </div>

      <Footer />
    </div>
  );
}
