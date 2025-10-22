'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function RegistrationSuccessPage() {
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    // Simulate processing time (webhook should complete within a few seconds)
    const timer = setTimeout(() => {
      setProcessing(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2A2B7C 0%, #1a1b5e 100%)',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
        padding: '40px',
        width: '100%',
        maxWidth: '600px',
        textAlign: 'center'
      }}>
        {processing ? (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #2FB282',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <h1 style={{
              color: '#333',
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '15px'
            }}>
              Payment Successful!
            </h1>
            <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>
              We're setting up your EchoDesk tenant...
            </p>
            <p style={{ color: '#888', fontSize: '14px' }}>
              This usually takes just a few seconds. Please wait while we:
            </p>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: '20px 0',
              textAlign: 'left',
              display: 'inline-block'
            }}>
              <li style={{ padding: '8px 0', color: '#555', fontSize: '14px' }}>
                ✓ Create your dedicated workspace
              </li>
              <li style={{ padding: '8px 0', color: '#555', fontSize: '14px' }}>
                ✓ Set up your subscription
              </li>
              <li style={{ padding: '8px 0', color: '#555', fontSize: '14px' }}>
                ✓ Configure your admin account
              </li>
              <li style={{ padding: '8px 0', color: '#555', fontSize: '14px' }}>
                ✓ Deploy your frontend
              </li>
            </ul>
          </>
        ) : (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#2FB282',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '40px',
              color: 'white'
            }}>
              ✓
            </div>
            <h1 style={{
              color: '#333',
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '15px'
            }}>
              Welcome to EchoDesk!
            </h1>
            <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
              Your tenant has been created successfully.
              You can now access your EchoDesk dashboard.
            </p>

            <div style={{
              background: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '30px'
            }}>
              <p style={{ color: '#333', fontSize: '14px', marginBottom: '10px' }}>
                <strong>What's next?</strong>
              </p>
              <ol style={{
                textAlign: 'left',
                paddingLeft: '20px',
                margin: 0,
                color: '#555',
                fontSize: '14px'
              }}>
                <li style={{ marginBottom: '8px' }}>Check your email for login credentials</li>
                <li style={{ marginBottom: '8px' }}>Access your unique tenant URL</li>
                <li style={{ marginBottom: '8px' }}>Complete your profile setup</li>
                <li>Start using EchoDesk!</li>
              </ol>
            </div>

            <Link
              href="/"
              style={{
                display: 'inline-block',
                background: '#2FB282',
                color: 'white',
                padding: '12px 30px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              Go to Homepage
            </Link>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
