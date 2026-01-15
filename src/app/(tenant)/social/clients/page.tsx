"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  UserPlus,
  Mail,
  Phone,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Link2,
  MessageSquare,
} from "lucide-react";
import {
  useSocialClients,
  useCreateSocialClient,
  useUpdateSocialClient,
  useDeleteSocialClient,
  useSocialClientCustomFields,
  type SocialClientList,
  type SocialClientCreateRequest,
} from "@/hooks/api/useSocialClients";
import LoadingSpinner from "@/components/LoadingSpinner";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Platform badge colors
const platformColors: Record<string, string> = {
  facebook: "bg-blue-600",
  instagram: "bg-pink-600",
  whatsapp: "bg-green-600",
  email: "bg-gray-600",
  tiktok: "bg-black",
};

// Platform icons
const platformLabels: Record<string, string> = {
  facebook: "FB",
  instagram: "IG",
  whatsapp: "WA",
  email: "Email",
  tiktok: "TT",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export default function SocialClientsPage() {
  const t = useTranslations("socialClients");
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<SocialClientList | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  // Fetch clients
  const { data: clientsData, isLoading } = useSocialClients({
    search: searchQuery || undefined,
    platform: platformFilter !== "all" ? platformFilter : undefined,
  });

  // Fetch custom fields for future use
  const { data: customFieldsData } = useSocialClientCustomFields({ is_active: true });

  // Mutations
  const createClient = useCreateSocialClient();
  const updateClient = useUpdateSocialClient();
  const deleteClient = useDeleteSocialClient();

  const clients = clientsData?.results || [];
  const totalCount = clientsData?.count || 0;

  // Calculate stats
  const stats = useMemo(() => {
    const platformCounts: Record<string, number> = {
      facebook: 0,
      instagram: 0,
      whatsapp: 0,
      email: 0,
      tiktok: 0,
    };
    let linkedCount = 0;

    clients.forEach((client: any) => {
      const platforms = Array.isArray(client.platforms) ? client.platforms : [];
      if (platforms.length > 0) {
        linkedCount++;
        platforms.forEach((p: string) => {
          if (platformCounts[p] !== undefined) {
            platformCounts[p]++;
          }
        });
      }
    });

    return { platformCounts, linkedCount };
  }, [clients]);

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", notes: "" });
    setEditingClient(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (client: SocialClientList) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      notes: "",
    });
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    const data: SocialClientCreateRequest = {
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    };

    try {
      if (editingClient) {
        await updateClient.mutateAsync({ id: editingClient.id, data });
        toast({
          title: "Success",
          description: "Client updated successfully",
        });
      } else {
        await createClient.mutateAsync(data);
        toast({
          title: "Success",
          description: "Client created successfully",
        });
      }
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save client",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (client: SocialClientList) => {
    if (!confirm(`Are you sure you want to delete "${client.name}"?`)) return;

    try {
      await deleteClient.mutateAsync(client.id);
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete client",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t("createClient")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? t("editClient") : t("createClient")}
              </DialogTitle>
              <DialogDescription>
                {editingClient ? t("editClientDescription") : t("createClientDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {t("form.cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createClient.isPending || updateClient.isPending}
              >
                {createClient.isPending || updateClient.isPending
                  ? t("form.saving")
                  : editingClient
                  ? t("form.save")
                  : t("form.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.total")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.linked")}</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.linkedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.whatsapp")}</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.platformCounts.whatsapp}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.facebook")}</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.platformCounts.facebook}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-4 py-2 border rounded-md bg-background"
            >
              <option value="all">{t("filters.allPlatforms")}</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.client")}</TableHead>
                <TableHead>{t("table.email")}</TableHead>
                <TableHead>{t("table.phone")}</TableHead>
                <TableHead>{t("table.platforms")}</TableHead>
                <TableHead>{t("table.linkedAccounts")}</TableHead>
                <TableHead>{t("table.created")}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t("noClients")}
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client: any) => {
                  const platforms = Array.isArray(client.platforms) ? client.platforms : [];
                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {client.profile_picture && (
                              <AvatarImage src={client.profile_picture} alt={client.name} />
                            )}
                            <AvatarFallback className="text-xs">
                              {getInitials(client.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{client.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{client.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{client.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {platforms.length > 0 ? (
                            platforms.map((platform: string) => (
                              <Badge
                                key={platform}
                                variant="secondary"
                                className={`${platformColors[platform]} text-white text-xs`}
                              >
                                {platformLabels[platform] || platform}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{client.social_accounts_count || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {format(new Date(client.created_at), "MMM dd, yyyy")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(client)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("actions.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(client)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("actions.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
