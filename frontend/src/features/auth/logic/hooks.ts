import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { USER_FRESH_MS } from "@/lib/query-config";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchCurrentUser,
  login,
  logout,
  register,
  updateProfile,
} from "./api";
import type { User } from "./types";

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: fetchCurrentUser,
    staleTime: USER_FRESH_MS,
  });
}

function useSetCurrentUser() {
  const queryClient = useQueryClient();
  return (user: User) => queryClient.setQueryData(queryKeys.user, user);
}

export function useLogin() {
  const setCurrentUser = useSetCurrentUser();
  return useMutation({ mutationFn: login, onSuccess: setCurrentUser });
}

export function useRegister() {
  const setCurrentUser = useSetCurrentUser();
  return useMutation({ mutationFn: register, onSuccess: setCurrentUser });
}

export function useUpdateProfile() {
  const setCurrentUser = useSetCurrentUser();
  return useMutation({ mutationFn: updateProfile, onSuccess: setCurrentUser });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(queryKeys.user, null);
    },
  });
}
