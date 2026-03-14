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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Clock,
  Store,
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
      toast.success(message || 'TikTok Shop account connected successfully!');
      refetch();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (tiktokStatus === 'error') {
      toast.error(message || 'Failed to connect TikTok Shop account');
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
      toast.error(error.response?.data?.error || error.message || 'Failed to start TikTok Shop connection');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this TikTok Shop account?')) {
      return;
    }

    try {
      await disconnectTikTok.mutateAsync(undefined);
      toast.success('TikTok Shop account disconnected successfully');
    } catch (error: any) {
      console.error('Failed to disconnect TikTok Shop:', error);
      toast.error(error.response?.data?.error || 'Failed to disconnect TikTok Shop account');
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
  const account = status?.account;

  return (
    <Card
      className={cn(
        'border-2',
        isConnected ? 'border-gray-300 bg-gray-50/50' : 'border-border'
      )}
    >
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white">
              <TikTokIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">TikTok Shop</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                {isConnected && account ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Connected</span>
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
              'h-8 self-start sm:self-auto',
              isConnected && 'bg-black hover:bg-gray-800'
            )}
          >
            {isConnected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              disabled={loading || connectTikTok.isPending}
              className="bg-black hover:bg-gray-800 w-full sm:w-auto"
            >
              {loading || connectTikTok.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <TikTokIcon className="mr-2 h-4 w-4" />
                  Connect TikTok Shop
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleDisconnect}
              disabled={loading || disconnectTikTok.isPending}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              {disconnectTikTok.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Disconnect
                </>
              )}
            </Button>
          )}
          <Button onClick={() => refetch()} disabled={loading} variant="outline" className="w-full sm:w-auto">
            <RefreshCw
              className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}
            />
            Refresh Status
          </Button>
        </div>

        {/* Connected Account Details */}
        {isConnected && account && (
          <div className="space-y-3 pt-4">
            <h4 className="font-semibold text-sm">Connected Shop</h4>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">
                    {account.seller_name || 'TikTok Shop Seller'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {account.seller_base_region && (
                      <Badge variant="outline" className="text-xs">
                        {account.seller_base_region}
                      </Badge>
                    )}
                    <span className="hidden sm:inline">•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(account.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <Badge
                  variant={account.is_active ? 'default' : 'secondary'}
                  className={account.is_active ? 'bg-black' : ''}
                >
                  {account.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Token expiration warning */}
        {isConnected && status?.is_token_expired && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Token expired.</strong> Please reconnect your TikTok Shop account to continue receiving messages.
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Instructions */}
        {!isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Requirements:</strong> You need a TikTok Shop seller account to connect.
              Your shop must be authorized through the TikTok Shop Partner Center.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
