"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Mail,
  Phone,
  Pencil,
  X,
  Save,
  Link2,
  Unlink,
  Search,
  Plus,
  UserPlus,
} from "lucide-react";
import {
  useSocialClient,
  useSocialClientByAccount,
  useSocialClients,
  useCreateSocialClient,
  useUpdateSocialClient,
  useLinkSocialAccount,
  useUnlinkSocialAccount,
  type LinkAccountData,
} from "@/hooks/api/useSocialClients";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Platform badge colors
const platformColors: Record<string, string> = {
  facebook: "bg-blue-600",
  instagram: "bg-pink-600",
  whatsapp: "bg-green-600",
  email: "bg-gray-600",
  tiktok: "bg-black",
};

const platformLabels: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  email: "Email",
  tiktok: "TikTok",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type PanelMode = "view" | "search" | "create" | "edit";

interface ClientDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  platform: string;
  platformId: string;
  accountConnectionId: string;
  chatDisplayName?: string;
  chatProfilePic?: string;
  // Additional metadata from the chat
  chatEmail?: string;
  chatPhone?: string;
}

// Extract platform-specific data for auto-fill
function extractPlatformData(platform: string, platformId: string, props: ClientDetailPanelProps) {
  const data: { phone?: string; email?: string } = {};

  // For WhatsApp, platformId is the phone number
  if (platform === 'whatsapp' && platformId) {
    // WhatsApp numbers are like: 995555123456
    data.phone = platformId.startsWith('+') ? platformId : `+${platformId}`;
  }

  // For email platform, platformId is now the sender's email address
  // This ensures all emails from the same sender are linked to the same client
  if (platform === 'email' && platformId && platformId.includes('@')) {
    data.email = platformId;
  }

  // Override with explicit props if provided
  if (props.chatPhone) {
    data.phone = props.chatPhone;
  }
  if (props.chatEmail) {
    data.email = props.chatEmail;
  }

  return data;
}

