/**
 * hooks/useAuth.js
 * Auth mutation hooks wrapping React Query + Zustand.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate }           from 'react-router-dom';
import toast                     from 'react-hot-toast';
import { authService }           from '../services/index.js';
import useAuthStore              from '../store/authStore.js';

// Role → dashboard route map
const ROLE_ROUTES = {
  owner:        '/owner',
  collegeAdmin: '/admin',
  deptAdmin:    '/dept-admin',
  student:      '/student',
  faculty:      '/faculty',
  alumni:       '/alumni',
};

export const useLogin = () => {
  const { setAuth } = useAuthStore();
  const navigate    = useNavigate();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      toast.success(`Welcome back, ${data.user.firstName}!`);
      navigate(ROLE_ROUTES[data.user.role] ?? '/');
    },
    onError: (err) => {
      const msg = err.response?.data?.message ?? 'Login failed';
      // Show a longer toast for the pending-verification case so users understand the workflow
      const isPending = msg.toLowerCase().includes('pending verification');
      toast.error(msg, { duration: isPending ? 6000 : 4000 });
    },
  });
};

export const useOwnerLogin = () => {
  const { setAuth } = useAuthStore();
  const navigate    = useNavigate();

  return useMutation({
    mutationFn: authService.ownerLogin,
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      toast.success(`Welcome, ${data.user.firstName}!`);
      navigate('/owner');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message ?? 'Login failed');
    },
  });
};

export const useRegisterCollege = () => {
  const { setAuth } = useAuthStore();
  const navigate    = useNavigate();

  return useMutation({
    mutationFn: authService.registerCollege,
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      toast.success(`College registered! Set up your subscription to go live.`);
      navigate('/admin/billing');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message ?? 'Registration failed');
    },
  });
};

export const useRegister = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authService.register,
    onSuccess: () => {
      toast.success('Registration successful! Awaiting verification.');
      navigate('/login');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message ?? 'Registration failed');
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuthStore();
  const navigate   = useNavigate();

  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      logout();
      navigate('/login');
    },
  });
};

export const useMe = () => {
  const { isAuth } = useAuthStore();

  return useQuery({
    queryKey: ['me'],
    queryFn:  authService.me,
    enabled:  isAuth,
    select:   (res) => res.data.user,
  });
};
