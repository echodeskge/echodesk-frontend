import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '600px',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ 
          fontSize: '48px', 
          marginBottom: '10px', 
          color: '#333',
          fontWeight: '700'
        }}>
          🚀 EchoDesk
        </h1>
        <p style={{ 
          fontSize: '20px', 
          color: '#666', 
          marginBottom: '30px' 
        }}>
          Multi-Tenant CRM Platform
        </p>
        <p style={{ 
          fontSize: '16px', 
          color: '#666', 
          lineHeight: '1.6',
          marginBottom: '30px'
        }}>
          Welcome to EchoDesk! This is the main landing page. 
          To access a tenant-specific dashboard, visit a subdomain like{' '}
          <code style={{ 
            background: '#f5f5f5', 
            padding: '2px 6px', 
            borderRadius: '3px',
            fontSize: '14px'
          }}>
            tenant-name.echodesk.ge
          </code>
        </p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <Link 
            href="/register-tenant/"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '16px',
              display: 'inline-block',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Create New Tenant
          </Link>
          <a 
            href="#"
            style={{
              background: '#6c757d',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '16px',
              display: 'inline-block'
            }}
          >
            Learn More
          </a>
        </div>
      </div>
    </div>
  );
}
