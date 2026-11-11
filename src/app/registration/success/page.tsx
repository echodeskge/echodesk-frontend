'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CalendarClock, CheckCircle2, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/landing/Footer';
import {
  formatTrialDate,
  readRegistrationResult,
  TRIAL_DAYS,
  type RegistrationResult,
} from '@/lib/registration-result';

/**
 * Shown right after `POST /api/register/` succeeds: the workspace exists and
 * the 30-day free trial has started. No card was taken, so there is nothing
 * about payments here — only when the trial ends and how to add a card then.
 */
export default function RegistrationSuccessPage() {
  const t = useTranslations('auth.trialSuccess');
  const tAuth = useTranslations('auth');
  const locale = useLocale();
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [ready, setReady] = useState(false);

  // sessionStorage is client-only; read it after mount.
  useEffect(() => {
    setResult(readRegistrationResult());
    setReady(true);
  }, []);

  const trialEnd = result?.trial_ends_at ?? new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const date = formatTrialDate(trialEnd, locale);
  const workspaceUrl = result?.frontend_url ?? null;
  const workspaceHost = workspaceUrl ? workspaceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-16">
        <div className="mx-auto max-w-2xl space-y-8" data-testid="registration-success" aria-busy={!ready}>
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-9 w-9" aria-hidden />
            </div>
            <h1 className="text-4xl font-bold">{t('title')}</h1>
            <p className="text-lg text-muted-foreground" data-testid="success-subtitle">
              {result?.company_name ? t('subtitle', { company: result.company_name }) : t('genericSubtitle')}
            </p>
            <p
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-medium"
              data-testid="trial-ends"
            >
              <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden />
              {t('trialEnds', { date })}
            </p>
          </div>

          {workspaceUrl && (
            <Card data-testid="workspace-card">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{t('workspaceUrl')}</div>
                  <div className="truncate font-semibold" data-testid="workspace-host">
                    {workspaceHost}
                  </div>
                  {result?.admin_email && (
                    <p className="text-sm text-muted-foreground">{t('signInHint', { email: result.admin_email })}</p>
                  )}
                </div>
                <Button asChild size="lg" className="shrink-0">
                  <a href={workspaceUrl} data-testid="open-workspace">
                    {t('openWorkspace')}
                    <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-secondary/30 bg-secondary/5" data-testid="day30-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" aria-hidden />
                {t('day30Title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t('day30Body', { date })}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('nextStepsTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>{t('step1')}</li>
                <li>{t('step2')}</li>
                <li>{t('step3', { date })}</li>
              </ol>
            </CardContent>
          </Card>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            {workspaceUrl ? (
              <Button asChild size="lg">
                <a href={workspaceUrl}>
                  {t('openWorkspace')}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </a>
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="lg">
              <Link href="/">{tAuth('backToHome')}</Link>
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
