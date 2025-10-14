'use client';

// import { useState } from 'react';
import { subTicketsDestroy, subTicketsToggleCompletionPartialUpdate } from '@/api/generated/api';
import type { SubTicket } from '@/api/generated/interfaces';
// import SubTicketForm from './SubTicketForm';
// import { Button } from './ui/button';
// import { Plus } from 'lucide-react';

interface SubTicketListProps {
  parentTicketId: number;
  subTickets: SubTicket[];
  onSubTicketsChange?: () => void;
}

export default function SubTicketList({ parentTicketId, subTickets, onSubTicketsChange }: SubTicketListProps) {
  // const [showForm, setShowForm] = useState(false);
  // const [editingSubTicket, setEditingSubTicket] = useState<SubTicket | null>(null);

  const handleToggleCompletion = async (subTicket: SubTicket) => {
    try {
      await subTicketsToggleCompletionPartialUpdate(subTicket.id.toString(), {
        is_completed: !subTicket.is_completed
      });
      if (onSubTicketsChange) {
        onSubTicketsChange();
      }
    } catch (error) {
      console.error('Error toggling sub-ticket completion:', error);
    }
  };

  const handleDelete = async (subTicket: SubTicket) => {
    if (confirm('Are you sure you want to delete this sub-ticket?')) {
      try {
        await subTicketsDestroy(subTicket.id.toString());
        if (onSubTicketsChange) {
          onSubTicketsChange();
        }
      } catch (error) {
        console.error('Error deleting sub-ticket:', error);
      }
    }
  };

  // const handleEdit = (subTicket: SubTicket) => {
  //   setEditingSubTicket(subTicket);
  //   setShowForm(true);
  // };

  // const handleFormSave = () => {
  //   setShowForm(false);
  //   setEditingSubTicket(null);
  //   if (onSubTicketsChange) {
  //     onSubTicketsChange();
  //   }
  // };

  // const handleFormCancel = () => {
  //   setShowForm(false);
  //   setEditingSubTicket(null);
  // };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-green-600';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="mt-5">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h4 className="text-base font-semibold text-gray-800 m-0">
          Sub-Tickets ({subTickets.length})
        </h4>
      </div>

      <div className="flex flex-col gap-2.5">
        {subTickets.map((subTicket) => (
          <div
            key={subTicket.id}
            className="bg-white border border-gray-200 rounded-md p-3 shadow-sm"
          >
            <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <button
                    onClick={() => handleToggleCompletion(subTicket)}
                    className={`${
                      subTicket.is_completed ? 'bg-green-600 text-white' : 'bg-white text-green-600'
                    } border-2 border-green-600 rounded-full w-5 h-5 flex-shrink-0 cursor-pointer flex items-center justify-center text-xs p-0`}
                  >
                    {subTicket.is_completed && '✓'}
                  </button>

                  <h5 className={`text-sm font-semibold m-0 break-words ${
                    subTicket.is_completed ? 'text-gray-500 line-through' : 'text-gray-800'
                  }`}>
                    {subTicket.title}
                  </h5>

                  {subTicket.priority && (
                    <span className={`${getPriorityColor(subTicket.priority as unknown as string)} text-white px-1.5 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0`}>
                      {subTicket.priority as unknown as string}
                    </span>
                  )}
                </div>

                {subTicket.description && (
                  <div className="text-xs text-gray-600 mb-2 leading-tight break-words">
                    {(subTicket.description_format as any) === 'html' && subTicket.rich_description ? (
                      <div dangerouslySetInnerHTML={{ __html: subTicket.rich_description }} />
                    ) : (
                      subTicket.description
                    )}
                  </div>
                )}

                <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                  {subTicket.assigned_to && (
                    <span className="truncate">
                      Assigned: {subTicket.assigned_to.first_name} {subTicket.assigned_to.last_name}
                    </span>
                  )}
                  <span className="flex-shrink-0">
                    Checklist: {subTicket.completed_items_count}/{subTicket.checklist_items_count}
                  </span>
                  <span className="flex-shrink-0">
                    Created: {new Date(subTicket.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                {/* <button
                  onClick={() => handleEdit(subTicket)}
                  className="bg-white text-blue-500 border border-blue-500 px-2 py-1 rounded text-xs cursor-pointer hover:bg-blue-50"
                >
                  Edit
                </button> */}
                <button
                  onClick={() => handleDelete(subTicket)}
                  className="bg-white text-red-600 border border-red-600 px-2 py-1 rounded text-xs cursor-pointer hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {subTickets.length === 0 && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-md p-5 text-center text-gray-500 text-sm">
          No sub-tickets yet. Click "Add Sub-Ticket" to create one.
        </div>
      )}
    </div>
  );
}
