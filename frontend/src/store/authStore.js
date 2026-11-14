/**
 * store/authStore.js
 * Global authentication state via Zustand.
 * Persisted to sessionStorage so refresh doesn't log users out.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:        null,
      accessToken: null,
      isAuth:      false,

      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuth: true }),

      updateToken: (accessToken) =>
        set({ accessToken }),

      // Shallow-merge updated fields into the stored user object
      updateUser: (fields) =>
        set(state => ({ user: { ...state.user, ...fields } })),

      logout: () =>
        set({ user: null, accessToken: null, isAuth: false }),

      // Convenience getters
      getRole:      ()    => get().user?.role ?? null,
      getCollegeId: ()    => get().user?.collegeId ?? null,
      isRole:       (role) => get().user?.role === role,
    }),
    {
      name:    'cc_auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user:        state.user,
        accessToken: state.accessToken,
        isAuth:      state.isAuth,
      }),
    }
  )
);

export default useAuthStore;
