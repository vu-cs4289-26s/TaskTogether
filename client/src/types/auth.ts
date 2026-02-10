export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: 'ADMIN' | 'MEMBER';
  householdId: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  status: 'success';
  data: {
    user: User;
    token: string;
  };
}

export interface ApiError {
  status: 'error';
  error: {
    code: string;
    message: string;
  };
}
