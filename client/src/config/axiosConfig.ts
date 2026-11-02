import axios from "axios";

export const axiosConfig = axios.create({
  baseURL: import.meta.env.VITE_API_URL + "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// The session lives in an httpOnly cookie sent automatically (withCredentials).
// A 401 means it expired or was revoked: tell the auth context so it can sign the user out.
export const UNAUTHORIZED_EVENT = "auth:unauthorized";

axiosConfig.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith("/auth/")) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);
