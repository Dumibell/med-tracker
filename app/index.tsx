import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useOnboarding, useColors } from "../src/hooks";
import { notificationTarget } from "../src/notifications";

export default function Index() {
  const router = useRouter();
  const colors = useColors();
  const { hasCompleted } = useOnboarding();

  useEffect(() => {
    if (hasCompleted === null) return;

    if (!hasCompleted) {
      router.replace("/onboarding");
      return;
    }

    // 알림을 눌러 앱이 켜졌으면(콜드 스타트) 그 목적지로 보낸다: 오늘 알림이면
    // 메인의 그 슬롯, 지난 알림이면 그날을 정정하는 캘린더. 아니면 평소대로 메인.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const target = notificationTarget(response);
      if (target?.kind === "today") {
        router.replace({ pathname: "/main", params: { slot: target.slotId } });
      } else if (target?.kind === "past") {
        router.replace("/main");
        router.push({ pathname: "/calendar", params: { date: target.date } });
      } else {
        router.replace("/main");
      }
    });
  }, [hasCompleted, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.greenDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
