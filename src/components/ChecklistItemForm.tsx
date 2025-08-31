'use client';

import { useState } from 'react';
import { checklistItemsCreate, checklistItemsUpdate } from '@/api/generated/api';
import type { ChecklistItem, PatchedChecklistItem } from '@/api/generated/interfaces';

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
    <div style={{ padding: '15px' }}>
      <h4 style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: '10px'
      }}>
        {isEditing ? 'Edit Checklist Item' : 'Add Checklist Item'}
      </h4>

      {error && (
        <div style={{
          background: '#fee',
          color: '#c33',
          padding: '8px',
          borderRadius: '4px',
          marginBottom: '10px',
          fontSize: '12px',
          border: '1px solid #fcc'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter checklist item..."
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '2px solid #e1e5e9',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: 'white',
                color: '#6c757d',
                border: '2px solid #6c757d',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={loading || !text.trim()}
            style={{
              background: (!text.trim() || loading) ? '#dee2e6' : '#27ae60',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: (!text.trim() || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update' : 'Add')}
          </button>
        </div>
      </form>
    </div>
  );
}