'use client';

import { useState, useEffect } from 'react';
import { AuthUser, TenantInfo } from '@/types/auth';
import { authService } from '@/services/authService';
import { User } from '@/api/generated/interfaces';
import TicketManagement from './TicketManagement';

interface DashboardProps {
  user: AuthUser;
  tenant: TenantInfo;
  onLogout: () => void;
}

export default function Dashboard({ tenant, onLogout }: DashboardProps) {
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState<'dashboard' | 'tickets'>('dashboard');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const profile = await authService.getProfile();
      setUserProfile(profile);
    } catch (err: unknown) {
      console.error('Failed to fetch user profile:', err);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      onLogout();
    } catch (err) {
      console.error('Logout error:', err);
      // Force local logout even if API call fails
      // Clear tokens manually
      if (typeof window !== 'undefined') {
        localStorage.removeItem('echodesk_auth_token');
        localStorage.removeItem('echodesk_user_data');
        localStorage.removeItem('echodesk_tenant_data');
      }
      onLogout();
    }
  };

  if (currentView === 'tickets') {
    return <TicketManagement onBackToDashboard={() => setCurrentView('dashboard')} />;
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${tenant.theme.primary_color}22, ${tenant.theme.secondary_color}22)`,
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: `4px solid ${tenant.theme.primary_color}`,
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${tenant.theme.primary_color}22, ${tenant.theme.secondary_color}22)`,
    }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e1e5e9',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {tenant.theme.logo_url && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={tenant.theme.logo_url} 
                alt={tenant.name}
                style={{ height: '40px', marginRight: '15px' }}
              />
            </>
          )}
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: tenant.theme.primary_color,
              margin: 0
            }}>
              {tenant.theme.company_name || tenant.name}
            </h1>
            <p style={{
              fontSize: '12px',
              color: '#666',
              margin: 0
            }}>
              {tenant.domain}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <nav style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setCurrentView('dashboard')}
              style={{
                background: currentView === 'dashboard' ? tenant.theme.primary_color : 'transparent',
                color: currentView === 'dashboard' ? 'white' : tenant.theme.primary_color,
                border: `1px solid ${tenant.theme.primary_color}`,
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('tickets')}
              style={{
                background: (currentView as string) === 'tickets' ? tenant.theme.primary_color : 'transparent',
                color: (currentView as string) === 'tickets' ? 'white' : tenant.theme.primary_color,
                border: `1px solid ${tenant.theme.primary_color}`,
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Tickets
            </button>
          </nav>
          
          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontSize: '14px',
              fontWeight: '500',
              margin: 0,
              color: '#333'
            }}>
              {userProfile?.first_name} {userProfile?.last_name}
            </p>
            <p style={{
              fontSize: '12px',
              color: '#666',
              margin: 0
            }}>
              {userProfile?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: tenant.theme.secondary_color || '#f0f0f0',
              color: '#333',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px 20px' }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {error && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          )}

          {/* Welcome Section */}
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            marginBottom: '30px'
          }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#333',
              margin: '0 0 15px 0'
            }}>
              Welcome to your EchoDesk Dashboard!
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#666',
              margin: 0,
              lineHeight: '1.5'
            }}>
              You&apos;ve successfully logged into {tenant.name}. This is your personalized dashboard where you can manage your support activities.
            </p>
          </div>

          {/* Tenant Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{
              background: 'white',
              padding: '25px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: tenant.theme.primary_color,
                margin: '0 0 15px 0'
              }}>
                Tenant Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <strong>Name:</strong> {tenant.name}
                </div>
                <div>
                  <strong>Schema:</strong> {tenant.schema_name}
                </div>
                <div>
                  <strong>Domain:</strong> {tenant.domain}
                </div>
                <div>
                  <strong>API URL:</strong> {tenant.api_url}
                </div>
              </div>
            </div>

            <div style={{
              background: 'white',
              padding: '25px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: tenant.theme.primary_color,
                margin: '0 0 15px 0'
              }}>
                User Profile
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <strong>Name:</strong> {userProfile?.first_name} {userProfile?.last_name}
                </div>
                <div>
                  <strong>Email:</strong> {userProfile?.email}
                </div>
                <div>
                  <strong>Status:</strong> {userProfile?.is_active ? 'Active' : 'Inactive'}
                </div>
                <div>
                  <strong>Staff:</strong> {userProfile?.is_staff ? 'Yes' : 'No'}
                </div>
                {userProfile?.date_joined && (
                  <div>
                    <strong>Joined:</strong> {new Date(userProfile.date_joined).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: tenant.theme.primary_color,
              margin: '0 0 20px 0'
            }}>
              Quick Actions
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px'
            }}>
              <button 
              onClick={() => setCurrentView('tickets')}
              style={{
                background: tenant.theme.primary_color,
                color: 'white',
                border: 'none',
                padding: '15px 20px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Manage Tickets
              </button>
              <button style={{
                background: tenant.theme.secondary_color || '#f0f0f0',
                color: '#333',
                border: 'none',
                padding: '15px 20px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                View Clients
              </button>
              <button style={{
                background: tenant.theme.secondary_color || '#f0f0f0',
                color: '#333',
                border: 'none',
                padding: '15px 20px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Call Logs
              </button>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
