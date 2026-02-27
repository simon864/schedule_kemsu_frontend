import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { jwtDecode } from 'jwt-decode';
import type { LoginRequest, AuthResponse, User, DecodedToken, ProfileResponse } from '../types/auth';

// Расширяем интерфейс для внутренних запросов
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Создаем экземпляр axios с базовыми настройками
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Класс для работы с авторизацией
export class AuthService {
  static setSession(token: string, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    // Устанавливаем токен в заголовки по умолчанию
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('Токен установлен в заголовки:', `Bearer ${token}`);
  }

  static clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    console.log('Сессия очищена');
  }

  static getToken(): string | null {
    return localStorage.getItem('token');
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr) as User;
      } catch {
        return null;
      }
    }
    return null;
  }

  static updateUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  static isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch {
      return false;
    }
  }

  static async refreshToken(): Promise<boolean> {
    try {
      const response = await api.post<{ success: boolean; data: { token: string; user: User } }>('/auth/refresh');
      if (response.data.success) {
        const { token, user } = response.data.data;
        this.setSession(token, user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Ошибка обновления токена:', error);
      this.clearSession();
      return false;
    }
  }
}

// Добавляем интерцептор запросов для логирования и проверки токена
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = AuthService.getToken();
    
    // Логируем запрос
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`, {
      headers: config.headers,
      data: config.data,
      hasToken: !!token
    });
    
    // Добавляем токен к каждому запросу
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Токен добавлен к запросу');
    } else {
      console.warn('⚠️ Токен отсутствует в запросе');
    }
    
    return config;
  },
  (error: unknown) => {
    console.error('❌ Ошибка в интерцепторе запросов:', error);
    return Promise.reject(error);
  }
);

// Добавляем интерцептор для обработки ошибок авторизации
api.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      console.error(`❌ Ошибка ответа: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`);
      console.error('Детали ошибки:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      const originalRequest = error.config as CustomAxiosRequestConfig;
      
      // Если ошибка 401 и это не повторный запрос
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        console.log('🔄 Получена ошибка 401, пробуем обновить токен...');
        originalRequest._retry = true;
        
        const refreshed = await AuthService.refreshToken();
        if (refreshed) {
          console.log('✅ Токен обновлен, повторяем запрос');
          const token = AuthService.getToken();
          if (token && originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
          }
          return api(originalRequest);
        } else {
          console.error('❌ Не удалось обновить токен');
        }
      }
      
      // Если ошибка 401 - не авторизован
      if (error.response?.status === 401) {
        console.log('🚪 Перенаправление на страницу входа...');
        // Не очищаем сессию сразу, возможно токен просто истек
        // AuthService.clearSession();
        // window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: User;
  };
  message?: string;
}

interface ProfileDataResponse {
  success: boolean;
  data?: User;
  message?: string;
}

export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      console.log('🔐 Попытка входа:', credentials.login);
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      
      if (response.data.success && response.data.data) {
        const { token, user } = response.data.data;
        AuthService.setSession(token, user);
        console.log('✅ Вход выполнен успешно');
        return { success: true, data: { token, user } };
      }
      
      return { 
        success: false, 
        message: response.data.message || 'Ошибка авторизации' 
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Ошибка входа:', error.response?.data || error.message);
        return { 
          success: false, 
          message: error.response?.data?.message || 'Ошибка сервера' 
        };
      }
      return { 
        success: false, 
        message: 'Ошибка соединения с сервером' 
      };
    }
  },

  getProfile: async (): Promise<ProfileDataResponse> => {
    try {
      console.log('👤 Запрос профиля');
      const response = await api.get<ProfileResponse>('/auth/profile');
      
      if (response.data.success && response.data.data) {
        const currentUser = AuthService.getUser();
        if (currentUser) {
          const updatedUser = { ...currentUser, ...response.data.data };
          AuthService.updateUser(updatedUser);
        }
        
        console.log('✅ Профиль получен');
        return { success: true, data: response.data.data };
      }
      
      return { 
        success: false, 
        message: response.data.message || 'Ошибка получения профиля' 
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Ошибка получения профиля:', error.response?.data || error.message);
        if (error.response?.status === 401) {
          AuthService.clearSession();
        }
        return { 
          success: false, 
          message: error.response?.data?.message || 'Ошибка сервера' 
        };
      }
      return { 
        success: false, 
        message: 'Ошибка соединения с сервером' 
      };
    }
  },

  logout: (): void => {
    console.log('🚪 Выход из системы');
    AuthService.clearSession();
  },

  checkAuth: (): boolean => {
    const isAuth = AuthService.isAuthenticated();
    console.log('🔍 Проверка авторизации:', isAuth);
    return isAuth;
  },

  getCurrentUser: (): User | null => {
    return AuthService.getUser();
  }
};

export default api;