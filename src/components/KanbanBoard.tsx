'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { kanbanBoard, ticketsPartialUpdate } from '@/api/generated/api';
import type { KanbanBoard as KanbanBoardType, Ticket, TicketColumn } from '@/api/generated/interfaces';

interface KanbanBoardProps {
  onTicketClick?: (ticketId: number) => void;
  onCreateTicket?: () => void;
}

export default function KanbanBoard({ onTicketClick, onCreateTicket }: KanbanBoardProps) {
  const [boardData, setBoardData] = useState<KanbanBoardType | null>(null);
  const [tickets, setTickets] = useState<{ [columnId: string]: Ticket[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBoardData();
  }, []);

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      const board = await kanbanBoard();
      setBoardData(board);
      
      // Parse tickets by column if it's a string
      if (typeof board.tickets_by_column === 'string') {
        const ticketsByColumn = JSON.parse(board.tickets_by_column);
        setTickets(ticketsByColumn);
      } else {
        setTickets(board.tickets_by_column as any);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch board data:', err);
      setError('Failed to load kanban board');
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

    const sourceColumnId = source.droppableId;
    const destColumnId = destination.droppableId;
    const ticketId = parseInt(draggableId);

    // Create new tickets state
    const newTickets = { ...tickets };
    const sourceTickets = [...(newTickets[sourceColumnId] || [])];
    const destTickets = sourceColumnId === destColumnId 
      ? sourceTickets 
      : [...(newTickets[destColumnId] || [])];

    // Remove from source
    const [movedTicket] = sourceTickets.splice(source.index, 1);
    
    // Add to destination
    if (sourceColumnId === destColumnId) {
      sourceTickets.splice(destination.index, 0, movedTicket);
      newTickets[sourceColumnId] = sourceTickets;
    } else {
      destTickets.splice(destination.index, 0, movedTicket);
      newTickets[sourceColumnId] = sourceTickets;
      newTickets[destColumnId] = destTickets;
    }

    // Update state optimistically
    setTickets(newTickets);

    try {
      // Update ticket in backend
      await ticketsPartialUpdate(ticketId, {
        column_id: parseInt(destColumnId),
        position_in_column: destination.index
      });
    } catch (err: unknown) {
      console.error('Failed to update ticket position:', err);
      // Revert on error
      setTickets(tickets);
      setError('Failed to move ticket');
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

  if (error) {
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
          onClick={fetchBoardData}
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

  if (!boardData) {
    return <div>No board data available</div>;
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
        <div style={{
          display: 'flex',
          gap: '20px',
          overflowX: 'auto',
          paddingBottom: '20px'
        }}>
          {boardData.columns
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map((column) => (
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
                  {column.color && (
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: column.color
                    }}></div>
                  )}
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
              {column.description && (
                <p style={{
                  fontSize: '12px',
                  color: '#6c757d',
                  margin: '0 0 16px 0'
                }}>
                  {column.description}
                </p>
              )}

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
                    {(tickets[column.id] || [])
                      .sort((a, b) => (a.position_in_column || 0) - (b.position_in_column || 0))
                      .map((ticket, index) => (
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

                            {/* Ticket Description */}
                            {ticket.description && (
                              <p style={{
                                fontSize: '12px',
                                color: '#6c757d',
                                margin: '0 0 8px 0',
                                lineHeight: '1.4',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {ticket.description}
                              </p>
                            )}

                            {/* Ticket Meta */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '11px',
                              color: '#6c757d'
                            }}>
                              <span>#{ticket.id}</span>
                              <span>{formatDate(ticket.created_at)}</span>
                            </div>

                            {/* Assigned User */}
                            {ticket.assigned_to && (
                              <div style={{
                                marginTop: '8px',
                                fontSize: '11px',
                                color: '#495057'
                              }}>
                                👤 {ticket.assigned_to.first_name} {ticket.assigned_to.last_name}
                              </div>
                            )}

                            {/* Tags */}
                            {ticket.tags && ticket.tags.length > 0 && (
                              <div style={{
                                marginTop: '8px',
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
