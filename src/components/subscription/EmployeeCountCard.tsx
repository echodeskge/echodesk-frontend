'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { CreditCard, ExternalLink, Loader2, Save, Users } from 'lucide-react';
import { toast } from 'sonner';
import { featuresList, subscriptionAgentCountUpdate } from '@/api/generated/api';
import type { UpdateAgentCountResponse } from '@/api/generated/interfaces';
import type { Feature } from '@/types/package';
import { useTenantSubscription, tenantKeys } from '@/hooks/api/useTenant';
import { useMyAccess } from '@/hooks/useMyAccess';
import { readTrialStatus } from '@/lib/subscription-trial';
import { clampEmployees, formatGel, priceByKey, priceOf, subscriptionMonthlyTotal } from '@/lib/pricing';
import { getApiErrorMessage } from '@/lib/utils';
import { TonePill } from '@/components/redesign/pill';
import { ActionButton, SettingsNote, SettingsSection } from '@/components/redesign/settings';
import { EmployeeCount } from '@/components/pricing/EmployeeCount';

/**
 * What `PUT /api/subscription/agent-count/` may answer. The generated type
 * carries the paid shape; the trial shape (`charged: false`, no proration)
 * and a possible payment hand-off are read defensively on top of it.
 */
type AgentCountResult = Partial<UpdateAgentCountResponse> & {
  agent_count?: number;
  monthly_cost?: number;
  charged?: boolean;
  is_trial?: boolean;
  requires_payment?: boolean;
  requires_authentication?: boolean;
  payment_url?: string;
  prorated_cost?: number;
};

type SelectedFeature = { key?: string; price_per_user_gel?: number | string };

