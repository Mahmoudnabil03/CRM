// Minimal stub for Cloudflare auth integration
// Replace with real implementation later.

export const cloudflareAuth = {
  // Simulate getSession returning no session
  async getSession() {
    return { data: { session: null }, error: null } as any;
  },
  // Dummy signIn with email/password
  async signInWithPassword(_params: { email: string; password: string }) {
    return { data: null, error: null } as any;
  },
  // Dummy OAuth sign‑in
  async signInWithOAuth(_params: { provider: string }) {
    return { data: null, error: null } as any;
  },
  // Dummy sign out
  async signOut() {
    return { error: null } as any;
  },
  // Dummy auth state change listener
  onAuthStateChange(_callback: any) {
    return { data: null, error: null } as any;
  },
};
