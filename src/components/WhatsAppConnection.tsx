'use client';

import { useState, useEffect } from 'react';
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
      toast.success('Contacts sync initiated. Contacts will be delivered via webhook.');
      refetchCoex();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to sync contacts');
    }
  };

  const handleSyncHistory = async () => {
    try {
      await syncHistory.mutateAsync({ accountId: account.id, phase: historyPhase });
      toast.success(`History sync initiated for phase ${historyPhase}. Messages will be delivered via webhook.`);
      refetchCoex();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to sync history');
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-auto">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Business App Coexistence</span>
            {isCoexEnabled && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Enabled
              </Badge>
            )}
          </div>
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2">
        {/* Status Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Platform:</span>
            <span className="font-medium">{localStatus?.platform_type || account.platform_type || 'Cloud API'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Throughput:</span>
            <span className="font-medium">{localStatus?.throughput_limit || account.throughput_limit || 80} mps</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Contacts Synced:</span>
            <span className="font-medium">
              {localStatus?.contacts_synced_at
                ? new Date(localStatus.contacts_synced_at).toLocaleDateString()
                : 'Never'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">History Synced:</span>
            <span className="font-medium">
              {localStatus?.history_synced_at
                ? new Date(localStatus.history_synced_at).toLocaleDateString()
                : 'Never'}
            </span>
          </div>
        </div>

        {/* Sync Window Alert */}
        {syncWindowOpen && syncWindowRemaining && (
          <Alert className="bg-amber-50 border-amber-200">
            <Timer className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Sync Window Open!</strong> You have {formatRemainingTime(syncWindowRemaining)} remaining to sync contacts and history from your Business App.
            </AlertDescription>
          </Alert>
        )}

        {!syncWindowOpen && localStatus?.onboarded_at && (
          <Alert className="bg-gray-50 border-gray-200">
            <AlertCircle className="h-4 w-4 text-gray-500" />
            <AlertDescription className="text-gray-600">
              Sync window has expired. Contacts and history can only be synced within 24 hours of onboarding.
            </AlertDescription>
          </Alert>
        )}

        {/* Sync Controls */}
        {syncWindowOpen && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncContacts}
              disabled={syncContacts.isPending}
            >
              {syncContacts.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Users className="mr-2 h-4 w-4" />
              )}
              Sync Contacts
            </Button>

            <div className="flex items-center gap-2">
              <Select value={historyPhase} onValueChange={setHistoryPhase}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-1">Last 24h</SelectItem>
                  <SelectItem value="1-90">1-90 days</SelectItem>
                  <SelectItem value="90-180">90-180 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncHistory}
                disabled={syncHistory.isPending}
              >
                {syncHistory.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <History className="mr-2 h-4 w-4" />
                )}
                Sync History
              </Button>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function WhatsAppConnection() {
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
      toast.success(message || 'WhatsApp Business Account connected successfully!');
      refetch();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (whatsappStatus === 'error') {
      toast.error(message || 'Failed to connect WhatsApp Business Account');
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
      toast.error(error.response?.data?.error || error.message || 'Failed to start WhatsApp connection');
    }
  };

  const handleDisconnect = async (wabaId?: string) => {
    if (!confirm('Are you sure you want to disconnect this WhatsApp Business Account?')) {
      return;
    }

    try {
      await disconnectWhatsApp.mutateAsync(wabaId);
      toast.success('WhatsApp Business Account disconnected successfully');
    } catch (error: any) {
      console.error('Failed to disconnect WhatsApp:', error);
      toast.error(error.response?.data?.error || 'Failed to disconnect WhatsApp Business Account');
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#25D366] text-white">
              <WhatsAppIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">WhatsApp Business</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                {isConnected && status ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{status.accounts_count} account(s) connected</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span>Not connected</span>
                  </>
                )}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={isConnected ? 'default' : 'secondary'}
            className={cn(
              'h-8',
              isConnected && 'bg-green-600 hover:bg-green-700'
            )}
          >
            {isConnected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-3">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              disabled={loading || connectWhatsApp.isPending}
              className="bg-[#25D366] hover:bg-[#20BA59]"
            >
              {loading || connectWhatsApp.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <WhatsAppIcon className="mr-2 h-4 w-4" />
                  Connect WhatsApp Business
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => handleDisconnect()}
              disabled={loading || disconnectWhatsApp.isPending}
              variant="destructive"
            >
              {disconnectWhatsApp.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Disconnect All
                </>
              )}
            </Button>
          )}
          <Button onClick={() => refetch()} disabled={loading} variant="outline">
            <RefreshCw
              className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}
            />
            Refresh Status
          </Button>
        </div>

        {/* Connected Accounts List */}
        {status && status.accounts.length > 0 && (
          <div className="space-y-3 pt-4">
            <h4 className="font-semibold text-sm">Connected Accounts</h4>
            {status.accounts.map((account, index) => (
              <div key={account.id}>
                {index > 0 && <Separator className="my-3" />}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-green-100 text-green-600">
                        <WhatsAppIcon className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{account.business_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{account.phone_number}</span>
                        {account.quality_rating && (
                          <>
                            <span>•</span>
                            <span>Quality: {account.quality_rating}</span>
                          </>
                        )}
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(account.connected_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {account.coex_enabled && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Coex
                      </Badge>
                    )}
                    <Badge
                      variant={account.is_active ? 'default' : 'secondary'}
                      className={account.is_active ? 'bg-green-600' : ''}
                    >
                      {account.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {account.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(account.waba_id)}
                      >
                        Disconnect
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
              <strong>Note:</strong> You need to have a WhatsApp Business Account to
              use this integration. The connection will use Facebook Embedded Signup
              for a seamless setup experience.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
