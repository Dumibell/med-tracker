import * as Notifications from "expo-notifications";
import type { DoseSlot, DoseLog } from "./types";
import { timeToMinutes, getCurrentMinutes } from "./utils/time";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;

  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === "granted";
}

/**
 * Reconcile today's "아직 체크 안 됐어요" reminders against the current
 * slots/log. This is the only place in the app that schedules local
 * notifications, so a full cancel-and-reschedule pass is safe and avoids
 * tracking per-slot notification ids across app restarts.
 */
export async function reconcileTodayReminders(
  slots: DoseSlot[],
  log: DoseLog | null,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const nowMinutes = getCurrentMinutes();
  const now = new Date();

  for (const slot of slots) {
    if (slot.deletedAt) continue;

    const taken = log?.entries[slot.id]?.taken ?? false;
    if (taken) continue;

    const endMinutes = timeToMinutes(slot.end);
    if (endMinutes <= nowMinutes) continue;

    const fireDate = new Date(now);
    fireDate.setHours(0, endMinutes, 0, 0);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "먹었다",
        body: `💊 오늘 ${slot.name} 약, 아직 안먹었어요`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });
  }
}
