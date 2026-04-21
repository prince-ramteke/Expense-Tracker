import type { AuthUser } from "@/types/api";

const TOKEN_STORAGE_KEY = "token";
const USER_STORAGE_KEY = "user";

type JwtPayload = {
  exp?: number;
  sub?: string;
};

const getFallbackName = (email: string) =>
  email
    .split("@")[0]
    ?.replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase()) || "User";

const parseJwtPayload = (token: string): JwtPayload | null => {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = window.atob(normalizedPayload);

    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
};

export const buildAuthUser = (
  user: Partial<AuthUser> & Pick<AuthUser, "email">,
): AuthUser => {
  const fallbackName = getFallbackName(user.email);
  const fullName = user.fullName?.trim() || user.name?.trim() || fallbackName;

  return {
    id: user.id?.toString() || user.email,
    email: user.email,
    name: user.name?.trim() || fullName,
    fullName,
  };
};

export const getStoredToken = () => window.localStorage.getItem(TOKEN_STORAGE_KEY);

export const getStoredUser = () => {
  const rawUser = window.localStorage.getItem(USER_STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(rawUser) as Partial<AuthUser>;

    if (!parsedUser.email) {
      return null;
    }

    return buildAuthUser({
      id: parsedUser.id,
      email: parsedUser.email,
      name: parsedUser.name,
      fullName: parsedUser.fullName,
    });
  } catch {
    return null;
  }
};

export const persistAuth = (
  token: string,
  user: Partial<AuthUser> & Pick<AuthUser, "email">,
) => {
  const normalizedUser = buildAuthUser(user);

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));

  return normalizedUser;
};

export const clearStoredAuth = () => {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
};

export const isTokenExpired = (token: string, bufferMs = 15_000) => {
  const payload = parseJwtPayload(token);

  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now() + bufferMs;
};

export const readStoredAuth = () => {
  const token = getStoredToken();

  if (!token || isTokenExpired(token)) {
    clearStoredAuth();

    return {
      token: null,
      user: null,
      isAuthenticated: false,
    };
  }

  const storedUser = getStoredUser();
  const tokenPayload = parseJwtPayload(token);

  const user =
    storedUser ||
    (tokenPayload?.sub
      ? buildAuthUser({
          email: tokenPayload.sub,
        })
      : null);

  if (!user) {
    clearStoredAuth();

    return {
      token: null,
      user: null,
      isAuthenticated: false,
    };
  }

  return {
    token,
    user,
    isAuthenticated: true,
  };
};

export const emitUnauthorized = () => {
  window.dispatchEvent(new Event("unauthorized"));
};
