export interface User {
  id: string;
  username: string;
  name: string;
  codusu: number;
  token?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface SankhyaLoginResponse {
  callID: { $: string };
  jsessionid: { $: string };
  idusu: { $: string };
  appToken?: string;
  codusu?: number;
  username?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}