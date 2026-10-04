export type FacilityRules = {
  open_hour: number;
  close_hour: number;
  min_hours: number;
  max_hours: number;
  booking_window_months: number;
};

export type Facility = {
  name: string;
  phone: string;
  address: string;
  email: string;
  rules: FacilityRules;
  prices: { weekday: number; weekend: number };
  regular_holidays: number[];
};
