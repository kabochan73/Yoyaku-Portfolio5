import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  cancelReservation,
  createReservation,
  fetchMyReservations,
} from "./api";

export function useMyReservations() {
  return useQuery({
    queryKey: queryKeys.myReservations,
    queryFn: fetchMyReservations,
  });
}

function useRefreshAfterChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.myReservations }),
    ]);
}

export function useCreateReservation() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: createReservation,
    // 先に予約されて失敗したときも、カレンダーをすぐ最新にして埋まった枠を見せる
    onSettled: refresh,
  });
}

export function useCancelReservation() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: cancelReservation,
    // 開始済み・キャンセル済みで断られたときは一覧が古いので、取り直して最新にする
    onSettled: refresh,
  });
}
