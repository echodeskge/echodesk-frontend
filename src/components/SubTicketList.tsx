'use client';

import { useState } from 'react';
import { subTicketsDestroy, subTicketsToggleCompletionPartialUpdate } from '@/api/generated/api';
import type { SubTicket } from '@/api/generated/interfaces';
import SubTicketForm from './SubTicketForm';

interface SubTicketListProps {
  parentTicketId: number;
  subTickets: SubTicket[];
  onSubTicketsChange?: () => void;
}

export default function SubTicketList({ parentTicketId, subTickets, onSubTicketsChange }: SubTicketListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingSubTicket, setEditingSubTicket] = useState<SubTicket | null>(null);

  const handleToggleCompletion = async (subTicket: SubTicket) => {
    try {
      await subTicketsToggleCompletionPartialUpdate(subTicket.id.toString(), {
        is_completed: !subTicket.is_completed
      });
      if (onSubTicketsChange) {
        onSubTicketsChange();
      }
    } catch (error) {
      console.error('Error toggling sub-ticket completion:', error);
    }
  };

  const handleDelete = async (subTicket: SubTicket) => {
    if (confirm('Are you sure you want to delete this sub-ticket?')) {
      try {
        await subTicketsDestroy(subTicket.id.toString());
        if (onSubTicketsChange) {
          onSubTicketsChange();
        }
      } catch (error) {
        console.error('Error deleting sub-ticket:', error);
      }
    }
  };

  const handleEdit = (subTicket: SubTicket) => {
    setEditingSubTicket(subTicket);
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingSubTicket(null);
    if (onSubTicketsChange) {
      onSubTicketsChange();
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingSubTicket(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#e74c3c';
      case 'high': return '#e67e22';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#2c3e50',
          margin: 0
        }}>
          Sub-Tickets ({subTickets.length})
        </h4>
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: '#3498db',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          + Add Sub-Ticket
        </button>
      </div>

      {showForm && (
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          marginBottom: '15px'
        }}>
          <SubTicketForm
            parentTicketId={parentTicketId}
            subTicket={editingSubTicket || undefined}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {subTickets.map((subTicket) => (
          <div
            key={subTicket.id}
            style={{
              background: 'white',
              border: '1px solid #e1e5e9',
              borderRadius: '6px',
              padding: '15px',
              marginBottom: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '10px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '5px'
                }}>
                  <button
                    onClick={() => handleToggleCompletion(subTicket)}
                    style={{
                      background: subTicket.is_completed ? '#27ae60' : 'white',
                      color: subTicket.is_completed ? 'white' : '#27ae60',
                      border: '2px solid #27ae60',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      padding: 0
                    }}
                  >
                    {subTicket.is_completed && '✓'}
                  </button>
                  
                  <h5 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: subTicket.is_completed ? '#6c757d' : '#2c3e50',
                    margin: 0,
                    textDecoration: subTicket.is_completed ? 'line-through' : 'none'
                  }}>
                    {subTicket.title}
                  </h5>
                  
                  {subTicket.priority && (
                    <span style={{
                      background: getPriorityColor(subTicket.priority as unknown as string),
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: '500',
                      textTransform: 'capitalize'
                    }}>
                      {subTicket.priority as unknown as string}
                    </span>
                  )}
                </div>

                {subTicket.description && (
                  <div style={{
                    fontSize: '12px',
                    color: '#6c757d',
                    marginBottom: '8px',
                    lineHeight: '1.4'
                  }}>
                    {(subTicket.description_format as any) === 'html' && subTicket.rich_description ? (
                      <div dangerouslySetInnerHTML={{ __html: subTicket.rich_description }} />
                    ) : (
                      subTicket.description
                    )}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  gap: '15px',
                  fontSize: '11px',
                  color: '#95a5a6'
                }}>
                  {subTicket.assigned_to && (
                    <span>
                      Assigned: {subTicket.assigned_to.first_name} {subTicket.assigned_to.last_name}
                    </span>
                  )}
                  <span>
                    Checklist: {subTicket.completed_items_count}/{subTicket.checklist_items_count}
                  </span>
                  <span>
                    Created: {new Date(subTicket.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '5px'
              }}>
                <button
                  onClick={() => handleEdit(subTicket)}
                  style={{
                    background: 'white',
                    color: '#3498db',
                    border: '1px solid #3498db',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(subTicket)}
                  style={{
                    background: 'white',
                    color: '#e74c3c',
                    border: '1px solid #e74c3c',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {subTickets.length === 0 && (
        <div style={{
          background: '#f8f9fa',
          border: '1px dashed #dee2e6',
          borderRadius: '6px',
          padding: '20px',
          textAlign: 'center',
          color: '#6c757d',
          fontSize: '14px'
        }}>
          No sub-tickets yet. Click "Add Sub-Ticket" to create one.
        </div>
      )}
    </div>
  );
}