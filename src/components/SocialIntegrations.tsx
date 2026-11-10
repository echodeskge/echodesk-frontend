"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FacebookPageConnection, FacebookMessage } from "@/api/generated/interfaces";
import {
  useFacebookStatus,
  useFacebookPages,
  useFacebookMessages,
  useConnectFacebook,
  useDisconnectFacebook,
  useInstagramStatus,
  useInstagramAccounts,
  useInstagramMessages,
  useDisconnectInstagram,
  useRecheckInstagramMessaging,
} from "@/hooks/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Facebook,
  Instagram,
  RefreshCw,
  Check,
  X,
  MessageCircle,
  Clock,
  AlertCircle,
  Info,
  Mail,
  Plug,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { socialFacebookPagesDestroy } from "@/api/generated/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AccountRow,
  AccountRowAction,
  ChannelDetailCard,
  ChannelList,
  ChannelNote,
  ConnectionsLayout,
  PermissionList,
  SettingsNote,
  SettingsPage,
  SettingsSection,
  type ChannelListItem,
} from "@/components/redesign/settings";
import { useRouter } from "next/navigation";
import { WhatsAppConnection } from "@/components/WhatsAppConnection";
import { EmailConnection } from "@/components/EmailConnection";
import { TikTokConnection } from "@/components/TikTokConnection";
import { TelegramConnection, TelegramIcon } from "@/components/TelegramConnection";
import { WidgetConnection } from "@/components/WidgetConnection";
import {
  InstagramMessagingHealthAlert,
  type InstagramMessagingStatus,
} from "@/components/social/InstagramMessagingHealthAlert";

// Scopes requested by the Facebook Login dialog (backend facebook_oauth_start)
// with the one-line purpose shown before connecting.
const CONNECT_PERMISSIONS = [
  { scope: "pages_show_list", key: "pages_show_list" },
  { scope: "pages_messaging", key: "pages_messaging" },
  { scope: "pages_manage_metadata", key: "pages_manage_metadata" },
  { scope: "pages_read_engagement", key: "pages_read_engagement" },
  { scope: "instagram_basic", key: "instagram_basic" },
  { scope: "instagram_manage_messages", key: "instagram_manage_messages" },
  { scope: "business_management", key: "business_management" },
  { scope: "public_profile, email", key: "public_profile_email" },
] as const;

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

type ChannelId = "facebook" | "instagram" | "whatsapp" | "email" | "widget" | "tiktok" | "telegram";

interface SocialIntegrationsProps {
  onBackToDashboard?: () => void;
  onConnectionChange?: (type: 'facebook', connected: boolean) => void;
}

interface FacebookStatus {
  connected: boolean;
  pages_count: number;
  pages: Array<{
    id: number;
    page_id: string;
    page_name: string;
    is_active: boolean;
    connected_at: string;
  }>;
}

interface InstagramStatus {
  connected: boolean;
  accounts_count: number;
  accounts: Array<{
    id: number;
    instagram_account_id: string;
    username: string;
    profile_picture_url?: string;
    is_active: boolean;
    connected_at: string;
    messaging_status?: InstagramMessagingStatus;
    messaging_error?: string;
    messaging_error_code?: string;
    messaging_checked_at?: string | null;
  }>;
}

interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

