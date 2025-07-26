'use client';

import { useState, useEffect } from 'react';
import {
  sipConfigurationsList,
  sipConfigurationsCreate,
  sipConfigurationsUpdate,
  sipConfigurationsDestroy,
  sipConfigurationsSetDefaultCreate,
  sipConfigurationsTestConnectionCreate,
  sipConfigurationsRetrieve,
} from '@/api/generated/api';
import type {
  SipConfigurationList,
  SipConfigurationDetail,
  SipConfiguration,
} from '@/api/generated/interfaces';

interface SipConfigManagerProps {
  onConfigChange?: () => void;
}

export default function SipConfigManager({ onConfigChange }: SipConfigManagerProps) {
  const [sipConfigs, setSipConfigs] = useState<SipConfigurationList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SipConfigurationDetail | null>(null);
  const [configForm, setConfigForm] = useState<Partial<SipConfigurationDetail>>({
    name: '',
    sip_server: '',
    sip_port: 5060,
    username: '',
    password: '',
    realm: '',
    proxy: '',
    stun_server: '',
    turn_server: '',
    turn_username: '',
    turn_password: '',
    is_active: true,
    is_default: false,
    max_concurrent_calls: 5,
  });
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchSipConfigs();
  }, []);

  const fetchSipConfigs = async () => {
    try {
      setLoading(true);
      const response = await sipConfigurationsList();
      setSipConfigs(response.results);
      setError('');
    } catch (err: unknown) {
      console.error('Failed to fetch SIP configs:', err);
      setError('Failed to load SIP configurations');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (config?: SipConfigurationList) => {
    if (config) {
      loadConfigForEdit(config.id);
    } else {
      setEditingConfig(null);
      setConfigForm({
        name: '',
        sip_server: '',
        sip_port: 5060,
        username: '',
        realm: '',
        proxy: '',
        stun_server: '',
        turn_server: '',
        turn_username: '',
        is_active: true,
        is_default: false,
        max_concurrent_calls: 5,
      });
    }
    setShowModal(true);
  };

  const loadConfigForEdit = async (configId: number) => {
    try {
      setActionLoading(configId);
      const config = await sipConfigurationsRetrieve(configId.toString());
      setEditingConfig(config);
      setConfigForm({
        name: config.name,
        sip_server: config.sip_server,
        sip_port: config.sip_port || 5060,
        username: config.username,
        realm: config.realm || '',
        proxy: config.proxy || '',
        stun_server: config.stun_server || '',
        turn_server: config.turn_server || '',
        turn_username: config.turn_username || '',
        is_active: config.is_active ?? true,
        is_default: config.is_default ?? false,
        max_concurrent_calls: config.max_concurrent_calls || 5,
      });
    } catch (err: unknown) {
      console.error('Failed to load SIP config:', err);
      setError('Failed to load SIP configuration');
    } finally {
      setActionLoading(null);
    }
  };

  // Quick setup for your Asterisk server
  const setupAsteriskServer = () => {
    setEditingConfig(null);
    setConfigForm({
      name: 'EchoDesk Asterisk Server',
      sip_server: '165.227.166.42',
      sip_port: 8089, // WebSocket port for wss
      username: '1001',
      password: 'Giorgi123.',
      realm: '165.227.166.42',
      proxy: '',
      stun_server: 'stun:stun.l.google.com:19302',
      turn_server: '',
      turn_username: '',
      turn_password: '',
      is_active: true,
      is_default: true,
      max_concurrent_calls: 5,
    });
    setShowModal(true);
  };

  const saveConfig = async () => {
    try {
      setActionLoading(-1); // Special ID for save action
      
      // Create a copy without password for the API (if creating)
      // Password is handled separately in SipConfigurationDetail
      const { password, turn_password, ...apiConfig } = configForm;
      
      if (editingConfig) {
        // For updates, include all fields including password
        await sipConfigurationsUpdate(editingConfig.id.toString(), configForm as any);
      } else {
        // For creation, exclude password fields that aren't in SipConfiguration
        const createData = {
          ...apiConfig,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          id: 0 // Will be set by backend
        } as SipConfiguration;
        await sipConfigurationsCreate(createData);
      }

      await fetchSipConfigs();
      setShowModal(false);
      setError('');
      onConfigChange?.();
      
    } catch (err: unknown) {
      console.error('Failed to save SIP config:', err);
      setError('Failed to save SIP configuration');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteConfig = async (configId: number) => {
    if (!confirm('Are you sure you want to delete this SIP configuration?')) {
      return;
    }

    try {
      setActionLoading(configId);
      await sipConfigurationsDestroy(configId.toString());
      await fetchSipConfigs();
      setError('');
      onConfigChange?.();
      
    } catch (err: unknown) {
      console.error('Failed to delete SIP config:', err);
      setError('Failed to delete SIP configuration');
    } finally {
      setActionLoading(null);
    }
  };

  const setDefaultConfig = async (configId: number) => {
    try {
      setActionLoading(configId);
      const config = await sipConfigurationsRetrieve(configId.toString());
      await sipConfigurationsSetDefaultCreate(configId.toString(), config as any);
      await fetchSipConfigs();
      setError('');
      onConfigChange?.();
      
    } catch (err: unknown) {
      console.error('Failed to set default SIP config:', err);
      setError('Failed to set default SIP configuration');
    } finally {
      setActionLoading(null);
    }
  };

  const testConnection = async (config: SipConfigurationList) => {
    try {
      setActionLoading(config.id);
      const fullConfig = await sipConfigurationsRetrieve(config.id.toString());
      const result = await sipConfigurationsTestConnectionCreate(config.id.toString(), fullConfig as any);
      alert(`Connection test ${result.success ? 'successful' : 'failed'}: ${result.message || ''}`);
    } catch (err: unknown) {
      console.error('Failed to test SIP config:', err);
      alert('Connection test failed');
    } finally {
      setActionLoading(null);
    }
  };

  const updateFormField = (field: keyof SipConfiguration, value: any) => {
    setConfigForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Error Message */}
      {error && (
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#721c24',
              cursor: 'pointer',
              float: 'right',
              fontSize: '16px',
              fontWeight: 'bold'
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
          color: '#333',
          margin: 0
        }}>
          SIP Configurations
        </h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={setupAsteriskServer}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            🚀 Quick Setup (Asterisk)
          </button>
          
          <button
            onClick={() => openModal()}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            ➕ Add Configuration
          </button>
        </div>
      </div>

      {/* SIP Configurations List */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e1e5e9',
        overflow: 'hidden'
      }}>
        {sipConfigs.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#6c757d'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#495057' }}>No SIP Configurations</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>Add your first SIP configuration to start making calls</p>
          </div>
        ) : (
          <div>
            {sipConfigs.map((config, index) => (
              <div
                key={config.id}
                style={{
                  padding: '20px',
                  borderBottom: index < sipConfigs.length - 1 ? '1px solid #e1e5e9' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      {config.name}
                    </h3>
                    
                    {config.is_default && (
                      <span style={{
                        background: '#28a745',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Default
                      </span>
                    )}
                    
                    <span style={{
                      background: config.is_active ? '#d4edda' : '#f8d7da',
                      color: config.is_active ? '#155724' : '#721c24',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {config.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div style={{
                    fontSize: '14px',
                    color: '#6c757d',
                    display: 'flex',
                    gap: '20px'
                  }}>
                    <span>📡 {config.sip_server}</span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  <button
                    onClick={() => testConnection(config)}
                    disabled={actionLoading === config.id}
                    style={{
                      background: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: actionLoading === config.id ? 'wait' : 'pointer',
                      opacity: actionLoading === config.id ? 0.6 : 1
                    }}
                  >
                    {actionLoading === config.id ? '⏳' : '🔧'} Test
                  </button>
                  
                  {!config.is_default && (
                    <button
                      onClick={() => setDefaultConfig(config.id)}
                      disabled={actionLoading === config.id}
                      style={{
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: actionLoading === config.id ? 'wait' : 'pointer',
                        opacity: actionLoading === config.id ? 0.6 : 1
                      }}
                    >
                      Set Default
                    </button>
                  )}
                  
                  <button
                    onClick={() => openModal(config)}
                    disabled={actionLoading === config.id}
                    style={{
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: actionLoading === config.id ? 'wait' : 'pointer',
                      opacity: actionLoading === config.id ? 0.6 : 1
                    }}
                  >
                    ✏️ Edit
                  </button>
                  
                  <button
                    onClick={() => deleteConfig(config.id)}
                    disabled={actionLoading === config.id || config.is_default}
                    style={{
                      background: config.is_default ? '#6c757d' : '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: (actionLoading === config.id || config.is_default) ? 'not-allowed' : 'pointer',
                      opacity: (actionLoading === config.id || config.is_default) ? 0.6 : 1
                    }}
                    title={config.is_default ? "Cannot delete default configuration" : "Delete configuration"}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#333'
            }}>
              {editingConfig ? 'Edit SIP Configuration' : 'Add SIP Configuration'}
            </h3>

            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Basic Configuration */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '4px',
                  color: '#333'
                }}>
                  Configuration Name *
                </label>
                <input
                  type="text"
                  value={configForm.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="My SIP Server"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '4px',
                    color: '#333'
                  }}>
                    SIP Server *
                  </label>
                  <input
                    type="text"
                    value={configForm.sip_server}
                    onChange={(e) => updateFormField('sip_server', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="sip.example.com"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '4px',
                    color: '#333'
                  }}>
                    Port
                  </label>
                  <input
                    type="number"
                    value={configForm.sip_port}
                    onChange={(e) => updateFormField('sip_port', parseInt(e.target.value) || 5060)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="5060"
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '4px',
                  color: '#333'
                }}>
                  Username *
                </label>
                <input
                  type="text"
                  value={configForm.username}
                  onChange={(e) => updateFormField('username', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="user123"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '4px',
                    color: '#333'
                  }}>
                    Realm
                  </label>
                  <input
                    type="text"
                    value={configForm.realm}
                    onChange={(e) => updateFormField('realm', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="example.com"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '4px',
                    color: '#333'
                  }}>
                    Proxy
                  </label>
                  <input
                    type="text"
                    value={configForm.proxy}
                    onChange={(e) => updateFormField('proxy', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="proxy.example.com"
                  />
                </div>
              </div>

              {/* WebRTC Configuration */}
              <div style={{
                background: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                marginTop: '8px'
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  WebRTC Settings
                </h4>

                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '4px',
                      color: '#333'
                    }}>
                      STUN Server
                    </label>
                    <input
                      type="text"
                      value={configForm.stun_server}
                      onChange={(e) => updateFormField('stun_server', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      placeholder="stun:stun.l.google.com:19302"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '4px',
                        color: '#333'
                      }}>
                        TURN Server
                      </label>
                      <input
                        type="text"
                        value={configForm.turn_server}
                        onChange={(e) => updateFormField('turn_server', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                        placeholder="turn:turn.example.com:3478"
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '4px',
                        color: '#333'
                      }}>
                        TURN Username
                      </label>
                      <input
                        type="text"
                        value={configForm.turn_username}
                        onChange={(e) => updateFormField('turn_username', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                        placeholder="turnuser"
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '4px',
                        color: '#333'
                      }}>
                        Max Calls
                      </label>
                      <input
                        type="number"
                        value={configForm.max_concurrent_calls}
                        onChange={(e) => updateFormField('max_concurrent_calls', parseInt(e.target.value) || 5)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                        placeholder="5"
                        min="1"
                        max="20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Options */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={configForm.is_active}
                    onChange={(e) => updateFormField('is_active', e.target.checked)}
                  />
                  Active Configuration
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={configForm.is_default}
                    onChange={(e) => updateFormField('is_default', e.target.checked)}
                  />
                  Set as Default
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid #e1e5e9'
            }}>
              <button
                onClick={() => setShowModal(false)}
                disabled={actionLoading === -1}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: actionLoading === -1 ? 'wait' : 'pointer',
                  opacity: actionLoading === -1 ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={saveConfig}
                disabled={actionLoading === -1 || !configForm.name || !configForm.sip_server || !configForm.username}
                style={{
                  background: (!configForm.name || !configForm.sip_server || !configForm.username) ? '#6c757d' : '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: (actionLoading === -1 || !configForm.name || !configForm.sip_server || !configForm.username) ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading === -1 ? '⏳ Saving...' : (editingConfig ? 'Update Configuration' : 'Create Configuration')}
              </button>
            </div>
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
