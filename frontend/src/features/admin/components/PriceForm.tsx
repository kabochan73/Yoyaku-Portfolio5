"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { FormField } from "@/components/ui/FormField";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFacility } from "@/features/facility/logic/hooks";
import { applyServerErrors } from "@/lib/form-errors";
import { useUpdatePrices } from "../logic/hooks";
import {
  pricesSchema,
  type PricesInput,
  type PricesOutput,
} from "../logic/schemas";

export function PriceForm() {
  const facility = useFacility();
  const updatePrices = useUpdatePrices();
  const [saved, setSaved] = useState(false);
  const prices = facility.data?.prices;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PricesInput, unknown, PricesOutput>({
    resolver: zodResolver(pricesSchema),
    values: prices && {
      weekday: String(prices.weekday),
      weekend: String(prices.weekend),
    },
  });

  if (facility.isPending) {
    // 読み込む前に保存させると、空欄が0円として保存されてしまう
    return (
      <div className="space-y-4" data-testid="price-form-loading">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (facility.isError) {
    return (
      <ErrorState
        message="料金を取得できませんでした。"
        onRetry={() => void facility.refetch()}
      />
    );
  }

  const onSubmit = handleSubmit(async (input) => {
    setSaved(false);
    try {
      await updatePrices.mutateAsync(input);
      setSaved(true);
    } catch (error) {
      applyServerErrors(setError, error, ["weekday", "weekend"]);
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      onChange={() => setSaved(false)}
      noValidate
      className="space-y-4"
    >
      {saved && (
        <Alert tone="success">
          保存しました。トップページにも反映されました。
        </Alert>
      )}
      {errors.root?.server && (
        <Alert tone="error">{errors.root.server.message}</Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="平日（円/時間）"
          inputMode="numeric"
          error={errors.weekday?.message}
          {...register("weekday")}
        />
        <FormField
          label="土日（円/時間）"
          inputMode="numeric"
          error={errors.weekend?.message}
          {...register("weekend")}
        />
      </div>
      <p className="text-xs text-zinc-500">
        変更は、これから入る予約にだけ効きます。
      </p>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "保存中..." : "保存する"}
      </Button>
    </form>
  );
}
