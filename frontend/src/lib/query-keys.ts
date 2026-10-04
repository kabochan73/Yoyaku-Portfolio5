export const queryKeys = {
  user: ["user"] as const,
  myReservations: ["user", "reservations"] as const,
  facility: ["facility"] as const,
  calendar: {
    all: ["calendar"] as const,
    week: (weekStart: string) => ["calendar", weekStart] as const,
  },
  admin: {
    calendar: {
      all: ["admin", "calendar"] as const,
      week: (weekStart: string) => ["admin", "calendar", weekStart] as const,
    },
    holidays: ["admin", "holidays"] as const,
    users: (search: string) => ["admin", "users", search] as const,
  },
};
