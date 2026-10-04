"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";

function isClientError(error: Error): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

export function createQueryClient(): QueryClient {
  const clearUserOnUnauthorized = (error: Error) => {
    if (error instanceof ApiError && error.status === 401) {
      queryClient.setQueryData(queryKeys.user, null);
    }
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: clearUserOnUnauthorized }),
    mutationCache: new MutationCache({ onError: clearUserOnUnauthorized }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          !isClientError(error) && failureCount < 1,
      },
    },
  });

  return queryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
