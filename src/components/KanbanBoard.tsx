'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
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

interface DragItem {
  type: string;
  id: number;
  status: TicketStatus;
  index: number;
}

// Helper functions
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

// Draggable Ticket Component
function DraggableTicket({ 
  ticket, 
  index, 
  onTicketClick,
  onMoveTicket 
}: { 
  ticket: TicketList;
  index: number;
  onTicketClick?: (ticketId: number) => void;
  onMoveTicket: (ticketId: number, sourceStatus: TicketStatus, destStatus: TicketStatus, sourceIndex: number, destIndex: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, dragRef] = useDrag({
    type: 'ticket',
    item: (): DragItem => ({
      type: 'ticket',
      id: ticket.id,
      status: String(ticket.status || 'open') as TicketStatus,
      index
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, dropRef] = useDrop({
    accept: 'ticket',
    hover: (item: DragItem) => {
      if (!item || item.id === ticket.id) {
        return;
      }
      
      const dragStatus = item.status;
      const hoverStatus = String(ticket.status || 'open') as TicketStatus;
      const dragIndex = item.index;
      const hoverIndex = index;

      // If dragging to same status and same position, do nothing
      if (dragStatus === hoverStatus && dragIndex === hoverIndex) {
        return;
      }

      // Move the item
      onMoveTicket(item.id, dragStatus, hoverStatus, dragIndex, hoverIndex);
      
      // Update the item for continued dragging
      item.status = hoverStatus;
      item.index = hoverIndex;
    },
  });

  // Connect drag and drop to the element
  dragRef(dropRef(ref));

  return (
    <div
      ref={ref}
      onClick={() => onTicketClick?.(ticket.id)}
      style={{
        background: isDragging ? '#f0f0f0' : '#fff',
        border: isDragging ? '2px solid #007bff' : '1px solid #dee2e6',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '8px',
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: isDragging 
          ? '0 8px 25px rgba(0,123,255,0.3)' 
          : '0 1px 3px rgba(0,0,0,0.1)',
        opacity: isDragging ? 0.5 : 1,
        transition: 'all 0.2s ease',
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
          {ticket.tags.slice(0, 3).map((tag: any) => (
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
  );
}

// Droppable Column Component
function DroppableColumn({ 
  column, 
  tickets, 
  onTicketClick, 
  onMoveTicket 
}: { 
  column: typeof STATUS_COLUMNS[number];
  tickets: TicketList[];
  onTicketClick?: (ticketId: number) => void;
  onMoveTicket: (ticketId: number, sourceStatus: TicketStatus, destStatus: TicketStatus, sourceIndex: number, destIndex: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isOver }, dropRef] = useDrop({
    accept: 'ticket',
    drop: (item: DragItem) => {
      const sourceStatus = item.status;
      const destStatus = column.id as TicketStatus;
      const sourceIndex = item.index;
      const destIndex = tickets.length; // Add to end when dropping on column
      
      if (sourceStatus !== destStatus) {
        onMoveTicket(item.id, sourceStatus, destStatus, sourceIndex, destIndex);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Connect drop to the element
  dropRef(ref);

  return (
    <div
      ref={ref}
      style={{
        minWidth: '300px',
        maxWidth: '300px',
        background: isOver ? '#f0f8ff' : '#f8f9fa',
        borderRadius: '8px',
        padding: '16px',
        border: isOver ? '2px dashed #007bff' : '2px dashed transparent',
        transition: 'all 0.2s ease',
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
          {tickets.length}
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

      {/* Tickets */}
      <div style={{
        minHeight: '200px',
        padding: '8px'
      }}>
        {tickets.map((ticket, index) => (
          <DraggableTicket
            key={ticket.id}
            ticket={ticket}
            index={index}
            onTicketClick={onTicketClick}
            onMoveTicket={onMoveTicket}
          />
        ))}
      </div>
    </div>
  );
}

// Main Kanban Board Component
function KanbanBoardContent({ onTicketClick, onCreateTicket }: KanbanBoardProps) {
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
        console.log('Ticket status mapping:', { ticketId: ticket.id, originalStatus: ticket.status, mappedStatus: status });
        if (ticketsByStatus[status]) {
          ticketsByStatus[status].push(ticket);
        } else {
          // If status doesn't match our predefined statuses, put in open
          console.log('Status not found, moving to open:', { status, availableStatuses: Object.keys(ticketsByStatus) });
          ticketsByStatus['open'].push(ticket);
        }
      });

      console.log('Final tickets by status:', Object.keys(ticketsByStatus).map(status => ({ 
        status, 
        count: ticketsByStatus[status].length 
      })));
      
      setTickets(ticketsByStatus);
      setError('');
    } catch (err: unknown) {
      console.error('Failed to fetch tickets:', err);
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const moveTicket = useCallback(async (
    ticketId: number,
    sourceStatus: TicketStatus,
    destStatus: TicketStatus,
    sourceIndex: number,
    destIndex: number
  ) => {
    console.log('Moving ticket:', { ticketId, sourceStatus, destStatus, sourceIndex, destIndex });

    // Store the current state for rollback
    const originalTickets = { ...tickets };

    // Find the ticket being moved
    const sourceTickets = [...(tickets[sourceStatus] || [])];
    const ticketToMove = sourceTickets.find(ticket => ticket.id === ticketId);
    
    if (!ticketToMove) {
      console.error('Could not find ticket to move', { ticketId, sourceStatus });
      return;
    }

    // Create new tickets state
    const newTickets = { ...tickets };
    const newSourceTickets = [...(newTickets[sourceStatus] || [])];
    const newDestTickets = sourceStatus === destStatus 
      ? newSourceTickets 
      : [...(newTickets[destStatus] || [])];

    // Remove from source
    const actualSourceIndex = newSourceTickets.findIndex(ticket => ticket.id === ticketId);
    if (actualSourceIndex === -1) {
      console.error('Could not find ticket in source column');
      return;
    }
    
    const [removedTicket] = newSourceTickets.splice(actualSourceIndex, 1);

    // Add to destination
    if (sourceStatus === destStatus) {
      // Moving within the same status column (just reordering)
      const targetIndex = Math.min(destIndex, newSourceTickets.length);
      newSourceTickets.splice(targetIndex, 0, removedTicket);
      newTickets[sourceStatus] = newSourceTickets;
    } else {
      // Moving to a different status
      const targetIndex = Math.min(destIndex, newDestTickets.length);
      newDestTickets.splice(targetIndex, 0, removedTicket);
      newTickets[sourceStatus] = newSourceTickets;
      newTickets[destStatus] = newDestTickets;
    }

    // Update state optimistically
    setTickets(newTickets);

    // Only make API call if moving between different statuses
    if (sourceStatus !== destStatus) {
      setIsMoving(true);

      try {
        console.log('Starting API update...');
        console.log('Updating ticket status to:', destStatus);
        
        // Ensure the status is valid
        const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        if (!validStatuses.includes(destStatus)) {
          throw new Error(`Invalid status: ${destStatus}`);
        }
        
        // Add timeout to prevent hanging
        const updatePromise = ticketsPartialUpdate(ticketId, {
          status: destStatus as any
        });
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Update timeout after 5 seconds')), 5000);
        });
        
        await Promise.race([updatePromise, timeoutPromise]);
        console.log('Status update successful');
      } catch (err: unknown) {
        console.error('Failed to update ticket status:', err);
        // Revert on error
        setTickets(originalTickets);
        setError('Failed to move ticket. Please try again.');
        
        // Clear error after 3 seconds
        setTimeout(() => setError(''), 3000);
      } finally {
        console.log('Setting isMoving to false');
        setIsMoving(false);
      }
    } else {
      console.log('Same status, no API call needed');
    }
  }, [tickets]);

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

      {/* Loading State */}
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

      {/* Kanban Board */}
      <div style={{
        display: 'flex',
        gap: '20px',
        overflowX: 'auto',
        paddingBottom: '20px'
      }}>
        {STATUS_COLUMNS.map((column) => {
          console.log('Rendering column:', column.id, 'with tickets:', tickets[column.id]?.length || 0);
          return (
            <DroppableColumn
              key={column.id}
              column={column}
              tickets={tickets[column.id] || []}
              onTicketClick={onTicketClick}
              onMoveTicket={moveTicket}
            />
          );
        })}
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

// Wrapper component with DndProvider
export default function KanbanBoard({ onTicketClick, onCreateTicket }: KanbanBoardProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <KanbanBoardContent onTicketClick={onTicketClick} onCreateTicket={onCreateTicket} />
    </DndProvider>
  );
}
