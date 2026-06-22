"use client";

import { useState, useMemo } from "react";
import {
  MessageSquareText,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Zap,
  ArrowLeft,
} from "lucide-react";
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

const UNCATEGORIZED = "__uncategorized__";

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
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: quickReplies, isLoading } = useQuickReplies({ platform });
  const deleteQuickReply = useDeleteQuickReply();

  const isEditing = isCreating || editingReply !== null;

  // Filter by search query
  const filteredReplies = useMemo(() => {
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

  // Group by category (uncategorized last), preserving server ordering within a group.
  const groups = useMemo(() => {
    const map = new Map<string, QuickReply[]>();
    for (const reply of filteredReplies) {
      const key = reply.category?.trim() || UNCATEGORIZED;
      const list = map.get(key);
      if (list) list.push(reply);
      else map.set(key, [reply]);
    }
    const named = [...map.entries()].filter(([k]) => k !== UNCATEGORIZED);
    const uncategorized = map.get(UNCATEGORIZED);
    if (uncategorized) named.push([UNCATEGORIZED, uncategorized]);
    return named;
  }, [filteredReplies]);

  // Replace variables in message
  const processMessage = (message: string): string => {
    let processed = message;
    if (customerName) processed = processed.replace(/\{\{customer_name\}\}/g, customerName);
    if (agentName) processed = processed.replace(/\{\{agent_name\}\}/g, agentName);
    if (companyName) processed = processed.replace(/\{\{company_name\}\}/g, companyName);
    processed = processed.replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString());
    processed = processed.replace(
      /\{\{current_time\}\}/g,
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
    return processed;
  };

  const handleSelect = (reply: QuickReply) => {
    onSelect(processMessage(reply.message));
    setOpen(false);
    setSearchQuery("");
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteQuickReply.mutate(id, {
      onSuccess: () =>
        toast({ title: "Quick reply deleted", description: "The quick reply has been removed." }),
      onError: () =>
        toast({
          title: "Error",
          description: "Failed to delete quick reply.",
          variant: "destructive",
        }),
    });
  };

  const handleEdit = (e: React.MouseEvent, reply: QuickReply) => {
    e.stopPropagation();
    setEditingReply(reply);
  };

  const handleFormSuccess = () => {
    setEditingReply(null);
    setIsCreating(false);
  };

  const closeForm = () => {
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

  const renderRow = (reply: QuickReply) => (
    <div
      key={reply.id}
      role="button"
      tabIndex={0}
      onClick={() => handleSelect(reply)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelect(reply);
        }
      }}
      className="group relative flex w-full cursor-pointer items-start gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{reply.title}</span>
          {reply.shortcut && (
            <Badge variant="secondary" className="text-xs">
              /{reply.shortcut}
            </Badge>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{reply.message}</p>
        {reply.platforms.length > 0 && reply.platforms[0] !== "all" && (
          <div className="mt-2 flex flex-wrap gap-1">
            {reply.platforms.map((p) => (
              <Badge key={p} variant="secondary" className={`text-xs ${getPlatformBadgeColor(p)}`}>
                {p}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Inline actions — revealed on hover/focus (always visible on touch). */}
      <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={`Edit ${reply.title}`}
          onClick={(e) => handleEdit(e, reply)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          aria-label={`Delete ${reply.title}`}
          disabled={deleteQuickReply.isPending}
          onClick={(e) => handleDelete(e, reply.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) closeForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" title="Quick Replies">
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
            {isEditing
              ? editingReply
                ? "Edit this shared template."
                : "Create a new shared template."
              : "Shared team templates — click one to insert it into your reply."}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1 px-2" onClick={closeForm}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <QuickReplyForm
              editingReply={editingReply}
              onSuccess={handleFormSuccess}
              onCancel={closeForm}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Toolbar: search + New */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search quick replies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setIsCreating(true)} className="flex-shrink-0 gap-1">
                <Plus className="h-4 w-4" />
                New
              </Button>
            </div>

            {/* List */}
            <ScrollArea className="h-[340px] pr-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredReplies.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <MessageSquareText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "No quick replies match your search."
                      : "No quick replies yet."}
                  </p>
                  {!searchQuery && (
                    <Button variant="outline" size="sm" onClick={() => setIsCreating(true)}>
                      <Plus className="mr-1 h-4 w-4" />
                      Create your first one
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {groups.map(([category, replies]) => (
                    <div key={category} className="space-y-2">
                      {category !== UNCATEGORIZED && (
                        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {category}
                        </p>
                      )}
                      <div className="space-y-2">{replies.map(renderRow)}</div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
