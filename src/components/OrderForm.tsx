'use client';

import { useState, useEffect } from 'react';
import { apiColumnsList } from '@/api/generated/api';
import type { User, Tag, TicketColumn } from '@/api/generated/interfaces';
import SimpleRichTextEditor from './SimpleRichTextEditor';
import MultiUserAssignment, { AssignmentData } from './MultiUserAssignment';
// For now, we'll use ticket service until we create a specific order service
import { ticketService } from '@/services/ticketService';

interface OrderFormProps {
  boardId: number;
  onSave?: (orderId: number) => void;
  onCancel?: () => void;
}

export default function OrderForm({ boardId, onSave, onCancel }: OrderFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rich_description: '',
    description_format: 'html' as 'plain' | 'html',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    assigned_to_id: 0,
    column_id: 0,
    tag_ids: [] as number[]
  });
  
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    fetchFormData();
  }, [boardId]);

  const fetchFormData = async () => {
    try {
      setFetchingData(true);
      const [usersResult, tagsResult, columnsResult] = await Promise.all([
        ticketService.getUsers(),
        ticketService.getTags(),
        apiColumnsList(boardId) // Get columns for specific board
      ]);
      
      setUsers(usersResult.results || []);
      setTags(tagsResult.results || []);
      setColumns(columnsResult.results || []);
      
      // Auto-assign to first column (as per requirement)
      // Sort columns by position to ensure we get the actual first column
      if (columnsResult.results && columnsResult.results.length > 0) {
        const sortedColumns = [...columnsResult.results].sort((a, b) => (a.position || 0) - (b.position || 0));
        const firstColumn = sortedColumns[0];
        setFormData(prev => ({ ...prev, column_id: firstColumn.id }));
      }
    } catch (err) {
      console.error('Error fetching form data:', err);
      setError('Failed to load form data');
    } finally {
      setFetchingData(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRichTextChange = (value: string) => {
    setFormData(prev => ({ ...prev, rich_description: value }));
  };

  const handleDescriptionFormatChange = (format: 'plain' | 'html') => {
    setFormData(prev => ({ 
      ...prev, 
      description_format: format,
      // Clear the other format when switching
      rich_description: format === 'html' ? prev.rich_description : '',
      description: format === 'plain' ? prev.description : ''
    }));
  };

  const handleTagToggle = (tagId: number) => {
    setFormData(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId]
    }));
  };

  const handleAssignmentsChange = (newAssignments: AssignmentData[]) => {
    setAssignments(newAssignments);
    
    // Set primary assignment as assigned_to_id
    const primaryAssignment = newAssignments.find(a => a.role === 'primary');
    if (primaryAssignment) {
      setFormData(prev => ({ ...prev, assigned_to_id: primaryAssignment.userId }));
    } else if (newAssignments.length > 0) {
      setFormData(prev => ({ ...prev, assigned_to_id: newAssignments[0].userId }));
    } else {
      setFormData(prev => ({ ...prev, assigned_to_id: 0 }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Prepare order data (similar to ticket creation)
      const orderData = {
        title: formData.title,
        description: formData.description_format === 'html' ? formData.rich_description : formData.description,
        rich_description: formData.description_format === 'html' ? formData.rich_description : '',
        description_format: formData.description_format,
        priority: formData.priority,
        assigned_to_id: formData.assigned_to_id || undefined,
        column_id: formData.column_id,
        tag_ids: formData.tag_ids,
        assignments,
        is_order: true // This will distinguish orders from tickets
      };

      // Create as a ticket with is_order flag - will be auto-assigned to first column
      const response = await ticketService.createTicket(orderData);
      
      if (onSave) {
        onSave(response.id);
      }
    } catch (err: any) {
      console.error('Error creating order:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
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
          📝 Create New Order
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
          {/* Order Assignment Notice */}
          <div style={{
            background: '#e7f3ff',
            border: '1px solid #bee5eb',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '25px',
            fontSize: '14px',
            color: '#0c5460'
          }}>
            <strong>📋 Order Assignment:</strong> This order will be automatically assigned to the first column (position 0) of the board, regardless of which column you may see selected below.
          </div>

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
              placeholder="Enter order title..."
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

          {/* Description Format Toggle */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '8px'
            }}>
              Description Format
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleDescriptionFormatChange('plain')}
                style={{
                  background: formData.description_format === 'plain' ? '#3498db' : 'white',
                  color: formData.description_format === 'plain' ? 'white' : '#3498db',
                  border: '2px solid #3498db',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
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
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Rich Text
              </button>
            </div>
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
            {formData.description_format === 'html' ? (
              <SimpleRichTextEditor
                value={formData.rich_description}
                onChange={handleRichTextChange}
                placeholder="Describe the order requirements in detail..."
              />
            ) : (
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                required
                placeholder="Describe the order requirements in detail..."
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
            )}
          </div>

          {/* Priority */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '8px'
            }}>
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '6px',
                fontSize: '16px',
                background: 'white',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🟠 High</option>
              <option value="critical">🔴 Critical</option>
            </select>
          </div>

          {/* User Assignment */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '8px'
            }}>
              Assign Users
            </label>
            <MultiUserAssignment
              users={users}
              selectedAssignments={assignments}
              onChange={handleAssignmentsChange}
            />
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '8px'
              }}>
                Tags (Optional)
              </label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
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
                      padding: '6px 12px',
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
            gap: '15px',
            justifyContent: 'flex-end',
            paddingTop: '20px',
            borderTop: '1px solid #e1e5e9'
          }}>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  border: '2px solid #95a5a6',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: 'white',
                  color: '#95a5a6',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                border: '2px solid #27ae60',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#95a5a6' : '#27ae60',
                color: 'white',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Creating Order...' : '✅ Create Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}