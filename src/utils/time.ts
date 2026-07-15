import type { DoseSlot, DoseLog } from "../types";
import { t, formatTime } from "../i18n";

/**
 * Get icon name based on start hour
 * 5 ≤ h < 11 → sunrise
 * 11 ≤ h < 16 → sun
 * 16 ≤ h < 21 → sunset
 * else → moon
 */
export function getIconForTime(
  startTime: string,
): "sunrise" | "sun" | "sunset" | "moon" {
  const hour = parseInt(startTime.split(":")[0], 10);

  if (hour >= 5 && hour < 11) return "sunrise";
  if (hour >= 11 && hour < 16) return "sun";
  if (hour >= 16 && hour < 21) return "sunset";
  return "moon";
}

/**
 * Convert time string "HH:MM" to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Get current time as minutes since midnight
 */
export function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * 시간이 순서를 정한다 — 수동 `order`는 두지 않는다. 같은 시각이 겹칠 수 있으므로
 * `end`, 그다음 `createdAt`까지 내려가는 tiebreaker로 순서를 못 박는다. 이게 없으면
 * 같은 시각 슬롯의 순서가 렌더마다 흔들린다.
 */
export function sortSlotsByTime(slots: DoseSlot[]): DoseSlot[] {
  return [...slots].sort(
    (a, b) =>
      timeToMinutes(a.start) - timeToMinutes(b.start) ||
      timeToMinutes(a.end) - timeToMinutes(b.end) ||
      a.createdAt.localeCompare(b.createdAt),
  );
}

/**
 * 그 날짜에 실제로 존재했던 슬롯들(시간순). 캘린더의 분모와 스트릭 판정이 이걸 쓴다.
 * "지금의 슬롯 목록"으로 과거를 판정하면, 슬롯을 하나 추가하는 순간 지난달 전체가
 * 그 슬롯을 안 먹은 "덜 챙긴 날"로 물든다 — 슬롯이 생기기 전 날짜에는 소급하지 않는다.
 *
 * createdAt은 UTC ISO라 그대로 자르면 시차가 있는 지역에서 하루 어긋난다. 로컬
 * 날짜로 환산해 비교한다. 삭제된 슬롯은 과거에서도 빠지는데, 이는 기존 동작 그대로다.
 */
export function slotsForDate(slots: DoseSlot[], date: string): DoseSlot[] {
  return sortSlotsByTime(
    slots.filter(
      (s) => !s.deletedAt && formatDate(new Date(s.createdAt)) <= date,
    ),
  );
}

/**
 * Pick the currently active slot based on current time
 * 1. If now is within start-end of a slot, return that slot
 * 2. Otherwise, return the next upcoming slot
 * 3. If no upcoming slot, return the last slot
 */
export function pickActiveSlot(slots: DoseSlot[]): DoseSlot | null {
  if (slots.length === 0) return null;

  const sortedSlots = sortSlotsByTime(slots);
  const now = getCurrentMinutes();

  // 1. Check if we're within any slot's time range
  for (const slot of sortedSlots) {
    const start = timeToMinutes(slot.start);
    const end = timeToMinutes(slot.end);

    if (now >= start && now <= end) {
      return slot;
    }
  }

  // 2. Find next upcoming slot
  for (const slot of sortedSlots) {
    const start = timeToMinutes(slot.start);
    if (start > now) {
      return slot;
    }
  }

  // 3. Return last slot
  return sortedSlots[sortedSlots.length - 1];
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
export function getTodayDate(): string {
  const now = new Date();
  return formatDate(now);
}

/**
 * Format a date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * `Date`에 며칠을 더한 새 `Date`(로컬 자정 기준). 알림을 며칠치 미리 걸 때 쓴다.
 */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Format an ISO timestamp for display (e.g., "오전 8:12" / "8:12 AM").
 * 12- vs 24-hour is the device's choice, not ours.
 */
export function formatTimeDisplay(isoString: string): string {
  return formatTime(new Date(isoString));
}

/**
 * "HH:MM" → today's date at that time. The pickers speak Date, we store "HH:MM".
 */
export function clockToDate(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Date → "HH:MM" (local).
 */
export function dateToClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

/**
 * Format a stored "HH:MM" slot time for display, in the device's clock format.
 */
export function formatClockTime(time: string): string {
  return formatTime(clockToDate(time));
}

/**
 * Format elapsed time since an ISO timestamp as a short relative string
 * (e.g. "2시간 전" / "2 hours ago"). Returns "" once the gap exceeds a day,
 * since this is only meant for "먹은 지 얼마나 됐지?" on today's log.
 */
export function formatRelativeTime(
  isoString: string,
  now: Date = new Date(),
): string {
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return t("relative.justNow");
  if (diffMinutes < 60) return t("relative.minutesAgo", { count: diffMinutes });

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return t("relative.hoursAgo", { count: diffHours });

  return "";
}

/**
 * Calculate streak: consecutive days where ALL doses were taken
 * Count from today (if complete) or yesterday backwards
 *
 * 분모는 날짜마다 다시 구한다(`slotsForDate`) — 오늘 추가한 슬롯이 과거의 완료
 * 판정을 뒤집으면 안 된다.
 */
export function calculateStreak(
  logs: DoseLog[],
  slots: DoseSlot[],
  today: string,
): number {
  if (slots.length === 0) return 0;

  const logMap = new Map(logs.map((log) => [log.date, log]));

  const isComplete = (date: string): boolean => {
    const log = logMap.get(date);
    if (!log) return false;

    const due = slotsForDate(slots, date);
    // 그날 챙길 슬롯이 없었으면 세지 않는다 — 여기서 true를 주면 앱을 쓰기 전의
    // 과거로 끝없이 거슬러 올라간다.
    if (due.length === 0) return false;

    for (const slot of due) {
      if (!log.entries[slot.id]?.taken) {
        return false;
      }
    }
    return true;
  };

  let streak = 0;
  const startDate = new Date(today);

  // Start from today if complete, otherwise start from yesterday
  if (!isComplete(today)) {
    startDate.setDate(startDate.getDate() - 1);
  }

  // Count backwards
  while (true) {
    const dateStr = formatDate(startDate);
    if (isComplete(dateStr)) {
      streak++;
      startDate.setDate(startDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get calendar color bucket based on completion ratio
 * c == 0 → 'empty'
 * c/N >= 1 → 'full'
 * c/N >= 0.5 → 'medium'
 * else → 'light'
 */
export function getCalendarColorBucket(
  completed: number,
  total: number,
): "empty" | "light" | "medium" | "full" {
  if (total === 0 || completed === 0) return "empty";
  const ratio = completed / total;
  if (ratio >= 1) return "full";
  if (ratio >= 0.5) return "medium";
  return "light";
}

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
