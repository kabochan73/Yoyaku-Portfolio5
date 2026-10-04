import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { FacilityProvider } from "@/features/facility/components/FacilityProvider";
import { useFacility } from "@/features/facility/logic/hooks";
import type { Facility } from "@/features/facility/logic/types";
import facilityResponse from "@/test/fixtures/facility.json";
import { server } from "@/test/msw/server";
import { createTestQueryClient } from "@/test/render";

const facility: Facility = facilityResponse.data;

function wrapper(fromServer: Facility | null) {
  const queryClient = createTestQueryClient();

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {fromServer === null ? (
          children
        ) : (
          <FacilityProvider facility={fromServer}>{children}</FacilityProvider>
        )}
      </QueryClientProvider>
    );
  };
}

test("サーバーで取った値があれば、API を呼ばずにそれを返す", () => {
  const { result } = renderHook(() => useFacility(), {
    wrapper: wrapper(facility),
  });

  expect(result.current.data).toEqual(facility);
});

test("サーバーで取った値が無ければ、/api/facility を取る", async () => {
  let requests = 0;
  server.use(
    http.get("/api/facility", () => {
      requests += 1;
      return HttpResponse.json(facilityResponse);
    }),
  );

  const { result } = renderHook(() => useFacility(), {
    wrapper: wrapper(null),
  });

  await waitFor(() => expect(result.current.data).toEqual(facility));
  expect(requests).toBe(1);
});
