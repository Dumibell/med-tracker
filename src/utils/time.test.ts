import {
  sortSlotsByTime,
  slotsForDate,
  pickActiveSlot,
  calculateStreak,
  timeToMinutes,
  getCalendarColorBucket,
  getIconForTime,
  addDays,
  formatDate,
} from "./time";
import type { DoseSlot, DoseLog } from "../types";

const iso = (date: string) => `${date}T09:00:00.000Z`;

function slot(
  id: string,
  start: string,
  end: string,
  createdAt = "2026-06-01",
): DoseSlot {
  return {
    id,
    name: id,
    start,
    end,
    createdAt: iso(createdAt),
    updatedAt: iso(createdAt),
  };
}

function log(date: string, takenIds: string[]): DoseLog {
  return {
    date,
    entries: Object.fromEntries(
      takenIds.map((id) => [id, { taken: true, at: iso(date) }]),
    ),
    updatedAt: iso(date),
  };
}

describe("timeToMinutes", () => {
  it("converts HH:MM to minutes since midnight", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("08:30")).toBe(510);
    expect(timeToMinutes("23:59")).toBe(1439);
  });
});

describe("getIconForTime", () => {
  it("maps the start hour to a time-of-day icon", () => {
    expect(getIconForTime("07:00")).toBe("sunrise");
    expect(getIconForTime("12:00")).toBe("sun");
    expect(getIconForTime("18:00")).toBe("sunset");
    expect(getIconForTime("23:00")).toBe("moon");
  });
});

describe("getCalendarColorBucket", () => {
  it("buckets by completion ratio", () => {
    expect(getCalendarColorBucket(0, 3)).toBe("empty");
    expect(getCalendarColorBucket(1, 3)).toBe("light");
    expect(getCalendarColorBucket(2, 3)).toBe("medium");
    expect(getCalendarColorBucket(3, 3)).toBe("full");
  });

  it("is empty when there is nothing due", () => {
    expect(getCalendarColorBucket(0, 0)).toBe("empty");
  });
});

describe("addDays", () => {
  it("adds days across a month boundary", () => {
    expect(formatDate(addDays(new Date("2026-07-30T00:00:00"), 3))).toBe(
      "2026-08-02",
    );
  });
});

describe("sortSlotsByTime", () => {
  it("orders by start, then end, then createdAt", () => {
    const noon = slot("noon", "12:00", "14:00");
    const laterAdded = slot("later", "08:00", "09:00", "2026-06-05");
    const earlierAdded = slot("earlier", "08:00", "09:00", "2026-06-01");

    const result = sortSlotsByTime([noon, laterAdded, earlierAdded]);

    // 같은 08:00–09:00 두 슬롯은 추가 순서(createdAt)로, 점심은 시작이 늦어 뒤로.
    expect(result.map((s) => s.id)).toEqual(["earlier", "later", "noon"]);
  });

  it("is stable regardless of input order", () => {
    const a = slot("a", "08:00", "09:00", "2026-06-01");
    const b = slot("b", "08:00", "09:00", "2026-06-05");
    expect(sortSlotsByTime([b, a]).map((s) => s.id)).toEqual(["a", "b"]);
    expect(sortSlotsByTime([a, b]).map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("slotsForDate", () => {
  it("excludes slots created after the date", () => {
    const existing = slot("old", "08:00", "09:00", "2026-06-01");
    const added = slot("new", "20:00", "21:00", "2026-07-15");

    expect(
      slotsForDate([existing, added], "2026-07-10").map((s) => s.id),
    ).toEqual(["old"]);
    expect(
      slotsForDate([existing, added], "2026-07-20").map((s) => s.id),
    ).toEqual(["old", "new"]);
  });

  it("excludes soft-deleted slots", () => {
    const deleted: DoseSlot = {
      ...slot("x", "08:00", "09:00"),
      deletedAt: iso("2026-07-01"),
    };
    expect(slotsForDate([deleted], "2026-07-10")).toEqual([]);
  });
});

describe("pickActiveSlot", () => {
  afterEach(() => jest.useRealTimers());

  const morning = slot("morning", "08:00", "09:00");
  const evening = slot("evening", "18:00", "20:00");

  it("picks the slot whose range contains now", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-15T08:30:00"));
    expect(pickActiveSlot([evening, morning])?.id).toBe("morning");
  });

  it("picks the next upcoming slot when none is active", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-15T10:00:00"));
    expect(pickActiveSlot([morning, evening])?.id).toBe("evening");
  });

  it("falls back to the last slot when all are past", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-15T23:00:00"));
    expect(pickActiveSlot([morning, evening])?.id).toBe("evening");
  });

  it("returns null for an empty list", () => {
    expect(pickActiveSlot([])).toBeNull();
  });
});

describe("calculateStreak", () => {
  const slots = [slot("m", "08:00", "09:00"), slot("e", "18:00", "20:00")];

  it("counts consecutive days where every due slot was taken", () => {
    const logs = [
      log("2026-07-13", ["m", "e"]),
      log("2026-07-14", ["m", "e"]),
      log("2026-07-15", ["m", "e"]),
    ];
    expect(calculateStreak(logs, slots, "2026-07-15")).toBe(3);
  });

  it("breaks the streak on an incomplete day", () => {
    const logs = [
      log("2026-07-13", ["m", "e"]),
      log("2026-07-14", ["m"]), // 저녁 안 먹음
      log("2026-07-15", ["m", "e"]),
    ];
    // 오늘(15)만 완료, 14는 미완 → streak 1
    expect(calculateStreak(logs, slots, "2026-07-15")).toBe(1);
  });

  it("does not judge the past with slots created later", () => {
    const withNewSlot = [
      slot("m", "08:00", "09:00", "2026-06-01"),
      slot("new", "20:00", "21:00", "2026-07-15"), // 오늘 추가된 슬롯
    ];
    const logs = [
      log("2026-07-13", ["m"]), // 그날엔 m만 있었으니 m만 먹으면 완료
      log("2026-07-14", ["m"]),
      log("2026-07-15", ["m", "new"]),
    ];
    // new가 생기기 전 날들이 "덜 챙긴 날"로 물들지 않아야 한다 → 3일 연속
    expect(calculateStreak(logs, withNewSlot, "2026-07-15")).toBe(3);
  });
});
