import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useSlots, useTodayLog, useStreak, useColors } from "../src/hooks";
import { LogoSymbol, TimeEditModal } from "../src/components";
import {
  requestNotificationPermission,
  reconcileTodayReminders,
} from "../src/notifications";
import type { DoseSlot } from "../src/types";
import {
  pickActiveSlot,
  sortSlotsByTime,
  getIconForTime,
  formatTimeDisplay,
  formatRelativeTime,
  getTodayDate,
} from "../src/utils/time";

const CIRCLE_SIZE = 180;
const RING_STROKE_WIDTH = 4;
const RING_RADIUS = (CIRCLE_SIZE - RING_STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function MainScreen() {
  const router = useRouter();
  const colors = useColors();
  const { slots, loading: slotsLoading, refreshSlots } = useSlots();
  const { log, toggleDose, updateDoseTime, completedCount, refreshLog } =
    useTodayLog(slots);
  const { streak } = useStreak(slots);

  const [selectedSlot, setSelectedSlot] = useState<DoseSlot | null>(null);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [sweepAnim] = useState(new Animated.Value(0));
  const [flashAnim] = useState(new Animated.Value(0));
  const [timeEditVisible, setTimeEditVisible] = useState(false);

  // Auto-select active slot on load
  useEffect(() => {
    if (slots.length > 0 && !selectedSlot) {
      const active = pickActiveSlot(slots);
      setSelectedSlot(active);
    }
  }, [slots, selectedSlot]);

  // Snap the ring to the right state when switching slots (no sweep here —
  // the sweep is reserved for the actual check/uncheck tap).
  useEffect(() => {
    if (!selectedSlot) return;
    const taken = log?.entries[selectedSlot.id]?.taken ?? false;
    sweepAnim.setValue(taken ? 1 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlot?.id]);

  // Refresh data whenever this screen regains focus (e.g. returning from settings)
  useFocusEffect(
    useCallback(() => {
      refreshSlots();
      refreshLog();
    }, [refreshSlots, refreshLog]),
  );

  // Keep "아직 체크 안 됐어요" reminders in sync with today's log
  useEffect(() => {
    if (slotsLoading) return;
    requestNotificationPermission().then((granted) => {
      if (granted) reconcileTodayReminders(slots, log);
    });
  }, [slots, log, slotsLoading]);

  const performUncheck = useCallback(async () => {
    if (!selectedSlot) return;

    // Uncheck: plain correction, no fanfare
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.94,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Ring just disappears — no reverse sweep, this is a plain correction
    Animated.timing(sweepAnim, {
      toValue: 0,
      duration: 120,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    await toggleDose(selectedSlot.id);
  }, [selectedSlot, toggleDose, scaleAnim, sweepAnim]);

  const handleCircleTap = useCallback(async () => {
    if (!selectedSlot) return;

    const currentEntry = log?.entries[selectedSlot.id];
    const willCheck = !(currentEntry?.taken ?? false);

    if (willCheck) {
      // Check: crisp and rewarding — success haptic, overshoot pop,
      // border sweeps around once, then a quick flash when it lands
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 140,
          useNativeDriver: true,
        }),
      ]).start();

      sweepAnim.setValue(0);
      Animated.timing(sweepAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        flashAnim.setValue(0);
        Animated.sequence([
          Animated.timing(flashAnim, {
            toValue: 1,
            duration: 90,
            useNativeDriver: true,
          }),
          Animated.timing(flashAnim, {
            toValue: 0,
            duration: 160,
            useNativeDriver: true,
          }),
        ]).start();
      });

      await toggleDose(selectedSlot.id);
      return;
    }

    // Uncheck is a correction to a real record — confirm before undoing it
    Alert.alert(
      "취소하시겠어요?",
      currentEntry?.at
        ? `이미 ${formatTimeDisplay(
            currentEntry.at,
          )}에 드셨어요. 취소하시겠어요?`
        : "이미 체크된 항목이에요. 취소하시겠어요?",
      [
        { text: "아니요", style: "cancel" },
        { text: "취소할게요", style: "destructive", onPress: performUncheck },
      ],
    );
  }, [
    selectedSlot,
    toggleDose,
    scaleAnim,
    sweepAnim,
    flashAnim,
    log,
    performUncheck,
  ]);

  const handleTimeEditConfirm = useCallback(
    async (time: string) => {
      setTimeEditVisible(false);
      if (!selectedSlot) return;

      const [hours, minutes] = time.split(":").map(Number);
      const at = new Date(`${getTodayDate()}T00:00:00`);
      at.setHours(hours, minutes, 0, 0);

      await updateDoseTime(selectedSlot.id, at.toISOString());
    },
    [selectedSlot, updateDoseTime],
  );

  const getIconName = (startTime: string) => {
    const icon = getIconForTime(startTime);
    switch (icon) {
      case "sunrise":
        return "sunny-outline";
      case "sun":
        return "sunny";
      case "sunset":
        return "partly-sunny-outline";
      case "moon":
        return "moon-outline";
    }
  };

  const isSlotCompleted = (slotId: string) => {
    return log?.entries[slotId]?.taken ?? false;
  };

  const selectedEntry = selectedSlot ? log?.entries[selectedSlot.id] : null;
  const isSelectedCompleted = selectedEntry?.taken ?? false;

  if (slotsLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.textSecondary }}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            오늘의 약
          </Text>
          <View style={styles.headerRight}>
            {streak > 0 && (
              <View
                style={[styles.streakPill, { backgroundColor: colors.surface }]}
              >
                <Text
                  style={[styles.streakText, { color: colors.textSecondary }]}
                >
                  {streak}일째 잘 챙기고 있어요
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push("/calendar")}
            >
              <Ionicons name="calendar-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push("/onboarding")}
            >
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Slot toggles */}
        <View style={styles.slotToggles}>
          {sortSlotsByTime(slots).map((slot) => {
            const isSelected = selectedSlot?.id === slot.id;
            const isCompleted = isSlotCompleted(slot.id);

            // Two independent axes — never fold them into one branch:
            // selection = bolder border + bold text/icon, taken = green
            // check/text/border color. Green means "taken" and nothing else.
            const contentColor = isCompleted
              ? colors.greenDark
              : isSelected
                ? colors.text
                : colors.textSecondary;

            return (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.slotToggle,
                  {
                    borderColor: isCompleted ? colors.greenLight : colors.border,
                    borderWidth: isSelected ? 2 : 1.5,
                  },
                ]}
                onPress={() => setSelectedSlot(slot)}
              >
                <View style={styles.slotToggleContent}>
                  <View style={styles.slotIconBox}>
                    {isCompleted ? (
                      isSelected ? (
                        <MaterialCommunityIcons
                          name="check-bold"
                          size={16}
                          color={contentColor}
                        />
                      ) : (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={contentColor}
                        />
                      )
                    ) : (
                      <Ionicons
                        name={getIconName(slot.start)}
                        size={16}
                        color={contentColor}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.slotToggleName,
                      {
                        color: contentColor,
                        fontWeight: isSelected ? "600" : "500",
                      },
                    ]}
                  >
                    {slot.name}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Main circle */}
        <View style={styles.circleContainer}>
          <View style={styles.circleWrapper}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.mainCircle,
                  {
                    borderColor: isSelectedCompleted
                      ? "transparent"
                      : colors.uncheckedBorder,
                  },
                ]}
                onPress={handleCircleTap}
                activeOpacity={0.8}
              >
                {isSelectedCompleted ? (
                  <Ionicons
                    name="checkmark"
                    size={76}
                    color={colors.greenDark}
                  />
                ) : (
                  <>
                    {selectedSlot && (
                      <LogoSymbol size={60} color={colors.textSecondary} />
                    )}
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Green ring sweeps in on check, disappears on uncheck */}
            <Svg
              width={CIRCLE_SIZE}
              height={CIRCLE_SIZE}
              style={styles.ringOverlay}
              pointerEvents="none"
            >
              <AnimatedCircle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RING_RADIUS}
                stroke={colors.greenDark}
                strokeWidth={RING_STROKE_WIDTH}
                fill="none"
                strokeLinecap="round"
                transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                strokeDasharray={[RING_CIRCUMFERENCE, RING_CIRCUMFERENCE]}
                strokeDashoffset={sweepAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [RING_CIRCUMFERENCE, 0],
                })}
              />
            </Svg>

            {/* Quick flash right as the ring finishes sweeping */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.flashOverlay,
                {
                  backgroundColor: colors.greenDark,
                  opacity: flashAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.35],
                  }),
                },
              ]}
            />
          </View>

          <Text
            style={[
              styles.circleLabel,
              {
                color: isSelectedCompleted
                  ? colors.greenDark
                  : colors.textSecondary,
              },
            ]}
          >
            {isSelectedCompleted && selectedEntry?.at
              ? (() => {
                  const relative = formatRelativeTime(selectedEntry.at);
                  const relativeSuffix = relative ? ` (${relative})` : "";
                  return `${formatTimeDisplay(
                    selectedEntry.at,
                  )}에 먹음${relativeSuffix} · 다시 탭하면 취소`;
                })()
              : "탭하여 체크"}
          </Text>

          {isSelectedCompleted && (
            <TouchableOpacity onPress={() => setTimeEditVisible(true)}>
              <Text
                style={[styles.timeEditLink, { color: colors.textSecondary }]}
              >
                시각 수정
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Summary */}
        <Text style={[styles.summary, { color: colors.textSecondary }]}>
          오늘 {completedCount}/{slots.length} 완료
        </Text>
      </ScrollView>

      <TimeEditModal
        visible={timeEditVisible}
        initialTime={
          selectedEntry?.at
            ? `${String(new Date(selectedEntry.at).getHours()).padStart(
                2,
                "0",
              )}:${String(new Date(selectedEntry.at).getMinutes()).padStart(
                2,
                "0",
              )}`
            : "00:00"
        }
        onConfirm={handleTimeEditConfirm}
        onCancel={() => setTimeEditVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  streakPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  streakText: {
    fontSize: 14,
    fontWeight: "600",
  },
  settingsButton: {
    padding: 4,
  },
  slotToggles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 32,
  },
  slotToggle: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  slotToggleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  slotIconBox: {
    width: 18,
    alignItems: "center",
  },
  slotToggleName: {
    fontSize: 15,
  },
  circleContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  circleWrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  mainCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  ringOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  flashOverlay: {
    position: "absolute",
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
  circleLabel: {
    marginTop: 16,
    fontSize: 14,
  },
  timeEditLink: {
    marginTop: 8,
    fontSize: 13,
    textDecorationLine: "underline",
  },
  summary: {
    textAlign: "center",
    fontSize: 16,
  },
});
