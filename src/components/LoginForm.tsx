'use client';

import { useState } from 'react';
import { TenantConfig } from '@/types/tenant';

interface LoginFormProps {
  tenant: TenantConfig;
  onLogin: (token: string, user: any) => void;
}

export default function LoginForm({ tenant, onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${tenant.api_url}/users/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': typeof window !== 'undefined' ? window.location.origin : '',
        },
        mode: 'cors',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Login successful:', data);
        
        // Store token in localStorage
        localStorage.setItem('authToken', data.token || data.access_token || data.key);
        localStorage.setItem('user', JSON.stringify(data.user || data));
        
        onLogin(data.token || data.access_token || data.key, data.user || data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || errorData.detail || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${tenant.api_url}/users/password-reset/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': typeof window !== 'undefined' ? window.location.origin : '',
        },
        mode: 'cors',
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        alert('Password reset instructions have been sent to your email.');
        setShowForgotPassword(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || errorData.detail || 'Failed to send reset email.');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${tenant.theme.primary_color}22, ${tenant.theme.secondary_color}22)`,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        {/* Tenant Branding */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          {tenant.theme.logo_url && (
            <img 
              src={tenant.theme.logo_url} 
              alt={tenant.tenant_name}
              style={{ height: '60px', marginBottom: '15px' }}
            />
          )}
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: tenant.theme.primary_color,
            margin: '0 0 8px 0'
          }}>
            {tenant.theme.company_name || tenant.tenant_name}
          </h1>
          <p style={{
            color: '#666',
            fontSize: '14px',
            margin: 0
          }}>
            Sign in to your account
          </p>
        </div>

        {/* Error Message */}
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

        {/* Login Form */}
        {!showForgotPassword ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '6px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = tenant.theme.primary_color}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
                placeholder="Enter your email"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '6px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = tenant.theme.primary_color}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? '#ccc' : tenant.theme.primary_color,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                marginBottom: '15px'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: tenant.theme.primary_color,
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Forgot your password?
              </button>
            </div>
          </form>
        ) : (
          /* Forgot Password Form */
          <form onSubmit={handleForgotPassword}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                fontSize: '20px', 
                margin: '0 0 10px 0', 
                color: '#333' 
              }}>
                Reset Password
              </h3>
              <p style={{ 
                color: '#666', 
                fontSize: '14px', 
                margin: '0 0 20px 0' 
              }}>
                Enter your email address and we'll send you instructions to reset your password.
              </p>
              
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '6px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = tenant.theme.primary_color}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
                placeholder="Enter your email"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? '#ccc' : tenant.theme.primary_color,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                marginBottom: '15px'
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Instructions'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: tenant.theme.primary_color,
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #eee',
          fontSize: '12px',
          color: '#999'
        }}>
          <p style={{ margin: 0 }}>
            Powered by EchoDesk • {tenant.schema_name}.echodesk.ge
          </p>
        </div>
      </div>
    </div>
  );
}
