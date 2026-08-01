import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import * as Notifications from "expo-notifications";
import { notificationTarget } from "../src/notifications";

/**
 * 앱이 이미 떠 있는 동안(백그라운드 복귀 등) 알림을 누르면 여기서 라우팅한다.
 * 콜드 스타트는 index가 맡는다. `navigate`라 같은 화면이면 스택을 쌓지 않고
 * 파라미터만 갱신한다.
 */
function useNotificationRouting() {
  const router = useRouter();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const target = notificationTarget(response);
        if (!target) return;

        if (target.kind === "today") {
          router.navigate({
            pathname: "/main",
            params: { slot: target.slotId },
          });
        } else {
          router.navigate({
            pathname: "/calendar",
            params: { date: target.date },
          });
        }
      },
    );
    return () => sub.remove();
  }, [router]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useNotificationRouting();

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colorScheme === "dark" ? "#0F0F0F" : "#FFFFFF",
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="main" />
        <Stack.Screen name="calendar" />
      </Stack>
    </>
  );
}
