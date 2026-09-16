import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext(null);

const normalizeUser = async () => {
  const res = await authAPI.getMe();
  return res.data.data;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const applyAuth = useCallback((token, userData) => {
    localStorage.setItem('veravote_token', token);
    localStorage.setItem('veravote_user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('veravote_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const userData = await normalizeUser();
      setUser(userData);
      setIsAuthenticated(true);
    } catch {
      localStorage.removeItem('veravote_token');
      localStorage.removeItem('veravote_user');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { data } = res.data;
    applyAuth(data.token, data.user);
    const userData = await normalizeUser().catch(() => data.user);
    setUser(userData);
    localStorage.setItem('veravote_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (userData) => {
    const res = await authAPI.register(userData);
    const { data } = res.data;
    applyAuth(data.token, data.user);
    const full = await normalizeUser().catch(() => data.user);
    setUser(full);
    localStorage.setItem('veravote_user', JSON.stringify(full));
    return full;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('veravote_token');
    localStorage.removeItem('veravote_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('veravote_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, register, logout, updateUser, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
