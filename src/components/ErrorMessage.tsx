interface ErrorMessageProps {
  error: string;
}

export default function ErrorMessage({ error }: ErrorMessageProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff5f5',
        border: '1px solid #fed7d7',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '500px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#c53030', marginBottom: '10px', fontSize: '24px' }}>
          ⚠️ Error
        </h2>
        <p style={{ color: '#c53030', fontSize: '16px', lineHeight: '1.5' }}>
          {error}
        </p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
