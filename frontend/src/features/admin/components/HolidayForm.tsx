"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { ApiError } from "@/lib/api-error";
import { todayInTokyo } from "@/lib/date";
import { applyServerErrors } from "@/lib/form-errors";
import { reservationCountOf } from "../logic/api";
import { useCreateHoliday } from "../logic/hooks";
import {
  holidaySchema,
  type HolidayInput,
  type HolidayOutput,
} from "../logic/schemas";
import {
  HolidayConflictDialog,
  type HolidayConflict,
} from "./HolidayConflictDialog";

const EMPTY = { date: "", reason: "" };

export function HolidayForm() {
  const createHoliday = useCreateHoliday();
  const [conflict, setConflict] = useState<HolidayConflict | null>(null);
  const [today] = useState(() => todayInTokyo());
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HolidayInput, unknown, HolidayOutput>({
    resolver: zodResolver(holidaySchema),
    defaultValues: EMPTY,
  });

  const onSubmit = handleSubmit(async (holiday) => {
    try {
      await createHoliday.mutateAsync(holiday);
      reset(EMPTY);
    } catch (error) {
      const reservationCount = reservationCountOf(error);
      if (reservationCount !== null) {
        setConflict({ holiday, reservationCount });
        return;
      }
      if (
        error instanceof ApiError &&
        error.code === "holiday_already_exists"
      ) {
        setError("date", { type: "server", message: error.message });
        return;
      }
      applyServerErrors(setError, error, ["date", "reason"]);
    }
  });

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {errors.root?.server && (
          <Alert tone="error">{errors.root.server.message}</Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <FormField
            label="日付"
            type="date"
            min={today}
            error={errors.date?.message}
            {...register("date")}
          />
          <FormField
            label="理由（任意）"
            error={errors.reason?.message}
            {...register("reason")}
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "追加中..." : "休業日を追加"}
        </Button>
      </form>
      <HolidayConflictDialog
        conflict={conflict}
        onClose={() => setConflict(null)}
        onClosed={() => {
          setConflict(null);
          reset(EMPTY);
        }}
      />
    </>
  );
}
