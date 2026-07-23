'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { LoginForm } from './LoginForm';
import { supabase } from '@/lib/auth/supabaseClient';

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading session…</div>;
  }

  if (!session) {
    return <LoginForm />;
  }

  return <>{children}</>;
}
