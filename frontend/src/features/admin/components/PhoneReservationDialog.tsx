"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { useFacility } from "@/features/facility/logic/hooks";
import { estimatePrice } from "@/features/facility/logic/price";
import { ReservationSummary } from "@/features/reservations/components/ReservationSummary";
import type { NewReservation } from "@/features/reservations/logic/types";
import { ApiError } from "@/lib/api-error";
import { applyServerErrors } from "@/lib/form-errors";
import { useCreatePhoneReservation } from "../logic/hooks";
import {
  phoneReservationSchema,
  type PhoneReservationInput,
} from "../logic/schemas";

export function PhoneReservationDialog({
  slot,
  onClose,
  onReserved,
}: {
  slot: NewReservation | null;
  onClose: () => void;
  onReserved: () => void;
}) {
  const { data: facility } = useFacility();
  const createReservation = useCreatePhoneReservation();
  const [slotTaken, setSlotTaken] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PhoneReservationInput>({
    resolver: zodResolver(phoneReservationSchema),
    defaultValues: { booker_name: "" },
  });

  const slotKey = slot
    ? `${slot.date}:${slot.start_hour}-${slot.end_hour}`
    : null;
  const [shownSlotKey, setShownSlotKey] = useState(slotKey);

  // 別の枠で開き直したら、前のエラーを消す
  if (slotKey !== shownSlotKey) {
    setShownSlotKey(slotKey);
    setSlotTaken(false);
  }

  // 前に入力した予約者名も消す
  useEffect(() => {
    reset({ booker_name: "" });
  }, [slotKey, reset]);

  const onSubmit = handleSubmit(async (input) => {
    if (slot === null) {
      return;
    }
    try {
      await createReservation.mutateAsync({ ...slot, ...input });
      onReserved();
    } catch (error) {
      if (error instanceof ApiError && error.code === "slot_taken") {
        setSlotTaken(true);
      }
      applyServerErrors(setError, error, ["booker_name"]);
    }
  });

  return (
    <Dialog
      open={slot !== null}
      onClose={onClose}
      title="電話予約の登録"
      closable={!isSubmitting}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {slot && facility && (
          <ReservationSummary
            date={slot.date}
            startHour={slot.start_hour}
            endHour={slot.end_hour}
            price={estimatePrice(
              facility,
              slot.date,
              slot.start_hour,
              slot.end_hour,
            )}
          />
        )}
        <FormField
          label="予約者名"
          autoComplete="off"
          error={errors.booker_name?.message}
          {...register("booker_name")}
        />
        {errors.root?.server && (
          <Alert tone="error">{errors.root.server.message}</Alert>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={isSubmitting} onClick={onClose}>
            戻る
          </Button>
          <Button type="submit" disabled={isSubmitting || slotTaken}>
            {isSubmitting ? "登録中..." : "登録する"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
