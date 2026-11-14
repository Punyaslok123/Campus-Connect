import AppRouter   from './routes/AppRouter.jsx';
import useSocket    from './hooks/useSocket.js';
import useUIStore   from './store/uiStore.js';
import useAuthStore from './store/authStore.js';
import { useEffect } from 'react';
import { authService } from './services/index.js';

// Mount socket globally — connects when user logs in, disconnects on logout
const SocketMount = () => { useSocket(); return null; };

// Hydrate authStore with populated college data on every app load.
// The login response stores collegeId as a raw ObjectId; /me returns the full
// populated object (with logo, coverImage, etc.) that the UI needs.
const MeHydrator = () => {
  const { isAuth, user, updateUser } = useAuthStore();

  useEffect(() => {
    if (!isAuth) return;
    if (user?.role === 'owner') return;

    authService.me().then(res => {
      const fresh = res.data?.user;
      if (fresh) updateUser(fresh);
    }).catch(() => {/* silently ignore — token may have expired, router guards handle it */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  return null;
};

// Global subscription expiry banner
const SubWarningBanner = () => {
  const { subscriptionWarning, clearSubscriptionWarning } = useUIStore();
  const { user } = useAuthStore();
  if (!subscriptionWarning) return null;
  const { daysRemaining } = subscriptionWarning;
  return (
    <div className="fixed top-0 left-0 right-0 z-[999] bg-amber-500 text-white text-xs font-medium
                    flex items-center justify-between px-4 py-2">
      <span>
        ⚠ Subscription expires in <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong>.
        {user?.role === 'collegeAdmin' && (
          <a href="/admin/billing" className="ml-2 underline font-semibold">Renew Now →</a>
        )}
      </span>
      <button onClick={clearSubscriptionWarning} className="ml-4 hover:opacity-70">✕</button>
    </div>
  );
};

const App = () => (
  <>
    <MeHydrator />
    <SocketMount />
    <SubWarningBanner />
    <AppRouter />
  </>
);

export default App;
