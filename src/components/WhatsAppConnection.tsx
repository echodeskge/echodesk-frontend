'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useTenant } from '@/contexts/TenantContext';
import {
  useWhatsAppStatus,
  useConnectWhatsApp,
  useDisconnectWhatsApp,
  useWhatsAppCoexStatus,
  useSyncWhatsAppContacts,
  useSyncWhatsAppHistory,
} from '@/hooks/api/useSocial';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Clock,
  Smartphone,
  Users,
  History,
  ChevronDown,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { TonePill } from '@/components/redesign/pill';
import {
  AccountRow,
  AccountRowAction,
  ActionButton,
  ChannelDetailCard,
  FactsGrid,
  SettingsNote,
  SettingsSection,
} from '@/components/redesign/settings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

interface WhatsAppAccount {
  id: number;
  waba_id: string;
  business_name: string;
  phone_number: string;
  quality_rating: string;
  is_active: boolean;
  connected_at: string;
  // Coexistence fields
  coex_enabled?: boolean;
  is_on_biz_app?: boolean;
  platform_type?: string | null;
  sync_status?: string;
  onboarded_at?: string | null;
  contacts_synced_at?: string | null;
  history_synced_at?: string | null;
  throughput_limit?: number;
}

interface WhatsAppStatus {
  connected: boolean;
  accounts_count: number;
  accounts: WhatsAppAccount[];
}

