import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { createQueryClient } from "@/app/providers";

export function createTestQueryClient(): QueryClient {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
    mutations: { retry: false },
  });
  return queryClient;
}

export function renderWithClient(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    ...options
  }: RenderOptions & { queryClient?: QueryClient } = {},
) {
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
      options,
    ),
  };
}
