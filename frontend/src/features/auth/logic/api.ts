import { api, getCsrfCookie } from "@/lib/api-client";
import { ApiError } from "@/lib/api-error";
import type { LoginInput, ProfileInput, RegisterInput } from "./schemas";
import type { User } from "./types";

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const { data } = await api.get<{ data: User }>("/user");
    return data.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<User> {
  await getCsrfCookie();
  const { data } = await api.post<{ data: User }>("/login", input);
  return data.data;
}

export async function register(input: RegisterInput): Promise<User> {
  await getCsrfCookie();
  const { data } = await api.post<{ data: User }>("/register", input);
  return data.data;
}

export async function logout(): Promise<void> {
  await api.post("/logout");
}

export async function updateProfile(input: ProfileInput): Promise<User> {
  const payload =
    input.password === "" ? { name: input.name, email: input.email } : input;
  const { data } = await api.put<{ data: User }>("/user/profile", payload);
  return data.data;
}
