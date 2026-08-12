import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { LoginCredentials } from '@/types/auth';
import { useAuthStore } from '@/store/authStore';

export function useLogin() {
  const { login, setLoading, setError } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (response) => {
      setLoading(false);
      if (response.success && response.user) {
        login(response.user);
      } else {
        setError(response.error || 'Erro ao fazer login');
      }
    },
    onError: (error: Error) => {
      setLoading(false);
      setError(error.message);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { logout, setLoading } = useAuthStore();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onMutate: () => {
      setLoading(true);
    },
    onSettled: () => {
      setLoading(false);
      logout();
      queryClient.clear();
    },
  });
}