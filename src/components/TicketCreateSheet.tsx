"use client";

import { useState, useEffect, useMemo } from "react";
import { useTicketCreate } from "@/contexts/TicketCreateContext";
import {
  ticketsCreate,
  columnsList,
  boardsList,
  usersList,
  tagsList,
  ticketFormsList,
  ticketFormsDefaultRetrieve,
  formSubmissionsCreate,
  itemListsRetrieve,
} from "@/api/generated/api";
import type {
  Board,
  TicketColumn,
  User,
  Tag,
  TicketForm,
  ListItemMinimal,
} from "@/api/generated/interfaces";
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
import { Plus, ChevronRight, ChevronDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface TreeSelectProps {
  items: any[];
  selected: number[];
  onToggle: (id: number) => void;
  level?: number;
}

function TreeSelectItem({ item, selected, onToggle, level = 0 }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSelected = selected.includes(item.id);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1 px-2 hover:bg-accent rounded"
        style={{ paddingLeft: `${level * 1 + 0.5}rem` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5"
            type="button"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(item.id)}
          className="cursor-pointer"
        />
        <span className="text-sm flex-1 cursor-pointer" onClick={() => onToggle(item.id)}>
          {item.label}
        </span>
        {item.custom_id && (
          <Badge variant="outline" className="text-xs">
            {item.custom_id}
          </Badge>
        )}
      </div>
      {isExpanded && hasChildren && (
        <div>
          {item.children.map((child: any) => (
            <TreeSelectItem
              key={child.id}
              item={child}
              selected={selected}
              onToggle={onToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TicketCreateSheet() {
  const { isOpen, selectedBoard, selectedColumn, closeTicketCreate } =
    useTicketCreate();
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
  const [ticketForms, setTicketForms] = useState<TicketForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<TicketForm | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [formListsWithItems, setFormListsWithItems] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Fetch boards, columns, users, forms on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchingData(true);
        const [boardsRes, columnsRes, usersRes, formsRes] = await Promise.all([
          boardsList(),
          columnsList(),
          usersList(),
          ticketFormsList(),
        ]);

        setBoards(boardsRes.results || []);
        setAllColumns(columnsRes.results || []);
        setUsers(usersRes.results || []);
        setTicketForms(formsRes.results || []);

        // Set default form if available
        const defaultForm =
          (formsRes.results || []).find((form: TicketForm) => form.is_default) ||
          null;
        setSelectedForm(defaultForm);
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
      setFormData((prev) => ({ ...prev, board_id: selectedBoard.id }));
    }
    if (selectedColumn) {
      setFormData((prev) => ({ ...prev, column_id: selectedColumn.id }));
    }
  }, [selectedBoard, selectedColumn]);

  // Filter columns by selected board
  useEffect(() => {
    if (formData.board_id) {
      const filteredColumns = allColumns.filter(
        (col) => col.board === formData.board_id
      );
      setColumns(filteredColumns);

      // If current column is not in the filtered list, reset it
      if (
        formData.column_id &&
        !filteredColumns.find((col) => col.id === formData.column_id)
      ) {
        setFormData((prev) => ({ ...prev, column_id: 0 }));
      }
    } else {
      setColumns([]);
    }
  }, [formData.board_id, allColumns, formData.column_id]);

  // Fetch items for selected form's lists
  useEffect(() => {
    const fetchListItems = async () => {
      if (!selectedForm || !selectedForm.item_lists || selectedForm.item_lists.length === 0) {
        setFormListsWithItems([]);
        return;
      }

      setLoadingLists(true);
      try {
        const listsWithItems = await Promise.all(
          selectedForm.item_lists.map(async (list) => {
            try {
              const fullList = await itemListsRetrieve(list.id);
              return fullList;
            } catch (error) {
              console.error(`Failed to load list ${list.id}:`, error);
              return list;
            }
          })
        );
        setFormListsWithItems(listsWithItems);
      } catch (error) {
        console.error("Error fetching list items:", error);
      } finally {
        setLoadingLists(false);
      }
    };

    fetchListItems();
  }, [selectedForm]);

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

      const createdTicket = await ticketsCreate(ticketData);

      // If a form is selected, create form submission
      if (selectedForm) {
        try {
          await formSubmissionsCreate({
            ticket: createdTicket.id,
            form_id: selectedForm.id,
            selected_item_ids: selectedItems,
            form_data: {},
          } as any);
        } catch (error) {
          console.error("Error creating form submission:", error);
        }
      }

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["kanbanBoard"] });

      // Reset form
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        board_id: selectedBoard?.id || 0,
        column_id: selectedColumn?.id || 0,
      });
      setSelectedItems([]);

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
    setSelectedItems([]);
    closeTicketCreate();
  };

  const toggleItem = (itemId: number) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectedColumnName = useMemo(() => {
    return (
      columns.find((col) => col.id === formData.column_id)?.name ||
      "selected column"
    );
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
                : "Create a new ticket for your board."}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 mt-6">
            {/* Form Selection */}
            {ticketForms.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="form">Ticket Form</Label>
                <Select
                  value={selectedForm?.id.toString() || ""}
                  onValueChange={(value) => {
                    const form = ticketForms.find(
                      (f) => f.id.toString() === value
                    );
                    setSelectedForm(form || null);
                    setSelectedItems([]);
                  }}
                  disabled={fetchingData}
                >
                  <SelectTrigger id="form">
                    <SelectValue placeholder="Select a form (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketForms
                      .filter((form) => form.is_active)
                      .map((form) => (
                        <SelectItem key={form.id} value={form.id.toString()}>
                          {form.title}
                          {form.is_default && " (Default)"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Task title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="board">Board *</Label>
              <Select
                value={formData.board_id > 0 ? formData.board_id.toString() : ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, board_id: parseInt(value) })
                }
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
                value={formData.column_id > 0 ? formData.column_id.toString() : ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, column_id: parseInt(value) })
                }
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
                onValueChange={(value: any) =>
                  setFormData({ ...formData, priority: value })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            {/* Item Lists from Selected Form */}
            {selectedForm &&
              formListsWithItems.length > 0 && (
                <div className="grid gap-2">
                  <Label>Select Items from Lists</Label>
                  {loadingLists ? (
                    <div className="border rounded-lg p-3 text-center text-sm text-muted-foreground">
                      Loading items...
                    </div>
                  ) : (
                    <div className="border rounded-lg p-3 space-y-4 max-h-80 overflow-y-auto">
                      {formListsWithItems.map((list) => (
                        <div key={list.id} className="space-y-2">
                          <div className="font-semibold text-sm border-b pb-1">
                            {list.title}
                          </div>
                          {list.description && (
                            <div className="text-xs text-muted-foreground">
                              {list.description}
                            </div>
                          )}
                          <div className="space-y-1">
                            {list.root_items && Array.isArray(list.root_items) && list.root_items.length > 0 ? (
                              list.root_items.map((item: any) => (
                                <TreeSelectItem
                                  key={item.id}
                                  item={item}
                                  selected={selectedItems}
                                  onToggle={toggleItem}
                                />
                              ))
                            ) : list.items && Array.isArray(list.items) && list.items.length > 0 ? (
                              list.items
                                .filter((item: any) => !item.parent)
                                .map((item: any) => (
                                  <TreeSelectItem
                                    key={item.id}
                                    item={item}
                                    selected={selectedItems}
                                    onToggle={toggleItem}
                                  />
                                ))
                            ) : (
                              <div className="text-xs text-muted-foreground italic">
                                No items in this list
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedItems.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {selectedItems.length} item(s) selected
                    </div>
                  )}
                </div>
              )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                loading ||
                !formData.title ||
                !formData.board_id ||
                !formData.column_id
              }
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
