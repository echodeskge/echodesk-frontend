"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { SignatureCanvas } from "@/components/SignatureCanvas";
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
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketForm, ListItemMinimal } from "@/api/generated/interfaces";
import { apiTicketFormsRetrieve, apiItemListsRetrieve, apiFormSubmissionsCreate } from "@/api/generated/api";

interface ChildFormFillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childFormId: number;
  ticketId: number;
  onSuccess: () => void;
}

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

export function ChildFormFillDialog({
  open,
  onOpenChange,
  childFormId,
  ticketId,
  onSuccess,
}: ChildFormFillDialogProps) {
  const [childForm, setChildForm] = useState<TicketForm | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<number, number | null>>({});
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [formListsWithItems, setFormListsWithItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingForm, setLoadingForm] = useState(true);
  const [loadingLists, setLoadingLists] = useState(false);
  const [openPopovers, setOpenPopovers] = useState<Record<number, boolean>>({});
  const [error, setError] = useState("");

  // Fetch child form details
  useEffect(() => {
    const fetchChildForm = async () => {
      if (!open || !childFormId) return;

      try {
        setLoadingForm(true);
        const fullForm = await apiTicketFormsRetrieve(childFormId);
        setChildForm(fullForm);
      } catch (error) {
        console.error("Error fetching child form:", error);
        setError("Failed to load form details");
      } finally {
        setLoadingForm(false);
      }
    };

    fetchChildForm();
  }, [open, childFormId]);

  // Fetch items for child form's lists
  useEffect(() => {
    const fetchListItems = async () => {
      if (!childForm || !childForm.item_lists || childForm.item_lists.length === 0) {
        setFormListsWithItems([]);
        return;
      }

      setLoadingLists(true);
      try {
        const listsWithItems = await Promise.all(
          childForm.item_lists.map(async (list) => {
            try {
              const fullList = await apiItemListsRetrieve(list.id);
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
  }, [childForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!childForm) return;

    try {
      setLoading(true);
      setError("");

      // Extract selected item IDs from the object (filter out null values)
      const selectedItemIds = Object.values(selectedItems).filter((id): id is number => id !== null);

      await apiFormSubmissionsCreate({
        ticket: ticketId,
        form_id: childForm.id,
        selected_item_ids: selectedItemIds,
        form_data: customFieldValues,
      } as any);

      // Reset form and close dialog
      setSelectedItems({});
      setCustomFieldValues({});
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting child form:", error);
      setError("Failed to submit form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedItems({});
    setCustomFieldValues({});
    setError("");
    onOpenChange(false);
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

  if (loadingForm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center space-x-2">
              <Spinner className="h-6 w-6" />
              <span className="text-muted-foreground">Loading form...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!childForm) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{childForm.title}</DialogTitle>
          {childForm.description && (
            <DialogDescription>{childForm.description}</DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive border border-destructive/20 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Item Lists from Child Form */}
            {formListsWithItems.length > 0 && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Select Items from Lists</Label>
                {loadingLists ? (
                  <div className="border rounded-lg p-3 text-center text-sm text-muted-foreground">
                    Loading lists...
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
                                    type="button"
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
                                    <CommandInput placeholder="Search..." />
                                    <CommandList>
                                      <CommandEmpty>No items found</CommandEmpty>
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

            {/* Custom Fields from Child Form */}
            {childForm.custom_fields && Array.isArray(childForm.custom_fields) && childForm.custom_fields.length > 0 && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Custom Fields</Label>
                <div className="space-y-3">
                  {childForm.custom_fields.map((field: any, index: number) => (
                    <div key={field.name || index} className="space-y-2">
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

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Submitting...
                  </>
                ) : (
                  "Submit Form"
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
