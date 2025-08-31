'use client';

import { useState, useEffect } from 'react';
import { ticketService } from '@/services/ticketService';
import type { Ticket, TicketComment, User } from '@/api/generated/interfaces';
import SubTicketList from './SubTicketList';
import ChecklistItemList from './ChecklistItemList';

interface TicketDetailProps {
  ticketId: number;
  onBack?: () => void;
  onEdit?: (ticket: Ticket) => void;
}

export default function TicketDetail({ ticketId, onBack, onEdit }: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchTicket();
    fetchUsers();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const result = await ticketService.getTicket(ticketId);
      setTicket(result);
    } catch (err) {
      console.error('Error fetching ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ticket');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const result = await ticketService.getUsers();
      setUsers(result.results || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmittingComment(true);
      await ticketService.addComment(ticketId, commentText);
      setCommentText('');
      await fetchTicket(); // Refresh ticket to get new comment
    } catch (err) {
      console.error('Error adding comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!ticket) return;

    try {
      const updatedTicket = await ticketService.updateTicket(ticket.id, { 
        status: status as any 
      });
      setTicket(updatedTicket);
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleAssign = async (userId: number) => {
    if (!ticket) return;

    try {
      const updatedTicket = await ticketService.assignTicket(ticket.id, userId);
      setTicket(updatedTicket);
    } catch (err) {
      console.error('Error assigning ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign ticket');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#e74c3c';
      case 'in_progress': return '#f39c12';
      case 'resolved': return '#27ae60';
      case 'closed': return '#95a5a6';
      default: return '#3498db';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
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

  if (error && !ticket) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px'
        }}>
          ⚠️
        </div>
        <h3 style={{
          fontSize: '20px',
          marginBottom: '10px',
          color: '#e74c3c'
        }}>
          Error Loading Ticket
        </h3>
        <p style={{
          fontSize: '16px',
          color: '#6c757d',
          marginBottom: '20px'
        }}>
          {error}
        </p>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'none',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ←
            </button>
          )}
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#2c3e50',
              margin: '0 0 5px 0'
            }}>
              Ticket #{ticket.id}
            </h1>
            <p style={{
              color: '#6c757d',
              margin: 0,
              fontSize: '14px'
            }}>
              Created {formatDate(ticket.created_at)} by {ticket.created_by.first_name} {ticket.created_by.last_name}
            </p>
          </div>
        </div>
        
        {onEdit && (
          <button
            onClick={() => onEdit(ticket)}
            style={{
              background: '#3498db',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Edit Ticket
          </button>
        )}
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px'
      }}>
        {/* Main Content */}
        <div>
          {/* Ticket Info */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '25px',
            marginBottom: '20px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#2c3e50',
              margin: '0 0 15px 0'
            }}>
              {ticket.title}
            </h2>
            
            <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <span style={{
                background: getStatusColor(ticket.status as any),
                color: 'white',
                padding: '6px 12px',
                borderRadius: '15px',
                fontSize: '12px',
                fontWeight: '500',
                textTransform: 'capitalize'
              }}>
                {(ticket.status as any)?.replace('_', ' ') || 'Unknown'}
              </span>
              <span style={{
                background: getPriorityColor(ticket.priority as any),
                color: 'white',
                padding: '6px 12px',
                borderRadius: '15px',
                fontSize: '12px',
                fontWeight: '500',
                textTransform: 'capitalize'
              }}>
                {ticket.priority as any || 'None'} Priority
              </span>
            </div>

            <div style={{
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              padding: '20px',
              lineHeight: '1.6',
              color: '#495057'
            }}>
              {(ticket.description_format as any) === 'html' && ticket.rich_description ? (
                <div dangerouslySetInnerHTML={{ __html: ticket.rich_description }} />
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</div>
              )}
            </div>

            {/* Tags */}
            {ticket.tags && ticket.tags.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#6c757d',
                  margin: '0 0 10px 0'
                }}>
                  Tags
                </h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {ticket.tags.map((tag) => (
                    <span
                      key={tag.id}
                      style={{
                        background: '#e9ecef',
                        color: '#495057',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist Items */}
            <ChecklistItemList
              ticketId={ticket.id}
              items={ticket.checklist_items || []}
              onItemsChange={fetchTicket}
            />
          </div>

          {/* Sub-tickets */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '25px',
            marginBottom: '20px'
          }}>
            <SubTicketList
              parentTicketId={ticket.id}
              subTickets={ticket.sub_tickets || []}
              onSubTicketsChange={fetchTicket}
            />
          </div>

          {/* Comments */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '25px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#2c3e50',
              margin: '0 0 20px 0'
            }}>
              Comments ({ticket.comments_count})
            </h3>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} style={{ marginBottom: '30px' }}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '10px'
              }}>
                <button
                  type="submit"
                  disabled={!commentText.trim() || submittingComment}
                  style={{
                    background: !commentText.trim() || submittingComment ? '#dee2e6' : '#27ae60',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: !commentText.trim() || submittingComment ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingComment ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      padding: '15px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#495057'
                      }}>
                        {comment.user.first_name} {comment.user.last_name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6c757d'
                      }}>
                        {formatDate(comment.created_at)}
                      </div>
                    </div>
                    <div style={{
                      color: '#495057',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {comment.comment}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6c757d'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>💬</div>
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Status Actions */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#2c3e50',
              margin: '0 0 15px 0'
            }}>
              Actions
            </h4>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#6c757d',
                marginBottom: '5px'
              }}>
                Status
              </label>
              <select
                value={ticket.status as any || ''}
                onChange={(e) => handleStatusChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#6c757d',
                marginBottom: '5px'
              }}>
                Assign To
              </label>
              <select
                value={ticket.assigned_to?.id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    handleAssign(parseInt(e.target.value));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ticket Info */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '20px'
          }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#2c3e50',
              margin: '0 0 15px 0'
            }}>
              Ticket Information
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '2px'
                }}>
                  Created By
                </div>
                <div style={{ fontSize: '14px', color: '#495057' }}>
                  {ticket.created_by.first_name} {ticket.created_by.last_name}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '2px'
                }}>
                  Assigned To
                </div>
                <div style={{ fontSize: '14px', color: '#495057' }}>
                  {ticket.assigned_to ? 
                    `${ticket.assigned_to.first_name} ${ticket.assigned_to.last_name}` : 
                    'Unassigned'
                  }
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '2px'
                }}>
                  Created Date
                </div>
                <div style={{ fontSize: '14px', color: '#495057' }}>
                  {formatDate(ticket.created_at)}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '2px'
                }}>
                  Last Updated
                </div>
                <div style={{ fontSize: '14px', color: '#495057' }}>
                  {formatDate(ticket.updated_at)}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6c757d',
                  marginBottom: '2px'
                }}>
                  Progress
                </div>
                <div style={{ fontSize: '12px', color: '#495057', lineHeight: '1.4' }}>
                  <div>Sub-tickets: {ticket.completed_sub_tickets_count}/{ticket.sub_tickets_count}</div>
                  <div>Checklist: {ticket.completed_checklist_items_count}/{ticket.checklist_items_count}</div>
                  <div>Comments: {ticket.comments_count}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
