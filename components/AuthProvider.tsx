'use client';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

type User = {
  id: string;
  name: string;
  email: string | null;
  type: string;
  avatar: string | null;
  /** ISO string when the user's email was verified, or null if the
   *  user is still in the unverified window. Drives the in-app
   *  "please verify" banner (see components/VerifyEmailBanner). */
  emailVerifiedAt: string | null;
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  refresh: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refresh: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        setUser(d.authenticated ? d.identity : null);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
