'use client';

import { useState } from 'react';
import { checklistItemsDestroy, checklistItemsToggleCheckPartialUpdate } from '@/api/generated/api';
import type { ChecklistItem } from '@/api/generated/interfaces';
import ChecklistItemForm from './ChecklistItemForm';

interface ChecklistItemListProps {
  ticketId?: number;
  subTicketId?: number;
  items: ChecklistItem[];
  onItemsChange?: () => void;
  showAddButton?: boolean;
}

export default function ChecklistItemList({ 
  ticketId, 
  subTicketId, 
  items, 
  onItemsChange,
  showAddButton = true
}: ChecklistItemListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);

  const handleToggleCheck = async (item: ChecklistItem) => {
    try {
      await checklistItemsToggleCheckPartialUpdate(item.id.toString(), {
        is_checked: !item.is_checked
      });
      if (onItemsChange) {
        onItemsChange();
      }
    } catch (error) {
      console.error('Error toggling checklist item:', error);
    }
  };

  const handleDelete = async (item: ChecklistItem) => {
    if (confirm('Are you sure you want to delete this checklist item?')) {
      try {
        await checklistItemsDestroy(item.id.toString());
        if (onItemsChange) {
          onItemsChange();
        }
      } catch (error) {
        console.error('Error deleting checklist item:', error);
      }
    }
  };

  const handleEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingItem(null);
    if (onItemsChange) {
      onItemsChange();
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const completedCount = items.filter(item => item.is_checked).length;

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
        <h5 className="text-sm font-semibold text-gray-800 m-0">
          Checklist ({completedCount}/{items.length})
        </h5>
        {showAddButton && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white border-none px-2 py-1 rounded text-xs font-medium cursor-pointer hover:bg-blue-600"
          >
            + Add Item
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gray-50 border border-gray-300 rounded mb-2">
          <ChecklistItemForm
            ticketId={ticketId}
            subTicketId={subTicketId}
            checklistItem={editingItem || undefined}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      <div className="space-y-0">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 py-1.5 border-b border-gray-100"
          >
            <button
              onClick={() => handleToggleCheck(item)}
              className={`${
                item.is_checked ? 'bg-green-600 text-white' : 'bg-white text-green-600'
              } border-2 border-green-600 rounded w-4 h-4 flex-shrink-0 cursor-pointer flex items-center justify-center text-xs p-0`}
            >
              {item.is_checked && '✓'}
            </button>

            <span className={`text-xs flex-1 min-w-0 break-words leading-tight ${
              item.is_checked ? 'text-gray-500 line-through' : 'text-gray-800'
            }`}>
              {item.text}
            </span>

            <div className="flex gap-1 opacity-70 flex-shrink-0">
              <button
                onClick={() => handleEdit(item)}
                className="bg-transparent border-none text-blue-500 cursor-pointer text-xs px-1 py-0.5"
                title="Edit"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(item)}
                className="bg-transparent border-none text-red-600 cursor-pointer text-xs px-1 py-0.5"
                title="Delete"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded p-4 text-center text-gray-500 text-xs">
          No checklist items yet. {showAddButton && 'Click "Add Item" to create one.'}
        </div>
      )}
    </div>
  );
}