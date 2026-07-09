import type { DoseSlot, DoseLog } from '../types';

/**
 * Get icon name based on start hour
 * 5 ≤ h < 11 → sunrise
 * 11 ≤ h < 16 → sun
 * 16 ≤ h < 21 → sunset
 * else → moon
 */
export function getIconForTime(startTime: string): 'sunrise' | 'sun' | 'sunset' | 'moon' {
  const hour = parseInt(startTime.split(':')[0], 10);

  if (hour >= 5 && hour < 11) return 'sunrise';
  if (hour >= 11 && hour < 16) return 'sun';
  if (hour >= 16 && hour < 21) return 'sunset';
  return 'moon';
}

/**
 * Convert time string "HH:MM" to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
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
 * Sort slots chronologically by start time. Stable: slots with the same
 * start time keep their relative (insertion) order.
 */
export function sortSlotsByTime(slots: DoseSlot[]): DoseSlot[] {
  return [...slots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
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
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time for display (e.g., "오전 8:12")
 */
export function formatTimeDisplay(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours < 12 ? '오전' : '오후';
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, '0');
  return `${period} ${displayHours}:${displayMinutes}`;
}

/**
 * Format elapsed time since an ISO timestamp as a short Korean relative
 * string (e.g. "2시간 전"). Returns "" once the gap exceeds a day, since
 * this is only meant for "먹은 지 얼마나 됐지?" on today's log.
 */
export function formatRelativeTime(isoString: string, now: Date = new Date()): string {
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  return '';
}

/**
 * Calculate streak: consecutive days where ALL doses were taken
 * Count from today (if complete) or yesterday backwards
 */
export function calculateStreak(
  logs: DoseLog[],
  slots: DoseSlot[],
  today: string
): number {
  if (slots.length === 0) return 0;

  const logMap = new Map(logs.map((log) => [log.date, log]));
  const activeSlotIds = new Set(slots.filter((s) => !s.deletedAt).map((s) => s.id));

  const isComplete = (date: string): boolean => {
    const log = logMap.get(date);
    if (!log) return false;

    for (const slotId of activeSlotIds) {
      if (!log.entries[slotId]?.taken) {
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
  total: number
): 'empty' | 'light' | 'medium' | 'full' {
  if (total === 0 || completed === 0) return 'empty';
  const ratio = completed / total;
  if (ratio >= 1) return 'full';
  if (ratio >= 0.5) return 'medium';
  return 'light';
}

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
