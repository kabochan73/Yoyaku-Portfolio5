export type ReservationStatus = "confirmed" | "cancelled";

export type ReservationPhase = "before_start" | "in_use" | "finished";

export type Reservation = {
  id: number;
  date: string;
  start_hour: number;
  end_hour: number;
  hours: number;
  price: number;
  status: ReservationStatus;
  phase: ReservationPhase;
  is_cancellable: boolean;
  booker_name: string | null;
};

export type NewReservation = {
  date: string;
  start_hour: number;
  end_hour: number;
};
