import { act, renderHook } from "@testing-library/react";
import { useDebouncedValue } from "@/lib/use-debounced-value";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test("変わってから指定の時間がたつまでは、前の値のまま", () => {
  const { result, rerender } = renderHook(
    ({ value }) => useDebouncedValue(value, 300),
    { initialProps: { value: "山" } },
  );

  rerender({ value: "山田" });
  act(() => jest.advanceTimersByTime(299));
  expect(result.current).toBe("山");

  act(() => jest.advanceTimersByTime(1));
  expect(result.current).toBe("山田");
});

test("続けて変わると、最後の変更から数え直す", () => {
  const { result, rerender } = renderHook(
    ({ value }) => useDebouncedValue(value, 300),
    { initialProps: { value: "" } },
  );

  rerender({ value: "山" });
  act(() => jest.advanceTimersByTime(200));
  rerender({ value: "山田" });
  act(() => jest.advanceTimersByTime(200));
  expect(result.current).toBe("");

  act(() => jest.advanceTimersByTime(100));
  expect(result.current).toBe("山田");
});