export default function SocialIntegrations({ onBackToDashboard, onConnectionChange }: SocialIntegrationsProps) {
  const t = useTranslations("social");
  const locale = useLocale();
  const [error, setError] = useState("");
  const router = useRouter();
  // An old (inactive) page the user asked to remove from the list
  const [pageToRemove, setPageToRemove] = useState<FacebookPageConnection | null>(null);
  const [removingPage, setRemovingPage] = useState(false);

  // React Query hooks - Facebook
  const { data: facebookStatusData, isLoading: statusLoading, refetch: refetchStatus } = useFacebookStatus();
  const { data: facebookPagesData, isLoading: pagesLoading, refetch: refetchPages } = useFacebookPages();
  const facebookStatus = facebookStatusData as FacebookStatus | null;
  const isConnected = facebookStatus?.connected || false;
  const { data: messagesData } = useFacebookMessages({ page: 1 }, { enabled: isConnected });
  const connectFacebook = useConnectFacebook();
  const disconnectFacebook = useDisconnectFacebook();

  // React Query hooks - Instagram
  const { data: instagramStatusData, isLoading: instagramStatusLoading, refetch: refetchInstagramStatus } = useInstagramStatus();
  const { data: instagramAccountsData, isLoading: instagramAccountsLoading, refetch: refetchInstagramAccounts } = useInstagramAccounts();
  const instagramStatus = instagramStatusData as InstagramStatus | null;
  const isInstagramConnected = instagramStatus?.connected || false;
  const instagramNeedsAttention = (instagramStatus?.accounts || []).some(
    (a) => a.is_active && (a.messaging_status === "messaging_disabled" || a.messaging_status === "error")
  );
  const { data: instagramMessagesData } = useInstagramMessages({ page: 1 }, { enabled: isInstagramConnected });
  const disconnectInstagram = useDisconnectInstagram();
  const recheckInstagram = useRecheckInstagramMessaging();

  // The OAuth callback lands here with ?facebook_status=connected|error&message=…
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("facebook_status");
    if (!status) return;
    const message = params.get("message") || undefined;
    if (status === "connected") {
      toast.success(t("oauthConnected"), { description: message });
      refetchStatus();
      refetchPages();
      // Reconnecting Facebook also (re)links Instagram accounts.
      refetchInstagramStatus();
      refetchInstagramAccounts();
    } else {
      toast.error(t("oauthFailed"), { description: message });
    }
    window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    await Promise.all([
      refetchStatus(),
      refetchPages(),
      refetchInstagramStatus(),
      refetchInstagramAccounts()
    ]);
  };

  // Facebook data
  const facebookPages = (facebookPagesData as PaginatedResponse<FacebookPageConnection>)?.results || [];
  const totalMessages = (messagesData as PaginatedResponse<FacebookMessage>)?.count || 0;
  const loading = statusLoading || pagesLoading;

  // Instagram data
  const instagramAccounts = instagramAccountsData?.results || [];
  const totalInstagramMessages = instagramMessagesData?.count || 0;
  const instagramLoading = instagramStatusLoading || instagramAccountsLoading;

  // Notify parent when connection status changes
  useEffect(() => {
    if (facebookStatus && onConnectionChange) {
      onConnectionChange('facebook', isConnected);
    }
  }, [isConnected, onConnectionChange]);

  const handleConnectFacebook = async () => {
    setError("");
    try {
      const response = await connectFacebook.mutateAsync();
      if (response.oauth_url) {
        window.location.href = response.oauth_url;
      } else {
        throw new Error("No OAuth URL received");
      }
    } catch (err: any) {
      console.error("Failed to start Facebook OAuth:", err);
      setError(err.response?.data?.error || err.message || t("error"));
    }
  };

  const handleDisconnectFacebook = async () => {
    if (!confirm(t("areYouSureDisconnect"))) {
      return;
    }

    setError("");
    try {
      await disconnectFacebook.mutateAsync();
    } catch (err: any) {
      console.error("Failed to disconnect Facebook:", err);
      setError(err.response?.data?.error || err.message || t("error"));
    }
  };

  const handleDisconnectInstagram = async () => {
    if (!confirm(t("areYouSureDisconnect"))) {
      return;
    }

    setError("");
    try {
      await disconnectInstagram.mutateAsync();
    } catch (err: any) {
      console.error("Failed to disconnect Instagram:", err);
      setError(err.response?.data?.error || err.message || t("error"));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ka' ? 'ka-GE' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [channel, setChannel] = useState<ChannelId>("facebook");

  // Channel list (design CONNECTIONS). Statuses only for the channels whose
  // status this page already loads; the others load when opened, as before.
  const channels: ChannelListItem<ChannelId>[] = [
    {
      id: "facebook",
      label: "Facebook",
      icon: Facebook,
      color: "#1877F2",
      status: isConnected && facebookStatus ? `${facebookStatus.pages_count} ${t("pagesConnected")}` : t("notConnected"),
      dot: isConnected ? "success" : null,
    },
    {
      id: "instagram",
      label: "Instagram",
      icon: Instagram,
      color: "linear-gradient(135deg,#9333ea,#db2777)",
      status: isInstagramConnected && instagramStatus ? `${instagramStatus.accounts_count} ${t("accountsConnected")}` : t("notConnected"),
      dot: isInstagramConnected ? (instagramNeedsAttention ? "warning" : "success") : null,
    },
    { id: "whatsapp", label: "WhatsApp", icon: WhatsAppIcon as unknown as LucideIcon, color: "#25D366" },
    { id: "email", label: t("connections.email"), icon: Mail, color: "#dc2626" },
    { id: "widget", label: t("connections.widget"), icon: MessageCircle, color: "#4f46e5" },
    { id: "tiktok", label: "TikTok", icon: TikTokIcon as unknown as LucideIcon, color: "linear-gradient(135deg,#25F4EE,#000 40%,#000 60%,#FE2C55)" },
    { id: "telegram", label: "Telegram", icon: TelegramIcon as unknown as LucideIcon, color: "#229ED9" },
  ];

  return (
    <SettingsPage
      icon={Plug}
      title={t("socialMediaIntegrations")}
      description={t("connectAndManage")}
      width="connections"
      gap={18}
      testId="social-connections-page"
    >
      {/* Error Alert */}
      {error && (
        <SettingsNote
          tone="danger"
          icon={AlertCircle}
          testId="connections-error"
          action={
            <button
              type="button"
              onClick={() => setError("")}
              className="-my-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-destructive/10"
              aria-label={t("connections.dismiss")}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          }
        >
          {error}
        </SettingsNote>
      )}

      {/* Shown above the channels: Instagram DMs silently stop when the
          owner turns off message access, whichever channel is open. */}
      <div className="empty:hidden">
        <InstagramMessagingHealthAlert
          accounts={instagramStatus?.accounts || []}
          onRecheck={() => recheckInstagram.mutate()}
          rechecking={recheckInstagram.isPending}
        />
      </div>

      <ConnectionsLayout
        list={<ChannelList channels={channels} value={channel} onSelect={setChannel} ariaLabel={t("connections.channelsLabel")} />}
      >
        {/* Facebook */}
        {channel === "facebook" && (
          <>
            <ChannelDetailCard
              icon={Facebook}
              color="#1877F2"
              title={t("facebookPages")}
              status={isConnected && facebookStatus ? `${facebookStatus.pages_count} ${t("pagesConnected")}` : t("notConnected")}
              statusIcon={isConnected && facebookStatus ? Check : X}
              statusTone={isConnected && facebookStatus ? "success" : "neutral"}
              badge={{ label: isConnected ? t("connected") : t("notConnected"), tone: isConnected ? "success" : "neutral" }}
              inbox={
                isConnected && totalMessages > 0
                  ? { count: totalMessages, label: t("totalMessages"), actionLabel: t("viewMessages"), onClick: () => router.push('/social/messages') }
                  : null
              }
              actions={[
                /* The Facebook Login button must ALWAYS be visible — App
                   Review rejected the app ("Unable to Locate Facebook
                   Login", Platform Term 7.a) because it disappeared once a
                   page was connected. It also lets tenants connect more
                   pages without disconnecting existing ones. */
                {
                  label: loading || connectFacebook.isPending ? t("connecting") : isConnected ? t("connectMorePages") : t("connectFacebookPages"),
                  icon: loading || connectFacebook.isPending ? RefreshCw : Facebook,
                  variant: "primary",
                  onClick: handleConnectFacebook,
                  disabled: loading || connectFacebook.isPending,
                  testId: "facebook-connect",
                },
                ...(isConnected
                  ? [{
                      label: loading || disconnectFacebook.isPending ? t("disconnecting") : t("disconnectAllPages"),
                      icon: loading || disconnectFacebook.isPending ? RefreshCw : X,
                      variant: "danger" as const,
                      onClick: handleDisconnectFacebook,
                      disabled: loading || disconnectFacebook.isPending,
                      testId: "facebook-disconnect",
                    }]
                  : []),
                { label: t("refreshStatus"), icon: RefreshCw, variant: "outline", onClick: handleRefresh, disabled: loading, testId: "facebook-refresh" },
              ]}
              testId="facebook-detail"
            />

            {/* Setup Instructions */}
            {!isConnected && (
              <SettingsSection title={t("howToConnect")} testId="facebook-how-to">
                <div className="flex flex-col gap-3 px-4 py-3.5">
                  <ol className="list-inside list-decimal space-y-1.5 text-[13px] text-muted-foreground">
                    <li>{t("step1")}</li>
                    <li>{t("step2")}</li>
                    <li>{t("step3")}</li>
                    <li>{t("step4")}</li>
                    <li>{t("step5")}</li>
                  </ol>
                  <SettingsNote tone="info">
                    <strong className="font-semibold">{t("note")}:</strong> {t("noteAdmin")}
                  </SettingsNote>
                </div>
              </SettingsSection>
            )}

            {/* Connected Pages List */}
            {facebookPages.length > 0 && (
              <SettingsSection
                title={t("connectedFacebookPages")}
                hint={`${facebookPages.length} ${t("pagesConnectedCount")}`}
                testId="facebook-pages"
              >
                {facebookPages.map((page) => (
                  <AccountRow
                    key={page.id}
                    avatar={page.page_name.charAt(0).toUpperCase()}
                    name={page.page_name}
                    meta={
                      <span className="inline-flex flex-wrap items-center gap-x-2">
                        <span>ID: {page.page_id}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden />
                          {formatDate(page.created_at)}
                        </span>
                      </span>
                    }
                    badge={{ label: page.is_active ? t("active") : t("inactive"), tone: page.is_active ? "success" : "neutral" }}
                    actions={
                      !page.is_active ? (
                        <AccountRowAction label={t("removePage")} icon={Trash2} tone="danger" onClick={() => setPageToRemove(page)} testId="facebook-remove-page" />
                      ) : undefined
                    }
                    testId="facebook-page-row"
                  />
                ))}
              </SettingsSection>
            )}

            {/* What each requested Meta permission is used for */}
            {!isConnected && (
              <SettingsSection title={t("connectPermissions.title")} testId="connect-permissions">
                <PermissionList
                  items={CONNECT_PERMISSIONS.map(({ scope, key }) => ({ scope, why: t(`connectPermissions.${key}`) }))}
                />
              </SettingsSection>
            )}

            {/* Meta Human Agent: replies up to 7 days, people only */}
            <ChannelNote icon={Clock} testId="human-agent-note">{t("humanAgentNote")}</ChannelNote>
          </>
        )}

        {/* Instagram */}
        {channel === "instagram" && (
          <>
            <ChannelDetailCard
              icon={Instagram}
              color="linear-gradient(135deg,#9333ea,#db2777)"
              title={t("instagramAccounts")}
              status={isInstagramConnected && instagramStatus ? `${instagramStatus.accounts_count} ${t("accountsConnected")}` : t("notConnected")}
              statusIcon={isInstagramConnected && instagramStatus ? Check : X}
              statusTone={isInstagramConnected && instagramStatus ? "success" : "neutral"}
              badge={{ label: isInstagramConnected ? t("connected") : t("notConnected"), tone: isInstagramConnected ? "success" : "neutral" }}
              inbox={
                isInstagramConnected && totalInstagramMessages > 0
                  ? { count: totalInstagramMessages, label: t("totalMessages"), actionLabel: t("viewMessages"), onClick: () => router.push('/social/messages') }
                  : null
              }
              actions={
                isInstagramConnected
                  ? [{
                      label: instagramLoading || disconnectInstagram.isPending ? t("disconnecting") : t("disconnectAllAccounts"),
                      icon: instagramLoading || disconnectInstagram.isPending ? RefreshCw : X,
                      variant: "danger",
                      onClick: handleDisconnectInstagram,
                      disabled: instagramLoading || disconnectInstagram.isPending,
                      testId: "instagram-disconnect",
                    }]
                  : []
              }
              testId="instagram-detail"
            >
              {!isInstagramConnected && (
                <SettingsNote tone="info" icon={Info}>{t("instagramConnectsViaFacebook")}</SettingsNote>
              )}
            </ChannelDetailCard>

            {/* Connected Instagram Accounts List */}
            {instagramAccounts.length > 0 && (
              <SettingsSection
                title={t("connectedInstagramAccounts")}
                hint={`${instagramAccounts.length} ${t("accountsConnectedCount")}`}
                testId="instagram-accounts"
              >
                {instagramAccounts.map((account: any) => (
                  <AccountRow
                    key={account.id}
                    avatar={
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={account.profile_picture_url} alt={`@${account.username}`} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 text-[13px] font-semibold text-pink-600">
                          {account.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    }
                    name={`@${account.username}`}
                    meta={
                      <span className="inline-flex flex-wrap items-center gap-x-2">
                        <span>ID: {account.instagram_account_id}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden />
                          {formatDate(account.created_at)}
                        </span>
                      </span>
                    }
                    badge={{ label: account.is_active ? t("active") : t("inactive"), tone: account.is_active ? "success" : "neutral" }}
                    testId="instagram-account-row"
                  />
                ))}
              </SettingsSection>
            )}
          </>
        )}

        {channel === "whatsapp" && <WhatsAppConnection />}
        {channel === "email" && <EmailConnection />}
        {channel === "widget" && <WidgetConnection />}
        {channel === "tiktok" && <TikTokConnection />}
        {channel === "telegram" && <TelegramConnection />}
      </ConnectionsLayout>

      <AlertDialog open={pageToRemove !== null} onOpenChange={(open) => !open && setPageToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removePageTitle", { name: pageToRemove?.page_name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("removePageDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingPage}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removingPage}
              onClick={async (event) => {
                event.preventDefault()
                if (!pageToRemove) return
                setRemovingPage(true)
                try {
                  await socialFacebookPagesDestroy(pageToRemove.id)
                  toast.success(t("pageRemoved"))
                  setPageToRemove(null)
                  await refetchPages()
                } catch {
                  toast.error(t("pageRemoveFailed"))
                } finally {
                  setRemovingPage(false)
                }
              }}
            >
              {t("removePage")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsPage>
  );
}
