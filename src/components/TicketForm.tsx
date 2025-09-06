'use client';

import { useState, useEffect } from 'react';
import { ticketService, CreateTicketData, UpdateTicketData } from '@/services/ticketService';
import { columnsList, boardsList } from '@/api/generated/api';
import type { Ticket, User, Tag, TicketColumn, Board } from '@/api/generated/interfaces';
import SimpleRichTextEditor from './SimpleRichTextEditor';
import MultiUserAssignment, { AssignmentData } from './MultiUserAssignment';

interface TicketFormProps {
  ticket?: Ticket; // If provided, we're editing; otherwise creating
  onSave?: (ticket: Ticket) => void;
  onCancel?: () => void;
}

export default function TicketForm({ ticket, onSave, onCancel }: TicketFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rich_description: '',
    description_format: 'html' as 'plain' | 'html' | 'delta',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    assigned_to_id: 0,
    board_id: 0,
    column_id: 0,
    tag_ids: [] as number[]
  });
  
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [allColumns, setAllColumns] = useState<TicketColumn[]>([]);
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
        rich_description: ticket.rich_description || ((ticket.description_format as any) === 'html' ? ticket.description : ''),
        description_format: (ticket.description_format as any) || 'html',
        priority: (ticket.priority as any) || 'medium',
        assigned_to_id: ticket.assigned_to?.id || 0,
        board_id: ticket.column?.board || 0,
        column_id: ticket.column?.id || 0,
        tag_ids: ticket.tags ? ticket.tags.map(tag => tag.id) : []
      });

      // Initialize assignments from existing ticket
      if (ticket.assignments && ticket.assignments.length > 0) {
        const existingAssignments: AssignmentData[] = ticket.assignments.map(assignment => ({
          userId: assignment.user.id,
          role: (assignment.role as any) || 'collaborator'
        }));
        setAssignments(existingAssignments);
      } else if (ticket.assigned_to) {
        // If no multi-assignments but has assigned_to, create assignment
        setAssignments([{
          userId: ticket.assigned_to.id,
          role: 'primary'
        }]);
      }
    }

    // Fetch users and tags
    fetchFormData();
  }, [ticket]);

  // Filter columns based on selected board
  useEffect(() => {
    if (formData.board_id && allColumns.length > 0) {
      const filteredColumns = allColumns.filter(col => col.board === formData.board_id);
      setColumns(filteredColumns);
      
      // Reset column selection if current column doesn't belong to selected board
      if (formData.column_id && !filteredColumns.find(col => col.id === formData.column_id)) {
        // Set default column for the selected board or first column
        const defaultColumn = filteredColumns.find(col => col.is_default) || filteredColumns[0];
        setFormData(prev => ({ 
          ...prev, 
          column_id: defaultColumn ? defaultColumn.id : 0 
        }));
      }
    } else {
      setColumns([]);
    }
  }, [formData.board_id, allColumns]);

  const fetchFormData = async () => {
    try {
      setFetchingData(true);
      const [usersResult, tagsResult, boardsResult, columnsResult] = await Promise.all([
        ticketService.getUsers(),
        ticketService.getTags(),
        boardsList(),
        columnsList()
      ]);
      
      setUsers(usersResult.results || []);
      setTags(tagsResult.results || []);
      setBoards(boardsResult.results || []);
      setAllColumns(columnsResult.results || []);
      
      // Set default board if creating new ticket
      if (!ticket && boardsResult.results && boardsResult.results.length > 0 && formData.board_id === 0) {
        const defaultBoard = boardsResult.results.find(board => board.is_default) || boardsResult.results[0];
        setFormData(prev => ({ ...prev, board_id: defaultBoard.id }));
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

      // Prepare assignment data
      const assigned_user_ids = assignments.map(a => a.userId);
      const assignment_roles: Record<string, string> = {};
      assignments.forEach(a => {
        assignment_roles[a.userId.toString()] = a.role;
      });

      // Set primary assignee (first primary role or first assignment)
      const primaryAssignment = assignments.find(a => a.role === 'primary') || assignments[0];
      const assigned_to_id = primaryAssignment?.userId || formData.assigned_to_id || undefined;

      if (isEditing && ticket) {
        // Update existing ticket
        const updateData: UpdateTicketData = {
          title: formData.title,
          description: formData.description_format === 'html' ? formData.rich_description : formData.description,
          rich_description: formData.description_format === 'html' ? formData.rich_description : null,
          description_format: formData.description_format,
          priority: formData.priority,
          assigned_to_id,
          assigned_user_ids,
          assignment_roles,
          column_id: formData.column_id || undefined,
          tag_ids: formData.tag_ids
        };
        
        savedTicket = await ticketService.updateTicket(ticket.id, updateData);
      } else {
        // Create new ticket
        const createData: CreateTicketData = {
          title: formData.title,
          description: formData.description_format === 'html' ? formData.rich_description : formData.description,
          rich_description: formData.description_format === 'html' ? formData.rich_description : null,
          description_format: formData.description_format,
          priority: formData.priority,
          assigned_to_id,
          assigned_user_ids,
          assignment_roles,
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

  const handleRichTextChange = (html: string) => {
    setFormData(prev => ({
      ...prev,
      rich_description: html,
      // Keep plain description in sync for fallback
      description: html.replace(/<[^>]*>/g, '') // Strip HTML tags for plain text fallback
    }));
  };

  const handleDescriptionFormatChange = (format: 'plain' | 'html' | 'delta') => {
    setFormData(prev => ({
      ...prev,
      description_format: format
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
                placeholder="Describe the issue or request in detail..."
              />
            ) : (
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
            )}
          </div>

          {/* Board Selection */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '8px'
            }}>
              Board *
            </label>
            <select
              value={formData.board_id}
              onChange={(e) => handleInputChange('board_id', parseInt(e.target.value) || 0)}
              required
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
              <option value={0}>Select Board</option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name} {board.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Priority and Status Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
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
                disabled={!formData.board_id || columns.length === 0}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '6px',
                  fontSize: '16px',
                  background: (!formData.board_id || columns.length === 0) ? '#f8f9fa' : 'white',
                  color: (!formData.board_id || columns.length === 0) ? '#6c757d' : '#000',
                  cursor: (!formData.board_id || columns.length === 0) ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              >
                {!formData.board_id ? (
                  <option value={0}>Select a board first</option>
                ) : columns.length === 0 ? (
                  <option value={0}>No statuses available for this board</option>
                ) : (
                  <>
                    <option value={0}>Select Status</option>
                    {columns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

          </div>

          {/* Multi-User Assignment */}
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
              assignments={ticket?.assignments}
              selectedAssignments={assignments}
              onChange={setAssignments}
              disabled={loading}
              placeholder="Select users to assign to this ticket..."
            />
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
              disabled={loading || !formData.title.trim() || (!formData.description.trim() && !formData.rich_description.trim()) || !formData.board_id}
              style={{
                background: (!formData.title.trim() || (!formData.description.trim() && !formData.rich_description.trim()) || !formData.board_id || loading) ? '#dee2e6' : '#27ae60',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: (!formData.title.trim() || (!formData.description.trim() && !formData.rich_description.trim()) || !formData.board_id || loading) ? 'not-allowed' : 'pointer',
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
