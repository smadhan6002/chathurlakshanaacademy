import { useState } from 'react';
import { motion } from 'framer-motion';
import { signInAdmin } from '../lib/auth';

export default function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const res = await signInAdmin(email, password);
    if (res.success) {
      onLogin();
    } else {
      setError(res.error || 'Invalid email or password.');
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--color-border)',
    padding: '12px 0',
    fontFamily: "var(--font-body)",
    fontSize: '16px',
    color: 'var(--color-text-primary)',
    outline: 'none',
    transition: 'border-color 0.3s ease',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: '13px',
    letterSpacing: '0.15em',
    fontWeight: 600,
    color: 'var(--color-accent)',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '8px',
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg-alternate)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
    }}>
      {/* Background texture matching website */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(247, 241, 229, 0.4) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
          padding: '48px 40px',
          boxShadow: '0 10px 40px rgba(59, 41, 34, 0.05)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '60px', height: '60px',
            border: '1px dashed var(--color-accent)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            fontFamily: "var(--font-display)",
            fontSize: '20px',
            color: 'var(--color-accent)',
          }}>
            CL
          </div>
          <h2 style={{
            fontFamily: "var(--font-body)",
            fontSize: '14px', fontWeight: 600, letterSpacing: '0.25em',
            color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '8px',
          }}>
            ADMIN ACCESS
          </h2>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: '28px', fontWeight: 400,
            color: 'var(--color-text-heading)', lineHeight: 1.2,
          }}>
            Chathur Lakshana<br/>Academy of Fine Arts
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              required
              style={inputStyle}
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--color-accent)'}
              onBlur={e => e.currentTarget.style.borderBottomColor = 'var(--color-border)'}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              required
              style={inputStyle}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--color-accent)'}
              onBlur={e => e.currentTarget.style.borderBottomColor = 'var(--color-border)'}
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                color: '#e57373',
                fontFamily: "var(--font-body)",
                fontSize: '13.5px',
                textAlign: 'center',
                lineHeight: 1.5,
                padding: '10px 14px',
                backgroundColor: 'rgba(229, 115, 115, 0.08)',
                border: '1px solid rgba(229, 115, 115, 0.3)',
                borderRadius: '2px',
                marginTop: '-8px',
              }}
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '16px',
              cursor: isLoading ? 'wait' : 'pointer',
              fontFamily: "var(--font-body)",
              fontSize: '14px', fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginTop: '16px',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'AUTHENTICATING...' : 'LOGIN'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
