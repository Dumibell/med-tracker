import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  Alert,
  PanResponder,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useSlots, useTodayLog, useStreak, useColors } from "../src/hooks";
import { AppIconBadge, LogoSymbol, TimeEditModal } from "../src/components";
import {
  requestNotificationPermission,
  reconcileTodayReminders,
} from "../src/notifications";
import { t } from "../src/i18n";
import type { DoseSlot } from "../src/types";
import {
  pickActiveSlot,
  sortSlotsByTime,
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
  const isLight = useColorScheme() !== "dark";
  const { slots, loading: slotsLoading, refreshSlots } = useSlots();
  const { log, toggleDose, updateDoseTime, completedCount, refreshLog } =
    useTodayLog(slots);
  const { streak } = useStreak(slots);

  const [selectedSlot, setSelectedSlot] = useState<DoseSlot | null>(null);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [sweepAnim] = useState(new Animated.Value(0));
  const [flashAnim] = useState(new Animated.Value(0));
  const [timeEditVisible, setTimeEditVisible] = useState(false);

  const sortedSlots = useMemo(() => sortSlotsByTime(slots), [slots]);
  const currentIndex = selectedSlot
    ? sortedSlots.findIndex((s) => s.id === selectedSlot.id)
    : -1;

  const selectByIndex = useCallback(
    (i: number) => {
      if (i < 0 || i >= sortedSlots.length) return;
      setSelectedSlot(sortedSlots[i]);
    },
    [sortedSlots],
  );

  // PanResponder reads the latest index/handler through a ref so the gesture
  // created once still moves relative to the current slot.
  const swipeState = useRef({ currentIndex, selectByIndex });
  swipeState.current = { currentIndex, selectByIndex };
  const panResponder = useRef(
    PanResponder.create({
      // Only claim the gesture on a clear horizontal drag — taps still reach
      // the circle's TouchableOpacity for check/uncheck.
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        const { currentIndex, selectByIndex } = swipeState.current;
        if (g.dx < -40) selectByIndex(currentIndex + 1);
        else if (g.dx > 40) selectByIndex(currentIndex - 1);
      },
    }),
  ).current;

  // Auto-select active slot on load
  useEffect(() => {
    if (slots.length > 0 && !selectedSlot) {
      const active = pickActiveSlot(slots);
      setSelectedSlot(active);
    }
  }, [slots, selectedSlot]);

  // Keep the selected slot pointing at the *latest* object whenever slots
  // refresh (e.g. returning from settings with a renamed slot). Without this
  // the title keeps rendering the stale snapshot's name.
  useEffect(() => {
    setSelectedSlot((prev) => {
      if (!prev) return prev;
      const fresh = slots.find((s) => s.id === prev.id);
      return fresh ?? pickActiveSlot(slots);
    });
  }, [slots]);

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
      t("main.uncheck.title"),
      currentEntry?.at
        ? t("main.uncheck.bodyWithTime", {
            time: formatTimeDisplay(currentEntry.at),
          })
        : t("main.uncheck.body"),
      [
        { text: t("main.uncheck.keep"), style: "cancel" },
        {
          text: t("main.uncheck.undo"),
          style: "destructive",
          onPress: performUncheck,
        },
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
          <Text style={{ color: colors.textSecondary }}>
            {t("common.loading")}
          </Text>
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
          <View style={styles.headerTitleRow}>
            <AppIconBadge size={26} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("app.name")}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {streak > 0 && (
              <View
                style={[styles.streakPill, { backgroundColor: colors.surface }]}
              >
                <Text
                  style={[styles.streakText, { color: colors.textSecondary }]}
                >
                  {t("main.streak", { count: streak })}
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

        {/* Main circle — the hero. Which slot is shown is named just above it,
            and the dot row below doubles as today's progress + navigator. */}
        <View style={styles.circleContainer}>
          {/* Fixed-height, single line so the circle below never shifts when
              the slot name length changes between slots. */}
          <View style={styles.slotTitleBox}>
            {selectedSlot && (
              <Text
                style={[styles.slotTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {selectedSlot.name}
              </Text>
            )}
          </View>
          <View style={styles.circleWrapper} {...panResponder.panHandlers}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.mainCircle,
                  // Untaken reads as a pressable surface, not an outline-only
                  // status ring — that lift is what invites the tap. In light
                  // the circle is white and floats on a soft shadow; in dark a
                  // shadow would be invisible, so `untakenFill` lifts it by
                  // being lighter than the background.
                  !isSelectedCompleted && isLight && styles.circleLift,
                  {
                    backgroundColor: isSelectedCompleted
                      ? "transparent"
                      : colors.untakenFill,
                    borderColor: isSelectedCompleted
                      ? "transparent"
                      : colors.uncheckedBorder,
                  },
                ]}
                onPress={handleCircleTap}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={
                  selectedSlot
                    ? t(
                        isSelectedCompleted
                          ? "main.a11y.taken"
                          : "main.a11y.notTaken",
                        { name: selectedSlot.name },
                      )
                    : undefined
                }
                accessibilityHint={t(
                  isSelectedCompleted
                    ? "main.a11y.hintUncheck"
                    : "main.a11y.hintCheck",
                )}
              >
                {isSelectedCompleted ? (
                  <View style={styles.circleTakenContent}>
                    <Ionicons
                      name="checkmark"
                      size={52}
                      color={colors.greenDark}
                    />
                    {selectedEntry?.at &&
                      (() => {
                        // "언제 먹었나"에 바로 답하는 상대시간을 주인공으로,
                        // 절대시각은 신뢰할 수 있는 앵커로 아래 작게. 24시간이
                        // 지나 상대시간이 비면 절대시각이 자동으로 주 정보가 된다.
                        const relative = formatRelativeTime(selectedEntry.at);
                        const absolute = t("main.takenAt", {
                          time: formatTimeDisplay(selectedEntry.at),
                        });
                        return relative ? (
                          <>
                            <Text
                              style={[
                                styles.circleTakenPrimary,
                                { color: colors.greenDark },
                              ]}
                            >
                              {relative}
                            </Text>
                            <Text
                              style={[
                                styles.circleTakenSecondary,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {absolute}
                            </Text>
                          </>
                        ) : (
                          <Text
                            style={[
                              styles.circleTakenPrimary,
                              { color: colors.greenDark },
                            ]}
                          >
                            {absolute}
                          </Text>
                        );
                      })()}
                  </View>
                ) : (
                  selectedSlot && (
                    // Mirrors the taken layout (icon + text stacked inside the
                    // circle) so the circle stays self-contained in both states.
                    <View style={styles.circleUntakenContent}>
                      <LogoSymbol size={64} color={colors.textSecondary} />
                      <Text
                        style={[
                          styles.circleHint,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("main.tapToCheck")}
                      </Text>
                    </View>
                  )
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

          {/* Fixed-height so the circle above never shifts when the taken
              state adds the "시각 수정" link. */}
          <View style={styles.circleFooter}>
            {isSelectedCompleted && (
              <TouchableOpacity onPress={() => setTimeEditVisible(true)}>
                <Text
                  style={[styles.timeEditLink, { color: colors.textSecondary }]}
                >
                  {t("main.editTime")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Dot indicator = today's progress + slot navigator, in time order.
              Green fill means "taken" (and nothing else); the current slot is
              shown by a neutral halo ring around the dot, never by color. The
              halo is always laid out so the row doesn't shift as it moves. */}
          {sortedSlots.length > 1 && (
            <View style={styles.dotRow}>
              {sortedSlots.map((slot, i) => {
                const taken = isSlotCompleted(slot.id);
                const isCurrent = i === currentIndex;
                return (
                  <TouchableOpacity
                    key={slot.id}
                    onPress={() => selectByIndex(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    accessibilityLabel={t(
                      taken ? "main.a11y.taken" : "main.a11y.notTaken",
                      { name: slot.name },
                    )}
                  >
                    <View
                      style={[
                        styles.dotHalo,
                        {
                          borderColor: isCurrent
                            ? colors.uncheckedBorder
                            : "transparent",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: taken
                              ? colors.greenDark
                              : "transparent",
                            borderColor: taken
                              ? colors.greenDark
                              : colors.border,
                          },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Summary */}
        <Text style={[styles.summary, { color: colors.textSecondary }]}>
          {t("main.summary", {
            completed: completedCount,
            total: slots.length,
          })}
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
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  slotTitleBox: {
    height: 26,
    justifyContent: "center",
    marginBottom: 20,
  },
  slotTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 28,
  },
  dotHalo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
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
  circleLift: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
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
  circleTakenContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  circleUntakenContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  circleHint: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
  },
  circleTakenPrimary: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  circleTakenSecondary: {
    marginTop: 2,
    fontSize: 12,
    textAlign: "center",
  },
  circleFooter: {
    height: 44,
    alignItems: "center",
    overflow: "hidden",
  },
  timeEditLink: {
    marginTop: 16,
    fontSize: 13,
    textDecorationLine: "underline",
  },
  summary: {
    textAlign: "center",
    fontSize: 16,
  },
});
