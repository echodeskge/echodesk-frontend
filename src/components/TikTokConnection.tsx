'use client';

import { useEffect } from 'react';
import {
  useTikTokStatus,
  useConnectTikTok,
  useDisconnectTikTok,
  TikTokStatus,
} from '@/hooks/api/useSocial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Clock,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
      toast.success(message || 'TikTok account connected successfully!');
      refetch();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (tiktokStatus === 'error') {
      toast.error(message || 'Failed to connect TikTok account');
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
      console.error('Failed to start TikTok OAuth:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to start TikTok connection');
    }
  };

  const handleDisconnect = async (accountId?: number) => {
    if (!confirm('Are you sure you want to disconnect this TikTok account?')) {
      return;
    }

    try {
      await disconnectTikTok.mutateAsync(accountId);
      toast.success('TikTok account disconnected successfully');
    } catch (error: any) {
      console.error('Failed to disconnect TikTok:', error);
      toast.error(error.response?.data?.error || 'Failed to disconnect TikTok account');
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
        isConnected ? 'border-gray-300 bg-gray-50/50' : 'border-border'
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white">
              <TikTokIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">TikTok</CardTitle>
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
              isConnected && 'bg-black hover:bg-gray-800'
            )}
          >
            {isConnected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Messaging Info Alert */}
        {isConnected && status && !status.messaging_available && (
          <Alert className="bg-amber-50 border-amber-200">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Note:</strong> {status.messaging_note || 'Make sure your TikTok account is upgraded to a Business Account for messaging features.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              disabled={loading || connectTikTok.isPending}
              className="bg-black hover:bg-gray-800"
            >
              {loading || connectTikTok.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <TikTokIcon className="mr-2 h-4 w-4" />
                  Connect TikTok
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => handleDisconnect()}
              disabled={loading || disconnectTikTok.isPending}
              variant="destructive"
            >
              {disconnectTikTok.isPending ? (
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
        {status && status.accounts && status.accounts.length > 0 && (
          <div className="space-y-3 pt-4">
            <h4 className="font-semibold text-sm">Connected Accounts</h4>
            {status.accounts.map((account, index) => (
              <div key={account.id}>
                {index > 0 && <Separator className="my-3" />}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {account.avatar_url ? (
                        <AvatarImage src={account.avatar_url} alt={`@${account.username}`} />
                      ) : null}
                      <AvatarFallback className="bg-black text-white">
                        <TikTokIcon className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {account.display_name || `@${account.username}` || 'TikTok User'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {account.username && <span>@{account.username}</span>}
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(account.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={account.is_active ? 'default' : 'secondary'}
                      className={account.is_active ? 'bg-black' : ''}
                    >
                      {account.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {account.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(account.id)}
                      >
                        Disconnect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Setup Instructions */}
        {!isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Requirements:</strong> You need a TikTok Business Account (not personal or creator) to use messaging.
              Go to TikTok settings and switch to Business Account before connecting.
              <br />
              <span className="text-xs text-muted-foreground mt-1 block">
                Note: Not available in US, UK, Switzerland, or European Economic Area.
              </span>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
