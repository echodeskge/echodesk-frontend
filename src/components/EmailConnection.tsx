'use client';

import { useState } from 'react';
import {
  useEmailStatus,
  useConnectEmail,
  useDisconnectEmail,
  useSyncEmail,
  EmailConnectRequest,
} from '@/hooks/api/useSocial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Mail,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Clock,
  ChevronDown,
  Settings2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function EmailConnection() {
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<EmailConnectRequest>({
    email_address: '',
    display_name: '',
    imap_server: '',
    imap_port: 993,
    imap_use_ssl: true,
    smtp_server: '',
    smtp_port: 587,
    smtp_use_tls: true,
    smtp_use_ssl: false,
    username: '',
    password: '',
    sync_folder: 'INBOX',
    sync_days_back: 30,
  });

  // React Query hooks
  const { data: status, isLoading: loading, refetch } = useEmailStatus();
  const connectEmail = useConnectEmail();
  const disconnectEmail = useDisconnectEmail();
  const syncEmail = useSyncEmail();

  const isConnected = status?.connected || false;

  // Auto-fill server settings based on email domain
  const handleEmailChange = (email: string) => {
    setFormData((prev) => ({ ...prev, email_address: email, username: email }));

    const domain = email.split('@')[1]?.toLowerCase();
    if (domain) {
      // Common email provider presets
      const presets: Record<string, Partial<EmailConnectRequest>> = {
        'gmail.com': {
          imap_server: 'imap.gmail.com',
          imap_port: 993,
          smtp_server: 'smtp.gmail.com',
          smtp_port: 587,
        },
        'googlemail.com': {
          imap_server: 'imap.gmail.com',
          imap_port: 993,
          smtp_server: 'smtp.gmail.com',
          smtp_port: 587,
        },
        'outlook.com': {
          imap_server: 'outlook.office365.com',
          imap_port: 993,
          smtp_server: 'smtp.office365.com',
          smtp_port: 587,
        },
        'hotmail.com': {
          imap_server: 'outlook.office365.com',
          imap_port: 993,
          smtp_server: 'smtp.office365.com',
          smtp_port: 587,
        },
        'live.com': {
          imap_server: 'outlook.office365.com',
          imap_port: 993,
          smtp_server: 'smtp.office365.com',
          smtp_port: 587,
        },
        'yahoo.com': {
          imap_server: 'imap.mail.yahoo.com',
          imap_port: 993,
          smtp_server: 'smtp.mail.yahoo.com',
          smtp_port: 587,
        },
        'icloud.com': {
          imap_server: 'imap.mail.me.com',
          imap_port: 993,
          smtp_server: 'smtp.mail.me.com',
          smtp_port: 587,
        },
      };

      const preset = presets[domain];
      if (preset) {
        setFormData((prev) => ({ ...prev, ...preset }));
      }
    }
  };

  const handleConnect = async () => {
    if (!formData.email_address || !formData.password || !formData.imap_server || !formData.smtp_server) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await connectEmail.mutateAsync(formData);
      toast.success('Email connected successfully!');
      setShowConnectDialog(false);
      setFormData({
        email_address: '',
        display_name: '',
        imap_server: '',
        imap_port: 993,
        imap_use_ssl: true,
        smtp_server: '',
        smtp_port: 587,
        smtp_use_tls: true,
        smtp_use_ssl: false,
        username: '',
        password: '',
        sync_folder: 'INBOX',
        sync_days_back: 30,
      });
    } catch (error: any) {
      console.error('Failed to connect email:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to connect email';
      toast.error(errorMessage);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this email account? All synced messages will be deleted.')) {
      return;
    }

    try {
      await disconnectEmail.mutateAsync();
      toast.success('Email disconnected successfully');
    } catch (error: any) {
      console.error('Failed to disconnect email:', error);
      toast.error(error.response?.data?.error || 'Failed to disconnect email');
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncEmail.mutateAsync();
      toast.success(`Synced ${result.new_messages || 0} new messages`);
    } catch (error: any) {
      console.error('Failed to sync email:', error);
      toast.error(error.response?.data?.error || 'Failed to sync email');
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

  return (
    <>
      <Card
        className={cn(
          'border-2',
          isConnected ? 'border-blue-200 bg-blue-50/50' : 'border-border'
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Email (IMAP/SMTP)</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  {isConnected && status?.connection ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{status.connection.email_address}</span>
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
                isConnected && 'bg-blue-600 hover:bg-blue-700'
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
                onClick={() => setShowConnectDialog(true)}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Mail className="mr-2 h-4 w-4" />
                Connect Email
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSync}
                  disabled={loading || syncEmail.isPending}
                  variant="outline"
                >
                  {syncEmail.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Now
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDisconnect}
                  disabled={loading || disconnectEmail.isPending}
                  variant="destructive"
                >
                  {disconnectEmail.isPending ? (
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
              </>
            )}
            <Button onClick={() => refetch()} disabled={loading} variant="outline">
              <RefreshCw
                className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}
              />
              Refresh Status
            </Button>
          </div>

          {/* Connection Details */}
          {isConnected && status?.connection && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold text-sm">Connection Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">IMAP Server:</span>
                  <span className="ml-2 font-medium">{status.connection.imap_server}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">SMTP Server:</span>
                  <span className="ml-2 font-medium">{status.connection.smtp_server}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Sync Folder:</span>
                  <span className="ml-2 font-medium">{status.connection.sync_folder}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Last Sync:</span>
                  <span className="ml-1 font-medium">
                    {status.connection.last_sync_at
                      ? formatDate(status.connection.last_sync_at)
                      : 'Never'}
                  </span>
                </div>
              </div>
              {status.connection.last_sync_error && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{status.connection.last_sync_error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Setup Instructions */}
          {!isConnected && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> For Gmail accounts, you need to use an{' '}
                <a
                  href="https://support.google.com/accounts/answer/185833"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  App Password
                </a>{' '}
                instead of your regular password (requires 2-Factor Authentication).
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Connect Email Account
            </DialogTitle>
            <DialogDescription>
              Enter your email credentials to connect via IMAP/SMTP.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email_address}
                onChange={(e) => handleEmailChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                placeholder="Your Name"
                value={formData.display_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, display_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password / App Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Server Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="imap_server">IMAP Server *</Label>
                <Input
                  id="imap_server"
                  placeholder="imap.example.com"
                  value={formData.imap_server}
                  onChange={(e) => setFormData((prev) => ({ ...prev, imap_server: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imap_port">IMAP Port</Label>
                <Input
                  id="imap_port"
                  type="number"
                  value={formData.imap_port}
                  onChange={(e) => setFormData((prev) => ({ ...prev, imap_port: parseInt(e.target.value) || 993 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp_server">SMTP Server *</Label>
                <Input
                  id="smtp_server"
                  placeholder="smtp.example.com"
                  value={formData.smtp_server}
                  onChange={(e) => setFormData((prev) => ({ ...prev, smtp_server: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp_port">SMTP Port</Label>
                <Input
                  id="smtp_port"
                  type="number"
                  value={formData.smtp_port}
                  onChange={(e) => setFormData((prev) => ({ ...prev, smtp_port: parseInt(e.target.value) || 587 }))}
                />
              </div>
            </div>

            {/* Advanced Settings */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Advanced Settings
                  </span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', showAdvanced && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username (if different from email)</Label>
                  <Input
                    id="username"
                    placeholder="Username"
                    value={formData.username}
                    onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="imap_ssl">IMAP SSL</Label>
                  <Switch
                    id="imap_ssl"
                    checked={formData.imap_use_ssl}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, imap_use_ssl: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="smtp_tls">SMTP TLS/STARTTLS</Label>
                  <Switch
                    id="smtp_tls"
                    checked={formData.smtp_use_tls}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, smtp_use_tls: checked, smtp_use_ssl: checked ? false : prev.smtp_use_ssl }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="smtp_ssl">SMTP SSL (alternative to TLS)</Label>
                  <Switch
                    id="smtp_ssl"
                    checked={formData.smtp_use_ssl}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, smtp_use_ssl: checked, smtp_use_tls: checked ? false : prev.smtp_use_tls }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sync_folder">Sync Folder</Label>
                    <Input
                      id="sync_folder"
                      value={formData.sync_folder}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sync_folder: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sync_days">Sync Days Back</Label>
                    <Input
                      id="sync_days"
                      type="number"
                      min={1}
                      max={365}
                      value={formData.sync_days_back}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sync_days_back: parseInt(e.target.value) || 30 }))}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={connectEmail.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {connectEmail.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Connect
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
