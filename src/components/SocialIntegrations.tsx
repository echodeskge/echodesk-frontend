"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
} from "@/hooks/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Facebook,
  Instagram,
  RefreshCw,
  Check,
  X,
  MessageSquare,
  MessageCircle,
  Clock,
  AlertCircle,
  Info,
  ArrowRight,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { WhatsAppConnection } from "@/components/WhatsAppConnection";
import { EmailConnection } from "@/components/EmailConnection";
import { TikTokConnection } from "@/components/TikTokConnection";
import { WidgetConnection } from "@/components/WidgetConnection";

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
  }>;
}

interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

export default function SocialIntegrations({ onBackToDashboard, onConnectionChange }: SocialIntegrationsProps) {
  const t = useTranslations("social");
  const [error, setError] = useState("");
  const router = useRouter();

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
  const { data: instagramMessagesData } = useInstagramMessages({ page: 1 }, { enabled: isInstagramConnected });
  const disconnectInstagram = useDisconnectInstagram();

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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Define platform tabs
  const platformTabs = [
    { value: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600" },
    { value: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-600" },
    { value: "whatsapp", label: "WhatsApp", icon: WhatsAppIcon, color: "text-green-600" },
    { value: "email", label: "Email", icon: Mail, color: "text-red-600" },
    { value: "widget", label: "Website widget", icon: MessageCircle, color: "text-indigo-600" },
    { value: "tiktok", label: "TikTok", icon: TikTokIcon, color: "text-black" },
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          {t("socialMediaIntegrations")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("connectAndManage")}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError("")}
              className="h-auto p-0 hover:bg-transparent self-end sm:self-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="facebook" className="w-full">
        <TabsList className="mb-6 h-auto flex-wrap">
          {platformTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-2"
            >
              <tab.icon className={cn("h-4 w-4", tab.color)} />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Facebook Tab */}
        <TabsContent value="facebook" className="space-y-6">
          <Card className={cn(
            "border-2",
            isConnected ? "border-green-200 bg-green-50/50" : "border-border"
          )}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Facebook className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{t("facebookPages")}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {isConnected && facebookStatus ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          <span>{facebookStatus.pages_count} {t("pagesConnected")}</span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 text-muted-foreground" />
                          <span>{t("notConnected")}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant={isConnected ? "default" : "secondary"}
                  className={cn(
                    "h-8 self-start sm:self-auto",
                    isConnected && "bg-green-600 hover:bg-green-700"
                  )}
                >
                  {isConnected ? t("connected") : t("notConnected")}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {isConnected && totalMessages > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <MessageSquare className="h-4 w-4" />
                    <span>{totalMessages} {t("totalMessages")}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-blue-700 hover:text-blue-800 hover:bg-blue-100 self-end sm:self-auto"
                    onClick={() => router.push('/social/messages')}
                  >
                    {t("viewMessages")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {!isConnected ? (
                  <Button
                    onClick={handleConnectFacebook}
                    disabled={loading || connectFacebook.isPending}
                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                  >
                    {loading || connectFacebook.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        {t("connecting")}
                      </>
                    ) : (
                      <>
                        <Facebook className="mr-2 h-4 w-4" />
                        {t("connectFacebookPages")}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleDisconnectFacebook}
                    disabled={loading || disconnectFacebook.isPending}
                    variant="destructive"
                    className="w-full sm:w-auto"
                  >
                    {loading || disconnectFacebook.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        {t("disconnecting")}
                      </>
                    ) : (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        {t("disconnectAllPages")}
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className={cn(
                    "mr-2 h-4 w-4",
                    loading && "animate-spin"
                  )} />
                  {t("refreshStatus")}
                </Button>
              </div>

              {/* Setup Instructions inside Facebook card */}
              {!isConnected && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4" />
                    {t("howToConnect")}
                  </h4>
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                    <li>{t("step1")}</li>
                    <li>{t("step2")}</li>
                    <li>{t("step3")}</li>
                    <li>{t("step4")}</li>
                    <li>{t("step5")}</li>
                  </ol>
                  <Alert className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{t("note")}:</strong> {t("noteAdmin")}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connected Pages List */}
          {facebookPages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("connectedFacebookPages")}</CardTitle>
                <CardDescription>
                  {facebookPages.length} {t("pagesConnectedCount")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {facebookPages.map((page, index) => (
                    <div key={page.id}>
                      {index > 0 && <Separator className="my-3" />}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                              {page.page_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{page.page_name}</p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <span>ID: {page.page_id}</span>
                              <span className="hidden sm:inline">•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDate(page.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Badge variant={page.is_active ? "default" : "secondary"} className="self-start sm:self-auto">
                          {page.is_active ? t("active") : t("inactive")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Instagram Tab */}
        <TabsContent value="instagram" className="space-y-6">
          <Card className={cn(
            "border-2",
            isInstagramConnected ? "border-pink-200 bg-pink-50/50" : "border-border"
          )}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                    <Instagram className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{t("instagramAccounts")}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {isInstagramConnected && instagramStatus ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          <span>{instagramStatus.accounts_count} {t("accountsConnected")}</span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 text-muted-foreground" />
                          <span>{t("notConnected")}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant={isInstagramConnected ? "default" : "secondary"}
                  className={cn(
                    "h-8 self-start sm:self-auto",
                    isInstagramConnected && "bg-pink-600 hover:bg-pink-700"
                  )}
                >
                  {isInstagramConnected ? t("connected") : t("notConnected")}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {isInstagramConnected && totalInstagramMessages > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-pink-50 rounded-lg border border-pink-200">
                  <div className="flex items-center gap-2 text-sm text-pink-700">
                    <MessageSquare className="h-4 w-4" />
                    <span>{totalInstagramMessages} {t("totalMessages")}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-pink-700 hover:text-pink-800 hover:bg-pink-100 self-end sm:self-auto"
                    onClick={() => router.push('/social/messages')}
                  >
                    {t("viewMessages")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {isInstagramConnected ? (
                  <Button
                    onClick={handleDisconnectInstagram}
                    disabled={instagramLoading || disconnectInstagram.isPending}
                    variant="destructive"
                    className="w-full sm:w-auto"
                  >
                    {instagramLoading || disconnectInstagram.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        {t("disconnecting")}
                      </>
                    ) : (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        {t("disconnectAllAccounts")}
                      </>
                    )}
                  </Button>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {t("instagramConnectsViaFacebook")}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Connected Instagram Accounts List */}
          {instagramAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("connectedInstagramAccounts")}</CardTitle>
                <CardDescription>
                  {instagramAccounts.length} {t("accountsConnectedCount")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {instagramAccounts.map((account: any, index: number) => (
                    <div key={account.id}>
                      {index > 0 && <Separator className="my-3" />}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={account.profile_picture_url} alt={`@${account.username}`} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 text-pink-600">
                              {account.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">@{account.username}</p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <span>ID: {account.instagram_account_id}</span>
                              <span className="hidden sm:inline">•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDate(account.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Badge variant={account.is_active ? "default" : "secondary"} className={cn("self-start sm:self-auto", account.is_active ? "bg-pink-600" : "")}>
                          {account.is_active ? t("active") : t("inactive")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp">
          <WhatsAppConnection />
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email">
          <EmailConnection />
        </TabsContent>

        {/* Website Widget Tab */}
        <TabsContent value="widget">
          <WidgetConnection />
        </TabsContent>

        {/* TikTok Tab */}
        <TabsContent value="tiktok">
          <TikTokConnection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
