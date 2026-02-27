export interface Department {
  id: number;
  short_name: string;
  full_name: string;
  faculty_id: number;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  login: string;
  role: 'lecturer' | 'admin';
  department_id: number;
  department?: Department;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
  message?: string;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface ProfileResponse {
  success: boolean;
  data: User;
  message?: string;
}

export interface DecodedToken {
  exp: number;
  iat: number;
  user_id: number;
  role: string;
}