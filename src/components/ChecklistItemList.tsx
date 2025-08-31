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
    <div style={{ marginTop: '15px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <h5 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#2c3e50',
          margin: 0
        }}>
          Checklist ({completedCount}/{items.length})
        </h5>
        {showAddButton && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: '#3498db',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            + Add Item
          </button>
        )}
      </div>

      {showForm && (
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <ChecklistItemForm
            ticketId={ticketId}
            subTicketId={subTicketId}
            checklistItem={editingItem || undefined}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      <div>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 0',
              borderBottom: '1px solid #f1f3f4'
            }}
          >
            <button
              onClick={() => handleToggleCheck(item)}
              style={{
                background: item.is_checked ? '#27ae60' : 'white',
                color: item.is_checked ? 'white' : '#27ae60',
                border: '2px solid #27ae60',
                borderRadius: '3px',
                width: '16px',
                height: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                padding: 0,
                flexShrink: 0
              }}
            >
              {item.is_checked && '✓'}
            </button>
            
            <span style={{
              fontSize: '13px',
              color: item.is_checked ? '#6c757d' : '#2c3e50',
              textDecoration: item.is_checked ? 'line-through' : 'none',
              flex: 1,
              lineHeight: '1.3'
            }}>
              {item.text}
            </span>

            <div style={{
              display: 'flex',
              gap: '4px',
              opacity: 0.7
            }}>
              <button
                onClick={() => handleEdit(item)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3498db',
                  cursor: 'pointer',
                  fontSize: '10px',
                  padding: '2px 4px'
                }}
                title="Edit"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(item)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#e74c3c',
                  cursor: 'pointer',
                  fontSize: '10px',
                  padding: '2px 4px'
                }}
                title="Delete"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div style={{
          background: '#f8f9fa',
          border: '1px dashed #dee2e6',
          borderRadius: '4px',
          padding: '15px',
          textAlign: 'center',
          color: '#6c757d',
          fontSize: '12px'
        }}>
          No checklist items yet. {showAddButton && 'Click "Add Item" to create one.'}
        </div>
      )}
    </div>
  );
}