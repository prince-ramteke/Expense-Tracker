import { create } from "zustand";

import {
  clearStoredAuth,
  persistAuth,
  readStoredAuth,
} from "@/lib/auth";
import type { AuthUser } from "@/types/api";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: Partial<AuthUser> & Pick<AuthUser, "email">) => void;
  logout: () => void;
  hydrate: () => void;
  initialize: () => void;
}

let hasInitializedUnauthorizedListener = false;

export const useAuthStore = create<AuthState>((set) => ({
  ...readStoredAuth(),

  setAuth: (token, user) => {
    const normalizedUser = persistAuth(token, user);
    set({ token, user: normalizedUser, isAuthenticated: true });
  },

  logout: () => {
    clearStoredAuth();
    set({ token: null, user: null, isAuthenticated: false });
  },

  hydrate: () => {
    set(readStoredAuth());
  },

  initialize: () => {
    if (!hasInitializedUnauthorizedListener) {
      window.addEventListener("unauthorized", () => {
        useAuthStore.getState().logout();
      });
      hasInitializedUnauthorizedListener = true;
    }

    set(readStoredAuth());
  },
}));
