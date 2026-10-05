import type { SlotStatus } from "./types";

export type Selection =
  | { kind: "idle" }
  | { kind: "start"; date: string; hour: number }
  | { kind: "complete"; date: string; startHour: number; endHour: number };

export type SlotRef = { date: string; hour: number };

// 取り直しで枠の状態が変わっても、毎回最新の状態で判定し直せるよう、状態は関数で受け取る
export type GetStatus = (date: string, hour: number) => SlotStatus | undefined;

export type SelectionRules = { minHours: number; maxHours: number };

export const IDLE: Selection = { kind: "idle" };

export function endCandidates(
  selection: Selection,
  getStatus: GetStatus,
  rules: SelectionRules,
): number[] {
  if (selection.kind !== "start") {
    return [];
  }

  const candidates: number[] = [];
  for (let hours = 1; hours <= rules.maxHours; hours++) {
    const hour = selection.hour + hours - 1;
    if (getStatus(selection.date, hour) !== "available") {
      break;
    }
    if (hours >= rules.minHours) {
      candidates.push(hour);
    }
  }
  return candidates;
}

export function selectSlot(
  current: Selection,
  clicked: SlotRef,
  getStatus: GetStatus,
  rules: SelectionRules,
): Selection {
  if (getStatus(clicked.date, clicked.hour) !== "available") {
    return IDLE;
  }

  if (current.kind === "start" && current.date === clicked.date) {
    if (current.hour === clicked.hour) {
      return IDLE;
    }

    if (endCandidates(current, getStatus, rules).includes(clicked.hour)) {
      return {
        kind: "complete",
        date: current.date,
        startHour: current.hour,
        endHour: clicked.hour + 1,
      };
    }
  }

  return { kind: "start", date: clicked.date, hour: clicked.hour };
}

export type SlotMark = "start" | "candidate" | "selected";

// candidates は endCandidates の結果。枠ごとに計算し直さないよう、外で1回だけ求めて渡す
export function slotMarkOf(
  selection: Selection,
  candidates: number[],
  date: string,
  hour: number,
): SlotMark | undefined {
  if (selection.kind === "idle" || selection.date !== date) {
    return undefined;
  }
  if (selection.kind === "start") {
    if (hour === selection.hour) {
      return "start";
    }
    return candidates.includes(hour) ? "candidate" : undefined;
  }
  return hour >= selection.startHour && hour < selection.endHour
    ? "selected"
    : undefined;
}
