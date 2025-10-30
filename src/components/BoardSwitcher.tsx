"use client";

import { useState } from "react";
import { apiBoardsDestroy } from "@/api/generated/api";
import type { Board, User } from "@/api/generated/interfaces";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ChevronDown, Plus, Settings, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface BoardSwitcherProps {
  selectedBoardId: number | null;
  boards?: Board[]; // Add boards as optional prop
  userProfile?: User | null; // Add user profile to check permissions
  onBoardChange: (boardId: number) => void;
  onCreateBoard?: () => void;
  onEditBoardStatuses?: (boardId: number) => void;
  onManageBoardUsers?: (boardId: number) => void;
}

export default function BoardSwitcher({
  selectedBoardId,
  boards: propsBoards,
  userProfile,
  onBoardChange,
  onCreateBoard,
  onEditBoardStatuses,
  onManageBoardUsers,
}: BoardSwitcherProps) {
  // Use boards from props if available, otherwise fallback to empty array
  const boards = propsBoards || [];
  const loading = !propsBoards;
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const selectedBoard = boards.find(board => board.id === selectedBoardId);
  const isStaff = userProfile?.is_staff || false;

  const handleDeleteBoard = async () => {
    if (!boardToDelete) return;

    setDeleting(true);
    try {
      await apiBoardsDestroy(boardToDelete.id);

      // Invalidate boards query to refetch
      queryClient.invalidateQueries({ queryKey: ['boards'] });

      // If deleted board was selected, switch to first available board
      if (selectedBoardId === boardToDelete.id && boards.length > 1) {
        const nextBoard = boards.find(b => b.id !== boardToDelete.id);
        if (nextBoard) {
          onBoardChange(nextBoard.id);
        }
      }

      toast.success('Board deleted successfully!');
      setDeleteDialogOpen(false);
      setBoardToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete board:', error);
      toast.error(error?.response?.data?.detail || 'Failed to delete board');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 min-w-[200px]">
        <Spinner className="h-4 w-4" />
        <span className="text-sm text-muted-foreground">Loading boards...</span>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full max-w-xs justify-between h-auto py-2">
          <div className="flex items-center gap-2">
            {boards.length > 0 && (
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: selectedBoard?.is_default ? "#007bff" : "#28a745"
                }}
              />
            )}
            <span className="text-sm">
              {boards.length === 0 ? "No boards - Create one" : (selectedBoard?.name || "Select Board")}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-96 bg-white border border-gray-200 shadow-lg" style={{ backgroundColor: 'white' }}>
        <DropdownMenuLabel>Boards</DropdownMenuLabel>

        {boards.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            <p className="mb-2">No boards available</p>
            <p className="text-xs">Click "Create New Board" below to get started</p>
          </div>
        )}

        {boards.map((board) => (
          <DropdownMenuItem
            key={board.id}
            className="cursor-pointer p-4 focus:bg-accent hover:bg-gray-100"
            onClick={() => onBoardChange(board.id)}
          >
            <div className="flex items-start gap-3 w-full">
              <div
                className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                style={{
                  backgroundColor: board.is_default ? "#007bff" : "#28a745"
                }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{board.name}</span>
                  {selectedBoardId === board.id && (
                    <Badge variant="secondary" className="text-xs">
                      Current
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {board.columns_count} cols
                  </Badge>
                </div>

                {board.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {board.description}
                  </p>
                )}

                {isStaff && (
                  <div className="flex gap-1 mt-2">
                    {onEditBoardStatuses && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(false);
                          onEditBoardStatuses(board.id);
                        }}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}

                    {onManageBoardUsers && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(false);
                          onManageBoardUsers(board.id);
                        }}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Users
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 px-2 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(false);
                        setBoardToDelete(board);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DropdownMenuItem>
        ))}

        {onCreateBoard && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-primary p-4"
              onClick={onCreateBoard}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Create New Board</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{boardToDelete?.name}"? This action cannot be undone.
              All tickets in this board will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBoard}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}