'use client';

import { useState, useEffect } from 'react';
import { callLogsStatisticsRetrieve, callLogsList } from '@/api/generated/api';
import type { CallLog } from '@/api/generated/interfaces';

interface CallStatsDashboardProps {
  onClose: () => void;
}

export default function CallStatsDashboard({ onClose }: CallStatsDashboardProps) {
  const [statistics, setStatistics] = useState<any>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stats, calls] = await Promise.all([
        callLogsStatisticsRetrieve(period),
        callLogsList('-created_at', 1)
      ]);
      
      setStatistics(stats);
      setRecentCalls(calls.results.slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch call statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: any): string => {
    const statusStr = String(status).toLowerCase();
    switch (statusStr) {
      case 'answered': return '#28a745';
      case 'missed': return '#dc3545';
      case 'ringing': return '#ffc107';
      case 'ended': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getDirectionIcon = (direction: any): string => {
    const directionStr = String(direction).toLowerCase();
    return directionStr === 'inbound' ? '📞' : '📱';
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <div>Loading statistics...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '1200px',
        maxHeight: '90vh',
        overflow: 'auto',
        width: '100%'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <h2 style={{ fontSize: '28px', fontWeight: '600', margin: 0 }}>
            📊 Call Analytics Dashboard
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#6c757d'
            }}
          >
            ×
          </button>
        </div>

        {/* Period Selector */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '30px'
        }}>
          {(['today', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                background: period === p ? '#007bff' : '#f8f9fa',
                color: period === p ? 'white' : '#333',
                border: '1px solid #dee2e6',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                textTransform: 'capitalize',
                fontWeight: '500'
              }}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>

        {statistics && (
          <>
            {/* Main Statistics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '12px',
                padding: '25px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {statistics.total_calls}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Calls</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                borderRadius: '12px',
                padding: '25px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {statistics.answered_calls}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Answered</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                borderRadius: '12px',
                padding: '25px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {statistics.missed_calls}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Missed</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white',
                borderRadius: '12px',
                padding: '25px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {statistics.answer_rate}%
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Answer Rate</div>
              </div>
            </div>

            {/* Detailed Statistics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                background: '#fff',
                border: '1px solid #dee2e6',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#333' }}>
                  📞 Call Direction Breakdown
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>📞 Inbound Calls:</span>
                  <strong>{statistics.inbound_calls}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>📱 Outbound Calls:</span>
                  <strong>{statistics.outbound_calls}</strong>
                </div>
                <div style={{
                  height: '8px',
                  background: '#e9ecef',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginTop: '15px'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${statistics.total_calls ? (statistics.inbound_calls / statistics.total_calls) * 100 : 0}%`,
                    background: '#007bff',
                    borderRadius: '4px'
                  }}></div>
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                  {statistics.total_calls ? Math.round((statistics.inbound_calls / statistics.total_calls) * 100) : 0}% inbound
                </div>
              </div>

              <div style={{
                background: '#fff',
                border: '1px solid #dee2e6',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#333' }}>
                  ⏱️ Call Duration
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>Average Duration:</span>
                  <strong>{Math.round(statistics.average_duration_seconds / 60)}m {statistics.average_duration_seconds % 60}s</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>Total Talk Time:</span>
                  <strong>{Math.round((statistics.answered_calls * statistics.average_duration_seconds) / 60)}m</strong>
                </div>
                <div style={{
                  background: '#f8f9fa',
                  padding: '10px',
                  borderRadius: '6px',
                  marginTop: '10px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                    {Math.round(statistics.average_duration_seconds / 60)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>Minutes avg per call</div>
                </div>
              </div>
            </div>

            {/* Recent Calls Table */}
            <div style={{
              background: '#fff',
              border: '1px solid #dee2e6',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#333' }}>
                📋 Recent Calls
              </h3>
              
              {recentCalls.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#6c757d',
                  padding: '20px'
                }}>
                  No recent calls found
                </div>
              ) : (
                <div style={{
                  overflowX: 'auto'
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Direction</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Number</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Duration</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCalls.map((call, index) => (
                        <tr key={call.id} style={{
                          borderBottom: '1px solid #e9ecef',
                          background: index % 2 === 0 ? '#f8f9fa' : 'white'
                        }}>
                          <td style={{ padding: '10px' }}>
                            {getDirectionIcon(call.direction)} {String(call.direction)}
                          </td>
                          <td style={{ padding: '10px', fontWeight: '500' }}>
                            {String(call.direction).toLowerCase() === 'inbound' ? call.caller_number : call.recipient_number}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{
                              color: getStatusColor(call.status),
                              fontWeight: '500',
                              textTransform: 'capitalize'
                            }}>
                              {String(call.status)}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            {call.duration_display || 'N/A'}
                          </td>
                          <td style={{ padding: '10px', color: '#6c757d' }}>
                            {formatTime(call.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
