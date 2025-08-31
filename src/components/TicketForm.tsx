'use client';

import { useState, useEffect } from 'react';
import { ticketService, CreateTicketData, UpdateTicketData } from '@/services/ticketService';
import { columnsList } from '@/api/generated/api';
import type { Ticket, User, Tag, TicketColumn } from '@/api/generated/interfaces';

interface TicketFormProps {
  ticket?: Ticket; // If provided, we're editing; otherwise creating
  onSave?: (ticket: Ticket) => void;
  onCancel?: () => void;
}

export default function TicketForm({ ticket, onSave, onCancel }: TicketFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    assigned_to_id: 0,
    column_id: 0,
    tag_ids: [] as number[]
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingData, setFetchingData] = useState(true);

  const isEditing = !!ticket;

  useEffect(() => {
    // Initialize form data if editing
    if (ticket) {
      setFormData({
        title: ticket.title,
        description: ticket.description,
        priority: (ticket.priority as any) || 'medium',
        assigned_to_id: ticket.assigned_to?.id || 0,
        column_id: ticket.column?.id || 0,
        tag_ids: ticket.tags ? ticket.tags.map(tag => tag.id) : []
      });
    }

    // Fetch users and tags
    fetchFormData();
  }, [ticket]);

  const fetchFormData = async () => {
    try {
      setFetchingData(true);
      const [usersResult, tagsResult, columnsResult] = await Promise.all([
        ticketService.getUsers(),
        ticketService.getTags(),
        columnsList()
      ]);
      
      setUsers(usersResult.results || []);
      setTags(tagsResult.results || []);
      setColumns(columnsResult.results || []);
      
      // Set default column if creating new ticket and no column is selected
      if (!ticket && columnsResult.results && columnsResult.results.length > 0 && formData.column_id === 0) {
        const defaultColumn = columnsResult.results.find(col => col.is_default);
        if (defaultColumn) {
          setFormData(prev => ({ ...prev, column_id: defaultColumn.id }));
        } else {
          setFormData(prev => ({ ...prev, column_id: columnsResult.results[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching form data:', err);
      setError('Failed to load form data');
    } finally {
      setFetchingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let savedTicket: Ticket;

      if (isEditing && ticket) {
        // Update existing ticket
        const updateData: UpdateTicketData = {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          assigned_to_id: formData.assigned_to_id || undefined,
          column_id: formData.column_id || undefined,
          tag_ids: formData.tag_ids
        };
        
        savedTicket = await ticketService.updateTicket(ticket.id, updateData);
      } else {
        // Create new ticket
        const createData: CreateTicketData = {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          assigned_to_id: formData.assigned_to_id || undefined,
          column_id: formData.column_id || undefined,
          tag_ids: formData.tag_ids
        };
        
        savedTicket = await ticketService.createTicket(createData);
      }

      if (onSave) {
        onSave(savedTicket);
      }
    } catch (err) {
      console.error('Error saving ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to save ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | number[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagToggle = (tagId: number) => {
    const currentTags = formData.tag_ids;
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    
    handleInputChange('tag_ids', newTags);
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

  if (fetchingData) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e3e3e3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '30px'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '600',
          color: '#2c3e50',
          margin: 0
        }}>
          {isEditing ? `Edit Ticket #${ticket?.id}` : 'Create New Ticket'}
        </h1>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fee',
          color: '#c33',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '14px',
          border: '1px solid #fcc'
        }}>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '30px'
        }}>
          {/* Title */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '8px'
            }}>
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
              placeholder="Enter ticket title..."
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '6px',
                fontSize: '16px',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '8px'
            }}>
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              required
              placeholder="Describe the issue or request in detail..."
              rows={6}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '6px',
                fontSize: '16px',
                fontFamily: 'inherit',
                resize: 'vertical',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            />
          </div>

          {/* Priority, Status, and Assignment Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '20px',
            marginBottom: '25px'
          }}>
            {/* Priority */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '8px'
              }}>
                Priority
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px'
              }}>
                {['low', 'medium', 'high', 'critical'].map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => handleInputChange('priority', priority)}
                    style={{
                      background: formData.priority === priority ? getPriorityColor(priority) : 'white',
                      color: formData.priority === priority ? 'white' : getPriorityColor(priority),
                      border: `2px solid ${getPriorityColor(priority)}`,
                      padding: '10px 15px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s'
                    }}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '8px'
              }}>
                Status
              </label>
              <select
                value={formData.column_id}
                onChange={(e) => handleInputChange('column_id', parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '6px',
                  fontSize: '16px',
                  background: 'white',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              >
                <option value={0}>Select Status</option>
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assign To */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '8px'
              }}>
                Assign To
              </label>
              <select
                value={formData.assigned_to_id}
                onChange={(e) => handleInputChange('assigned_to_id', parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '6px',
                  fontSize: '16px',
                  background: 'white',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              >
                <option value={0}>Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '12px'
              }}>
                Tags
              </label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    style={{
                      background: formData.tag_ids.includes(tag.id) ? '#3498db' : 'white',
                      color: formData.tag_ids.includes(tag.id) ? 'white' : '#3498db',
                      border: '2px solid #3498db',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '15px',
            paddingTop: '20px',
            borderTop: '1px solid #e1e5e9'
          }}>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  background: 'white',
                  color: '#6c757d',
                  border: '2px solid #6c757d',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#6c757d';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = '#6c757d';
                }}
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.description.trim()}
              style={{
                background: (!formData.title.trim() || !formData.description.trim() || loading) ? '#dee2e6' : '#27ae60',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: (!formData.title.trim() || !formData.description.trim() || loading) ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#229954';
                }
              }}
              onMouseOut={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#27ae60';
                }
              }}
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Ticket' : 'Create Ticket')}
            </button>
          </div>
        </div>
      </form>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
