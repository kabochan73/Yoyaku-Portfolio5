import "client-only";
import axios, { type InternalAxiosRequestConfig } from "axios";
import { toApiError } from "./api-error";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: "application/json" },
});

export async function getCsrfCookie(): Promise<void> {
  await axios.get("/sanctum/csrf-cookie", { withCredentials: true });
}

type RetriableConfig = InternalAxiosRequestConfig & { csrfRetried?: boolean };

// タブを長く開いていて CSRF トークンが切れたときは、取り直して1回だけ送り直す
api.interceptors.response.use(undefined, async (error: unknown) => {
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 419 &&
    error.config
  ) {
    const config: RetriableConfig = error.config;
    if (!config.csrfRetried) {
      config.csrfRetried = true;
      await getCsrfCookie();
      return api.request(config);
    }
  }

  throw toApiError(error);
});
