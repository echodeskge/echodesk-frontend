"use client";

import { useState, useEffect } from "react";
import { Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateQuickReply,
  useUpdateQuickReply,
  useQuickReplyVariables,
  QuickReply,
  QuickReplyPlatform,
} from "@/hooks/api/useSocial";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuickReplyFormProps {
  editingReply: QuickReply | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const PLATFORMS: { value: QuickReplyPlatform; label: string }[] = [
  { value: "all", label: "All Platforms" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "tiktok", label: "TikTok" },
];

export function QuickReplyForm({ editingReply, onSuccess, onCancel }: QuickReplyFormProps) {
  const { toast } = useToast();
  const createQuickReply = useCreateQuickReply();
  const updateQuickReply = useUpdateQuickReply();
  const { data: variables } = useQuickReplyVariables();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [category, setCategory] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<QuickReplyPlatform[]>(["all"]);

  // Populate form when editing
  useEffect(() => {
    if (editingReply) {
      setTitle(editingReply.title);
      setMessage(editingReply.message);
      setShortcut(editingReply.shortcut || "");
      setCategory(editingReply.category || "");
      setSelectedPlatforms(editingReply.platforms.length > 0 ? editingReply.platforms : ["all"]);
    } else {
      setTitle("");
      setMessage("");
      setShortcut("");
      setCategory("");
      setSelectedPlatforms(["all"]);
    }
  }, [editingReply]);

  const handlePlatformToggle = (platform: QuickReplyPlatform) => {
    if (platform === "all") {
      setSelectedPlatforms(["all"]);
    } else {
      setSelectedPlatforms((prev) => {
        const withoutAll = prev.filter((p) => p !== "all");
        if (withoutAll.includes(platform)) {
          const remaining = withoutAll.filter((p) => p !== platform);
          return remaining.length === 0 ? ["all"] : remaining;
        } else {
          return [...withoutAll, platform];
        }
      });
    }
  };

  const insertVariable = (varName: string) => {
    setMessage((prev) => prev + `{{${varName}}}`);
  };

  const handleSubmit = () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Validation error",
        description: "Title and message are required.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      title: title.trim(),
      message: message.trim(),
      shortcut: shortcut.trim(),
      category: category.trim(),
      platforms: selectedPlatforms,
      position: 0,
    };

    if (editingReply) {
      updateQuickReply.mutate(
        { id: editingReply.id, data },
        {
          onSuccess: () => {
            toast({
              title: "Quick reply updated",
              description: "Your changes have been saved.",
            });
            onSuccess();
          },
          onError: () => {
            toast({
              title: "Error",
              description: "Failed to update quick reply.",
              variant: "destructive",
            });
          },
        }
      );
    } else {
      createQuickReply.mutate(data, {
        onSuccess: () => {
          toast({
            title: "Quick reply created",
            description: "Your new quick reply is ready to use.",
          });
          onSuccess();
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to create quick reply.",
            variant: "destructive",
          });
        },
      });
    }
  };

  const isPending = createQuickReply.isPending || updateQuickReply.isPending;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          placeholder="e.g., Greeting, Thank you, Order status"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="message">Message *</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="font-medium mb-1">Available variables:</p>
                <ul className="text-xs space-y-1">
                  {variables?.map((v) => (
                    <li key={v.name}>
                      <code className="bg-muted px-1 rounded">{`{{${v.name}}}`}</code> - {v.description}
                    </li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Textarea
          id="message"
          placeholder="Hi {{customer_name}}, thank you for reaching out!"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[100px]"
        />
        {/* Variable buttons */}
        <div className="flex flex-wrap gap-1">
          {variables?.map((v) => (
            <Button
              key={v.name}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={() => insertVariable(v.name)}
            >
              {`{{${v.name}}}`}
            </Button>
          ))}
        </div>
      </div>

      {/* Shortcut */}
      <div className="space-y-2">
        <Label htmlFor="shortcut">Shortcut (optional)</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">/</span>
          <Input
            id="shortcut"
            placeholder="thanks"
            value={shortcut}
            onChange={(e) => setShortcut(e.target.value.replace(/\s/g, "").toLowerCase())}
            className="flex-1"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Type /{shortcut || "shortcut"} in the message box to quickly insert this reply
        </p>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category (optional)</Label>
        <Input
          id="category"
          placeholder="e.g., Greetings, Support, Sales"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>

      {/* Platforms */}
      <div className="space-y-2">
        <Label>Platforms</Label>
        <div className="flex flex-wrap gap-3">
          {PLATFORMS.map((platform) => (
            <label
              key={platform.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={selectedPlatforms.includes(platform.value)}
                onCheckedChange={() => handlePlatformToggle(platform.value)}
              />
              <span className="text-sm">{platform.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editingReply ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}
