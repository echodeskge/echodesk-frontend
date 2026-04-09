'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTenant } from '@/contexts/TenantContext';
import {
  useWhatsAppStatus,
  useConnectWhatsApp,
  useDisconnectWhatsApp,
  useWhatsAppCoexStatus,
  useSyncWhatsAppContacts,
  useSyncWhatsAppHistory,
} from '@/hooks/api/useSocial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
  MessageSquare,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Clock,
  Smartphone,
  Cloud,
  Users,
  History,
  ChevronDown,
  Timer,
  Zap,
} from 'lucide-react';
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-auto">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">{t('whatsapp.coexistence.title')}</span>
            {isCoexEnabled && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {t('whatsapp.coexistence.enabled')}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2">
        {/* Status Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">{t('whatsapp.coexistence.platform')}:</span>
            <span className="font-medium">{localStatus?.platform_type || account.platform_type || t('whatsapp.coexistence.cloudApi')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">{t('whatsapp.coexistence.throughput')}:</span>
            <span className="font-medium">{localStatus?.throughput_limit || account.throughput_limit || 80} {t('whatsapp.coexistence.mps')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">{t('whatsapp.coexistence.contactsSynced')}:</span>
            <span className="font-medium">
              {localStatus?.contacts_synced_at
                ? new Date(localStatus.contacts_synced_at).toLocaleDateString()
                : t('whatsapp.coexistence.never')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">{t('whatsapp.coexistence.historySynced')}:</span>
            <span className="font-medium">
              {localStatus?.history_synced_at
                ? new Date(localStatus.history_synced_at).toLocaleDateString()
                : t('whatsapp.coexistence.never')}
            </span>
          </div>
        </div>

        {/* Sync Window Alert */}
        {syncWindowOpen && syncWindowRemaining && (
          <Alert className="bg-amber-50 border-amber-200">
            <Timer className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>{t('whatsapp.coexistence.syncWindowOpen')}</strong> {t('whatsapp.coexistence.syncWindowDescription', { remaining: formatRemainingTime(syncWindowRemaining) })}
            </AlertDescription>
          </Alert>
        )}

        {!syncWindowOpen && localStatus?.onboarded_at && (
          <Alert className="bg-gray-50 border-gray-200">
            <AlertCircle className="h-4 w-4 text-gray-500" />
            <AlertDescription className="text-gray-600">
              {t('whatsapp.coexistence.syncWindowExpired')}
            </AlertDescription>
          </Alert>
        )}

        {/* Sync Controls */}
        {syncWindowOpen && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncContacts}
              disabled={syncContacts.isPending}
              className="w-full sm:w-auto"
            >
              {syncContacts.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Users className="mr-2 h-4 w-4" />
              )}
              {t('whatsapp.coexistence.syncContacts')}
            </Button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Select value={historyPhase} onValueChange={setHistoryPhase}>
                <SelectTrigger className="w-full sm:w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-1">{t('whatsapp.coexistence.last24h')}</SelectItem>
                  <SelectItem value="1-90">{t('whatsapp.coexistence.days1to90')}</SelectItem>
                  <SelectItem value="90-180">{t('whatsapp.coexistence.days90to180')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncHistory}
                disabled={syncHistory.isPending}
                className="w-full sm:w-auto"
              >
                {syncHistory.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <History className="mr-2 h-4 w-4" />
                )}
                {t('whatsapp.coexistence.syncHistory')}
              </Button>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function WhatsAppConnection() {
  const t = useTranslations('social');
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isConnected = status?.connected || false;

  return (
    <Card
      className={cn(
        'border-2',
        isConnected ? 'border-green-200 bg-green-50/50' : 'border-border'
      )}
    >
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#25D366] text-white">
              <WhatsAppIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">{t('whatsapp.title')}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                {isConnected && status ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{t('whatsapp.accountsConnected', { count: status.accounts_count })}</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span>{t('whatsapp.notConnected')}</span>
                  </>
                )}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={isConnected ? 'default' : 'secondary'}
            className={cn(
              'h-8 self-start sm:self-auto',
              isConnected && 'bg-green-600 hover:bg-green-700'
            )}
          >
            {isConnected ? t('whatsapp.badgeConnected') : t('whatsapp.badgeNotConnected')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              disabled={loading || connectWhatsApp.isPending}
              className="bg-[#25D366] hover:bg-[#20BA59] w-full sm:w-auto"
            >
              {loading || connectWhatsApp.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('whatsapp.connecting')}
                </>
              ) : (
                <>
                  <WhatsAppIcon className="mr-2 h-4 w-4" />
                  {t('whatsapp.connectWhatsAppBusiness')}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => handleDisconnect()}
              disabled={loading || disconnectWhatsApp.isPending}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              {disconnectWhatsApp.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('whatsapp.disconnecting')}
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  {t('whatsapp.disconnectAll')}
                </>
              )}
            </Button>
          )}
          <Button onClick={() => refetch()} disabled={loading} variant="outline" className="w-full sm:w-auto">
            <RefreshCw
              className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}
            />
            {t('whatsapp.refreshStatus')}
          </Button>
        </div>

        {/* Connected Accounts List */}
        {status && status.accounts.length > 0 && (
          <div className="space-y-3 pt-4">
            <h4 className="font-semibold text-sm">{t('whatsapp.connectedAccounts')}</h4>
            {status.accounts.map((account, index) => (
              <div key={account.id}>
                {index > 0 && <Separator className="my-3" />}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-green-100 text-green-600">
                        <WhatsAppIcon className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{account.business_name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{account.phone_number}</span>
                        {account.quality_rating && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span>{t('whatsapp.quality')}: {account.quality_rating}</span>
                          </>
                        )}
                        <span className="hidden sm:inline">•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(account.connected_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {account.coex_enabled && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {t('whatsapp.coex')}
                      </Badge>
                    )}
                    <Badge
                      variant={account.is_active ? 'default' : 'secondary'}
                      className={account.is_active ? 'bg-green-600' : ''}
                    >
                      {account.is_active ? t('whatsapp.active') : t('whatsapp.inactive')}
                    </Badge>
                    {account.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(account.waba_id)}
                      >
                        {t('whatsapp.disconnect')}
                      </Button>
                    )}
                  </div>
                </div>
                {/* Coexistence Section */}
                <CoexistenceSection account={account} />
              </div>
            ))}
          </div>
        )}

        {/* Setup Instructions */}
        {!isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('whatsapp.setupNote')}</strong> {t('whatsapp.setupDescription')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
