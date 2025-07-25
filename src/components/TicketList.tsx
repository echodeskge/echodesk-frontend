'use client';

import { useState, useEffect } from 'react';
import { ticketService, TicketFilters } from '@/services/ticketService';
import type { TicketList, PaginatedTicketListList } from '@/api/generated/interfaces';

interface TicketListProps {
  onTicketSelect?: (ticketId: number) => void;
  onCreateTicket?: () => void;
}

export default function TicketList({ onTicketSelect, onCreateTicket }: TicketListProps) {
  const [tickets, setTickets] = useState<PaginatedTicketListList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<TicketFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const result = await ticketService.getTickets(filters);
      setTickets(result);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, search: searchTerm, page: 1 });
  };

  const handleFilterChange = (key: keyof TicketFilters, value: string | number | undefined) => {
    setFilters({ ...filters, [key]: value || undefined, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
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

  if (loading && !tickets) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px'
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
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '600',
          color: '#2c3e50',
          margin: 0
        }}>
          Tickets
        </h1>
        {onCreateTicket && (
          <button
            onClick={onCreateTicket}
            style={{
              background: '#3498db',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2980b9'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3498db'}
          >
            + New Ticket
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <form onSubmit={handleSearch} style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto auto auto',
          gap: '15px',
          alignItems: 'end'
        }}>
          {/* Search */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#555'
            }}>
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tickets..."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#555'
            }}>
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value as any)}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#555'
            }}>
              Priority
            </label>
            <select
              value={filters.priority || ''}
              onChange={(e) => handleFilterChange('priority', e.target.value as any)}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#555'
            }}>
              Sort By
            </label>
            <select
              value={filters.ordering || ''}
              onChange={(e) => handleFilterChange('ordering', e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">Default</option>
              <option value="-created_at">Newest First</option>
              <option value="created_at">Oldest First</option>
              <option value="-updated_at">Recently Updated</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
          </div>

          {/* Search Button */}
          <button
            type="submit"
            style={{
              background: '#27ae60',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Search
          </button>

          {/* Clear Filters */}
          <button
            type="button"
            onClick={() => {
              setFilters({});
              setSearchTerm('');
            }}
            style={{
              background: '#95a5a6',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        </form>
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

      {/* Tickets List */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {tickets && tickets.results && tickets.results.length > 0 ? (
          <>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '50px 1fr 120px 100px 120px 120px 80px',
              background: '#f8f9fa',
              padding: '15px 20px',
              borderBottom: '1px solid #dee2e6',
              fontSize: '14px',
              fontWeight: '600',
              color: '#495057'
            }}>
              <div>ID</div>
              <div>Title</div>
              <div>Status</div>
              <div>Priority</div>
              <div>Assigned To</div>
              <div>Created</div>
              <div>Comments</div>
            </div>

            {/* Table Rows */}
            {tickets.results.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => onTicketSelect && onTicketSelect(ticket.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 120px 100px 120px 120px 80px',
                  padding: '15px 20px',
                  borderBottom: '1px solid #dee2e6',
                  fontSize: '14px',
                  cursor: onTicketSelect ? 'pointer' : 'default',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  if (onTicketSelect) {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ fontWeight: '500', color: '#6c757d' }}>
                  #{ticket.id}
                </div>
                <div style={{
                  fontWeight: '500',
                  color: '#343a40',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {ticket.title}
                </div>
                <div>
                  <span style={{
                    background: getStatusColor(ticket.status as any),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}>
                    {(ticket.status as any)?.replace('_', ' ') || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span style={{
                    background: getPriorityColor(ticket.priority as any),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}>
                    {ticket.priority as any || 'None'}
                  </span>
                </div>
                <div style={{ color: '#6c757d' }}>
                  {ticket.assigned_to ? 
                    `${ticket.assigned_to.first_name} ${ticket.assigned_to.last_name}`.trim() || 
                    ticket.assigned_to.email : 
                    'Unassigned'
                  }
                </div>
                <div style={{ color: '#6c757d' }}>
                  {formatDate(ticket.created_at)}
                </div>
                <div style={{
                  textAlign: 'center',
                  color: '#6c757d',
                  fontWeight: '500'
                }}>
                  {ticket.comments_count}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6c757d'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px'
            }}>
              📋
            </div>
            <h3 style={{
              fontSize: '20px',
              marginBottom: '10px',
              color: '#495057'
            }}>
              No tickets found
            </h3>
            <p style={{
              fontSize: '16px',
              marginBottom: '20px'
            }}>
              {filters.search || filters.status || filters.priority ? 
                'Try adjusting your filters to see more results.' :
                'Get started by creating your first ticket.'
              }
            </p>
            {onCreateTicket && (
              <button
                onClick={onCreateTicket}
                style={{
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Create First Ticket
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {tickets && (tickets.previous || tickets.next) && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            padding: '20px',
            borderTop: '1px solid #dee2e6',
            background: '#f8f9fa'
          }}>
            <button
              onClick={() => handlePageChange((filters.page || 1) - 1)}
              disabled={!tickets.previous}
              style={{
                background: tickets.previous ? '#6c757d' : '#dee2e6',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: tickets.previous ? 'pointer' : 'not-allowed'
              }}
            >
              Previous
            </button>
            <span style={{
              fontSize: '14px',
              color: '#6c757d'
            }}>
              Page {filters.page || 1}
            </span>
            <button
              onClick={() => handlePageChange((filters.page || 1) + 1)}
              disabled={!tickets.next}
              style={{
                background: tickets.next ? '#6c757d' : '#dee2e6',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: tickets.next ? 'pointer' : 'not-allowed'
              }}
            >
              Next
            </button>
          </div>
        )}
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
