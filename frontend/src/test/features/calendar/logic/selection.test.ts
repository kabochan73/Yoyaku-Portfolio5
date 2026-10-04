import {
  endCandidates,
  IDLE,
  selectSlot,
  type GetStatus,
  type Selection,
} from "@/features/calendar/logic/selection";

const rules = { minHours: 2, maxHours: 4 };
const DAY = "2026-10-09";
const NEXT_DAY = "2026-10-10";

// 10〜21時の枠がすべて空きで、booked に書いた枠だけ予約済み
function statuses(booked: Record<string, number[]> = {}): GetStatus {
  return (date, hour) => {
    if (hour < 10 || hour > 21) {
      return undefined;
    }
    return booked[date]?.includes(hour) ? "booked" : "available";
  };
}

function press(
  hours: Array<[string, number]>,
  getStatus: GetStatus = statuses(),
): Selection {
  return hours.reduce<Selection>(
    (selection, [date, hour]) =>
      selectSlot(selection, { date, hour }, getStatus, rules),
    IDLE,
  );
}

describe("開始を選ぶ", () => {
  test("空きを押すと開始になる", () => {
    expect(press([[DAY, 10]])).toEqual({ kind: "start", date: DAY, hour: 10 });
  });

  test("開始と同じ枠をもう一度押すと解除", () => {
    expect(
      press([
        [DAY, 10],
        [DAY, 10],
      ]),
    ).toEqual(IDLE);
  });

  test("予約済みを押すと解除", () => {
    const getStatus = statuses({ [DAY]: [14] });

    expect(
      press(
        [
          [DAY, 10],
          [DAY, 14],
        ],
        getStatus,
      ),
    ).toEqual(IDLE);
  });

  test("別の日の空きを押すと、そこが新しい開始", () => {
    expect(
      press([
        [DAY, 10],
        [NEXT_DAY, 11],
      ]),
    ).toEqual({ kind: "start", date: NEXT_DAY, hour: 11 });
  });
});

describe("B2: 終了を選ぶ（2〜4時間）", () => {
  test.each([
    ["1枠目（1時間）は開始と同じ枠なので解除", 10, { kind: "idle" }],
    ["2枠目（2時間）", 11, { endHour: 12 }],
    ["4枠目（4時間）", 13, { endHour: 14 }],
    ["5枠目（5時間）は候補でないので、そこが新しい開始", 14, { hour: 14 }],
  ])("%s", (_, hour, expected) => {
    expect(
      press([
        [DAY, 10],
        [DAY, hour],
      ]),
    ).toMatchObject(expected);
  });

  test("終了候補を押すと、開始から押した枠の次の時までになる", () => {
    expect(
      press([
        [DAY, 18],
        [DAY, 20],
      ]),
    ).toEqual({ kind: "complete", date: DAY, startHour: 18, endHour: 21 });
  });
});

describe("終了候補", () => {
  test("開始から2〜4枠目が候補", () => {
    expect(
      endCandidates({ kind: "start", date: DAY, hour: 10 }, statuses(), rules),
    ).toEqual([11, 12, 13]);
  });

  test("B7: 間に予約済みがあると、その先は候補にならない", () => {
    expect(
      endCandidates(
        { kind: "start", date: DAY, hour: 10 },
        statuses({ [DAY]: [12] }),
        rules,
      ),
    ).toEqual([11]);
  });

  test("B3: 営業時間を超える枠は候補にならない（21時開始は候補なし）", () => {
    expect(
      endCandidates({ kind: "start", date: DAY, hour: 20 }, statuses(), rules),
    ).toEqual([21]);
    expect(
      endCandidates({ kind: "start", date: DAY, hour: 21 }, statuses(), rules),
    ).toEqual([]);
  });

  test("開始の枠が取り直しで予約済みに変わると、候補は0件", () => {
    const selection = press([[DAY, 10]]);

    expect(endCandidates(selection, statuses({ [DAY]: [10] }), rules)).toEqual(
      [],
    );
  });

  test("開始を選んでいなければ候補は無い", () => {
    expect(endCandidates(IDLE, statuses(), rules)).toEqual([]);
  });
});

test("完了の後に空きを押すと、新しい開始になる", () => {
  expect(
    press([
      [DAY, 10],
      [DAY, 11],
      [DAY, 15],
    ]),
  ).toEqual({ kind: "start", date: DAY, hour: 15 });
});
