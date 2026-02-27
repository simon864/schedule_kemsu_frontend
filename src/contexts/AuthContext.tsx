import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import type { User } from '../types/auth';
import { authAPI } from '../services/api';

// Интерфейс для контекста
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

// Создаем контекст
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Хук для использования контекста
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Провайдер контекста
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка профиля с сервера
  const refreshProfile = async (): Promise<void> => {
    try {
      const response = await authAPI.getProfile();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        // Если не удалось получить профиль, возможно токен истек
        authAPI.logout();
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  // Проверка авторизации при загрузке
  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        const isAuth = authAPI.checkAuth();
        if (isAuth) {
          // Сначала берем пользователя из localStorage
          const currentUser = authAPI.getCurrentUser();
          setUser(currentUser);
          
          // Затем обновляем профиль с сервера
          await refreshProfile();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  interface LoginResult {
    success: boolean;
    message?: string;
  }

  const login = async (login: string, password: string): Promise<LoginResult> => {
    try {
      const response = await authAPI.login({ login, password });
      
      if (response.success && response.data) {
        setUser(response.data.user);
        
        // После успешного входа получаем полный профиль
        await refreshProfile();
        
        return { success: true };
      } else {
        return { 
          success: false, 
          message: response.message || 'Ошибка авторизации' 
        };
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      if (error && typeof error === 'object') {
        if ('response' in error) {
          const axiosError = error as { response?: { data?: { message?: string } } };
          return { 
            success: false, 
            message: axiosError.response?.data?.message || 'Ошибка сервера' 
          };
        } else if ('request' in error) {
          return { 
            success: false, 
            message: 'Нет соединения с сервером' 
          };
        }
      }
      
      return { 
        success: false, 
        message: 'Произошла ошибка при входе' 
      };
    }
  };

  const logout = (): void => {
    authAPI.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};