export function ClientDetailPanel(props: ClientDetailPanelProps) {
  const {
    isOpen,
    onClose,
    platform,
    platformId,
    accountConnectionId,
    chatDisplayName,
    chatProfilePic,
    chatEmail,
    chatPhone,
  } = props;

  const t = useTranslations("socialClients");
  const { toast } = useToast();
  const [mode, setMode] = useState<PanelMode>("view");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  // Extract platform-specific data for auto-fill
  const platformData = extractPlatformData(platform, platformId, props);

  // Query to find existing client by account
  const { data: clientByAccount, isLoading: isLookupLoading, refetch: refetchClientByAccount } = useSocialClientByAccount(
    platform,
    platformId,
    accountConnectionId,
    { enabled: isOpen && !!platform && !!platformId && !!accountConnectionId }
  );

  // Get full client details if found
  const { data: clientDetails, isLoading: isClientLoading } = useSocialClient(
    clientByAccount?.client?.id || 0,
    { enabled: !!clientByAccount?.client?.id }
  );

  // Search clients for linking
  const { data: searchResults, isLoading: isSearching } = useSocialClients({
    search: searchQuery || undefined,
  });

  // Mutations
  const createClient = useCreateSocialClient();
  const updateClient = useUpdateSocialClient();
  const linkAccount = useLinkSocialAccount();
  const unlinkAccount = useUnlinkSocialAccount();

  const client = clientDetails || clientByAccount?.client;
  const isLoading = isLookupLoading || isClientLoading;
  const hasClient = !!client;

  // Reset mode when panel opens/closes
  const handlePanelOpenChange = (open: boolean) => {
    if (!open) {
      setMode("view");
      setSearchQuery("");
      setFormData({ name: "", email: "", phone: "", notes: "" });
      onClose();
    }
  };

  const handleStartCreate = () => {
    setFormData({
      name: chatDisplayName || "",
      email: platformData.email || chatEmail || "",
      phone: platformData.phone || chatPhone || "",
      notes: "",
    });
    setMode("create");
  };

  const handleStartEdit = () => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email || "",
        phone: client.phone || "",
        notes: "",
      });
      setMode("edit");
    }
  };

  const handleStartSearch = () => {
    setSearchQuery("");
    setMode("search");
  };

  const handleCancel = () => {
    setMode(hasClient ? "view" : "view");
    setSearchQuery("");
    setFormData({ name: "", email: "", phone: "", notes: "" });
  };

  const getLinkData = (): LinkAccountData => ({
    platform: platform as any,
    platform_id: platformId,
    account_connection_id: accountConnectionId,
    display_name: chatDisplayName,
    profile_pic_url: chatProfilePic,
  });

  const handleLinkExistingClient = async (clientId: number) => {
    try {
      await linkAccount.mutateAsync({
        clientId,
        data: getLinkData(),
      });

      toast({
        title: "Success",
        description: "Client linked successfully",
      });
      setMode("view");
      setSearchQuery("");
      // Refetch to show the linked client
      refetchClientByAccount();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to link client",
        variant: "destructive",
      });
    }
  };

  const handleSaveCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create the client - the response includes id even though types say otherwise
      const newClient = await createClient.mutateAsync({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      // Link the social account - cast to any to access id
      await linkAccount.mutateAsync({
        clientId: (newClient as any).id,
        data: getLinkData(),
      });

      toast({
        title: "Success",
        description: "Client created and linked successfully",
      });
      setMode("view");
      setFormData({ name: "", email: "", phone: "", notes: "" });
      // Refetch to show the linked client
      refetchClientByAccount();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create client",
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!client || !formData.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateClient.mutateAsync({
        id: client.id,
        data: {
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        },
      });

      toast({
        title: "Success",
        description: "Client updated successfully",
      });
      setMode("view");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to update client",
        variant: "destructive",
      });
    }
  };

  const handleUnlink = async () => {
    if (!client) return;

    try {
      await unlinkAccount.mutateAsync({
        clientId: client.id,
        data: getLinkData(),
      });

      toast({
        title: "Success",
        description: "Client unlinked from this conversation",
      });
      // Refetch to clear the client
      refetchClientByAccount();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to unlink client",
        variant: "destructive",
      });
    }
  };

  const isSaving = createClient.isPending || updateClient.isPending || linkAccount.isPending || unlinkAccount.isPending;

  // Filter out already found client from search results
  const filteredSearchResults = useMemo(() => {
    if (!searchResults?.results) return [];
    return searchResults.results.filter((c: any) => c.id !== client?.id);
  }, [searchResults?.results, client?.id]);

  return (
    <Sheet open={isOpen} onOpenChange={handlePanelOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[450px] p-6">
        <SheetHeader>
          <SheetTitle>
            {mode === "search" ? t("linkExistingClient") || "Link Existing Client" :
             mode === "create" ? t("createClient") :
             mode === "edit" ? t("editClient") :
             hasClient ? t("clientDetails") : t("createClient")}
          </SheetTitle>
          <SheetDescription>
            {mode === "search" ? t("searchAndLinkDescription") || "Search for a client to link to this conversation" :
             mode === "create" ? t("createClientFromChat") :
             mode === "edit" ? t("editClientDescription") :
             hasClient ? t("clientDetailsDescription") : t("noClientLinkedDescription")}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : mode === "search" ? (
          // Search for existing clients
          <div className="mt-6 space-y-4">
            <Command className="rounded-lg border">
              <CommandInput
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {isSearching ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : filteredSearchResults.length === 0 ? (
                  <CommandEmpty>
                    <p className="text-sm text-muted-foreground py-2">
                      {searchQuery ? "No clients found" : "Type to search..."}
                    </p>
                  </CommandEmpty>
                ) : (
                  <CommandGroup heading="Clients">
                    {filteredSearchResults.map((c: any) => (
                      <CommandItem
                        key={c.id}
                        onSelect={() => handleLinkExistingClient(c.id)}
                        className="cursor-pointer"
                      >
                        <Avatar className="h-8 w-8 mr-3">
                          {c.profile_picture && (
                            <AvatarImage src={c.profile_picture} alt={c.name} />
                          )}
                          <AvatarFallback className="text-xs">
                            {getInitials(c.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{c.name}</p>
                          {c.email && (
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          )}
                        </div>
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                <X className="h-4 w-4 mr-2" />
                {t("form.cancel")}
              </Button>
              <Button onClick={handleStartCreate} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                {t("createNew") || "Create New"}
              </Button>
            </div>
          </div>
        ) : mode === "create" || mode === "edit" ? (
          // Create/Edit Form
          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("form.name")} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("form.namePlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t("form.email")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t("form.emailPlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">{t("form.phone")}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t("form.phonePlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">{t("form.notes")}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t("form.notesPlaceholder")}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                {t("form.cancel")}
              </Button>
              <Button
                onClick={mode === "create" ? handleSaveCreate : handleSaveEdit}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? t("form.saving") : t("form.save")}
              </Button>
            </div>
          </div>
        ) : hasClient && client ? (
          // Client Details View
          <div className="mt-6 space-y-6">
            {/* Client Header */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {client.profile_picture && (
                  <AvatarImage src={client.profile_picture} alt={client.name} />
                )}
                <AvatarFallback className="text-lg">
                  {getInitials(client.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{client.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("createdAt")}: {format(new Date(client.created_at), "MMM dd, yyyy")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handleStartEdit}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleUnlink}
                  disabled={isSaving}
                  className="text-destructive hover:text-destructive"
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.phone}</span>
                </div>
              )}
            </div>

            {/* Linked Accounts */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">{t("linkedAccounts")}</h4>
              </div>
              <div className="space-y-2">
                {(client as any).social_accounts?.length > 0 ? (
                  (client as any).social_accounts.map((account: any) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                    >
                      <Badge
                        variant="secondary"
                        className={`${platformColors[account.platform]} text-white text-xs`}
                      >
                        {platformLabels[account.platform] || account.platform}
                      </Badge>
                      <span className="text-sm truncate flex-1">
                        {account.display_name || account.platform_id}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t("noLinkedAccounts")}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            {client.notes && (
              <div className="space-y-2">
                <h4 className="font-medium">{t("form.notes")}</h4>
                <p className="text-sm text-muted-foreground">{client.notes}</p>
              </div>
            )}
          </div>
        ) : (
          // No Client - Options to create or search
          <div className="mt-6 space-y-6">
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Avatar className="h-12 w-12">
                  {chatProfilePic && <AvatarImage src={chatProfilePic} alt="" />}
                  <AvatarFallback>
                    {chatDisplayName ? getInitials(chatDisplayName) : "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <h3 className="text-lg font-medium mb-2">{t("noClientLinked")}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("noClientLinkedDescription")}
              </p>
              <Badge
                variant="secondary"
                className={`${platformColors[platform]} text-white mb-4`}
              >
                {platformLabels[platform] || platform}
              </Badge>
              <p className="text-sm font-medium">{chatDisplayName || platformId}</p>
            </div>
            <div className="space-y-2">
              <Button className="w-full" onClick={handleStartSearch}>
                <Search className="h-4 w-4 mr-2" />
                {t("linkExistingClient") || "Link Existing Client"}
              </Button>
              <Button variant="outline" className="w-full" onClick={handleStartCreate}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("createClientForChat")}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
