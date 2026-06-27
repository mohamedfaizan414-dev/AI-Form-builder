'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('formix_token');
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored);
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${stored}` } })
      .then((r) => {
        if (!r.ok) throw new Error('invalid session');
        return r.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('formix_token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const applySession = useCallback((newToken, newUser) => {
    localStorage.setItem('formix_token', newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      applySession(data.token, data.user);
      return data.user;
    },
    [applySession]
  );

  const signup = useCallback(
    async (name, email, password) => {
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      applySession(data.token, data.user);
      return data.user;
    },
    [applySession]
  );

  const loginWithGoogle = useCallback(
    async (idToken) => {
      const res = await fetch(`${API}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed');
      applySession(data.token, data.user);
      return data.user;
    },
    [applySession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('formix_token');
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  const authFetch = useCallback(
    (path, options = {}) => {
      const headers = { ...(options.headers || {}) };
      const t = localStorage.getItem('formix_token');
      if (t) headers.Authorization = `Bearer ${t}`;
      return fetch(`${API}${path}`, { ...options, headers });
    },
    []
  );

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, loginWithGoogle, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
