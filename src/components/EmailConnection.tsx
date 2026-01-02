'use client';

import { useState } from 'react';
import {
  useEmailStatus,
  useConnectEmail,
  useDisconnectEmail,
  useSyncEmail,
  useUpdateEmailConnection,
  EmailConnectRequest,
  EmailConnectionDetail,
} from '@/hooks/api/useSocial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
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
  Plus,
  Trash2,
  FileSignature,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Individual email account card
function EmailAccountCard({
  connection,
  onSync,
  onDisconnect,
  onEditSignature,
  isSyncing,
  isDisconnecting,
}: {
  connection: EmailConnectionDetail;
  onSync: () => void;
  onDisconnect: () => void;
  onEditSignature: () => void;
  isSyncing: boolean;
  isDisconnecting: boolean;
}) {
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
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{connection.display_name || connection.email_address}</p>
            <p className="text-sm text-muted-foreground">{connection.email_address}</p>
          </div>
        </div>
        <Badge
          variant={connection.is_active ? 'default' : 'secondary'}
          className={cn(connection.is_active && 'bg-green-600 hover:bg-green-700')}
        >
          {connection.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">IMAP:</span>
          <span className="ml-2">{connection.imap_server}</span>
        </div>
        <div>
          <span className="text-muted-foreground">SMTP:</span>
          <span className="ml-2">{connection.smtp_server}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Folder:</span>
          <span className="ml-2">{connection.sync_folder}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Synced:</span>
          <span className="ml-1">
            {connection.last_sync_at ? formatDate(connection.last_sync_at) : 'Never'}
          </span>
        </div>
      </div>

      {connection.last_sync_error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{connection.last_sync_error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 pt-2 flex-wrap">
        <Button
          onClick={onSync}
          disabled={isSyncing}
          variant="outline"
          size="sm"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-3 w-3" />
              Sync
            </>
          )}
        </Button>
        <Button
          onClick={onEditSignature}
          variant="outline"
          size="sm"
        >
          <FileSignature className="mr-2 h-3 w-3" />
          Signature
          {(connection.signature_html || connection.signature_text) && (
            <Check className="ml-1 h-3 w-3 text-green-500" />
          )}
        </Button>
        <Button
          onClick={onDisconnect}
          disabled={isDisconnecting}
          variant="destructive"
          size="sm"
        >
          {isDisconnecting ? (
            <>
              <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
              Removing...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-3 w-3" />
              Remove
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function EmailConnection() {
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [editingConnection, setEditingConnection] = useState<EmailConnectionDetail | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);
  const [syncingConnectionId, setSyncingConnectionId] = useState<number | null>(null);
  const [disconnectingConnectionId, setDisconnectingConnectionId] = useState<number | null>(null);

  // Signature form state
  const [signatureHtml, setSignatureHtml] = useState('');
  const [signatureText, setSignatureText] = useState('');

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
  const updateEmailConnection = useUpdateEmailConnection();

  const connections = status?.connections || [];
  const hasConnections = connections.length > 0;

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

  const handleDisconnect = async (connectionId: number, emailAddress: string) => {
    if (!confirm(`Are you sure you want to remove ${emailAddress}? All synced messages from this account will be deleted.`)) {
      return;
    }

    setDisconnectingConnectionId(connectionId);
    try {
      await disconnectEmail.mutateAsync(connectionId);
      toast.success(`Removed ${emailAddress}`);
    } catch (error: any) {
      console.error('Failed to disconnect email:', error);
      toast.error(error.response?.data?.error || 'Failed to disconnect email');
    } finally {
      setDisconnectingConnectionId(null);
    }
  };

  const handleSync = async (connectionId: number) => {
    setSyncingConnectionId(connectionId);
    try {
      const result = await syncEmail.mutateAsync(connectionId);
      toast.success(`Synced ${result.new_messages || 0} new messages`);
    } catch (error: any) {
      console.error('Failed to sync email:', error);
      toast.error(error.response?.data?.error || 'Failed to sync email');
    } finally {
      setSyncingConnectionId(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      const result = await syncEmail.mutateAsync(undefined);
      toast.success(`Synced ${result.new_messages || 0} new messages from all accounts`);
    } catch (error: any) {
      console.error('Failed to sync emails:', error);
      toast.error(error.response?.data?.error || 'Failed to sync emails');
    }
  };

  const handleEditSignature = (connection: EmailConnectionDetail) => {
    setEditingConnection(connection);
    setSignatureHtml(connection.signature_html || '');
    setSignatureText(connection.signature_text || '');
    setShowSignaturePreview(false);
    setShowSignatureDialog(true);
  };

  const handleSaveSignature = async () => {
    if (!editingConnection) return;

    try {
      await updateEmailConnection.mutateAsync({
        connection_id: editingConnection.id,
        signature_html: signatureHtml,
        signature_text: signatureText,
      });
      toast.success('Signature saved successfully');
      setShowSignatureDialog(false);
      setEditingConnection(null);
    } catch (error: any) {
      console.error('Failed to save signature:', error);
      toast.error(error.response?.data?.error || 'Failed to save signature');
    }
  };

  return (
    <>
      <Card className={cn('border-2', hasConnections ? 'border-red-200 bg-red-50/50' : 'border-border')}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 text-white">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Email (IMAP/SMTP)</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  {hasConnections ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{connections.length} account{connections.length > 1 ? 's' : ''} connected</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-muted-foreground" />
                      <span>No accounts connected</span>
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={hasConnections ? 'default' : 'secondary'}
              className={cn('h-8', hasConnections && 'bg-red-600 hover:bg-red-700')}
            >
              {hasConnections ? `${connections.length} Connected` : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => setShowConnectDialog(true)}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Email Account
            </Button>
            {hasConnections && (
              <Button
                onClick={handleSyncAll}
                disabled={loading || syncEmail.isPending}
                variant="outline"
              >
                {syncEmail.isPending && syncingConnectionId === null ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing All...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync All
                  </>
                )}
              </Button>
            )}
            <Button onClick={() => refetch()} disabled={loading} variant="outline">
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {/* Connected accounts list */}
          {hasConnections && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold text-sm">Connected Accounts</h4>
              {connections.map((connection) => (
                <EmailAccountCard
                  key={connection.id}
                  connection={connection}
                  onSync={() => handleSync(connection.id)}
                  onDisconnect={() => handleDisconnect(connection.id, connection.email_address)}
                  onEditSignature={() => handleEditSignature(connection)}
                  isSyncing={syncingConnectionId === connection.id}
                  isDisconnecting={disconnectingConnectionId === connection.id}
                />
              ))}
            </div>
          )}

          {/* Setup Instructions */}
          {!hasConnections && (
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
              Add Email Account
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
              className="bg-red-600 hover:bg-red-700"
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

      {/* Signature Dialog */}
      <Dialog open={showSignatureDialog} onOpenChange={(open) => {
        setShowSignatureDialog(open);
        if (!open) setEditingConnection(null);
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Email Signature
            </DialogTitle>
            <DialogDescription>
              Configure signature for {editingConnection?.email_address}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Signature will be automatically added to outgoing emails if content is provided below.
            </p>

            {/* HTML Signature Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="signature-html">Signature (HTML)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSignaturePreview(!showSignaturePreview)}
                  className="h-8 px-2"
                >
                  {showSignaturePreview ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                id="signature-html"
                placeholder={`Best regards,
<br/><br/>
<strong>John Doe</strong><br/>
Marketing Manager<br/>
<a href="https://example.com">www.example.com</a>`}
                value={signatureHtml}
                onChange={(e) => setSignatureHtml(e.target.value)}
                className="min-h-[120px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use HTML tags like &lt;br/&gt;, &lt;strong&gt;, &lt;a href=&quot;...&quot;&gt;
              </p>
            </div>

            {/* HTML Preview */}
            {showSignaturePreview && signatureHtml && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="rounded-md border bg-white p-4">
                  <div
                    className="[&_a]:text-blue-600 [&_a]:underline"
                    style={{
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      color: "#666666",
                    }}
                    dangerouslySetInnerHTML={{ __html: signatureHtml }}
                  />
                </div>
              </div>
            )}

            {/* Plain Text Fallback */}
            <div className="space-y-2">
              <Label htmlFor="signature-text">Plain Text Fallback</Label>
              <Textarea
                id="signature-text"
                placeholder="Best regards,&#10;John Doe&#10;Company Name"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                Used for email clients that don&apos;t support HTML
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignatureDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSignature}
              disabled={updateEmailConnection.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {updateEmailConnection.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Signature'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
