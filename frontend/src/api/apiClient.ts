import axios from "axios";

import { getApiBaseUrl } from "@/lib/api";
import {
  clearStoredAuth,
  emitUnauthorized,
  getStoredToken,
  isTokenExpired,
} from "@/lib/auth";

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: false,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (!token) {
    return config;
  }

  if (isTokenExpired(token)) {
    clearStoredAuth();
    emitUnauthorized();

    return config;
  }

  const isAuthRequest = config.url?.startsWith("/auth/");

  if (!isAuthRequest) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      clearStoredAuth();
      emitUnauthorized();
    }

    return Promise.reject(error);
  },
);

export default apiClient;
