import axios from "axios";
import { getSession, signOut } from "next-auth/react";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
});

// Request Interceptor: Menyisipkan Bearer Token dari NextAuth
api.interceptors.request.use(async (config) => {
  if (!config.skipAuth && typeof window !== "undefined") {
    const session = await getSession();
    if (session?.accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
  }
  return config;
});

// Response Interceptor: Tangani HTTP 401 Unauthenticated
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      await signOut({ callbackUrl: "/" });
    }
    return Promise.reject(error);
  },
);
