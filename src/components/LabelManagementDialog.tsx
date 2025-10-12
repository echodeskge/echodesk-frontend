"use client";

import { useState } from "react";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "@/hooks/useTags";
import type { Tag } from "@/api/generated";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#F59E0B", // amber
  "#EAB308", // yellow
  "#84CC16", // lime
  "#22C55E", // green
  "#10B981", // emerald
  "#14B8A6", // teal
  "#06B6D4", // cyan
  "#0EA5E9", // sky
  "#3B82F6", // blue
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#A855F7", // purple
  "#D946EF", // fuchsia
  "#EC4899", // pink
  "#6B7280", // gray
];

interface LabelFormData {
  name: string;
  color: string;
  description: string;
}

export function LabelManagementDialog() {
  const { data: tagsData, isLoading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [isOpen, setIsOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState<LabelFormData>({
    name: "",
    color: DEFAULT_COLORS[0],
    description: "",
  });

  const tags = tagsData?.results || [];

  const resetForm = () => {
    setFormData({
      name: "",
      color: DEFAULT_COLORS[0],
      description: "",
    });
    setEditingTag(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    try {
      if (editingTag) {
        await updateTag.mutateAsync({
          id: editingTag.id,
          data: {
            name: formData.name,
            color: formData.color,
            description: formData.description,
          },
        });
      } else {
        await createTag.mutateAsync({
          name: formData.name,
          color: formData.color,
          description: formData.description,
        } as any);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving label:", error);
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color || DEFAULT_COLORS[0],
      description: tag.description || "",
    });
  };

  const handleDelete = async (tagId: number) => {
    if (confirm("Are you sure you want to delete this label?")) {
      try {
        await deleteTag.mutateAsync(tagId);
      } catch (error) {
        console.error("Error deleting label:", error);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Manage Labels
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Manage Labels</DialogTitle>
          <DialogDescription>
            Create, edit, and organize labels for your tickets
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-6 p-6 pt-4">
          {/* Form Section */}
          <div className="flex-1">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Label Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Bug, Feature, Priority"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-9 gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded border-2 transition-all hover:scale-110",
                        formData.color === color
                          ? "border-foreground ring-2 ring-offset-2 ring-foreground"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    placeholder="#RRGGBB"
                    className="flex-1 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What does this label represent?"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="resize-none min-h-[60px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Preview</Label>
                <Badge
                  style={{
                    backgroundColor: formData.color,
                    color: "#ffffff",
                  }}
                  className="text-sm px-3 py-1"
                >
                  {formData.name || "Label Name"}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={
                    createTag.isPending || updateTag.isPending || !formData.name.trim()
                  }
                  className="flex-1"
                >
                  {createTag.isPending || updateTag.isPending ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      {editingTag ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {editingTag ? "Update Label" : "Create Label"}
                    </>
                  )}
                </Button>
                {editingTag && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Labels List Section */}
          <div className="flex-1 border-l pl-6">
            <div className="space-y-2">
              <Label>Existing Labels ({tags.length})</Label>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : tags.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No labels yet. Create your first label!
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {tags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <Badge
                            style={{
                              backgroundColor: tag.color || "#6B7280",
                              color: "#ffffff",
                            }}
                            className="text-xs px-2 py-1"
                          >
                            {tag.name}
                          </Badge>
                          {tag.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {tag.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(tag)}
                            disabled={deleteTag.isPending}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(tag.id)}
                            disabled={deleteTag.isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
