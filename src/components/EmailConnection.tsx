'use client';

import { useState } from 'react';
import DOMPurify from 'dompurify';
import { useLocale, useTranslations } from 'next-intl';
import {
  useEmailStatus,
  useConnectEmail,
  useDisconnectEmail,
  useSyncEmail,
  useUpdateEmailConnection,
  useReactivateEmailConnection,
  EmailConnectRequest,
  EmailConnectionDetail,
} from '@/hooks/api/useSocial';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TonePill } from '@/components/redesign/pill';
import { rdButton } from '@/components/redesign/buttons';
import {
  ChannelDetailCard,
  FieldRow,
  SecretInput,
  SettingsNote,
  SettingsSection,
  SettingsToggle,
  settingsFieldWidth,
  settingsInputClass,
} from '@/components/redesign/settings';
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
  Users,
  Pencil,
  Plug,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { EmailUserAssignmentDialog } from '@/components/email/EmailUserAssignmentDialog';
import { EmailSignatureSettings } from '@/components/social/EmailSignatureSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  hasEffectiveSignature,
  signatureDialogInitialState,
  signatureSavePayload,
  type SignatureDialogState,
} from '@/lib/email-compose';

// Individual email account card
function EmailAccountCard({
  connection,
  onSync,
  onDisconnect,
  onEdit,
  onEditSignature,
  onManageAccess,
  onReactivate,
  isSyncing,
  isDisconnecting,
  isReactivating,
}: {
  connection: EmailConnectionDetail;
  onSync: () => void;
  onDisconnect: () => void;
  onEdit: () => void;
  onEditSignature: () => void;
  onManageAccess: () => void;
  onReactivate: (password?: string) => void;
  isSyncing: boolean;
  isDisconnecting: boolean;
  isReactivating: boolean;
}) {
  const t = useTranslations('social.emailConnection');
  const locale = useLocale();
  const [reactivatePassword, setReactivatePassword] = useState('');
  const autoDisabled = Boolean(connection.auto_disabled_at);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ka' ? 'ka-GE' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLabel = autoDisabled
    ? t('statusAutoDisabled')
    : connection.is_active
      ? t('statusActive')
      : t('statusInactive');
  const rowAction =
    "inline-flex h-7 items-center gap-[5px] whitespace-nowrap rounded-md px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="flex flex-col gap-2.5 border-b px-4 py-3 last:border-b-0" data-testid="email-account-row">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
          <Mail className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="flex min-w-[180px] flex-1 flex-col gap-0.5">
          <span className="text-[13px] font-medium">{connection.display_name || connection.email_address}</span>
          <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{connection.email_address}</span>
        </div>
        <TonePill tone={autoDisabled ? 'warning' : connection.is_active ? 'success' : 'neutral'} testId="email-account-status">
          {statusLabel}
        </TonePill>
      </div>

      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2 sm:ps-12">
        <div className="flex min-w-0 gap-1.5">
          <dt className="text-muted-foreground">{t('imap')}:</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{connection.imap_server}</dd>
        </div>
        <div className="flex min-w-0 gap-1.5">
          <dt className="text-muted-foreground">{t('smtp')}:</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{connection.smtp_server}</dd>
        </div>
        <div className="flex min-w-0 gap-1.5">
          <dt className="text-muted-foreground">{t('folder')}:</dt>
          <dd>{connection.sync_folder}</dd>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          <dt className="text-muted-foreground">{t('synced')}:</dt>
          <dd>{connection.last_sync_at ? formatDate(connection.last_sync_at) : t('never')}</dd>
        </div>
      </dl>

      {autoDisabled ? (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/[0.08] px-3 py-2.5 sm:ms-12" role="alert" data-testid="email-auto-disabled">
          <div className="flex items-start gap-2 text-xs leading-[17px]">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
            <span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">{t('autoDisabledTitle')}</span>{' '}
              {connection.last_sync_error || t('autoDisabledFallback')}{' '}
              {t('autoDisabledHint')}
            </span>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onReactivate(reactivatePassword.trim() || undefined);
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input
              type="password"
              placeholder={t('reactivatePasswordPlaceholder')}
              aria-label={t('password')}
              value={reactivatePassword}
              onChange={(event) => setReactivatePassword(event.target.value)}
              className={cn(settingsInputClass, 'h-[30px] flex-1 text-xs')}
              autoComplete="new-password"
            />
            <button type="submit" className={rdButton.primarySm} disabled={isReactivating}>
              {isReactivating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  {t('testing')}
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" aria-hidden />
                  {t('reactivate')}
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        connection.last_sync_error && (
          <div className="sm:ms-12">
            <SettingsNote tone="danger" icon={AlertCircle}>{connection.last_sync_error}</SettingsNote>
          </div>
        )
      )}

      <div className="flex flex-wrap gap-1 sm:ms-10">
        <button type="button" onClick={onEdit} className={rowAction}>
          <Pencil className="h-[13px] w-[13px]" aria-hidden />
          {t('edit')}
        </button>
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing || autoDisabled}
          className={rowAction}
          title={autoDisabled ? t('reactivateBeforeSync') : undefined}
        >
          <RefreshCw className={cn('h-[13px] w-[13px]', isSyncing && 'animate-spin')} aria-hidden />
          {isSyncing ? t('syncing') : t('sync')}
        </button>
        <button type="button" onClick={onEditSignature} className={rowAction}>
          <FileSignature className="h-[13px] w-[13px]" aria-hidden />
          {t('signature')}
          {hasEffectiveSignature(connection) && (
            <Check
              className="h-3 w-3 text-green-600"
              data-testid="signature-indicator"
            />
          )}
        </button>
        <button type="button" onClick={onManageAccess} className={rowAction}>
          <Users className="h-[13px] w-[13px]" aria-hidden />
          {t('access')}
          {connection.assigned_users && connection.assigned_users.length > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-muted px-1 text-[10px] tabular-nums">
              {connection.assigned_users.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onDisconnect}
          disabled={isDisconnecting}
          className={cn(rowAction, 'text-destructive')}
        >
          {isDisconnecting ? (
            <>
              <RefreshCw className="h-[13px] w-[13px] animate-spin" aria-hidden />
              {t('removing')}
            </>
          ) : (
            <>
              <Trash2 className="h-[13px] w-[13px]" aria-hidden />
              {t('remove')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function EmailConnection() {
  const tSig = useTranslations('social.emailSignature');
  const t = useTranslations('social.emailConnection');
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [editingConnection, setEditingConnection] = useState<EmailConnectionDetail | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEditAdvanced, setShowEditAdvanced] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);
  const [syncingConnectionId, setSyncingConnectionId] = useState<number | null>(null);
  const [disconnectingConnectionId, setDisconnectingConnectionId] = useState<number | null>(null);
  const [reactivatingConnectionId, setReactivatingConnectionId] = useState<number | null>(null);

  // Signature form state
  const [signatureHtml, setSignatureHtml] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [signatureSource, setSignatureSource] = useState<SignatureDialogState['source']>('legacy');
  const [signatureTab, setSignatureTab] = useState<'mailbox' | 'workspace'>('mailbox');

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
  const reactivateEmailConnection = useReactivateEmailConnection();

  const handleReactivate = async (connectionId: number, password?: string) => {
    try {
      setReactivatingConnectionId(connectionId);
      await reactivateEmailConnection.mutateAsync({
        connection_id: connectionId,
        ...(password ? { password } : {}),
      });
      toast.success(t('reactivated'));
    } catch (error: unknown) {
      const message =
        (typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error ===
            'string'
          ? (error as { response: { data: { error: string } } }).response.data.error
          : undefined) ||
        t('reactivateFailed');
      toast.error(message);
    } finally {
      setReactivatingConnectionId(null);
    }
  };

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
      toast.error(t('requiredFields'));
      return;
    }

    try {
      await connectEmail.mutateAsync(formData);
      toast.success(t('connected'));
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
      const errorMessage = error.response?.data?.error || error.response?.data?.details || t('connectFailed');
      toast.error(errorMessage);
    }
  };

  const handleDisconnect = async (connectionId: number, emailAddress: string) => {
    if (!confirm(t('confirmRemove', { email: emailAddress }))) {
      return;
    }

    setDisconnectingConnectionId(connectionId);
    try {
      await disconnectEmail.mutateAsync(connectionId);
      toast.success(t('removed', { email: emailAddress }));
    } catch (error: any) {
      console.error('Failed to disconnect email:', error);
      toast.error(error.response?.data?.error || t('removeFailed'));
    } finally {
      setDisconnectingConnectionId(null);
    }
  };

  const handleSync = async (connectionId: number) => {
    setSyncingConnectionId(connectionId);
    try {
      const result = await syncEmail.mutateAsync(connectionId);
      toast.success(t('syncedCount', { count: result.new_messages || 0 }));
    } catch (error: any) {
      console.error('Failed to sync email:', error);
      toast.error(error.response?.data?.error || t('syncFailed'));
    } finally {
      setSyncingConnectionId(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      const result = await syncEmail.mutateAsync(undefined);
      toast.success(t('syncedAllCount', { count: result.new_messages || 0 }));
    } catch (error: any) {
      console.error('Failed to sync emails:', error);
      toast.error(error.response?.data?.error || t('syncAllFailed'));
    }
  };

  // Edit form state
  const [editFormData, setEditFormData] = useState({
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

  const handleEdit = (connection: EmailConnectionDetail) => {
    setEditingConnection(connection);
    setEditFormData({
      display_name: connection.display_name || '',
      imap_server: connection.imap_server || '',
      imap_port: connection.imap_port || 993,
      imap_use_ssl: connection.imap_use_ssl ?? true,
      smtp_server: connection.smtp_server || '',
      smtp_port: connection.smtp_port || 587,
      smtp_use_tls: connection.smtp_use_tls ?? true,
      smtp_use_ssl: connection.smtp_use_ssl ?? false,
      username: connection.username || '',
      password: '',
      sync_folder: connection.sync_folder || 'INBOX',
      sync_days_back: connection.sync_days_back || 30,
    });
    setShowEditAdvanced(false);
    setShowEditPassword(false);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingConnection) return;
    if (!editFormData.imap_server || !editFormData.smtp_server) {
      toast.error(t('serversRequired'));
      return;
    }

    try {
      await updateEmailConnection.mutateAsync({
        connection_id: editingConnection.id,
        display_name: editFormData.display_name,
        imap_server: editFormData.imap_server,
        imap_port: editFormData.imap_port,
        imap_use_ssl: editFormData.imap_use_ssl,
        smtp_server: editFormData.smtp_server,
        smtp_port: editFormData.smtp_port,
        smtp_use_tls: editFormData.smtp_use_tls,
        smtp_use_ssl: editFormData.smtp_use_ssl,
        username: editFormData.username,
        ...(editFormData.password ? { password: editFormData.password } : {}),
        sync_folder: editFormData.sync_folder,
        sync_days_back: editFormData.sync_days_back,
      });
      toast.success(t('updated'));
      setShowEditDialog(false);
      setEditingConnection(null);
    } catch (error: any) {
      console.error('Failed to update email connection:', error);
      const errorMessage = error.response?.data?.error || t('updateFailed');
      toast.error(errorMessage);
    }
  };

  const handleEditSignature = (connection: EmailConnectionDetail) => {
    setEditingConnection(connection);
    // Show the signature that is really used: the mailbox's own, else the
    // workspace default that every mailbox without its own inherits.
    const initial = signatureDialogInitialState(connection);
    setSignatureHtml(initial.html);
    setSignatureText(initial.text);
    setSignatureSource(initial.source);
    setSignatureTab('mailbox');
    setShowSignaturePreview(false);
    setShowSignatureDialog(true);
  };

  const handleManageAccess = (connection: EmailConnectionDetail) => {
    setEditingConnection(connection);
    setShowAccessDialog(true);
  };

  const handleSaveSignature = async () => {
    if (!editingConnection) return;

    try {
      await updateEmailConnection.mutateAsync({
        connection_id: editingConnection.id,
        ...signatureSavePayload(signatureHtml, signatureText),
      });
      toast.success(tSig('saved'));
      setShowSignatureDialog(false);
      setEditingConnection(null);
    } catch (error: any) {
      console.error('Failed to save signature:', error);
      toast.error(error.response?.data?.error || tSig('saveFailed'));
    }
  };

  // Drop the mailbox's own signature so it inherits the workspace default.
  const handleUseWorkspaceSignature = async () => {
    if (!editingConnection) return;
    try {
      await updateEmailConnection.mutateAsync({
        connection_id: editingConnection.id,
        signature_enabled: false,
      });
      toast.success(tSig('revertedToWorkspace'));
      setShowSignatureDialog(false);
      setEditingConnection(null);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || tSig('saveFailed'));
    }
  };

  const fieldLabel = 'text-xs font-medium text-muted-foreground';

  return (
    <>
      <ChannelDetailCard
        icon={Mail}
        color="#dc2626"
        title={t('title')}
        status={hasConnections ? t('accountsConnected', { count: connections.length }) : t('noAccounts')}
        statusIcon={hasConnections ? Check : X}
        statusTone={hasConnections ? 'success' : 'neutral'}
        badge={{ label: hasConnections ? t('badgeConnected', { count: connections.length }) : t('badgeNotConnected'), tone: hasConnections ? 'success' : 'neutral' }}
        actions={[
          { label: t('addAccount'), icon: Plus, variant: 'primary', onClick: () => setShowConnectDialog(true), disabled: loading, testId: 'email-add-account' },
          ...(hasConnections
            ? [{
                label: syncEmail.isPending && syncingConnectionId === null ? t('syncingAll') : t('syncAll'),
                icon: RefreshCw,
                variant: 'outline' as const,
                onClick: handleSyncAll,
                disabled: loading || syncEmail.isPending,
                testId: 'email-sync-all',
              }]
            : []),
          { label: t('refresh'), icon: RefreshCw, variant: 'outline', onClick: () => refetch(), disabled: loading, testId: 'email-refresh' },
        ]}
        testId="email-detail"
      >
        {/* Setup Instructions */}
        {!hasConnections && (
          <SettingsNote tone="info" icon={AlertCircle}>
            {t.rich('gmailNote', {
              strong: (chunks) => <strong className="font-semibold">{chunks}</strong>,
              link: (chunks) => (
                <a
                  href="https://support.google.com/accounts/answer/185833"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  {chunks}
                </a>
              ),
            })}
          </SettingsNote>
        )}
      </ChannelDetailCard>

      {/* Add mailbox (design CONNECTIONS email add form; same fields, checks and request as the old dialog) */}
      {showConnectDialog && (
        <SettingsSection title={t('addTitle')} hint={t('addDescription')} testId="email-add-form">
          <div className="flex flex-col gap-3.5 px-4 py-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex min-w-0 flex-col gap-1">
                <span className={fieldLabel}>{t('emailAddress')}</span>
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className={settingsInputClass}
                  value={formData.email_address}
                  onChange={(e) => handleEmailChange(e.target.value)}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className={fieldLabel}>{t('displayName')}</span>
                <input
                  id="display_name"
                  className={settingsInputClass}
                  placeholder={t('displayNamePlaceholder')}
                  value={formData.display_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, display_name: e.target.value }))}
                />
              </label>
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor="password" className={fieldLabel}>{t('passwordRequired')}</label>
                <SecretInput
                  id="password"
                  mono={false}
                  value={formData.password}
                  onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
                  placeholder={t('passwordPlaceholder')}
                  autoComplete="new-password"
                  showLabel={t('showPassword')}
                  hideLabel={t('hidePassword')}
                />
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3 sm:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)_88px]">
              <label className="flex min-w-0 flex-col gap-1">
                <span className={fieldLabel}>{t('imapServer')}</span>
                <input
                  id="imap_server"
                  className={settingsInputClass}
                  placeholder="imap.example.com"
                  value={formData.imap_server}
                  onChange={(e) => setFormData((prev) => ({ ...prev, imap_server: e.target.value }))}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className={fieldLabel}>{t('imapPort')}</span>
                <input
                  id="imap_port"
                  type="number"
                  className={cn(settingsInputClass, 'font-mono tabular-nums')}
                  value={formData.imap_port}
                  onChange={(e) => setFormData((prev) => ({ ...prev, imap_port: parseInt(e.target.value) || 993 }))}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className={fieldLabel}>{t('smtpServer')}</span>
                <input
                  id="smtp_server"
                  className={settingsInputClass}
                  placeholder="smtp.example.com"
                  value={formData.smtp_server}
                  onChange={(e) => setFormData((prev) => ({ ...prev, smtp_server: e.target.value }))}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className={fieldLabel}>{t('smtpPort')}</span>
                <input
                  id="smtp_port"
                  type="number"
                  className={cn(settingsInputClass, 'font-mono tabular-nums')}
                  value={formData.smtp_port}
                  onChange={(e) => setFormData((prev) => ({ ...prev, smtp_port: parseInt(e.target.value) || 587 }))}
                />
              </label>
            </div>

            <p className="text-xs leading-[17px] text-muted-foreground">{t('addHint')}</p>

            {/* Advanced Settings */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="rounded-lg border">
              <CollapsibleTrigger asChild>
                <button type="button" className="flex h-9 w-full items-center justify-between gap-2 px-3 text-[13px] font-medium hover:bg-accent/60">
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                    {t('advanced')}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showAdvanced && 'rotate-180')} aria-hidden />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t">
                <FieldRow label={t('username')} htmlFor="username" align="center">
                  <input
                    id="username"
                    className={cn(settingsInputClass, settingsFieldWidth)}
                    placeholder={t('usernamePlaceholder')}
                    value={formData.username}
                    onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                  />
                </FieldRow>
                <FieldRow label={t('imapSsl')} htmlFor="imap_ssl" align="center">
                  <SettingsToggle
                    id="imap_ssl"
                    checked={formData.imap_use_ssl}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, imap_use_ssl: checked }))}
                  />
                </FieldRow>
                <FieldRow label={t('smtpTls')} htmlFor="smtp_tls" align="center">
                  <SettingsToggle
                    id="smtp_tls"
                    checked={formData.smtp_use_tls}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, smtp_use_tls: checked, smtp_use_ssl: checked ? false : prev.smtp_use_ssl }))
                    }
                  />
                </FieldRow>
                <FieldRow label={t('smtpSsl')} htmlFor="smtp_ssl" align="center">
                  <SettingsToggle
                    id="smtp_ssl"
                    checked={formData.smtp_use_ssl}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, smtp_use_ssl: checked, smtp_use_tls: checked ? false : prev.smtp_use_tls }))
                    }
                  />
                </FieldRow>
                <FieldRow label={t('syncFolder')} htmlFor="sync_folder" align="center">
                  <input
                    id="sync_folder"
                    className={cn(settingsInputClass, settingsFieldWidth)}
                    value={formData.sync_folder}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sync_folder: e.target.value }))}
                  />
                </FieldRow>
                <FieldRow label={t('syncDaysBack')} htmlFor="sync_days" align="center">
                  <input
                    id="sync_days"
                    type="number"
                    min={1}
                    max={365}
                    className={cn(settingsInputClass, 'w-28 font-mono tabular-nums')}
                    value={formData.sync_days_back}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sync_days_back: parseInt(e.target.value) || 30 }))}
                  />
                </FieldRow>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={rdButton.outline} onClick={() => setShowConnectDialog(false)}>
                {t('cancel')}
              </button>
              <button type="button" onClick={handleConnect} className={rdButton.primary} disabled={connectEmail.isPending} data-testid="email-connect-submit">
                {connectEmail.isPending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    {t('connecting')}
                  </>
                ) : (
                  <>
                    <Plug className="h-3.5 w-3.5" aria-hidden />
                    {t('connect')}
                  </>
                )}
              </button>
            </div>
          </div>
        </SettingsSection>
      )}

      {/* Connected accounts list */}
      {hasConnections && (
        <SettingsSection title={t('connectedAccounts')} testId="email-accounts">
          {connections.map((connection) => (
            <EmailAccountCard
              key={connection.id}
              connection={connection}
              onSync={() => handleSync(connection.id)}
              onDisconnect={() => handleDisconnect(connection.id, connection.email_address)}
              onEdit={() => handleEdit(connection)}
              onEditSignature={() => handleEditSignature(connection)}
              onManageAccess={() => handleManageAccess(connection)}
              onReactivate={(password) => handleReactivate(connection.id, password)}
              isSyncing={syncingConnectionId === connection.id}
              isDisconnecting={disconnectingConnectionId === connection.id}
              isReactivating={reactivatingConnectionId === connection.id}
            />
          ))}
        </SettingsSection>
      )}

      {/* Edit Connection Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) setEditingConnection(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              {t('editTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('editDescription', { email: editingConnection?.email_address ?? '' })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_display_name">{t('displayName')}</Label>
              <Input
                id="edit_display_name"
                placeholder={t('displayNamePlaceholder')}
                value={editFormData.display_name}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, display_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_password">{t('password')}</Label>
              <div className="relative">
                <Input
                  id="edit_password"
                  type={showEditPassword ? 'text' : 'password'}
                  placeholder={t('passwordKeepPlaceholder')}
                  value={editFormData.password}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, password: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  aria-label={showEditPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_imap_server">{t('imapServer')}</Label>
                <Input
                  id="edit_imap_server"
                  placeholder="imap.example.com"
                  value={editFormData.imap_server}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, imap_server: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_imap_port">{t('imapPort')}</Label>
                <Input
                  id="edit_imap_port"
                  type="number"
                  value={editFormData.imap_port}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, imap_port: parseInt(e.target.value) || 993 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_smtp_server">{t('smtpServer')}</Label>
                <Input
                  id="edit_smtp_server"
                  placeholder="smtp.example.com"
                  value={editFormData.smtp_server}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, smtp_server: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_smtp_port">{t('smtpPort')}</Label>
                <Input
                  id="edit_smtp_port"
                  type="number"
                  value={editFormData.smtp_port}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, smtp_port: parseInt(e.target.value) || 587 }))}
                />
              </div>
            </div>

            {/* Advanced Settings */}
            <Collapsible open={showEditAdvanced} onOpenChange={setShowEditAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    {t('advanced')}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', showEditAdvanced && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_username">{t('username')}</Label>
                  <Input
                    id="edit_username"
                    placeholder={t('usernamePlaceholder')}
                    value={editFormData.username}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, username: e.target.value }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="edit_imap_ssl">{t('imapSsl')}</Label>
                  <Switch
                    id="edit_imap_ssl"
                    checked={editFormData.imap_use_ssl}
                    onCheckedChange={(checked) => setEditFormData((prev) => ({ ...prev, imap_use_ssl: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="edit_smtp_tls">{t('smtpTls')}</Label>
                  <Switch
                    id="edit_smtp_tls"
                    checked={editFormData.smtp_use_tls}
                    onCheckedChange={(checked) =>
                      setEditFormData((prev) => ({ ...prev, smtp_use_tls: checked, smtp_use_ssl: checked ? false : prev.smtp_use_ssl }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="edit_smtp_ssl">{t('smtpSsl')}</Label>
                  <Switch
                    id="edit_smtp_ssl"
                    checked={editFormData.smtp_use_ssl}
                    onCheckedChange={(checked) =>
                      setEditFormData((prev) => ({ ...prev, smtp_use_ssl: checked, smtp_use_tls: checked ? false : prev.smtp_use_tls }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_sync_folder">{t('syncFolder')}</Label>
                    <Input
                      id="edit_sync_folder"
                      value={editFormData.sync_folder}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, sync_folder: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_sync_days">{t('syncDaysBack')}</Label>
                    <Input
                      id="edit_sync_days"
                      type="number"
                      min={1}
                      max={365}
                      value={editFormData.sync_days_back}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, sync_days_back: parseInt(e.target.value) || 30 }))}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateEmailConnection.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {updateEmailConnection.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('saveChanges')
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              {tSig('title')}
            </DialogTitle>
            <DialogDescription>
              {tSig('description', { email: editingConnection?.email_address ?? '' })}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={signatureTab}
            onValueChange={(value) => setSignatureTab(value as 'mailbox' | 'workspace')}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mailbox">{tSig('tabMailbox')}</TabsTrigger>
              <TabsTrigger value="workspace">{tSig('tabWorkspace')}</TabsTrigger>
            </TabsList>

            <TabsContent value="mailbox">
              <div className="space-y-4 py-2">
                {signatureSource === 'tenant' && (
                  <Alert data-testid="signature-inherited-note">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{tSig('inheritedNote')}</AlertDescription>
                  </Alert>
                )}
                {signatureSource === 'connection' && (
                  <div className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-muted-foreground">{tSig('ownNote')}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseWorkspaceSignature}
                      disabled={updateEmailConnection.isPending}
                    >
                      {tSig('useWorkspace')}
                    </Button>
                  </div>
                )}
                {(signatureSource === 'none' || signatureSource === 'legacy') && (
                  <p className="text-sm text-muted-foreground">{tSig('noneNote')}</p>
                )}

                {/* HTML Signature Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signature-html">{tSig('htmlLabel')}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSignaturePreview(!showSignaturePreview)}
                      className="h-8 px-2"
                    >
                      {showSignaturePreview ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-1" />
                          {tSig('hidePreview')}
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          {tSig('preview')}
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
                    {tSig('htmlHint')}
                  </p>
                </div>

                {/* HTML Preview */}
                {showSignaturePreview && signatureHtml && (
                  <div className="space-y-2">
                    <Label>{tSig('preview')}</Label>
                    <div className="rounded-md border bg-white p-4">
                      <div
                        className="[&_a]:text-blue-600 [&_a]:underline"
                        style={{
                          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                          fontSize: "14px",
                          lineHeight: "1.5",
                          color: "#666666",
                        }}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(signatureHtml) }}
                      />
                    </div>
                  </div>
                )}

                {/* Plain Text Fallback */}
                <div className="space-y-2">
                  <Label htmlFor="signature-text">{tSig('textLabel')}</Label>
                  <Textarea
                    id="signature-text"
                    placeholder="Best regards,&#10;John Doe&#10;Company Name"
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {tSig('textHint')}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSignatureDialog(false)}>
                  {tSig('cancel')}
                </Button>
                <Button
                  onClick={handleSaveSignature}
                  disabled={updateEmailConnection.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {updateEmailConnection.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {tSig('saving')}
                    </>
                  ) : signatureSource === 'tenant' ? (
                    tSig('saveForMailbox')
                  ) : (
                    tSig('save')
                  )}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="workspace">
              <p className="pb-2 text-sm text-muted-foreground">{tSig('workspaceNote')}</p>
              <EmailSignatureSettings />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* User Access Assignment Dialog */}
      <EmailUserAssignmentDialog
        open={showAccessDialog}
        onOpenChange={(open) => {
          setShowAccessDialog(open);
          if (!open) setEditingConnection(null);
        }}
        connection={editingConnection}
      />
    </>
  );
}
