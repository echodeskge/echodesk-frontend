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
} from "@/hooks/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Facebook,
  RefreshCw,
  Check,
  X,
  MessageSquare,
  Clock,
  AlertCircle,
  Info,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

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

interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

export default function SocialIntegrations({ onBackToDashboard, onConnectionChange }: SocialIntegrationsProps) {
  const t = useTranslations("social");
  const tCommon = useTranslations("common");
  const [error, setError] = useState("");
  const router = useRouter();

  // React Query hooks
  const { data: facebookStatusData, isLoading: statusLoading, refetch: refetchStatus } = useFacebookStatus();
  const { data: facebookPagesData, isLoading: pagesLoading, refetch: refetchPages } = useFacebookPages();
  const { data: messagesData, refetch: refetchMessages } = useFacebookMessages({ page: 1 });
  const connectFacebook = useConnectFacebook();
  const disconnectFacebook = useDisconnectFacebook();

  const handleRefresh = async () => {
    await Promise.all([refetchStatus(), refetchPages(), refetchMessages()]);
  };

  const facebookStatus = facebookStatusData as FacebookStatus | null;
  const facebookPages = (facebookPagesData as PaginatedResponse<FacebookPageConnection>)?.results || [];
  const recentMessages = (messagesData as PaginatedResponse<FacebookMessage>)?.results?.slice(0, 5) || [];
  const totalMessages = (messagesData as PaginatedResponse<FacebookMessage>)?.count || 0;
  const loading = statusLoading || pagesLoading;
  const isConnected = facebookStatus?.connected || false;

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Facebook className="h-8 w-8 text-blue-600" />
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
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError("")}
              className="h-auto p-0 hover:bg-transparent"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Connection Status Card */}
        <Card className={cn(
          "border-2",
          isConnected ? "border-green-200 bg-green-50/50" : "border-border"
        )}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Facebook className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl">{t("facebookPages")}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    {isConnected ? (
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
                  "h-8",
                  isConnected && "bg-green-600 hover:bg-green-700"
                )}
              >
                {isConnected ? "Connected" : "Not Connected"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {isConnected && totalMessages > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <MessageSquare className="h-4 w-4" />
                  <span>{totalMessages} {t("totalMessages")}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-blue-700 hover:text-blue-800 hover:bg-blue-100"
                  onClick={() => router.push('/social/messages')}
                >
                  View Messages
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              {!isConnected ? (
                <Button
                  onClick={handleConnectFacebook}
                  disabled={loading || connectFacebook.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
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
              >
                <RefreshCw className={cn(
                  "mr-2 h-4 w-4",
                  loading && "animate-spin"
                )} />
                {t("refreshStatus")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Connected Pages List */}
        {facebookPages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("connectedFacebookPages")}</CardTitle>
              <CardDescription>
                {facebookPages.length} page{facebookPages.length !== 1 ? 's' : ''} connected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {facebookPages.map((page, index) => (
                  <div key={page.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {page.page_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{page.page_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>ID: {page.page_id}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(page.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={page.is_active ? "default" : "secondary"}>
                        {page.is_active ? t("active") : t("inactive")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Messages */}
        {recentMessages.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {t("recentMessages")}
                  </CardTitle>
                  <CardDescription>
                    Last {recentMessages.length} messages from all connected pages
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push('/social/messages')}
                >
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMessages.map((message, index) => (
                  <div key={message.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={message.profile_pic_url} alt={message.sender_name || "User"} />
                        <AvatarFallback>
                          {(message.sender_name || "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{message.sender_name || "Unknown User"}</span>
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {message.page_name}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {message.message_text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Instructions */}
        {!isConnected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t("howToConnect")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>{t("step1")}</li>
                <li>{t("step2")}</li>
                <li>{t("step3")}</li>
                <li>{t("step4")}</li>
                <li>{t("step5")}</li>
              </ol>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{tCommon("note")}:</strong> {t("noteAdmin")}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
