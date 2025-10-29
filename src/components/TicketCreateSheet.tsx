"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from 'next-intl';
import { useTicketCreate } from "@/contexts/TicketCreateContext";
import {
  ticketsCreate,
  columnsList,
  boardsList,
  usersList,
  tagsList,
  ticketFormsList,
  ticketFormsRetrieve,
  formSubmissionsCreate,
  itemListsRetrieve,
  tenantGroupsList,
} from "@/api/generated/api";
import type {
  Board,
  TicketColumn,
  User,
  Tag,
  TicketForm,
  TicketFormMinimal,
  ListItemMinimal,
  TenantGroup,
} from "@/api/generated/interfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Check, ChevronsUpDown, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LabelManagementDialog } from "@/components/LabelManagementDialog";
import MultiGroupSelection from "@/components/MultiGroupSelection";
import MultiUserAssignment, { AssignmentData } from "@/components/MultiUserAssignment";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileDropzone, type UploadedFile } from "@/components/FileDropzone";

// Flatten items recursively for search
function flattenItems(items: any[]): any[] {
  const flattened: any[] = [];

  const flatten = (items: any[], level: number = 0) => {
    items.forEach((item) => {
      flattened.push({ ...item, level });
      if (item.children && item.children.length > 0) {
        flatten(item.children, level + 1);
      }
    });
  };

  flatten(items);
  return flattened;
}

