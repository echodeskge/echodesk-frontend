'use client';

import { useState, useEffect } from 'react';
import { ticketService } from '@/services/ticketService';
import type { User, TicketList } from '@/api/generated/interfaces';
import MultiUserAssignment, { AssignmentData } from './MultiUserAssignment';
import { Spinner } from '@/components/ui/spinner';

interface BulkAssignmentModalProps {
  selectedTickets: TicketList[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkAssignmentModal({
  selectedTickets,
  isOpen,
  onClose,
  onSuccess
}: BulkAssignmentModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setAssignments([]);
      setError('');
      setReplaceExisting(false);
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const result = await ticketService.getUsers();
      setUsers(result.results || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    }
  };

  const handleAssign = async () => {
    if (assignments.length === 0) {
      setError('Please select at least one user to assign');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const ticketIds = selectedTickets.map(ticket => ticket.id);
      const userIds = assignments.map(a => a.userId);
      const roles: Record<string, string> = {};
      assignments.forEach(a => {
        roles[a.userId.toString()] = a.role;
      });

      await ticketService.bulkAssignTickets(ticketIds, userIds, roles, replaceExisting);
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error bulk assigning tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignAll = async () => {
    setLoading(true);
    setError('');

    try {
      const ticketIds = selectedTickets.map(ticket => ticket.id);
      await ticketService.bulkUnassignTickets(ticketIds);
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error bulk unassigning tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to unassign tickets');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e1e5e9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#2c3e50',
            margin: 0
          }}>
            Bulk Assignment
          </h3>
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#6c757d',
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Selected Tickets Summary */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '8px'
            }}>
              Selected Tickets ({selectedTickets.length})
            </h4>
            
            <div style={{
              maxHeight: '120px',
              overflowY: 'auto',
              border: '1px solid #e1e5e9',
              borderRadius: '4px',
              padding: '8px'
            }}>
              {selectedTickets.map(ticket => (
                <div
                  key={ticket.id}
                  style={{
                    padding: '4px 8px',
                    fontSize: '14px',
                    color: '#495057',
                    borderBottom: '1px solid #f8f9fa'
                  }}
                >
                  #{ticket.id} - {ticket.title}
                </div>
              ))}
            </div>
          </div>

          {/* Assignment Options */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '12px'
            }}>
              Assign Users
            </label>
            
            <MultiUserAssignment
              users={users}
              selectedAssignments={assignments}
              onChange={setAssignments}
              placeholder="Select users to assign to all selected tickets..."
            />
          </div>

          {/* Options */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#495057',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
              />
              Replace existing assignments (instead of adding to them)
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '14px',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleUnassignAll}
              disabled={loading}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading && <Spinner className="mr-2 size-4" />}
              {loading ? 'Processing...' : 'Unassign All'}
            </button>

            <button
              onClick={onClose}
              disabled={loading}
              style={{
                background: 'white',
                color: '#6c757d',
                border: '2px solid #6c757d',
                padding: '10px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              Cancel
            </button>
            
            <button
              onClick={handleAssign}
              disabled={loading || assignments.length === 0}
              style={{
                background: (loading || assignments.length === 0) ? '#dee2e6' : '#27ae60',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: (loading || assignments.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading && <Spinner className="mr-2 size-4" />}
              {loading ? 'Assigning...' : `Assign to ${selectedTickets.length} tickets`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}