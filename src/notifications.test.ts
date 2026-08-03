import { notificationTarget } from "./notifications";
import { getTodayDate, addDays, formatDate } from "./utils/time";

// notificationTarget이 읽는 최소 형태의 알림 응답만 흉내낸다.
function response(data: unknown): any {
  return { notification: { request: { content: { data } } } };
}

describe("notificationTarget", () => {
  it("routes today's reminder to the main slot", () => {
    const today = getTodayDate();
    expect(notificationTarget(response({ slotId: "s1", date: today }))).toEqual(
      { kind: "today", slotId: "s1" },
    );
  });

  it("routes a past reminder to that day's calendar", () => {
    const past = formatDate(addDays(new Date(), -2));
    expect(notificationTarget(response({ slotId: "s1", date: past }))).toEqual({
      kind: "past",
      date: past,
      slotId: "s1",
    });
  });

  it("returns null when the payload is missing or incomplete", () => {
    expect(notificationTarget(null)).toBeNull();
    expect(notificationTarget(response(undefined))).toBeNull();
    expect(notificationTarget(response({}))).toBeNull();
    expect(notificationTarget(response({ slotId: "s1" }))).toBeNull();
    expect(notificationTarget(response({ date: getTodayDate() }))).toBeNull();
  });
});
