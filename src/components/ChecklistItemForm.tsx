'use client';

import { useState } from 'react';
import { checklistItemsCreate, checklistItemsUpdate } from '@/api/generated/api';
import type { ChecklistItem, PatchedChecklistItem } from '@/api/generated/interfaces';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ChecklistItemFormProps {
  ticketId?: number;
  subTicketId?: number;
  checklistItem?: ChecklistItem;
  onSave?: (checklistItem: ChecklistItem) => void;
  onCancel?: () => void;
}

export default function ChecklistItemForm({ 
  ticketId, 
  subTicketId, 
  checklistItem, 
  onSave, 
  onCancel 
}: ChecklistItemFormProps) {
  const [text, setText] = useState(checklistItem?.text || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!checklistItem;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError('');

    try {
      let savedItem: ChecklistItem;

      if (isEditing && checklistItem) {
        const updateData: ChecklistItem = {
          ...checklistItem,
          text: text.trim()
        };
        
        savedItem = await checklistItemsUpdate(checklistItem.id.toString(), updateData);
      } else {
        const createData: ChecklistItem = {
          id: 0,
          ticket: ticketId || undefined,
          sub_ticket: subTicketId || undefined,
          text: text.trim(),
          is_checked: false,
          position: 0,
          created_at: '',
          updated_at: '',
          created_by: { id: 0, email: '', first_name: '', last_name: '' }
        };
        
        savedItem = await checklistItemsCreate(createData);
      }

      if (onSave) {
        onSave(savedItem);
      }
      setText('');
    } catch (err) {
      console.error('Error saving checklist item:', err);
      setError(err instanceof Error ? err.message : 'Failed to save checklist item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">
        {isEditing ? 'Edit Checklist Item' : 'Add Checklist Item'}
      </h4>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 mb-3 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="checklist-text" className="text-sm">
            Item Text
          </Label>
          <Input
            id="checklist-text"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter checklist item..."
            required
            className="text-sm"
          />
        </div>

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={loading || !text.trim()}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update' : 'Add')}
          </Button>
        </div>
      </form>
    </div>
  );
}