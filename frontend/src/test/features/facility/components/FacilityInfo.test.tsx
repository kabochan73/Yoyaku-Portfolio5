import { render, screen } from "@testing-library/react";
import { FacilityInfo } from "@/features/facility/components/FacilityInfo";
import type { Facility } from "@/features/facility/logic/types";
import facilityFixture from "@/test/fixtures/facility.json";

const facility = facilityFixture.data as Facility;

function valueOf(label: string): string | null {
  return screen.getByText(label).nextElementSibling?.textContent ?? null;
}

test("施設情報の値から、案内の各項目を作る", () => {
  render(<FacilityInfo facility={facility} />);

  expect(valueOf("営業時間")).toBe("10:00 〜 22:00");
  expect(valueOf("料金")).toBe(
    "平日 ¥4,000 / 土日 ¥5,000（1時間あたり、祝日は平日料金）",
  );
  expect(valueOf("定休日")).toBe("毎週 月曜日");
  expect(valueOf("利用時間")).toBe("2〜4時間（1時間単位）");
  expect(valueOf("予約受付")).toBe("1か月先まで");
});

test("料金・定休日・ルールが変われば、表示も変わる", () => {
  render(
    <FacilityInfo
      facility={{
        ...facility,
        rules: { ...facility.rules, open_hour: 9, max_hours: 3 },
        prices: { weekday: 4500, weekend: 6000 },
        regular_holidays: [2, 0],
      }}
    />,
  );

  expect(valueOf("営業時間")).toBe("09:00 〜 22:00");
  expect(valueOf("料金")).toContain("平日 ¥4,500 / 土日 ¥6,000");
  expect(valueOf("定休日")).toBe("毎週 火曜日・日曜日");
  expect(valueOf("利用時間")).toBe("2〜3時間（1時間単位）");
});

test("定休日が無ければ「なし」", () => {
  render(<FacilityInfo facility={{ ...facility, regular_holidays: [] }} />);

  expect(valueOf("定休日")).toBe("なし");
});
