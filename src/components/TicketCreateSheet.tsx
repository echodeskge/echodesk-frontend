"use client";

import { useState, useEffect, useMemo } from "react";
import { useTicketCreate } from "@/contexts/TicketCreateContext";
import { ticketsCreate } from "@/api/generated/api";
import { columnsList, boardsList, usersList, tagsList } from "@/api/generated/api";
import type { Board, TicketColumn, User, Tag } from "@/api/generated/interfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function TicketCreateSheet() {
  const { isOpen, selectedBoard, selectedColumn, closeTicketCreate } = useTicketCreate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    board_id: 0,
    column_id: 0,
  });

  const [boards, setBoards] = useState<Board[]>([]);
  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [allColumns, setAllColumns] = useState<TicketColumn[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Fetch boards, columns, users on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchingData(true);
        const [boardsRes, columnsRes, usersRes] = await Promise.all([
          boardsList(),
          columnsList(),
          usersList(),
        ]);

        setBoards(boardsRes.results || []);
        setAllColumns(columnsRes.results || []);
        setUsers(usersRes.results || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setFetchingData(false);
      }
    };

    fetchData();
  }, []);

  // Set board and column from context when available
  useEffect(() => {
    if (selectedBoard) {
      setFormData(prev => ({ ...prev, board_id: selectedBoard.id }));
    }
    if (selectedColumn) {
      setFormData(prev => ({ ...prev, column_id: selectedColumn.id }));
    }
  }, [selectedBoard, selectedColumn]);

  // Filter columns by selected board
  useEffect(() => {
    if (formData.board_id) {
      const filteredColumns = allColumns.filter(
        col => col.board === formData.board_id
      );
      setColumns(filteredColumns);

      // If current column is not in the filtered list, reset it
      if (formData.column_id && !filteredColumns.find(col => col.id === formData.column_id)) {
        setFormData(prev => ({ ...prev, column_id: 0 }));
      }
    } else {
      setColumns([]);
    }
  }, [formData.board_id, allColumns, formData.column_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.board_id || !formData.column_id) {
      return;
    }

    try {
      setLoading(true);

      const ticketData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        column: formData.column_id,
        board: formData.board_id,
      } as any;

      await ticketsCreate(ticketData);

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['kanbanBoard'] });

      // Reset form
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        board_id: selectedBoard?.id || 0,
        column_id: selectedColumn?.id || 0,
      });

      closeTicketCreate();
    } catch (error) {
      console.error("Error creating ticket:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      board_id: 0,
      column_id: 0,
    });
    closeTicketCreate();
  };

  const selectedColumnName = useMemo(() => {
    return columns.find(col => col.id === formData.column_id)?.name || "selected column";
  }, [columns, formData.column_id]);

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="p-0 w-full sm:max-w-lg" side="right">
        <ScrollArea className="h-full p-6">
          <SheetHeader>
            <SheetTitle>Add New Task</SheetTitle>
            <SheetDescription>
              {formData.column_id
                ? `Add a new task to the ${selectedColumnName} column.`
                : "Create a new ticket for your board."
              }
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 mt-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Task title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="board">Board *</Label>
              <Select
                value={formData.board_id.toString()}
                onValueChange={(value) => setFormData({ ...formData, board_id: parseInt(value) })}
                disabled={!!selectedBoard || fetchingData}
              >
                <SelectTrigger id="board">
                  <SelectValue placeholder="Select a board" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id.toString()}>
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="column">Column *</Label>
              <Select
                value={formData.column_id.toString()}
                onValueChange={(value) => setFormData({ ...formData, column_id: parseInt(value) })}
                disabled={!formData.board_id || !!selectedColumn || fetchingData}
              >
                <SelectTrigger id="column">
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column.id} value={column.id.toString()}>
                      {column.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Task description"
                className="resize-none min-h-[100px]"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !formData.title || !formData.board_id || !formData.column_id}
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Task
                </>
              )}
            </Button>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
