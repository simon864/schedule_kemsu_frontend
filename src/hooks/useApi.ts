import { useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { AxiosRequestConfig } from 'axios';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function useApi<T = unknown>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const { logout } = useAuth();

  const request = useCallback(async (
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await api.request<T>({
        method,
        url,
        data,
        ...config,
      });

      setState({
        data: response.data,
        loading: false,
        error: null,
      });

      return { success: true, data: response.data };
    } catch (error: unknown) {
      // Типизация ошибки
      let errorMessage = 'Произошла ошибка';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        
        // Если ошибка 401 - возможно токен истек
        if (axiosError.response?.status === 401) {
          logout();
        }
        
        errorMessage = axiosError.response?.data?.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }, [logout]);

  const get = useCallback((url: string, config?: AxiosRequestConfig) => 
    request('get', url, undefined, config), [request]);

  const post = useCallback((url: string, data?: unknown, config?: AxiosRequestConfig) => 
    request('post', url, data, config), [request]);

  const put = useCallback((url: string, data?: unknown, config?: AxiosRequestConfig) => 
    request('put', url, data, config), [request]);

  const del = useCallback((url: string, config?: AxiosRequestConfig) => 
    request('delete', url, undefined, config), [request]);

  return {
    ...state,
    get,
    post,
    put,
    delete: del,
  };
}