// Helper to format remaining time
function formatRemainingTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Coexistence Status Section Component
function CoexistenceSection({ account }: { account: WhatsAppAccount }) {
  const t = useTranslations('social');
  const [historyPhase, setHistoryPhase] = useState('0-1');
  const [isOpen, setIsOpen] = useState(false);

  const { data: coexStatus, isLoading: coexLoading, refetch: refetchCoex } = useWhatsAppCoexStatus(account.id);
  const syncContacts = useSyncWhatsAppContacts();
  const syncHistory = useSyncWhatsAppHistory();

  const localStatus = coexStatus?.local_status;
  const isCoexEnabled = localStatus?.coex_enabled || account.coex_enabled;
  const syncWindowOpen = localStatus?.sync_window_open;
  const syncWindowRemaining = localStatus?.sync_window_remaining_seconds;

  if (!isCoexEnabled && !account.is_on_biz_app) {
    return null; // Don't show section if coexistence is not enabled
  }

  const handleSyncContacts = async () => {
    try {
      await syncContacts.mutateAsync(account.id);
      toast.success(t('whatsapp.coexistence.contactsSyncInitiated'));
      refetchCoex();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('whatsapp.coexistence.contactsSyncError'));
    }
  };

  const handleSyncHistory = async () => {
    try {
      await syncHistory.mutateAsync({ accountId: account.id, phase: historyPhase });
      toast.success(t('whatsapp.coexistence.historySyncInitiated', { phase: historyPhase }));
      refetchCoex();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('whatsapp.coexistence.historySyncError'));
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <section className="min-w-0 overflow-hidden rounded-[10px] border bg-card" data-testid="whatsapp-coexistence">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-h-11 w-full flex-wrap items-center gap-x-2 gap-y-1 bg-muted/35 px-4 py-2.5 text-start hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[state=open]:border-b"
          >
            <Smartphone className="h-4 w-4 text-green-600" aria-hidden />
            <span className="text-[13px] font-semibold">{t('whatsapp.coexistence.title')}</span>
            <span className="min-w-0 truncate text-xs text-muted-foreground">· {account.business_name}</span>
            {isCoexEnabled && (
              <TonePill tone="success">{t('whatsapp.coexistence.enabled')}</TonePill>
            )}
            <ChevronDown className={cn('ms-auto h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} aria-hidden />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Status Info */}
          <FactsGrid
            items={[
              { k: t('whatsapp.coexistence.platform'), v: localStatus?.platform_type || account.platform_type || t('whatsapp.coexistence.cloudApi') },
              { k: t('whatsapp.coexistence.throughput'), v: `${localStatus?.throughput_limit || account.throughput_limit || 80} ${t('whatsapp.coexistence.mps')}` },
              {
                k: t('whatsapp.coexistence.contactsSynced'),
                v: localStatus?.contacts_synced_at
                  ? new Date(localStatus.contacts_synced_at).toLocaleDateString()
                  : t('whatsapp.coexistence.never'),
              },
              {
                k: t('whatsapp.coexistence.historySynced'),
                v: localStatus?.history_synced_at
                  ? new Date(localStatus.history_synced_at).toLocaleDateString()
                  : t('whatsapp.coexistence.never'),
              },
            ]}
          />

          {syncWindowOpen || localStatus?.onboarded_at ? (
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              {/* Sync Window */}
              {syncWindowOpen && syncWindowRemaining && (
                <span className="flex min-w-[200px] flex-1 items-start gap-2 text-xs leading-[17px] text-amber-700 dark:text-amber-400">
                  <Timer className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    <strong className="font-semibold">{t('whatsapp.coexistence.syncWindowOpen')}</strong>{' '}
                    {t('whatsapp.coexistence.syncWindowDescription', { remaining: formatRemainingTime(syncWindowRemaining) })}
                  </span>
                </span>
              )}

              {!syncWindowOpen && localStatus?.onboarded_at && (
                <span className="flex min-w-[200px] flex-1 items-start gap-2 text-xs leading-[17px] text-muted-foreground">
                  <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t('whatsapp.coexistence.syncWindowExpired')}
                </span>
              )}

              {/* Sync Controls */}
              {syncWindowOpen && (
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton
                    icon={syncContacts.isPending ? RefreshCw : Users}
                    onClick={handleSyncContacts}
                    disabled={syncContacts.isPending}
                    testId="whatsapp-sync-contacts"
                  >
                    {t('whatsapp.coexistence.syncContacts')}
                  </ActionButton>
                  <Select value={historyPhase} onValueChange={setHistoryPhase}>
                    <SelectTrigger className="h-[30px] w-[130px] text-xs" aria-label={t('whatsapp.coexistence.syncHistory')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1">{t('whatsapp.coexistence.last24h')}</SelectItem>
                      <SelectItem value="1-90">{t('whatsapp.coexistence.days1to90')}</SelectItem>
                      <SelectItem value="90-180">{t('whatsapp.coexistence.days90to180')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <ActionButton
                    icon={syncHistory.isPending ? RefreshCw : History}
                    onClick={handleSyncHistory}
                    disabled={syncHistory.isPending}
                    testId="whatsapp-sync-history"
                  >
                    {t('whatsapp.coexistence.syncHistory')}
                  </ActionButton>
                </div>
              )}
            </div>
          ) : null}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

export function WhatsAppConnection() {
  const t = useTranslations('social');
  const locale = useLocale();
  const { tenant } = useTenant();

  // React Query hooks
  const { data: statusData, isLoading: loading, refetch } = useWhatsAppStatus();
  const connectWhatsApp = useConnectWhatsApp();
  const disconnectWhatsApp = useDisconnectWhatsApp();

  const status = statusData as WhatsAppStatus | null;

  // Check for OAuth callback parameters on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const whatsappStatus = urlParams.get('whatsapp_status');
    const message = urlParams.get('message');

    if (whatsappStatus === 'connected') {
      toast.success(message || t('whatsapp.connectedSuccess'));
      refetch();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (whatsappStatus === 'error') {
      toast.error(message || t('whatsapp.connectedError'));
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refetch]);

  const handleConnect = async () => {
    try {
      const response = await connectWhatsApp.mutateAsync();
      if (response.oauth_url) {
        window.location.href = response.oauth_url;
      } else {
        throw new Error('No OAuth URL received');
      }
    } catch (error: any) {
      console.error('Failed to start WhatsApp OAuth:', error);
      toast.error(error.response?.data?.error || error.message || t('whatsapp.oauthError'));
    }
  };

  const handleDisconnect = async (wabaId?: string) => {
    if (!confirm(t('whatsapp.confirmDisconnect'))) {
      return;
    }

    try {
      await disconnectWhatsApp.mutateAsync(wabaId);
      toast.success(t('whatsapp.disconnectedSuccess'));
    } catch (error: any) {
      console.error('Failed to disconnect WhatsApp:', error);
      toast.error(error.response?.data?.error || t('whatsapp.disconnectedError'));
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

  return (
    <>
      <ChannelDetailCard
        icon={WhatsAppIcon as unknown as LucideIcon}
        color="#25D366"
        title={t('whatsapp.title')}
        status={isConnected && status ? t('whatsapp.accountsConnected', { count: status.accounts_count }) : t('whatsapp.notConnected')}
        statusIcon={isConnected && status ? Check : X}
        statusTone={isConnected && status ? 'success' : 'neutral'}
        badge={{ label: isConnected ? t('whatsapp.badgeConnected') : t('whatsapp.badgeNotConnected'), tone: isConnected ? 'success' : 'neutral' }}
        actions={[
          !isConnected
            ? {
                label: loading || connectWhatsApp.isPending ? t('whatsapp.connecting') : t('whatsapp.connectWhatsAppBusiness'),
                icon: loading || connectWhatsApp.isPending ? RefreshCw : (WhatsAppIcon as unknown as LucideIcon),
                variant: 'primary' as const,
                onClick: handleConnect,
                disabled: loading || connectWhatsApp.isPending,
                testId: 'whatsapp-connect',
              }
            : {
                label: disconnectWhatsApp.isPending ? t('whatsapp.disconnecting') : t('whatsapp.disconnectAll'),
                icon: disconnectWhatsApp.isPending ? RefreshCw : X,
                variant: 'danger' as const,
                onClick: () => handleDisconnect(),
                disabled: loading || disconnectWhatsApp.isPending,
                testId: 'whatsapp-disconnect-all',
              },
          { label: t('whatsapp.refreshStatus'), icon: RefreshCw, variant: 'outline' as const, onClick: () => refetch(), disabled: loading, testId: 'whatsapp-refresh' },
        ]}
        testId="whatsapp-detail"
      >
        {/* Setup Instructions */}
        {!isConnected && (
          <SettingsNote tone="info" icon={AlertCircle}>
            <strong className="font-semibold">{t('whatsapp.setupNote')}</strong> {t('whatsapp.setupDescription')}
          </SettingsNote>
        )}
      </ChannelDetailCard>

      {/* Connected Accounts List */}
      {status && status.accounts.length > 0 && (
        <SettingsSection title={t('whatsapp.connectedAccounts')} testId="whatsapp-accounts">
          {status.accounts.map((account) => (
            <AccountRow
              key={account.id}
              avatar={<WhatsAppIcon className="h-[18px] w-[18px] text-green-600" />}
              name={
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  {account.business_name}
                  {account.coex_enabled && <TonePill tone="info">{t('whatsapp.coex')}</TonePill>}
                </span>
              }
              meta={
                <span className="inline-flex flex-wrap items-center gap-x-2">
                  <span className="font-mono tabular-nums">{account.phone_number}</span>
                  {account.quality_rating && (
                    <span>{t('whatsapp.quality')}: {account.quality_rating}</span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden />
                    {formatDate(account.connected_at)}
                  </span>
                </span>
              }
              badge={{ label: account.is_active ? t('whatsapp.active') : t('whatsapp.inactive'), tone: account.is_active ? 'success' : 'neutral' }}
              actions={
                account.is_active ? (
                  <AccountRowAction label={t('whatsapp.disconnect')} tone="danger" onClick={() => handleDisconnect(account.waba_id)} testId="whatsapp-disconnect" />
                ) : undefined
              }
              testId="whatsapp-account-row"
            />
          ))}
        </SettingsSection>
      )}

      {/* Coexistence Section (one per account that uses it) */}
      {status?.accounts.map((account) => (
        <CoexistenceSection key={account.id} account={account} />
      ))}
    </>
  );
}
