/**
 * hooks/useSubscription.js
 * Provides subscription status with derived helpers used across all layouts.
 */
import { useQuery }    from '@tanstack/react-query';
import useAuthStore    from '../store/authStore.js';
import { subscriptionService } from '../services/index.js';

const useSubscription = () => {
  const { isAuth, user } = useAuthStore();

  const enabled = isAuth && !!user?.collegeId &&
    ['collegeAdmin', 'deptAdmin', 'student', 'faculty', 'alumni'].includes(user?.role);

  const { data, isLoading } = useQuery({
    queryKey: ['subscription', user?.collegeId],
    queryFn:  subscriptionService.getStatus,
    select:   r => r.data,
    enabled,
    staleTime:      1000 * 60 * 5,   // 5 min
    refetchInterval:1000 * 60 * 10,  // re-check every 10 min
  });

  const sub          = data?.subscription ?? null;
  const isActive     = data?.hasActiveSubscription ?? false;
  const daysRemaining = sub?.daysRemaining ?? 0;
  const isExpired    = !isActive || daysRemaining <= 0;
  const isWarning    = isActive && daysRemaining > 0 && daysRemaining <= 14;
  const isUrgent     = isActive && daysRemaining > 0 && daysRemaining <= 3;

  return {
    subscription: sub,
    isActive,
    isExpired,
    isWarning,
    isUrgent,
    daysRemaining,
    isLoading,
  };
};

export default useSubscription;
