'use client';

import { useState, useEffect } from 'react';
import type { Ticket, TicketTimeLog } from '@/api/generated/interfaces';
import { useTimeLogs } from '@/hooks/api';

interface TimeTrackingProps {
  ticket: Ticket;
  className?: string;
}

interface TimeTrackingDisplayProps {
  timeLogs: TicketTimeLog[];
  currentColumn?: {
    id: number;
    name: string;
    track_time?: boolean;
  };
}

// Helper function to format duration
const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
};

// Helper function to calculate current time spent
const calculateCurrentDuration = (startTime: string): string => {
  const start = new Date(startTime);
  const now = new Date();
  const durationMs = now.getTime() - start.getTime();
  const durationSeconds = Math.floor(durationMs / 1000);
  return formatDuration(durationSeconds);
};

function TimeTrackingDisplay({ timeLogs, currentColumn }: TimeTrackingDisplayProps) {
  const [currentDuration, setCurrentDuration] = useState<string>('');

  // Find active time log (no exited_at)
  const activeLog = timeLogs.find(log => !log.exited_at);

  // Update current duration every second if there's an active log
  useEffect(() => {
    if (!activeLog) return;

    const updateDuration = () => {
      if (activeLog.entered_at) {
        setCurrentDuration(calculateCurrentDuration(activeLog.entered_at));
      }
    };

    // Update immediately
    updateDuration();

    // Update every second
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [activeLog]);

  if (!timeLogs || timeLogs.length === 0) {
    return null;
  }

  // Calculate total time spent
  const totalSeconds = timeLogs
    .filter(log => log.duration_seconds)
    .reduce((total, log) => total + (log.duration_seconds || 0), 0);

  return (
    <div style={{
      background: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '16px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <span style={{ fontSize: '16px' }}>⏱️</span>
        <h4 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: '#333'
        }}>
          Time Tracking
        </h4>
      </div>

      {/* Current active tracking */}
      {activeLog && currentColumn?.track_time && (
        <div style={{
          background: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <strong style={{ color: '#1976d2' }}>
                Currently in: {currentColumn.name}
              </strong>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                Started: {new Date(activeLog.entered_at).toLocaleString()}
              </div>
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1976d2',
              fontFamily: 'monospace'
            }}>
              {currentDuration} (active)
            </div>
          </div>
        </div>
      )}

      {/* Total time summary */}
      {totalSeconds > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 0',
          borderBottom: '1px solid #e9ecef',
          marginBottom: '12px'
        }}>
          <strong>Total Time Tracked:</strong>
          <strong style={{
            fontSize: '16px',
            color: '#28a745',
            fontFamily: 'monospace'
          }}>
            {formatDuration(totalSeconds)}
          </strong>
        </div>
      )}

      {/* Time log history */}
      <div>
        <h5 style={{
          margin: '0 0 8px 0',
          fontSize: '14px',
          fontWeight: '600',
          color: '#666'
        }}>
          Time Log History
        </h5>
        <div style={{
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {timeLogs
            .slice()
            .sort((a, b) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime())
            .map((log, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: index < timeLogs.length - 1 ? '1px solid #f0f0f0' : 'none',
                fontSize: '13px'
              }}>
                <div>
                  <div style={{ fontWeight: '500' }}>
                    {log.column?.name}
                  </div>
                  <div style={{ color: '#666', fontSize: '11px' }}>
                    Started: {new Date(log.entered_at).toLocaleString()}
                    {log.exited_at && (
                      <><br />Ended: {new Date(log.exited_at).toLocaleString()}</>
                    )}
                  </div>
                </div>
                <div style={{
                  fontWeight: '600',
                  fontFamily: 'monospace',
                  color: log.exited_at ? '#333' : '#2196f3'
                }}>
                  {log.duration_display || 'Active'}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

export default function TimeTracking({ ticket, className }: TimeTrackingProps) {
  // Use React Query hook to fetch time logs
  const { data: timeLogsData, isLoading: loading } = useTimeLogs(ticket.id);
  const timeLogs = timeLogsData?.results || [];

  // Check if current column has time tracking enabled
  const currentColumn = ticket.column;
  const hasTimeTracking = currentColumn?.track_time;

  if (!hasTimeTracking && (!timeLogs || timeLogs.length === 0)) {
    return null;
  }

  return (
    <div className={className}>
      <TimeTrackingDisplay
        timeLogs={timeLogs}
        currentColumn={currentColumn}
      />
    </div>
  );
}

export { TimeTrackingDisplay, formatDuration };