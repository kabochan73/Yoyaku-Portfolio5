import type {
  CalendarDay,
  CalendarMeta,
  CalendarSlot,
} from "@/features/calendar/logic/types";
import type {
  NewReservation,
  Reservation,
} from "@/features/reservations/logic/types";

export type AdminReservation = Reservation & {
  user_id: number | null;
  is_phone: boolean;
};

export type AdminCalendarSlot = CalendarSlot & {
  reservation_id: number | null;
};

export type AdminCalendarDay = Omit<CalendarDay, "slots"> & {
  slots: AdminCalendarSlot[];
  reservations: AdminReservation[];
};

export type AdminCalendar = {
  meta: CalendarMeta & { oldest_date: string };
  data: AdminCalendarDay[];
};

export type NewPhoneReservation = NewReservation & {
  booker_name: string;
};

export type Prices = {
  weekday: number;
  weekend: number;
};

export type Holiday = {
  id: number;
  date: string;
  reason: string | null;
};

export type NewHoliday = {
  date: string;
  reason: string | null;
  cancel_reservations?: boolean;
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  confirmed_reservations_count: number;
};

export type UserSearchResult = {
  users: AdminUser[];
  // この件数ちょうどなら、まだ続きがあるかもしれない
  limit: number;
};
