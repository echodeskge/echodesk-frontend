'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  useTikTokStatus,
  useConnectTikTok,
  useDisconnectTikTok,
  TikTokStatus,
} from '@/hooks/api/useSocial';
import {
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Clock,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { TonePill } from '@/components/redesign/pill';
import {
  AccountRow,
  ChannelAlert,
  ChannelDetailCard,
  SettingsNote,
  SettingsSection,
} from '@/components/redesign/settings';
import { toast } from 'sonner';

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

export function TikTokConnection() {
  const t = useTranslations('social');
  const locale = useLocale();

  // React Query hooks
  const { data: statusData, isLoading: loading, refetch } = useTikTokStatus();
  const connectTikTok = useConnectTikTok();
  const disconnectTikTok = useDisconnectTikTok();

  const status = statusData as TikTokStatus | null;

  // Check for OAuth callback parameters on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const tiktokStatus = urlParams.get('tiktok_status');
    const message = urlParams.get('message');

    if (tiktokStatus === 'connected') {
      toast.success(message || t('tiktok.connectedSuccess'));
      refetch();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (tiktokStatus === 'error') {
      toast.error(message || t('tiktok.connectedError'));
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refetch]);

  const handleConnect = async () => {
    try {
      const response = await connectTikTok.mutateAsync();
      if (response.oauth_url) {
        window.location.href = response.oauth_url;
      } else {
        throw new Error('No OAuth URL received');
      }
    } catch (error: any) {
      console.error('Failed to start TikTok Shop OAuth:', error);
      toast.error(error.response?.data?.error || error.message || t('tiktok.oauthError'));
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(t('tiktok.confirmDisconnect'))) {
      return;
    }

    try {
      await disconnectTikTok.mutateAsync(undefined);
      toast.success(t('tiktok.disconnectedSuccess'));
    } catch (error: any) {
      console.error('Failed to disconnect TikTok Shop:', error);
      toast.error(error.response?.data?.error || t('tiktok.disconnectedError'));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ka' ? 'ka-GE' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isConnected = status?.connected || false;
  const account = status?.account;

  return (
    <>
      <ChannelDetailCard
        icon={TikTokIcon as unknown as LucideIcon}
        color="#000000"
        title={t('tiktok.title')}
        status={isConnected && account ? t('tiktok.connected') : t('tiktok.notConnected')}
        statusIcon={isConnected && account ? Check : X}
        statusTone={isConnected && account ? 'success' : 'neutral'}
        badge={{ label: isConnected ? t('tiktok.badgeConnected') : t('tiktok.badgeNotConnected'), tone: isConnected ? 'success' : 'neutral' }}
        actions={[
          !isConnected
            ? {
                label: loading || connectTikTok.isPending ? t('tiktok.connecting') : t('tiktok.connectTikTokShop'),
                icon: loading || connectTikTok.isPending ? RefreshCw : (TikTokIcon as unknown as LucideIcon),
                variant: 'primary' as const,
                onClick: handleConnect,
                disabled: loading || connectTikTok.isPending,
                testId: 'tiktok-connect',
              }
            : {
                label: disconnectTikTok.isPending ? t('tiktok.disconnecting') : t('tiktok.disconnect'),
                icon: disconnectTikTok.isPending ? RefreshCw : X,
                variant: 'danger' as const,
                onClick: handleDisconnect,
                disabled: loading || disconnectTikTok.isPending,
                testId: 'tiktok-disconnect',
              },
          { label: t('tiktok.refreshStatus'), icon: RefreshCw, variant: 'outline' as const, onClick: () => refetch(), disabled: loading, testId: 'tiktok-refresh' },
        ]}
        testId="tiktok-detail"
      >
        {/* Setup Instructions */}
        {!isConnected && (
          <SettingsNote tone="info" icon={AlertCircle}>
            <strong className="font-semibold">{t('tiktok.requirements')}</strong> {t('tiktok.requirementsDescription')}
          </SettingsNote>
        )}
      </ChannelDetailCard>

      {/* Token expiration warning */}
      {isConnected && status?.is_token_expired && (
        <ChannelAlert title={t('tiktok.tokenExpired')} text={t('tiktok.tokenExpiredDescription')} testId="tiktok-token-expired" />
      )}

      {/* Connected Account Details */}
      {isConnected && account && (
        <SettingsSection title={t('tiktok.connectedShop')} testId="tiktok-shop">
          <AccountRow
            avatar={<Store className="h-[18px] w-[18px]" aria-hidden />}
            name={account.seller_name || t('tiktok.defaultSellerName')}
            meta={
              <span className="inline-flex flex-wrap items-center gap-x-2">
                {account.seller_base_region && <TonePill tone="neutral">{account.seller_base_region}</TonePill>}
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden />
                  {formatDate(account.created_at)}
                </span>
              </span>
            }
            badge={{ label: account.is_active ? t('tiktok.active') : t('tiktok.inactive'), tone: account.is_active ? 'success' : 'neutral' }}
            testId="tiktok-shop-row"
          />
        </SettingsSection>
      )}
    </>
  );
}
