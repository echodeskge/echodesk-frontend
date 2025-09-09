'use client';

import { useState, useEffect } from 'react';
import { formatDuration } from './TimeTracking';
import { usersList, timeLogsList } from '@/api/generated';
import { User, TicketTimeLog } from '@/api/generated/interfaces';

interface UserTimeStats {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  today: number;
  this_week: number;
  last_week: number;
  this_month: number;
  last_month: number;
  past_month: number;
  avg_daily_this_month: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface UserStatisticsProps {
  className?: string;
}

export default function UserStatistics({ className }: UserStatisticsProps) {
  const [data, setData] = useState<UserTimeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<keyof UserTimeStats>('this_week');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getDateRanges = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get start of week (Monday) and end of week (Friday)
    const startOfWeek = new Date(today);
    const dayOfWeek = (today.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 4); // Friday
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Get start of last week (Monday to Friday)
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    
    const endOfLastWeek = new Date(startOfLastWeek);
    endOfLastWeek.setDate(startOfLastWeek.getDate() + 4); // Friday
    endOfLastWeek.setHours(23, 59, 59, 999);
    
    // Get start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get start of last month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    // Get start of month before last
    const startOfPastMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endOfPastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
    
    return {
      today: { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) },
      thisWeek: { start: startOfWeek, end: Math.min(now.getTime(), endOfWeek.getTime()) > endOfWeek.getTime() ? endOfWeek : now },
      lastWeek: { start: startOfLastWeek, end: endOfLastWeek },
      thisMonth: { start: startOfMonth, end: now },
      lastMonth: { start: startOfLastMonth, end: endOfLastMonth },
      pastMonth: { start: startOfPastMonth, end: endOfPastMonth }
    };
  };

  const aggregateTimeByUserAndPeriod = (timeLogs: TicketTimeLog[], users: User[]) => {
    const ranges = getDateRanges();
    const now = new Date();
    
    const userStats: UserTimeStats[] = users.map(user => {
      const userLogs = timeLogs.filter(log => log.user.id === user.id);
      
      const calculateTimeForRange = (range: DateRange) => {
        return userLogs
          .filter(log => {
            const enteredAt = new Date(log.entered_at);
            return enteredAt >= range.start && enteredAt <= range.end;
          })
          .reduce((total, log) => total + (log.duration_seconds || 0), 0);
      };

      // Calculate average daily time this month
      const thisMonthTime = calculateTimeForRange(ranges.thisMonth);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysSinceStartOfMonth = Math.floor((now.getTime() - startOfMonth.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      const avgDailyThisMonth = daysSinceStartOfMonth > 0 ? thisMonthTime / daysSinceStartOfMonth : 0;

      return {
        user_id: user.id,
        username: user.email.split('@')[0], // Use email prefix as username since User doesn't have username field
        full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        email: user.email,
        today: calculateTimeForRange(ranges.today),
        this_week: calculateTimeForRange(ranges.thisWeek),
        last_week: calculateTimeForRange(ranges.lastWeek),
        this_month: thisMonthTime,
        last_month: calculateTimeForRange(ranges.lastMonth),
        past_month: calculateTimeForRange(ranges.pastMonth),
        avg_daily_this_month: Math.floor(avgDailyThisMonth),
      };
    });

    return userStats;
  };

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch users and time logs in parallel
      const [usersResponse, timeLogsResponse] = await Promise.all([
        usersList(),
        // Fetch time logs from the past 3 months to cover all periods
        timeLogsList()
      ]);
      
      // Filter time logs to only include those from columns with track_time enabled
      const trackingTimeLogs = timeLogsResponse.results.filter(log => 
        log.column && log.column.track_time
      );
      
      const userStats = aggregateTimeByUserAndPeriod(trackingTimeLogs, usersResponse.results);
      setData(userStats);
      
    } catch (err) {
      console.error('Error fetching user statistics:', err);
      setError('Failed to load user statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSort = (column: keyof UserTimeStats) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return sortOrder === 'asc' 
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  if (loading) {
    return (
      <div className={className} style={{ padding: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '300px'
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
      <div className={className} style={{ padding: '20px' }}>
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '16px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      </div>
    );
  }

  const getSortIcon = (column: keyof UserTimeStats) => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className={className} style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#333',
          margin: '0 0 8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📊 User Time Tracking Statistics
        </h2>
        <p style={{
          color: '#666',
          margin: 0,
          fontSize: '14px'
        }}>
          Time tracking overview for all users in your tenant
        </p>
      </div>

      {/* Summary Cards */}
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
            fontSize: '24px',
            fontWeight: '700',
            color: '#007bff',
            marginBottom: '4px'
          }}>
            {data.length}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Active Users
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
            fontSize: '24px',
            fontWeight: '700',
            color: '#28a745',
            marginBottom: '4px',
            fontFamily: 'monospace'
          }}>
            {formatDuration(data.reduce((sum, user) => sum + user.this_week, 0))}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Total This Week
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
            fontSize: '24px',
            fontWeight: '700',
            color: '#ffc107',
            marginBottom: '4px',
            fontFamily: 'monospace'
          }}>
            {data.length > 0 ? formatDuration(Math.floor(data.reduce((sum, user) => sum + user.this_week, 0) / data.length)) : '0s'}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Average This Week
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
            fontSize: '24px',
            fontWeight: '700',
            color: '#6f42c1',
            marginBottom: '4px',
            fontFamily: 'monospace'
          }}>
            {data.length > 0 ? formatDuration(Math.floor(data.reduce((sum, user) => sum + user.avg_daily_this_month, 0) / data.length)) : '0s'}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Team Avg Daily
          </div>
        </div>
      </div>

      {/* Statistics Table */}
      <div style={{
        background: '#fff',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{
          overflowX: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '900px'
          }}>
            <thead>
              <tr style={{
                background: '#f8f9fa',
                borderBottom: '2px solid #e9ecef'
              }}>
                <th
                  onClick={() => handleSort('full_name')}
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#333',
                    cursor: 'pointer',
                    borderRight: '1px solid #e9ecef',
                    userSelect: 'none'
                  }}
                >
                  User {getSortIcon('full_name')}
                </th>
                <th
                  onClick={() => handleSort('today')}
                  style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#333',
                    cursor: 'pointer',
                    borderRight: '1px solid #e9ecef',
                    userSelect: 'none'
                  }}
                >
                  Today {getSortIcon('today')}
                </th>
                <th
                  onClick={() => handleSort('this_week')}
                  style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#333',
                    cursor: 'pointer',
                    borderRight: '1px solid #e9ecef',
                    userSelect: 'none'
                  }}
                >
                  This Week {getSortIcon('this_week')}
                </th>
                <th
                  onClick={() => handleSort('last_week')}
                  style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#333',
                    cursor: 'pointer',
                    borderRight: '1px solid #e9ecef',
                    userSelect: 'none'
                  }}
                >
                  Last Week {getSortIcon('last_week')}
                </th>
                <th
                  onClick={() => handleSort('this_month')}
                  style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#333',
                    cursor: 'pointer',
                    borderRight: '1px solid #e9ecef',
                    userSelect: 'none'
                  }}
                >
                  This Month {getSortIcon('this_month')}
                </th>
                <th
                  onClick={() => handleSort('last_month')}
                  style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#333',
                    cursor: 'pointer',
                    borderRight: '1px solid #e9ecef',
                    userSelect: 'none'
                  }}
                >
                  Last Month {getSortIcon('last_month')}
                </th>
                <th
                  onClick={() => handleSort('past_month')}
                  style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#333',
                    cursor: 'pointer',
                    borderRight: '1px solid #e9ecef',
                    userSelect: 'none'
                  }}
                >
                  Past Month {getSortIcon('past_month')}
                </th>
                <th
                  onClick={() => handleSort('avg_daily_this_month')}
                  style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#333',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  Avg Daily {getSortIcon('avg_daily_this_month')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((user, index) => (
                <tr
                  key={user.user_id}
                  style={{
                    borderBottom: index === sortedData.length - 1 ? 'none' : '1px solid #e9ecef',
                    backgroundColor: index % 2 === 0 ? 'transparent' : '#f8f9fa'
                  }}
                >
                  <td style={{
                    padding: '16px',
                    borderRight: '1px solid #e9ecef'
                  }}>
                    <div>
                      <div style={{
                        fontWeight: '500',
                        color: '#333',
                        marginBottom: '2px'
                      }}>
                        {user.full_name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: '#333',
                    borderRight: '1px solid #e9ecef'
                  }}>
                    {formatDuration(user.today)}
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: '#007bff',
                    fontWeight: '600',
                    borderRight: '1px solid #e9ecef'
                  }}>
                    {formatDuration(user.this_week)}
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: '#6c757d',
                    borderRight: '1px solid #e9ecef'
                  }}>
                    {formatDuration(user.last_week)}
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: '#28a745',
                    fontWeight: '500',
                    borderRight: '1px solid #e9ecef'
                  }}>
                    {formatDuration(user.this_month)}
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: '#6c757d',
                    borderRight: '1px solid #e9ecef'
                  }}>
                    {formatDuration(user.last_month)}
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: '#6c757d',
                    borderRight: '1px solid #e9ecef'
                  }}>
                    {formatDuration(user.past_month)}
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    color: '#6f42c1',
                    fontWeight: '500'
                  }}>
                    {formatDuration(user.avg_daily_this_month)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#666'
          }}>
            No user data available
          </div>
        )}
      </div>

      {/* Info about data source */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#e7f3ff',
        border: '1px solid #b3d7ff',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#0066cc'
      }}>
        <strong>Info:</strong> Shows time tracked in tickets within columns that have time tracking enabled. Data is aggregated from actual ticket time logs.
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        table th:hover {
          background: #e9ecef !important;
        }
        
        table tr:hover {
          background: #f1f3f4 !important;
        }
      `}</style>
    </div>
  );
}