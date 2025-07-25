'use client';

import { useState } from 'react';
import TicketList from './TicketList';
import TicketDetail from './TicketDetail';
import TicketForm from './TicketForm';
import type { Ticket } from '@/api/generated/interfaces';

type View = 'list' | 'detail' | 'create' | 'edit';

interface TicketManagementProps {
  onBackToDashboard?: () => void;
}

export default function TicketManagement({ onBackToDashboard }: TicketManagementProps) {
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const handleTicketSelect = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setCurrentView('detail');
  };

  const handleCreateTicket = () => {
    setSelectedTicket(null);
    setCurrentView('create');
  };

  const handleEditTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCurrentView('edit');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedTicketId(null);
    setSelectedTicket(null);
  };

  const handleTicketSaved = (ticket: Ticket) => {
    // After saving, show the ticket detail
    setSelectedTicketId(ticket.id);
    setSelectedTicket(ticket);
    setCurrentView('detail');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'list':
        return (
          <TicketList
            onTicketSelect={handleTicketSelect}
            onCreateTicket={handleCreateTicket}
          />
        );

      case 'detail':
        if (!selectedTicketId) {
          return <div>No ticket selected</div>;
        }
        return (
          <TicketDetail
            ticketId={selectedTicketId}
            onBack={handleBackToList}
            onEdit={handleEditTicket}
          />
        );

      case 'create':
        return (
          <TicketForm
            onSave={handleTicketSaved}
            onCancel={handleBackToList}
          />
        );

      case 'edit':
        if (!selectedTicket) {
          return <div>No ticket selected for editing</div>;
        }
        return (
          <TicketForm
            ticket={selectedTicket}
            onSave={handleTicketSaved}
            onCancel={() => setCurrentView('detail')}
          />
        );

      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa'
    }}>
      {/* Header with back button */}
      {onBackToDashboard && (
        <div style={{
          background: 'white',
          borderBottom: '1px solid #e1e5e9',
          padding: '15px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <button
            onClick={onBackToDashboard}
            style={{
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            margin: 0,
            color: '#333'
          }}>
            Ticket Management
          </h1>
        </div>
      )}
      
      {renderCurrentView()}
    </div>
  );
}
