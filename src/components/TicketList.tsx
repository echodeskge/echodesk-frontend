'use client';

import { useState, useEffect } from 'react';
import { ticketService, TicketFilters } from '@/services/ticketService';
import { apiColumnsList } from '@/api/generated/api';
import type { TicketList, PaginatedTicketListList, TicketColumn } from '@/api/generated/interfaces';
import AssigneeList from './AssigneeList';
import BulkAssignmentModal from './BulkAssignmentModal';

interface TicketListProps {
  onTicketSelect?: (ticketId: number) => void;
  onCreateTicket?: () => void;
}

export default function TicketList({ onTicketSelect, onCreateTicket }: TicketListProps) {
  const [tickets, setTickets] = useState<PaginatedTicketListList | null>(null);
  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<TicketFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTickets, setSelectedTickets] = useState<Set<number>>(new Set());
  const [bulkAssignmentOpen, setBulkAssignmentOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (columns.length > 0) {
      fetchTickets();
    }
  }, [filters, columns]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch columns first
      const columnsResult = await apiColumnsList();
      setColumns(columnsResult.results || []);
      
      // Then fetch tickets
      const result = await ticketService.getTickets(filters);
      setTickets(result);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

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

  const handleTicketSelect = (ticketId: number, checked: boolean) => {
    const newSelected = new Set(selectedTickets);
    if (checked) {
      newSelected.add(ticketId);
    } else {
      newSelected.delete(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && tickets?.results) {
      const allTicketIds = new Set(tickets.results.map(ticket => ticket.id));
      setSelectedTickets(allTicketIds);
    } else {
      setSelectedTickets(new Set());
    }
  };

  const handleBulkAssignmentSuccess = () => {
    setSelectedTickets(new Set());
    fetchTickets(); // Refresh the list
  };

  const getStatusColor = (ticket: TicketList) => {
    // Use the column color if available, otherwise fallback to defaults
    if (ticket.column?.color) {
      return ticket.column.color;
    }
    
    // Fallback colors based on status string
    const status = ticket.status?.toLowerCase();
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
              value={filters.column || ''}
              onChange={(e) => handleFilterChange('column', parseInt(e.target.value) || undefined)}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">All Statuses</option>
              {columns.map(column => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
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
            {/* Bulk Actions Bar */}
            {selectedTickets.size > 0 && (
              <div style={{
                background: '#e3f2fd',
                border: '1px solid #bbdefb',
                borderRadius: '4px',
                padding: '12px 20px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: '#1976d2',
                  fontWeight: '500'
                }}>
                  {selectedTickets.size} ticket{selectedTickets.size > 1 ? 's' : ''} selected
                </span>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setBulkAssignmentOpen(true)}
                    style={{
                      background: '#1976d2',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Bulk Assign
                  </button>
                  
                  <button
                    onClick={() => setSelectedTickets(new Set())}
                    style={{
                      background: 'white',
                      color: '#1976d2',
                      border: '1px solid #1976d2',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 50px 1fr 120px 100px 120px 120px 80px',
              background: '#f8f9fa',
              padding: '15px 20px',
              borderBottom: '1px solid #dee2e6',
              fontSize: '14px',
              fontWeight: '600',
              color: '#495057'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={tickets?.results ? selectedTickets.size === tickets.results.length && tickets.results.length > 0 : false}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  style={{ margin: 0 }}
                />
              </div>
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
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 50px 1fr 120px 100px 120px 120px 80px',
                  padding: '15px 20px',
                  borderBottom: '1px solid #dee2e6',
                  fontSize: '14px',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedTickets.has(ticket.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleTicketSelect(ticket.id, e.target.checked);
                    }}
                    style={{ margin: 0 }}
                  />
                </div>
                <div style={{ fontWeight: '500', color: '#6c757d' }}>
                  #{ticket.id}
                </div>
                <div 
                  onClick={() => onTicketSelect && onTicketSelect(ticket.id)}
                  style={{
                    fontWeight: '500',
                    color: '#343a40',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: onTicketSelect ? 'pointer' : 'default'
                  }}
                >
                  {ticket.title}
                </div>
                <div>
                  <span style={{
                    background: getStatusColor(ticket),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}>
                    {ticket.column?.name || ticket.status || 'Unknown'}
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
                <div>
                  <AssigneeList
                    assigned_to={ticket.assigned_to}
                    assigned_users={ticket.assigned_users}
                    assignments={ticket.assignments}
                    size="small"
                    maxDisplay={2}
                  />
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
              {filters.search || filters.column || filters.priority ? 
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

      {/* Bulk Assignment Modal */}
      <BulkAssignmentModal
        selectedTickets={tickets?.results?.filter(ticket => selectedTickets.has(ticket.id)) || []}
        isOpen={bulkAssignmentOpen}
        onClose={() => setBulkAssignmentOpen(false)}
        onSuccess={handleBulkAssignmentSuccess}
      />

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
