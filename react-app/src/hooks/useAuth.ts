/*import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import type { LoginResponse } from '../services/api';

export function useAuth() {
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setIsLoading(true);
    try {
      const sessionData = await authAPI.checkSession();
      if (sessionData) {
        setUser(sessionData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const userData = await authAPI.login(email, password);
    setUser(userData);
    setIsAuthenticated(true);
    return userData;
  };

  const register = async (email: string, password: string, confirmPassword: string) => {
    console.log('📝 Registering user...');
    const userData = await authAPI.register(email, password, confirmPassword);
    console.log('✅ Registration API response:', userData);
    setUser(userData);
    setIsAuthenticated(true);
    console.log('✅ Auth state updated - user:', userData, 'isAuthenticated:', true);
    return userData;
  };

  const logout = async () => {
    console.log('🚪 Logging out...');
    try {
      await authAPI.logout();
      console.log('✅ Logout API call successful');
    } catch (error) {
      console.error('❌ Logout API call failed:', error);
    }
    setUser(null);
    setIsAuthenticated(false);
    console.log('✅ Auth state cleared - user:', null, 'isAuthenticated:', false);
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    checkSession,
  };
}
*/