'use client';

import { useState, useEffect } from 'react';
import { formatDuration } from './TimeTracking';
import { timeLogsMyTimeSummaryRetrieve, TimeTrackingSummary as ApiTimeTrackingSummary } from '@/api/generated';

interface TimeByColumn {
  column__name: string;
  column__color: string;
  total_seconds: number;
  session_count: number;
  avg_seconds: number;
}

interface DailyBreakdown {
  date: string;
  total_seconds: number;
  session_count: number;
}

interface TimeTrackingSummary {
  period_days: number;
  start_date: string;
  total_time_seconds: number;
  total_sessions: number;
  time_by_column: TimeByColumn[];
  daily_breakdown: DailyBreakdown[];
  recent_activity: any[];
  active_sessions: any[];
}

interface UserTimeTrackingProps {
  className?: string;
}

export default function UserTimeTracking({ className }: UserTimeTrackingProps) {
  const [data, setData] = useState<TimeTrackingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodDays, setPeriodDays] = useState(30);

  const fetchTimeData = async (days: number = 30) => {
    try {
      setLoading(true);
      setError('');
      
      const data = await timeLogsMyTimeSummaryRetrieve(days);
      setData(data);
    } catch (err) {
      console.error('Error fetching time data:', err);
      setError('Failed to load time tracking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeData(periodDays);
  }, [periodDays]);

  if (loading) {
    return (
      <div className={className}>
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
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={className} style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#333',
            margin: '0 0 4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⏱️ My Time Tracking
          </h2>
          <p style={{
            color: '#666',
            margin: 0,
            fontSize: '14px'
          }}>
            Last {data.period_days} days
          </p>
        </div>
        
        {/* Period selector */}
        <select 
          value={periodDays}
          onChange={(e) => setPeriodDays(parseInt(e.target.value))}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            fontSize: '14px'
          }}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: '#fff',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#007bff',
            marginBottom: '4px',
            fontFamily: 'monospace'
          }}>
            {formatDuration(data.total_time_seconds)}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Total Time Tracked
          </div>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#28a745',
            marginBottom: '4px'
          }}>
            {data.total_sessions}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Work Sessions
          </div>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#ffc107',
            marginBottom: '4px',
            fontFamily: 'monospace'
          }}>
            {data.total_sessions > 0 ? formatDuration(Math.floor(data.total_time_seconds / data.total_sessions)) : '0s'}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Avg Session Time
          </div>
        </div>
      </div>

      {/* Time by Column */}
      {data.time_by_column.length > 0 && (
        <div style={{
          background: '#fff',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#333',
            margin: '0 0 16px 0'
          }}>
            Time by Column
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.time_by_column.map((column, index) => {
              const percentage = data.total_time_seconds > 0 
                ? (column.total_seconds / data.total_time_seconds) * 100 
                : 0;

              return (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    background: column.column__color,
                    flexShrink: 0
                  }}></div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#333'
                      }}>
                        {column.column__name}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: column.column__color,
                        fontFamily: 'monospace'
                      }}>
                        {formatDuration(column.total_seconds)}
                      </span>
                    </div>
                    
                    <div style={{
                      height: '8px',
                      background: '#f0f0f0',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        background: column.column__color,
                        width: `${percentage}%`,
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                    
                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      marginTop: '2px'
                    }}>
                      {column.session_count} sessions • {formatDuration(Math.floor(column.avg_seconds))} avg
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Activity */}
      {data.daily_breakdown.length > 0 && (
        <div style={{
          background: '#fff',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#333',
            margin: '0 0 16px 0'
          }}>
            Daily Activity
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px'
          }}>
            {data.daily_breakdown.slice(0, 7).map((day, index) => (
              <div key={day.date} style={{
                padding: '12px',
                background: '#f8f9fa',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  marginBottom: '4px'
                }}>
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#007bff',
                  marginBottom: '2px',
                  fontFamily: 'monospace'
                }}>
                  {formatDuration(day.total_seconds)}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#999'
                }}>
                  {day.session_count} sessions
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}