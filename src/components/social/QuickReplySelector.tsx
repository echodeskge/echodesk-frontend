"use client";

import { useState, useMemo } from "react";
import { MessageSquareText, Plus, Search, Pencil, Trash2, Loader2, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useQuickReplies,
  useDeleteQuickReply,
  QuickReply,
  QuickReplyPlatform,
} from "@/hooks/api/useSocial";
import { QuickReplyForm } from "./QuickReplyForm";

interface QuickReplySelectorProps {
  platform: QuickReplyPlatform;
  onSelect: (message: string) => void;
  customerName?: string;
  agentName?: string;
  companyName?: string;
}

export function QuickReplySelector({
  platform,
  onSelect,
  customerName,
  agentName,
  companyName,
}: QuickReplySelectorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"select" | "manage">("select");
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch quick replies filtered by platform
  const { data: quickReplies, isLoading } = useQuickReplies({ platform });
  const deleteQuickReply = useDeleteQuickReply();

  // Filter by search query
  const filteredReplies = useMemo(() => {
    // Ensure we always work with an array
    const replies = Array.isArray(quickReplies) ? quickReplies : [];
    if (!searchQuery.trim()) return replies;

    const query = searchQuery.toLowerCase();
    return replies.filter(
      (reply) =>
        reply.title.toLowerCase().includes(query) ||
        reply.message.toLowerCase().includes(query) ||
        reply.shortcut?.toLowerCase().includes(query)
    );
  }, [quickReplies, searchQuery]);

  // Replace variables in message
  const processMessage = (message: string): string => {
    let processed = message;
    if (customerName) processed = processed.replace(/\{\{customer_name\}\}/g, customerName);
    if (agentName) processed = processed.replace(/\{\{agent_name\}\}/g, agentName);
    if (companyName) processed = processed.replace(/\{\{company_name\}\}/g, companyName);
    processed = processed.replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString());
    processed = processed.replace(/\{\{current_time\}\}/g, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    return processed;
  };

  const handleSelect = (reply: QuickReply) => {
    const processedMessage = processMessage(reply.message);
    onSelect(processedMessage);
    setOpen(false);
    setSearchQuery("");
  };

  const handleDelete = (id: number) => {
    deleteQuickReply.mutate(id, {
      onSuccess: () => {
        toast({
          title: "Quick reply deleted",
          description: "The quick reply has been removed.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to delete quick reply.",
          variant: "destructive",
        });
      },
    });
  };

  const handleFormSuccess = () => {
    setEditingReply(null);
    setIsCreating(false);
  };

  const getPlatformBadgeColor = (p: QuickReplyPlatform) => {
    switch (p) {
      case "facebook":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "instagram":
        return "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300";
      case "whatsapp":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "email":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      case "tiktok":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Quick Replies">
          <Zap className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5" />
            Quick Replies
          </DialogTitle>
          <DialogDescription>
            Select a quick reply or manage your templates
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as "select" | "manage")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select">Select</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quick replies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Quick Reply List */}
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredReplies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No quick replies found" : "No quick replies yet"}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredReplies.map((reply) => (
                    <button
                      key={reply.id}
                      onClick={() => handleSelect(reply)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{reply.title}</span>
                            {reply.shortcut && (
                              <Badge variant="secondary" className="text-xs">
                                /{reply.shortcut}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {reply.message}
                          </p>
                        </div>
                        {reply.category && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {reply.category}
                          </Badge>
                        )}
                      </div>
                      {reply.platforms.length > 0 && reply.platforms[0] !== "all" && (
                        <div className="flex gap-1 mt-2">
                          {reply.platforms.map((p) => (
                            <Badge
                              key={p}
                              className={`text-xs ${getPlatformBadgeColor(p)}`}
                              variant="secondary"
                            >
                              {p}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            {isCreating || editingReply ? (
              <QuickReplyForm
                editingReply={editingReply}
                onSuccess={handleFormSuccess}
                onCancel={() => {
                  setEditingReply(null);
                  setIsCreating(false);
                }}
              />
            ) : (
              <>
                {/* Add New Button */}
                <Button
                  onClick={() => setIsCreating(true)}
                  className="w-full"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Quick Reply
                </Button>

                {/* Quick Reply List for Management */}
                <ScrollArea className="h-[280px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredReplies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No quick replies yet. Create your first one!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredReplies.map((reply) => (
                        <div
                          key={reply.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{reply.title}</span>
                              {reply.shortcut && (
                                <Badge variant="secondary" className="text-xs">
                                  /{reply.shortcut}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {reply.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingReply(reply)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(reply.id)}
                              disabled={deleteQuickReply.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
