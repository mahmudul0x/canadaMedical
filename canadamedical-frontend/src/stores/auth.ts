import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type UserType = "physician" | "employer" | null;

export interface AuthUser {
  id?: number | string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type?: UserType;
  is_admin?: boolean;
  specialty?: string;
  company_name?: string;
  [key: string]: unknown;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  userType: UserType;
  isAdmin: boolean;
  hydrated: boolean;
  login: (payload: { user: AuthUser; access: string; refresh: string }) => void;
  logout: () => void;
  updateTokens: (access: string, refresh: string) => void;
  setUser: (user: AuthUser) => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      userType: null,
      isAdmin: false,
      hydrated: false,
      login: ({ user, access, refresh }) =>
        set({
          user,
          accessToken: access,
          refreshToken: refresh,
          isAuthenticated: true,
          userType: (user.user_type as UserType) ?? null,
          isAdmin: !!user.is_admin,
        }),
      logout: () => {
        // Fire-and-forget token blacklist — don't block UI on failure
        const { refreshToken } = useAuthStore.getState();
        if (refreshToken) {
          import("axios").then(({ default: axios }) => {
            const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
            axios.post(`${base}/api/auth/logout/`, { refresh: refreshToken }).catch(() => {});
          });
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          userType: null,
          isAdmin: false,
        });
      },
      updateTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
      setUser: (user) =>
        set({
          user,
          userType: (user.user_type as UserType) ?? null,
          isAdmin: !!user.is_admin,
        }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "CandianMdJobs-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage),
      ),
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        isAuthenticated: s.isAuthenticated,
        userType: s.userType,
        isAdmin: s.isAdmin,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);