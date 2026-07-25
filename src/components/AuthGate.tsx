'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { LoginForm } from './LoginForm';
import { cloudflareAuth } from '@/lib/auth/cloudflareAuth';

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!cloudflareAuth) {
      setLoading(false);
      return;
    }

    cloudflareAuth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = cloudflareAuth.onAuthStateChange((_event: any, newSession: any) => {
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
