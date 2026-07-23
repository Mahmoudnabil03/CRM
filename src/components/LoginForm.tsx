'use client';

import { useState } from 'react';
import { supabase } from '@/lib/auth/supabaseClient';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async (type: 'password' | 'google') => {
    setError(null);
    setLoading(true);

    if (!supabase) {
      setError('Authentication client is not configured.');
      setLoading(false);
      return;
    }

    if (type === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) setError(error.message);
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 420, width: '100%', padding: 24, borderRadius: 16, background: '#ffffff', boxShadow: '0 20px 60px rgba(15,23,42,0.08)' }}>
      <h2 style={{ margin: 0, marginBottom: 16, fontSize: 22 }}>Sign in to VisionGuard</h2>
      <label style={{ display: 'block', marginBottom: 12 }}>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db' }}
        />
      </label>
      <label style={{ display: 'block', marginBottom: 16 }}>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db' }}
        />
      </label>
      {error && <div style={{ marginBottom: 16, color: '#b91c1c' }}>{error}</div>}
      <button
        type="button"
        onClick={() => signIn('password')}
        disabled={loading}
        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <div style={{ marginTop: 18, textAlign: 'center', color: '#6b7280' }}>or</div>
      <button
        type="button"
        onClick={() => signIn('google')}
        disabled={loading}
        style={{ width: '100%', marginTop: 16, padding: '12px 16px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', color: '#111827', fontWeight: 600, cursor: 'pointer' }}
      >
        Continue with Google
      </button>
    </div>
  );
}