function readCount(data: unknown): number | null {
  const d = data as { agent_count?: unknown; subscription?: { agent_count?: unknown } } | null | undefined;
  const raw = d?.subscription?.agent_count ?? d?.agent_count;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function readSelected(data: unknown): SelectedFeature[] {
  const list = (data as { selected_features?: unknown } | null | undefined)?.selected_features;
  return Array.isArray(list) ? (list as SelectedFeature[]) : [];
}

/**
 * Settings → Subscription: the seat count of the subscription. Any whole
 * number from 1, no cap. Shows the current count, the shared `EmployeeCount`
 * control, a live "new monthly total" from the catalogue prices × count,
 * and saves through `subscriptionAgentCountUpdate`. On trial the change is
 * free; on a paid plan the proration (and a payment link, if the API sends
 * one) is shown. Only billing admins get the editor.
 */
export function EmployeeCountCard() {
  const t = useTranslations('subscription.employees');
  const queryClient = useQueryClient();
  const { isBillingAdmin } = useMyAccess();
  const { data: subscription, isLoading } = useTenantSubscription();

  const current = readCount(subscription);
  const trial = readTrialStatus(subscription);
  const selected = readSelected(subscription);
  const hasSubscription = (subscription as { has_subscription?: boolean } | undefined)?.has_subscription === true;

  // Live catalogue prices (GET /api/features/); the subscription's own
  // price fields are the fallback for any key the catalogue does not list.
  const { data: catalogue } = useQuery<Feature[]>({
    queryKey: ['features', 'catalogue'],
    queryFn: async () => ((await featuresList()).results || []) as Feature[],
    staleTime: 5 * 60 * 1000,
    enabled: hasSubscription,
  });

  const [count, setCount] = useState<number>(current ?? 1);
  const [result, setResult] = useState<AgentCountResult | null>(null);
  useEffect(() => {
    if (current !== null) setCount(current);
  }, [current]);

  const { selectedKeys, prices } = useMemo(() => {
    const keys = selected.map((f) => f.key).filter((k): k is string => typeof k === 'string');
    const map = new Map<string, number>();
    for (const f of selected) {
      if (typeof f.key === 'string') map.set(f.key, priceOf({ price_per_user_gel: String(f.price_per_user_gel ?? '0') }));
    }
    for (const [k, v] of priceByKey(catalogue ?? [])) if (map.has(k)) map.set(k, v);
    return { selectedKeys: keys, prices: map as ReadonlyMap<string, number> };
  }, [selected, catalogue]);

  const perEmployee = subscriptionMonthlyTotal(selectedKeys, prices, 1);
  const newTotal = subscriptionMonthlyTotal(selectedKeys, prices, count);

  const save = useMutation<AgentCountResult, unknown, number>({
    mutationFn: async (n) => (await subscriptionAgentCountUpdate({ agent_count: n })) as AgentCountResult,
    onSuccess: (data, n) => {
      setResult(data);
      const saved = typeof data.agent_count === 'number' ? data.agent_count : (data.new_agent_count ?? n);
      if (data.requires_payment || data.requires_authentication) {
        if (data.payment_url) {
          toast.info(t('toasts.redirecting'));
          window.location.href = data.payment_url;
          return;
        }
      }
      toast.success(data.charged === false || data.is_trial ? t('toasts.savedTrial', { count: saved }) : t('toasts.saved', { count: saved }));
      // The trial banner, usage card and feature prices all read the same query.
      queryClient.invalidateQueries({ queryKey: tenantKeys.subscription() });
      queryClient.invalidateQueries({ queryKey: ['tenant-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['available-features'] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, t('toasts.saveFailed')));
    },
  });

  if (isLoading) {
    return (
      <SettingsSection title={t('title')} hint={t('description')} testId="employee-count-card">
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      </SettingsSection>
    );
  }

  if (!hasSubscription || current === null) return null;

  const dirty = count !== current;
  const busy = save.isPending;
  const proration = typeof result?.prorated_difference === 'number' ? result.prorated_difference : result?.prorated_cost;
  const resultMonthly = typeof result?.monthly_cost === 'number' ? result.monthly_cost : result?.new_monthly_cost;

  return (
    <SettingsSection
      title={t('title')}
      hint={t('description')}
      actions={
        <TonePill tone="neutral">
          <Users className="me-1 inline h-3 w-3 align-[-2px]" aria-hidden />
          {t('current', { count: current })}
        </TonePill>
      }
      testId="employee-count-card"
    >
      {isBillingAdmin ? (
        <div className="flex flex-col gap-4 px-4 py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex min-w-0 flex-col gap-0.5 sm:flex-[1_1_240px]">
              <label htmlFor="subscription-employees" className="text-[13px] font-medium">
                {t('label')}
              </label>
              <span className="text-xs leading-[17px] text-muted-foreground">
                {t('perEmployee', { price: formatGel(perEmployee) })}
              </span>
            </div>
            <EmployeeCount
              id="subscription-employees"
              value={count}
              onChange={(n) => {
                setResult(null);
                setCount(clampEmployees(n));
              }}
              disabled={busy}
              className="sm:w-[300px]"
            />
          </div>

          <div
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border bg-muted/30 px-3 py-2"
            data-testid="employee-count-total"
          >
            <span className="text-xs text-muted-foreground">{t('newTotal')}</span>
            <span className="text-base font-semibold tabular-nums">
              {formatGel(newTotal)} ₾ <span className="text-xs font-normal text-muted-foreground">{t('perMonth')}</span>
            </span>
          </div>

          <SettingsNote tone={trial.isTrial ? 'info' : 'neutral'} testId="employee-count-note">
            {trial.isTrial ? t('trialNote') : t('paidNote')}
          </SettingsNote>

          {result && (
            <SettingsNote
              tone="success"
              testId="employee-count-result"
              action={
                result.payment_url ? (
                  <ActionButton
                    icon={ExternalLink}
                    onClick={() => {
                      window.location.href = result.payment_url as string;
                    }}
                    testId="employee-count-pay"
                  >
                    {t('payNow')}
                  </ActionButton>
                ) : undefined
              }
            >
              <span className="block">
                {result.charged === false || result.is_trial
                  ? t('result.trial', { count: result.agent_count ?? result.new_agent_count ?? count })
                  : t('result.saved', { count: result.agent_count ?? result.new_agent_count ?? count })}
              </span>
              {typeof resultMonthly === 'number' && (
                <span className="block">{t('result.monthly', { amount: formatGel(resultMonthly) })}</span>
              )}
              {!(result.charged === false || result.is_trial) && typeof proration === 'number' && (
                <span className="block">
                  <CreditCard className="me-1 inline h-3 w-3 align-[-2px]" aria-hidden />
                  {typeof result.days_remaining === 'number'
                    ? t('result.prorated', { amount: formatGel(proration), days: result.days_remaining })
                    : t('result.proratedNoDays', { amount: formatGel(proration) })}
                </span>
              )}
              {result.message && <span className="block text-muted-foreground">{result.message}</span>}
            </SettingsNote>
          )}

          <div className="flex items-center gap-2">
            <ActionButton
              icon={busy ? Loader2 : Save}
              onClick={() => save.mutate(count)}
              disabled={!dirty || busy}
              testId="employee-count-save"
            >
              {t('save')}
            </ActionButton>
            {dirty && !busy && (
              <ActionButton
                onClick={() => {
                  setCount(current);
                  setResult(null);
                }}
                testId="employee-count-reset"
              >
                {t('reset')}
              </ActionButton>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 py-3.5">
          <SettingsNote tone="neutral" testId="employee-count-readonly">
            {t('readOnly')}
          </SettingsNote>
        </div>
      )}
    </SettingsSection>
  );
}
