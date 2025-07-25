import { TenantConfig } from '@/types/tenant';
import { useState } from 'react';

interface TenantDashboardProps {
  tenant: TenantConfig;
}

export default function TenantDashboard({ tenant }: TenantDashboardProps) {
  const [activeSection, setActiveSection] = useState('overview');

  const getLanguageFlag = (lang: string) => {
    switch (lang) {
      case 'en': return '🇺🇸';
      case 'ru': return '🇷🇺';
      case 'ka': return '🇬🇪';
      default: return '🌐';
    }
  };

  const getLanguageName = (lang: string) => {
    switch (lang) {
      case 'en': return 'English';
      case 'ru': return 'Russian';
      case 'ka': return 'Georgian';
      default: return 'Unknown';
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <header style={{
        background: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '15px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '24px', 
              margin: 0, 
              color: tenant.theme.primary_color || '#667eea',
              fontWeight: '700'
            }}>
              {tenant.tenant_name}
            </h1>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
              {tenant.schema_name}.echodesk.ge
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ 
              background: '#e9ecef', 
              padding: '6px 12px', 
              borderRadius: '20px',
              fontSize: '14px',
              color: '#495057'
            }}>
              {getLanguageFlag(tenant.preferred_language)} {getLanguageName(tenant.preferred_language)}
            </span>
            <span style={{ 
              background: tenant.plan === 'basic' ? '#28a745' : '#007bff',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              {tenant.plan}
            </span>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {/* Navigation */}
        <nav style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[
              { key: 'overview', label: '📊 Overview' },
              { key: 'users', label: '👥 Users' },
              { key: 'settings', label: '⚙️ Settings' },
              { key: 'api', label: '🔌 API' }
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  background: activeSection === item.key ? tenant.theme.primary_color : 'white',
                  color: activeSection === item.key ? 'white' : '#495057',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        {activeSection === 'overview' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Dashboard Overview</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '20px' 
            }}>
              {/* Tenant Info Card */}
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Tenant Information</h3>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <p><strong>Name:</strong> {tenant.tenant_name}</p>
                  <p><strong>Schema:</strong> {tenant.schema_name}</p>
                  <p><strong>Domain:</strong> {tenant.domain_url}</p>
                  <p><strong>Admin:</strong> {tenant.admin_email}</p>
                  <p><strong>Plan:</strong> {tenant.plan}</p>
                </div>
              </div>

              {/* Features Card */}
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Features & Limits</h3>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <p><strong>Max Users:</strong> {tenant.features.max_users}</p>
                  <p><strong>Storage:</strong> {tenant.features.max_storage} MB</p>
                  <p><strong>Analytics:</strong> {tenant.features.analytics ? '✅' : '❌'}</p>
                  <p><strong>Custom Branding:</strong> {tenant.features.custom_branding ? '✅' : '❌'}</p>
                  <p><strong>API Access:</strong> {tenant.features.api_access ? '✅' : '❌'}</p>
                  <p><strong>Webhooks:</strong> {tenant.features.webhooks ? '✅' : '❌'}</p>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <a 
                    href={tenant.api_url + '/admin/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '10px',
                      background: '#28a745',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}
                  >
                    🔧 Admin Panel
                  </a>
                  <a 
                    href={tenant.api_url + '/api/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '10px',
                      background: '#007bff',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}
                  >
                    🔌 API Docs
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'users' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>User Management</h2>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <p>User management features will be implemented here.</p>
              <p style={{ color: '#666', fontSize: '14px' }}>
                This will include user creation, role management, and permissions.
              </p>
            </div>
          </div>
        )}

        {activeSection === 'settings' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Settings</h2>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '15px' }}>Localization</h3>
              <p><strong>Language:</strong> {getLanguageFlag(tenant.preferred_language)} {getLanguageName(tenant.preferred_language)}</p>
              <p><strong>Timezone:</strong> {tenant.localization.timezone}</p>
              <p><strong>Date Format:</strong> {tenant.localization.date_format}</p>
              
              <h3 style={{ marginTop: '25px', marginBottom: '15px' }}>Theme</h3>
              <p><strong>Primary Color:</strong> 
                <span style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  background: tenant.theme.primary_color,
                  marginLeft: '10px',
                  borderRadius: '3px',
                  verticalAlign: 'middle'
                }}></span>
                {tenant.theme.primary_color}
              </p>
              <p><strong>Secondary Color:</strong>
                <span style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  background: tenant.theme.secondary_color,
                  marginLeft: '10px',
                  borderRadius: '3px',
                  verticalAlign: 'middle'
                }}></span>
                {tenant.theme.secondary_color}
              </p>
            </div>
          </div>
        )}

        {activeSection === 'api' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>API Information</h2>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '15px' }}>API Endpoints</h3>
              <div style={{ 
                background: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '4px',
                marginBottom: '15px',
                fontFamily: 'monospace',
                fontSize: '14px'
              }}>
                <p><strong>Base URL:</strong> {tenant.api_url}</p>
                <p><strong>Admin Panel:</strong> {tenant.api_url}/admin/</p>
                <p><strong>API Docs:</strong> {tenant.api_url}/api/schema/swagger-ui/</p>
                <p><strong>Config Endpoint:</strong> {tenant.api_url}/api/tenant/config/</p>
              </div>
              
              <h3 style={{ marginBottom: '15px' }}>Sample Configuration Response</h3>
              <pre style={{
                background: '#f8f9fa',
                padding: '15px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                {JSON.stringify(tenant, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
