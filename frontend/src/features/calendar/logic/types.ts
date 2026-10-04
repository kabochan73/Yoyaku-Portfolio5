export type SlotStatus = "available" | "booked" | "past" | "closed";

export type DayClosedReason =
  "past" | "out_of_range" | "regular_holiday" | "holiday";

export type CalendarSlot = {
  hour: number;
  status: SlotStatus;
};

export type CalendarDay = {
  date: string;
  closed_reason: DayClosedReason | null;
  slots: CalendarSlot[];
};

export type CalendarMeta = {
  today: string;
  bookable_until: string;
};

export type Calendar = {
  meta: CalendarMeta;
  data: CalendarDay[];
};
