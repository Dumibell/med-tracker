import * as Notifications from "expo-notifications";
import type { DoseSlot, DoseLog } from "./types";
import {
  timeToMinutes,
  addDays,
  formatDate,
  slotsForDate,
  getTodayDate,
} from "./utils/time";
import { t } from "./i18n";

// iOS는 앱당 예약 알림을 64개까지만 유지한다 — 넘으면 오래된 것부터 조용히
// 버린다. 슬롯 수에 상관없이 이 선을 넘지 않도록 총량을 제한한다.
const MAX_SCHEDULED = 60;
// 그 안에서 최대한 먼 미래까지 채운다. 슬롯이 적으면 아래 상한에, 많으면
// MAX_SCHEDULED에 먼저 걸린다.
const MAX_DAYS_AHEAD = 30;

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
 * "아직 체크 안 됐어요" 알림을 슬롯/로그에 맞춰 다시 건다. 앱에서 로컬 알림을 거는
 * 유일한 곳이라, 매번 전부 취소하고 다시 거는 방식이 안전하고 알림 id를 앱 재시작
 * 너머로 추적하지 않아도 된다.
 *
 * 핵심: **오늘 것만 걸면 앱을 안 연 날은 알림이 통째로 사라진다.** 로컬 알림은 한 번
 * 예약되면 앱이 꺼져 있어도 뜨지만, 예약 자체가 앱 실행에 의존하기 때문이다. 그래서
 * 오늘뿐 아니라 앞으로 여러 날치를 미리 걸어, 앱을 한동안 안 열어도 알림이 이어지게 한다.
 *
 * 미래 날짜는 그날 약을 먹었는지 알 수 없으니(로그가 아직 없다) 일단 다 건다. 그날이
 * 되어 사용자가 앱에서 체크하면 이 함수가 다시 돌며 그날 알림을 취소한다. 앱을 계속
 * 안 열었다면 체크도 안 한 것이므로 "아직 안 먹었어요"가 맞는 알림이다.
 */
export async function reconcileReminders(
  slots: DoseSlot[],
  log: DoseLog | null,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const todayStr = formatDate(now);
  let scheduled = 0;

  for (let offset = 0; offset <= MAX_DAYS_AHEAD; offset++) {
    if (scheduled >= MAX_SCHEDULED) break;

    const date = addDays(now, offset);
    const dateStr = formatDate(date);
    const isToday = dateStr === todayStr;

    // 그날 존재한 슬롯만(시간순). 미래엔 현재 슬롯이 다 포함된다.
    for (const slot of slotsForDate(slots, dateStr)) {
      if (scheduled >= MAX_SCHEDULED) break;

      const fireDate = new Date(date);
      fireDate.setHours(0, timeToMinutes(slot.end), 0, 0);

      // 이미 지난 시각은 건너뛴다(오늘만 해당).
      if (fireDate.getTime() <= now.getTime()) continue;

      // 오늘 이미 먹은 슬롯은 다시 알리지 않는다. 미래는 taken을 알 수 없어 다 건다.
      if (isToday && (log?.entries[slot.id]?.taken ?? false)) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: t("app.name"),
          body: t("notification.body", { name: slot.name }),
          // 클릭하면 어느 날짜·시간대였는지 알아야 그 슬롯으로 보낼 수 있다.
          data: { slotId: slot.id, date: dateStr },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireDate,
        },
      });
      scheduled++;
    }
  }
}

export type NotificationTarget =
  | { kind: "today"; slotId: string }
  | { kind: "past"; date: string; slotId: string };

/**
 * 알림 응답에서 "어디로 보낼지"를 뽑는다. 슬롯은 매일 반복되므로 날짜는 구분이
 * 아니라 라우팅에 쓴다 — 오늘 알림이면 메인의 그 슬롯, 지난 알림이면 그날을 정정
 * 하는 캘린더로. payload가 없거나(과거 버전 알림 등) 형식이 안 맞으면 null.
 */
export function notificationTarget(
  response: Notifications.NotificationResponse | null,
): NotificationTarget | null {
  const data = response?.notification?.request?.content?.data as
    { slotId?: string; date?: string } | undefined;
  if (!data?.slotId || !data?.date) return null;

  return data.date === getTodayDate()
    ? { kind: "today", slotId: data.slotId }
    : { kind: "past", date: data.date, slotId: data.slotId };
}