export function TicketCreateSheet() {
  const t = useTranslations('tickets');
  const tCommon = useTranslations('common');
  const { isOpen, selectedBoard, selectedColumn, closeTicketCreate } =
    useTicketCreate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent" | "critical",
    board_id: 0,
    column_id: 0,
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const [boards, setBoards] = useState<Board[]>([]);
  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [allColumns, setAllColumns] = useState<TicketColumn[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [groups, setGroups] = useState<TenantGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<AssignmentData[]>([]);
  const [ticketForms, setTicketForms] = useState<TicketFormMinimal[]>([]);
  const [selectedForm, setSelectedForm] = useState<TicketForm | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<number, number | null>>({});
  const [formListsWithItems, setFormListsWithItems] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [openPopovers, setOpenPopovers] = useState<Record<number, boolean>>({});
  const [isLabelPopoverOpen, setIsLabelPopoverOpen] = useState(false);

  // Fetch boards, columns, users, forms, tags, groups on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchingData(true);
        const [boardsRes, columnsRes, usersRes, formsRes, tagsRes, groupsRes] = await Promise.all([
          boardsList(),
          columnsList(),
          usersList(),
          ticketFormsList(),
          tagsList(),
          tenantGroupsList(),
        ]);

        setBoards(boardsRes.results || []);
        setAllColumns(columnsRes.results || []);
        setUsers(usersRes.results || []);
        setTicketForms(formsRes.results || []);
        setTags(tagsRes.results || []);
        setGroups(groupsRes.results || []);

        // Set default form if available and fetch full form details
        const defaultFormMinimal =
          (formsRes.results || []).find((form) => form.is_default);
        if (defaultFormMinimal) {
          try {
            const fullForm = await ticketFormsRetrieve(defaultFormMinimal.id);
            setSelectedForm(fullForm);
          } catch (error) {
            console.error("Error fetching default form:", error);
          }
        }
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

      // Prepare user assignments
      const assigned_user_ids = selectedAssignments.map((a) => a.userId);
      const assignment_roles: Record<string, string> = {};
      selectedAssignments.forEach((a) => {
        assignment_roles[a.userId.toString()] = a.role;
      });
      const primaryAssignment = selectedAssignments.find((a) => a.role === "primary") || selectedAssignments[0];
      const assigned_to_id = primaryAssignment?.userId;

      const ticketData = {
        title: formData.title,
        description: formData.description || "", // Ensure empty string if not provided
        priority: formData.priority,
        column_id: formData.column_id,
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined, // Only include if tags are selected
        assigned_group_ids: selectedGroupIds.length > 0 ? selectedGroupIds : undefined, // Only include if groups are selected
        assigned_to_id: assigned_to_id,
        assigned_user_ids: assigned_user_ids.length > 0 ? assigned_user_ids : undefined,
        assignment_roles: Object.keys(assignment_roles).length > 0 ? assignment_roles : undefined,
      } as any;

      const createdTicket = await ticketsCreate(ticketData);

      // If a form is selected, create form submission
      if (selectedForm) {
        try {
          // Extract selected item IDs from the object (filter out null values)
          const selectedItemIds = Object.values(selectedItems).filter((id): id is number => id !== null);

          await formSubmissionsCreate({
            ticket: createdTicket.id,
            form_id: selectedForm.id,
            selected_item_ids: selectedItemIds,
            form_data: customFieldValues,
          } as any);
        } catch (error) {
          console.error("Error creating form submission:", error);
        }
      }

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["kanbanBoard", formData.board_id] });

      // Reset form
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        board_id: selectedBoard?.id || 0,
        column_id: selectedColumn?.id || 0,
      });
      setSelectedItems({});
      setSelectedTagIds([]);
      setSelectedGroupIds([]);
      setSelectedAssignments([]);
      setCustomFieldValues({});

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
    setSelectedItems({});
    setSelectedTagIds([]);
    setSelectedGroupIds([]);
    setSelectedAssignments([]);
    setCustomFieldValues({});
    closeTicketCreate();
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const selectItemForList = (listId: number, itemId: number | null) => {
    setSelectedItems((prev) => ({
      ...prev,
      [listId]: itemId,
    }));
    setOpenPopovers((prev) => ({
      ...prev,
      [listId]: false,
    }));
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
            <SheetTitle>{t('addNewTask')}</SheetTitle>
            <SheetDescription>
              {formData.column_id
                ? `${t('addNewTask')} ${selectedColumnName} ${t('column')}.`
                : t('createTask')}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 mt-6">
            {/* Title and Priority Row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="title">{t('ticketTitle')} *</Label>
                <Input
                  id="title"
                  placeholder={t('ticketTitle')}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">{t('priorityLabel')}</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder={t('priorityLabel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('priority.low')}</SelectItem>
                    <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                    <SelectItem value="high">{t('priority.high')}</SelectItem>
                    <SelectItem value="urgent">{t('priority.urgent')}</SelectItem>
                    <SelectItem value="critical">{t('priority.critical')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!selectedBoard && (
              <div className="grid gap-2">
                <Label htmlFor="board">{t('board')} *</Label>
                <Select
                  value={formData.board_id > 0 ? formData.board_id.toString() : ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, board_id: parseInt(value) })
                  }
                  disabled={fetchingData}
                >
                  <SelectTrigger id="board">
                    <SelectValue placeholder={t('selectBoard')} />
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
            )}

            {!selectedColumn && (
              <div className="grid gap-2">
                <Label htmlFor="column">{t('column')} *</Label>
                <Select
                  value={formData.column_id > 0 ? formData.column_id.toString() : ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, column_id: parseInt(value) })
                  }
                  disabled={!formData.board_id || fetchingData}
                >
                  <SelectTrigger id="column">
                    <SelectValue placeholder={t('selectColumn')} />
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
            )}

            {/* Form Selection - Moved here below title row */}
            {ticketForms.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="form">Ticket Form (Optional)</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedForm?.id.toString() || ""}
                    onValueChange={async (value) => {
                      const formId = parseInt(value);
                      setSelectedItems({});
                      try {
                        const fullForm = await ticketFormsRetrieve(formId);
                        setSelectedForm(fullForm);
                      } catch (error) {
                        console.error("Error fetching form:", error);
                        setSelectedForm(null);
                      }
                    }}
                    disabled={fetchingData}
                  >
                    <SelectTrigger id="form" className="w-full">
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
                  {selectedForm && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setSelectedForm(null);
                        setSelectedItems({});
                      }}
                      className="shrink-0"
                      title="Clear form selection"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="description">{t('description')} (Optional)</Label>
              <RichTextEditor
                content={formData.description}
                onChange={(content) =>
                  setFormData({ ...formData, description: content })
                }
                placeholder={t('taskDescription')}
                onImageUpload={async (file) => {
                  // TODO: Implement image upload to DO Spaces and return URL
                  // For now, create a local object URL
                  return URL.createObjectURL(file)
                }}
              />
            </div>

            {/* File Attachments */}
            <div className="grid gap-2">
              <Label>{t('attachments')} (Optional)</Label>
              <FileDropzone
                onFilesSelected={(files) => {
                  const newFiles = files.map(file => ({
                    file,
                    preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
                  }))
                  setUploadedFiles(prev => [...prev, ...newFiles])
                }}
                files={uploadedFiles}
                onRemoveFile={(index) => {
                  setUploadedFiles(prev => prev.filter((_, i) => i !== index))
                }}
                maxFiles={10}
                maxSize={10 * 1024 * 1024} // 10MB
              />
            </div>

            {/* User Assignment Section */}
            <div className="grid gap-2">
              <Label>Assign to Users (Optional)</Label>
              <MultiUserAssignment
                users={users}
                selectedAssignments={selectedAssignments}
                onChange={setSelectedAssignments}
                placeholder="Select users to assign..."
              />
            </div>

            {/* Labels Section */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>{t('labels')} (Optional)</Label>
                <LabelManagementDialog />
              </div>
              <Popover open={isLabelPopoverOpen} onOpenChange={setIsLabelPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isLabelPopoverOpen}
                    className="w-full justify-between"
                  >
                    {selectedTagIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedTagIds.map((tagId) => {
                          const tag = tags.find((t) => t.id === tagId);
                          if (!tag) return null;
                          return (
                            <Badge
                              key={tag.id}
                              style={{
                                backgroundColor: tag.color || '#6B7280',
                                color: '#ffffff',
                              }}
                              className="text-xs px-2 py-0.5"
                            >
                              {tag.name}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      t('selectLabels')
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('selectLabels')} />
                    <CommandList>
                      <CommandEmpty>{t('noLabels')}</CommandEmpty>
                      <CommandGroup>
                        {tags.map((tag) => (
                          <CommandItem
                            key={tag.id}
                            value={tag.name}
                            onSelect={() => toggleTag(tag.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedTagIds.includes(tag.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <Badge
                              style={{
                                backgroundColor: tag.color || '#6B7280',
                                color: '#ffffff',
                              }}
                              className="text-xs px-2 py-0.5 mr-2"
                            >
                              {tag.name}
                            </Badge>
                            {tag.description && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                {tag.description}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedTagIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedTagIds.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <Badge
                        key={tag.id}
                        style={{
                          backgroundColor: tag.color || '#6B7280',
                          color: '#ffffff',
                        }}
                        className="text-xs px-2 py-1 cursor-pointer hover:opacity-80"
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                        <span className="ml-1">×</span>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Group Assignment Section */}
            <div className="grid gap-2">
              <Label>Assign to Groups (Optional)</Label>
              <MultiGroupSelection
                groups={groups}
                selectedGroupIds={selectedGroupIds}
                onChange={setSelectedGroupIds}
                disabled={fetchingData}
                placeholder="Select groups to assign..."
              />
            </div>

            {/* Item Lists from Selected Form */}
            {selectedForm &&
              formListsWithItems.length > 0 && (
                <div className="grid gap-4">
                  <Label>Select Items from Lists (Optional)</Label>
                  {loadingLists ? (
                    <div className="border rounded-lg p-3 text-center text-sm text-muted-foreground">
                      {tCommon('loading')}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formListsWithItems.map((list) => {
                        const items = list.root_items && Array.isArray(list.root_items) && list.root_items.length > 0
                          ? list.root_items
                          : list.items && Array.isArray(list.items) && list.items.length > 0
                          ? list.items.filter((item: any) => !item.parent)
                          : [];

                        const flatItems = flattenItems(items);
                        const selectedItemId = selectedItems[list.id];
                        const selectedItem = flatItems.find((item) => item.id === selectedItemId);

                        return (
                          <div key={list.id} className="space-y-2">
                            <Label htmlFor={`list-${list.id}`} className="text-sm font-medium">
                              {list.title}
                              {list.description && (
                                <span className="text-xs text-muted-foreground font-normal ml-2">
                                  {list.description}
                                </span>
                              )}
                            </Label>
                            {items.length > 0 ? (
                              <div className="flex gap-2">
                                <Popover
                                  open={openPopovers[list.id] || false}
                                  onOpenChange={(open) =>
                                    setOpenPopovers((prev) => ({ ...prev, [list.id]: open }))
                                  }
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      id={`list-${list.id}`}
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={openPopovers[list.id] || false}
                                      className="w-full justify-between"
                                    >
                                      {selectedItem ? (
                                        <span className="flex items-center gap-2 truncate">
                                          {selectedItem.level > 0 && (
                                            <span className="text-muted-foreground">
                                              {"→ ".repeat(selectedItem.level)}
                                            </span>
                                          )}
                                          <span className="truncate">{selectedItem.label}</span>
                                          {selectedItem.custom_id && (
                                            <Badge variant="outline" className="text-xs">
                                              {selectedItem.custom_id}
                                            </Badge>
                                          )}
                                        </span>
                                      ) : (
                                        "Select item..."
                                      )}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder={tCommon('search')} />
                                    <CommandList>
                                      <CommandEmpty>{tCommon('noResults')}</CommandEmpty>
                                      <CommandGroup>
                                        {selectedItemId && (
                                          <CommandItem
                                            value="none"
                                            onSelect={() => selectItemForList(list.id, null)}
                                          >
                                            <span className="text-muted-foreground italic">Clear selection</span>
                                          </CommandItem>
                                        )}
                                        {flatItems.map((item) => (
                                          <CommandItem
                                            key={item.id}
                                            value={`${item.label} ${item.custom_id || ""}`}
                                            onSelect={() => selectItemForList(list.id, item.id)}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                selectedItemId === item.id ? "opacity-100" : "opacity-0"
                                              }`}
                                            />
                                            {item.level > 0 && (
                                              <span className="text-muted-foreground mr-1">
                                                {"→ ".repeat(item.level)}
                                              </span>
                                            )}
                                            <span className="flex-1">{item.label}</span>
                                            {item.custom_id && (
                                              <Badge variant="outline" className="text-xs ml-2">
                                                {item.custom_id}
                                              </Badge>
                                            )}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              {selectedItemId && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => selectItemForList(list.id, null)}
                                  className="shrink-0"
                                  title="Clear selection"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            ) : (
                              <div className="text-sm text-muted-foreground italic border rounded-lg p-3">
                                No items in this list
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            {/* Custom Fields from Selected Form */}
            {selectedForm && selectedForm.custom_fields && Array.isArray(selectedForm.custom_fields) && selectedForm.custom_fields.length > 0 && (
              <div className="grid gap-4">
                <Label>Custom Fields</Label>
                <div className="space-y-3">
                  {selectedForm.custom_fields.map((field: any, index: number) => (
                    <div key={field.name || index} className="grid gap-2">
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>

                      {field.type === "string" && (
                        <Input
                          id={field.name}
                          value={customFieldValues[field.name] || ""}
                          onChange={(e) => setCustomFieldValues(prev => ({...prev, [field.name]: e.target.value}))}
                          required={field.required}
                          placeholder={field.label}
                        />
                      )}

                      {field.type === "text" && (
                        <Textarea
                          id={field.name}
                          value={customFieldValues[field.name] || ""}
                          onChange={(e) => setCustomFieldValues(prev => ({...prev, [field.name]: e.target.value}))}
                          required={field.required}
                          rows={3}
                          placeholder={field.label}
                        />
                      )}

                      {field.type === "number" && (
                        <Input
                          id={field.name}
                          type="number"
                          value={customFieldValues[field.name] || ""}
                          onChange={(e) => setCustomFieldValues(prev => ({...prev, [field.name]: e.target.value ? parseFloat(e.target.value) : ""}))}
                          required={field.required}
                          placeholder={field.label}
                        />
                      )}

                      {field.type === "date" && (
                        <Input
                          id={field.name}
                          type="date"
                          value={customFieldValues[field.name] || ""}
                          onChange={(e) => setCustomFieldValues(prev => ({...prev, [field.name]: e.target.value}))}
                          required={field.required}
                        />
                      )}

                      {field.type === "signature" && (
                        <SignatureCanvas
                          onSignatureChange={(dataUrl) => {
                            setCustomFieldValues(prev => ({...prev, [field.name]: dataUrl}));
                          }}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
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
                  {tCommon('loading')}
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('createTask')}
                </>
              )}
            </Button>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
