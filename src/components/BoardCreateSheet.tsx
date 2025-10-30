"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';
import { apiBoardsCreate } from "@/api/generated/api";
import type { Board } from "@/api/generated/interfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";

interface BoardCreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onBoardCreated?: (board: Board) => void;
}

export function BoardCreateSheet({ isOpen, onClose, onBoardCreated }: BoardCreateSheetProps) {
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_default: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Board name is required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const newBoard = await apiBoardsCreate({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        is_default: formData.is_default,
      } as any);

      // Invalidate boards query to refetch data
      queryClient.invalidateQueries({ queryKey: ["boards"] });

      // Reset form
      setFormData({
        name: "",
        description: "",
        is_default: false,
      });

      // Call the callback if provided
      onBoardCreated?.(newBoard);

      // Close the sheet
      onClose();
    } catch (err: any) {
      console.error("Failed to create board:", err);
      setError("Failed to create board. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      description: "",
      is_default: false,
    });
    setError("");
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="p-0 w-full sm:max-w-lg" side="right">
        <ScrollArea className="h-full p-6">
          <SheetHeader>
            <SheetTitle>Create New Board</SheetTitle>
            <SheetDescription>
              Create a new board to organize your tickets
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 mt-6">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="board-name">Board Name *</Label>
              <Input
                id="board-name"
                placeholder="e.g., Customer Support, Development"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="board-description">Description (Optional)</Label>
              <Textarea
                id="board-description"
                placeholder="Describe what this board is for..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="is-default" className="text-base cursor-pointer">
                  Set as default board
                </Label>
                <div className="text-sm text-muted-foreground">
                  Users will see this board first when they visit tickets
                </div>
              </div>
              <Switch
                id="is-default"
                checked={formData.is_default}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_default: checked })
                }
                disabled={loading}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={loading}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || !formData.name.trim()}
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {tCommon('create')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
