'use client';

import { useState, useEffect } from 'react';
import { subTicketsCreate, subTicketsUpdate, usersList } from '@/api/generated/api';
import type { SubTicket, User, PatchedSubTicket } from '@/api/generated/interfaces';
import SimpleRichTextEditor from './SimpleRichTextEditor';

interface SubTicketFormProps {
  parentTicketId: number;
  subTicket?: SubTicket;
  onSave?: (subTicket: SubTicket) => void;
  onCancel?: () => void;
}

export default function SubTicketForm({ parentTicketId, subTicket, onSave, onCancel }: SubTicketFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rich_description: '',
    description_format: 'html' as 'plain' | 'html' | 'delta',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    assigned_to_id: 0
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingData, setFetchingData] = useState(true);

  const isEditing = !!subTicket;

  useEffect(() => {
    if (subTicket) {
      setFormData({
        title: subTicket.title,
        description: subTicket.description || '',
        rich_description: subTicket.rich_description || ((subTicket.description_format as any) === 'html' ? subTicket.description || '' : ''),
        description_format: (subTicket.description_format as any) || 'html',
        priority: (subTicket.priority as any) || 'medium',
        assigned_to_id: subTicket.assigned_to?.id || 0
      });
    }

    fetchUsers();
  }, [subTicket]);

  const fetchUsers = async () => {
    try {
      setFetchingData(true);
      const usersResult = await usersList();
      setUsers(usersResult.results || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setFetchingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let savedSubTicket: SubTicket;

      if (isEditing && subTicket) {
        const updateData: SubTicket = {
          ...subTicket,
          title: formData.title,
          description: formData.description_format === 'html' ? formData.rich_description : formData.description,
          rich_description: formData.description_format === 'html' ? formData.rich_description : null,
          description_format: formData.description_format as any,
          priority: formData.priority as any,
          assigned_to_id: formData.assigned_to_id || undefined
        };
        
        savedSubTicket = await subTicketsUpdate(subTicket.id.toString(), updateData);
      } else {
        const createData: SubTicket = {
          id: 0,
          parent_ticket: parentTicketId,
          title: formData.title,
          description: formData.description_format === 'html' ? formData.rich_description : formData.description,
          rich_description: formData.description_format === 'html' ? formData.rich_description : null,
          description_format: formData.description_format as any,
          priority: formData.priority as any,
          assigned_to_id: formData.assigned_to_id || undefined,
          is_completed: false,
          position: 0,
          created_at: '',
          updated_at: '',
          created_by: { id: 0, email: '', first_name: '', last_name: '' },
          assigned_to: { id: 0, email: '', first_name: '', last_name: '' },
          assigned_users: [],
          assignments: [],
          checklist_items: [],
          checklist_items_count: '0',
          completed_items_count: '0'
        };
        
        savedSubTicket = await subTicketsCreate(createData);
      }

      if (onSave) {
        onSave(savedSubTicket);
      }
    } catch (err) {
      console.error('Error saving sub-ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to save sub-ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRichTextChange = (html: string) => {
    setFormData(prev => ({
      ...prev,
      rich_description: html,
      description: html.replace(/<[^>]*>/g, '')
    }));
  };

  const handleDescriptionFormatChange = (format: 'plain' | 'html' | 'delta') => {
    setFormData(prev => ({
      ...prev,
      description_format: format
    }));
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
        height: '200px'
      }}>
        <div style={{
          width: '30px',
          height: '30px',
          border: '3px solid #e3e3e3',
          borderTop: '3px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: '20px'
      }}>
        {isEditing ? 'Edit Sub-Ticket' : 'Add Sub-Ticket'}
      </h3>

      {error && (
        <div style={{
          background: '#fee',
          color: '#c33',
          padding: '10px',
          borderRadius: '6px',
          marginBottom: '15px',
          fontSize: '14px',
          border: '1px solid #fcc'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '20px'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '6px'
            }}>
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
              placeholder="Enter sub-ticket title..."
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #e1e5e9',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '6px'
            }}>
              Description Format
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleDescriptionFormatChange('plain')}
                style={{
                  background: formData.description_format === 'plain' ? '#3498db' : 'white',
                  color: formData.description_format === 'plain' ? 'white' : '#3498db',
                  border: '2px solid #3498db',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Plain Text
              </button>
              <button
                type="button"
                onClick={() => handleDescriptionFormatChange('html')}
                style={{
                  background: formData.description_format === 'html' ? '#3498db' : 'white',
                  color: formData.description_format === 'html' ? 'white' : '#3498db',
                  border: '2px solid #3498db',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Rich Text
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '6px'
            }}>
              Description
            </label>
            {formData.description_format === 'html' ? (
              <SimpleRichTextEditor
                value={formData.rich_description}
                onChange={handleRichTextChange}
                placeholder="Describe the sub-ticket..."
              />
            ) : (
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the sub-ticket..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '6px'
              }}>
                Priority
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px'
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
                      padding: '6px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '6px'
              }}>
                Assign To
              </label>
              <select
                value={formData.assigned_to_id}
                onChange={(e) => handleInputChange('assigned_to_id', parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
              >
                <option value={0}>Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '15px',
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
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              style={{
                background: (!formData.title.trim() || loading) ? '#dee2e6' : '#27ae60',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: (!formData.title.trim() || loading) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Saving...' : (isEditing ? 'Update' : 'Add')}
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