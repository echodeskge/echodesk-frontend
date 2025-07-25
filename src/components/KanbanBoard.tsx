'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ticketsList, ticketsPartialUpdate } from '@/api/generated/api';
import type { Ticket, TicketList } from '@/api/generated/interfaces';

interface KanbanBoardProps {
  onTicketClick?: (ticketId: number) => void;
  onCreateTicket?: () => void;
}

// Define the status columns for the Kanban board
const STATUS_COLUMNS = [
  {
    id: 'open',
    name: 'Open',
    description: 'New tickets that need attention',
    color: '#17a2b8'
  },
  {
    id: 'in_progress',
    name: 'In Progress',
    description: 'Tickets currently being worked on',
    color: '#ffc107'
  },
  {
    id: 'resolved',
    name: 'Resolved',
    description: 'Tickets that have been fixed',
    color: '#28a745'
  },
  {
    id: 'closed',
    name: 'Closed',
    description: 'Completed tickets',
    color: '#6c757d'
  }
] as const;

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export default function KanbanBoard({ onTicketClick, onCreateTicket }: KanbanBoardProps) {
  const [tickets, setTickets] = useState<{ [status: string]: TicketList[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      
      // Fetch all tickets
      const response = await ticketsList();
      const allTickets = response.results;
      
      // Group tickets by status
      const ticketsByStatus: { [status: string]: TicketList[] } = {};
      
      // Initialize all status columns
      STATUS_COLUMNS.forEach(column => {
        ticketsByStatus[column.id] = [];
      });
      
      // Group tickets by their status
      allTickets.forEach(ticket => {
        const status = String(ticket.status || 'open') as unknown as string;
        if (ticketsByStatus[status]) {
          ticketsByStatus[status].push(ticket);
        } else {
          // If status doesn't match our predefined statuses, put in open
          ticketsByStatus['open'].push(ticket);
        }
      });
      
      setTickets(ticketsByStatus);
      setError('');
    } catch (err: unknown) {
      console.error('Failed to fetch tickets:', err);
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If dropped outside any droppable area
    if (!destination) {
      return;
    }

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId as TicketStatus;
    const destStatus = destination.droppableId as TicketStatus;
    const ticketId = parseInt(draggableId);

    // Store the current state for rollback
    const originalTickets = { ...tickets };

    // Find the ticket being moved
    const sourceTickets = [...(tickets[sourceStatus] || [])];
    const movedTicket = sourceTickets.find(ticket => ticket.id === ticketId);
    
    if (!movedTicket) {
      console.error('Could not find ticket to move');
      return;
    }

    // Create new tickets state
    const newTickets = { ...tickets };
    const newSourceTickets = [...(newTickets[sourceStatus] || [])];
    const newDestTickets = sourceStatus === destStatus 
      ? newSourceTickets 
      : [...(newTickets[destStatus] || [])];

    // Remove from source
    const sourceIndex = newSourceTickets.findIndex(ticket => ticket.id === ticketId);
    if (sourceIndex === -1) {
      console.error('Could not find ticket in source column');
      return;
    }
    
    const [removedTicket] = newSourceTickets.splice(sourceIndex, 1);

    // Add to destination at the correct position
    if (sourceStatus === destStatus) {
      // Moving within the same status column (just reordering)
      newSourceTickets.splice(destination.index, 0, removedTicket);
      newTickets[sourceStatus] = newSourceTickets;
    } else {
      // Moving to a different status
      newDestTickets.splice(destination.index, 0, removedTicket);
      newTickets[sourceStatus] = newSourceTickets;
      newTickets[destStatus] = newDestTickets;
    }

    // Update state optimistically
    setTickets(newTickets);
    setIsMoving(true);

    try {
      // Only update status if moving between different statuses
      if (sourceStatus !== destStatus) {
        await ticketsPartialUpdate(ticketId, {
          status: destStatus as any
        });
      }
      
      // Refresh tickets to ensure consistency
      await fetchTickets();
    } catch (err: unknown) {
      console.error('Failed to update ticket status:', err);
      // Revert on error
      setTickets(originalTickets);
      setError('Failed to move ticket. Please try again.');
      
      // Clear error after 3 seconds
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsMoving(false);
    }
  };

  const getPriorityColor = (priority?: any) => {
    if (!priority) return '#6c757d';
    const priorityStr = String(priority).toLowerCase();
    switch (priorityStr) {
      case 'high': return '#dc3545';
      case 'medium': return '#fd7e14';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
          border: '4px solid #e9ecef',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  if (error && loading) {
    return (
      <div style={{
        background: '#fee',
        color: '#c33',
        padding: '16px',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        {error}
        <button
          onClick={fetchTickets}
          style={{
            marginLeft: '10px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!Object.keys(tickets).length && !loading) {
    return <div>No tickets available</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#dc3545',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(220,53,69,0.3)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          maxWidth: '300px'
        }}>
          <span>⚠️</span>
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0',
              marginLeft: '8px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          margin: 0,
          color: '#333'
        }}>
          Kanban Board
        </h2>
        {onCreateTicket && (
          <button
            onClick={onCreateTicket}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            + Create Ticket
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        {isMoving && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #007bff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Moving ticket...
            </div>
          </div>
        )}
        <div style={{
          display: 'flex',
          gap: '20px',
          overflowX: 'auto',
          paddingBottom: '20px'
        }}>
          {STATUS_COLUMNS.map((column) => (
            <div
              key={column.id}
              style={{
                minWidth: '300px',
                maxWidth: '300px',
                background: '#f8f9fa',
                borderRadius: '8px',
                padding: '16px'
              }}
            >
              {/* Column Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: column.color
                  }}></div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: 0,
                    color: '#333'
                  }}>
                    {column.name}
                  </h3>
                </div>
                <span style={{
                  background: '#dee2e6',
                  color: '#495057',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {tickets[column.id]?.length || 0}
                </span>
              </div>

              {/* Column Description */}
              <p style={{
                fontSize: '12px',
                color: '#6c757d',
                margin: '0 0 16px 0'
              }}>
                {column.description}
              </p>

              {/* Droppable Area */}
              <Droppable droppableId={String(column.id)}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minHeight: '200px',
                      background: snapshot.isDraggingOver ? '#e3f2fd' : 'transparent',
                      borderRadius: '4px',
                      border: snapshot.isDraggingOver ? '2px dashed #007bff' : '2px dashed transparent',
                      transition: 'all 0.2s ease',
                      padding: '8px'
                    }}
                  >
                    {(tickets[column.id] || []).map((ticket, index) => (
                      <Draggable
                        key={ticket.id}
                        draggableId={String(ticket.id)}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => onTicketClick?.(ticket.id)}
                            style={{
                              ...provided.draggableProps.style,
                              background: snapshot.isDragging ? '#fff' : '#fff',
                              border: snapshot.isDragging ? '2px solid #007bff' : '1px solid #dee2e6',
                              borderRadius: '6px',
                              padding: '12px',
                              marginBottom: '8px',
                              cursor: 'pointer',
                              boxShadow: snapshot.isDragging 
                                ? '0 8px 25px rgba(0,123,255,0.3)' 
                                : '0 1px 3px rgba(0,0,0,0.1)',
                              transform: snapshot.isDragging 
                                ? `${provided.draggableProps.style?.transform} rotate(3deg)` 
                                : provided.draggableProps.style?.transform || 'none',
                              transition: snapshot.isDragging ? 'none' : 'all 0.2s ease',
                              opacity: snapshot.isDragging ? 0.9 : 1
                            }}
                          >
                            {/* Ticket Priority Indicator */}
                            <div style={{
                              width: '100%',
                              height: '3px',
                              background: getPriorityColor(ticket.priority),
                              borderRadius: '2px',
                              marginBottom: '8px'
                            }}></div>

                            {/* Ticket Title */}
                            <h4 style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              margin: '0 0 6px 0',
                              color: '#333',
                              lineHeight: '1.3'
                            }}>
                              {ticket.title}
                            </h4>

                            {/* Ticket Meta */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '11px',
                              color: '#6c757d',
                              marginBottom: '8px'
                            }}>
                              <span>#{ticket.id}</span>
                              <span>{formatDate(ticket.created_at)}</span>
                            </div>

                            {/* Assigned User */}
                            {ticket.assigned_to && (
                              <div style={{
                                marginBottom: '8px',
                                fontSize: '11px',
                                color: '#495057'
                              }}>
                                👤 {ticket.assigned_to.first_name} {ticket.assigned_to.last_name}
                              </div>
                            )}

                            {/* Tags */}
                            {ticket.tags && ticket.tags.length > 0 && (
                              <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '4px'
                              }}>
                                {ticket.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag.id}
                                    style={{
                                      background: '#e9ecef',
                                      color: '#495057',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '10px'
                                    }}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                                {ticket.tags.length > 3 && (
                                  <span style={{
                                    color: '#6c757d',
                                    fontSize: '10px'
                                  }}>
                                    +{ticket.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
