import axios from "axios";

export const getApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return "/api";
  }

  return configuredBaseUrl.replace(/\/+$/, "");
};

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage = "Something went wrong. Please try again.",
) => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (typeof responseData === "string" && responseData.trim()) {
      return responseData.trim();
    }

    if (
      responseData &&
      typeof responseData === "object" &&
      "message" in responseData &&
      typeof responseData.message === "string" &&
      responseData.message.trim()
    ) {
      return responseData.message.trim();
    }

    if (
      responseData &&
      typeof responseData === "object" &&
      "error" in responseData &&
      typeof responseData.error === "string" &&
      responseData.error.trim()
    ) {
      return responseData.error.trim();
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      return "Your session has expired. Please sign in again.";
    }

    if (error.code === "ERR_NETWORK") {
      return "Unable to reach the API. Check the frontend API base URL or dev proxy target.";
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallbackMessage;
};
