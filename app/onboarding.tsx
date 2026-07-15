import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useSlots, useOnboarding, useTodayLog } from "../src/hooks";
import { t } from "../src/i18n";
import type { DoseSlot } from "../src/types";
import { generateId, getIconForTime, sortSlotsByTime } from "../src/utils/time";
import { TimePickerRow } from "../src/components/TimePickerRow";

// 슬롯 이름은 만들어지는 순간 사용자 데이터가 된다 — 여기서 한 번 번역해 저장하고,
// 이후 기기 언어가 바뀌어도 다시 번역하지 않는다(사용자가 고친 이름을 덮어쓸 수 없으므로).
const DEFAULT_SLOTS = [
  { nameKey: "slot.default.morning", start: "07:00", end: "09:00" },
  { nameKey: "slot.default.evening", start: "18:00", end: "20:00" },
  { nameKey: "slot.default.bedtime", start: "22:00", end: "23:00" },
] as const;

const NAME_EXAMPLE_KEYS = [
  "slot.default.morning",
  "slot.default.noon",
  "slot.default.evening",
  "slot.default.bedtime",
] as const;

function createDefaultSlot(index: number): DoseSlot {
  // 같은 배치에서 만든 슬롯이라도 createdAt이 겹치지 않게 index만큼 밀어준다 —
  // 사용자가 나중에 이들을 같은 시각으로 바꿔도 tiebreaker가 추가 순서를 지킨다.
  const now = new Date(Date.now() + index).toISOString();
  const defaults = DEFAULT_SLOTS[index];
  if (defaults) {
    return {
      id: generateId(),
      name: t(defaults.nameKey),
      start: defaults.start,
      end: defaults.end,
      createdAt: now,
      updatedAt: now,
    };
  }

  // Generate sensible defaults for additional slots
  const baseHour = 8 + index * 4;
  const hour = baseHour % 24;
  const startTime = `${String(hour).padStart(2, "0")}:00`;
  const endTime = `${String((hour + 2) % 24).padStart(2, "0")}:00`;

  return {
    id: generateId(),
    name: t("slot.default.nth", { n: index + 1 }),
    start: startTime,
    end: endTime,
    createdAt: now,
    updatedAt: now,
  };
}

export default function Onboarding() {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useColors();
  const {
    slots: existingSlots,
    loading: existingSlotsLoading,
    saveSlots,
  } = useSlots();
  const { hasCompleted, completeOnboarding } = useOnboarding();
  const { log } = useTodayLog(existingSlots);
  const isEditingSettings = hasCompleted === true;

  const [count, setCount] = useState(3);
  const [slots, setLocalSlots] = useState<DoseSlot[]>(() =>
    Array.from({ length: 3 }, (_, i) => createDefaultSlot(i)),
  );
  // Snapshot of what was loaded, so we can tell whether anything actually
  // changed (and which slots the user removed) at save time.
  const [baseline, setBaseline] = useState<DoseSlot[]>([]);
  const [hydratedFromExisting, setHydratedFromExisting] = useState(false);

  useEffect(() => {
    if (!existingSlotsLoading && !hydratedFromExisting) {
      if (existingSlots.length > 0) {
        const sorted = sortSlotsByTime(existingSlots);
        setLocalSlots(sorted);
        setCount(existingSlots.length);
        setBaseline(sorted);
      }
      setHydratedFromExisting(true);
    }
  }, [existingSlotsLoading, existingSlots, hydratedFromExisting]);

  // Only the user-editable fields count as a change — updatedAt churns on every
  // keystroke and would make everything look dirty.
  const isDirty = useMemo(() => {
    if (slots.length !== baseline.length) return true;
    return slots.some((slot, i) => {
      const before = baseline[i];
      return (
        !before ||
        before.id !== slot.id ||
        before.name !== slot.name ||
        before.start !== slot.start ||
        before.end !== slot.end
      );
    });
  }, [slots, baseline]);

  // Slots present when we loaded but gone now. Their dose entries are keyed by
  // slot id, so removing one is the only edit that actually drops a record —
  // renaming or retiming a slot keeps today's check intact.
  const removedSlots = useMemo(() => {
    const keptIds = new Set(slots.map((s) => s.id));
    return baseline.filter((s) => !keptIds.has(s.id));
  }, [slots, baseline]);

  const handleCountChange = useCallback((newCount: number) => {
    const clamped = Math.max(1, Math.min(10, newCount));
    setCount(clamped);

    setLocalSlots((prev) => {
      if (clamped > prev.length) {
        const additional = Array.from(
          { length: clamped - prev.length },
          (_, i) => createDefaultSlot(prev.length + i),
        );
        return [...prev, ...additional];
      }
      return prev.slice(0, clamped);
    });
  }, []);

  const handleSlotChange = useCallback(
    (index: number, field: keyof DoseSlot, value: string) => {
      setLocalSlots((prev) =>
        prev.map((slot, i) =>
          i === index
            ? { ...slot, [field]: value, updatedAt: new Date().toISOString() }
            : slot,
        ),
      );
    },
    [],
  );

  const handleDeleteSlot = useCallback((index: number) => {
    setLocalSlots((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      setCount(next.length);
      return next;
    });
  }, []);

  // Set when we're the ones navigating away (saving, or the user chose to
  // discard), so the unsaved-changes guard below lets that navigation through.
  const leavingIntentionally = useRef(false);

  const commitSave = useCallback(async () => {
    // Removed slots are soft-deleted, not dropped, so past logs keep their
    // meaning and a future sync can replay the deletion.
    const deletedAt = new Date().toISOString();
    const tombstones = removedSlots.map((slot) => ({
      ...slot,
      deletedAt,
      updatedAt: deletedAt,
    }));

    await saveSlots([...slots, ...tombstones]);

    leavingIntentionally.current = true;
    if (isEditingSettings) {
      router.back();
    } else {
      await completeOnboarding();
      router.replace("/main");
    }
  }, [
    slots,
    removedSlots,
    saveSlots,
    isEditingSettings,
    completeOnboarding,
    router,
  ]);

  // Edits here are staged until "저장하기", and the back chevron sits right next
  // to them — so leaving with unsaved edits would silently drop them. Guarding
  // on "beforeRemove" covers the chevron, the iOS swipe-back gesture and the
  // Android back button in one place. Framed as discard-or-keep-editing (not
  // "save?") so this alert can never stack on top of the delete warning.
  useEffect(() => {
    if (!isEditingSettings) return;

    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      if (leavingIntentionally.current || !isDirty) return;

      e.preventDefault();
      Alert.alert(t("onboarding.discard.title"), t("onboarding.discard.body"), [
        { text: t("onboarding.discard.keep"), style: "cancel" },
        {
          text: t("onboarding.discard.leave"),
          style: "destructive",
          onPress: () => {
            leavingIntentionally.current = true;
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [navigation, isDirty, isEditingSettings]);

  const saveDisabled = isEditingSettings && !isDirty;

  const handleStart = useCallback(() => {
    // Renames and time edits keep their dose entries (keyed by slot id), so
    // they save silently. Only deleting a slot that's already checked today
    // destroys a record — that's the one case worth interrupting for.
    const checkedToday = removedSlots.filter(
      (slot) => log?.entries[slot.id]?.taken,
    );

    if (checkedToday.length === 0) {
      commitSave();
      return;
    }

    const names = checkedToday.map((slot) => `'${slot.name}'`).join(", ");
    Alert.alert(
      t("onboarding.deleteWarn.title"),
      t("onboarding.deleteWarn.body", { names }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("onboarding.deleteWarn.confirm"),
          style: "destructive",
          onPress: commitSave,
        },
      ],
    );
  }, [removedSlots, log, commitSave]);

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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {isEditingSettings && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.header, { color: colors.text }]}>
            {t("onboarding.header")}
          </Text>
          {!isEditingSettings && (
            <Text style={[styles.tagline, { color: colors.greenDark }]}>
              {t("onboarding.tagline")}
            </Text>
          )}
          <Text style={[styles.subheader, { color: colors.textSecondary }]}>
            {t("onboarding.subheader")}
          </Text>

          {/* Stepper */}
          <View style={styles.stepperContainer}>
            <Text style={[styles.stepperLabel, { color: colors.text }]}>
              {t("onboarding.countLabel")}
            </Text>
            <View style={[styles.stepper, { borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.stepperButton, { borderColor: colors.border }]}
                onPress={() => handleCountChange(count - 1)}
                disabled={count <= 1}
              >
                <Ionicons
                  name="remove"
                  size={24}
                  color={count <= 1 ? colors.border : colors.text}
                />
              </TouchableOpacity>
              <TextInput
                style={[styles.stepperInput, { color: colors.text }]}
                value={String(count)}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num)) handleCountChange(num);
                }}
                keyboardType="number-pad"
                maxLength={2}
              />
              <TouchableOpacity
                style={[styles.stepperButton, { borderColor: colors.border }]}
                onPress={() => handleCountChange(count + 1)}
                disabled={count >= 10}
              >
                <Ionicons
                  name="add"
                  size={24}
                  color={count >= 10 ? colors.border : colors.text}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Slot rows */}
          <View style={styles.slotsContainer}>
            {slots.map((slot, index) => (
              <View
                key={slot.id}
                style={[styles.slotRow, { borderColor: colors.border }]}
              >
                <View style={styles.slotIconContainer}>
                  <Ionicons
                    name={getIconName(slot.start)}
                    size={24}
                    color={colors.greenDark}
                  />
                </View>
                <View style={styles.slotContent}>
                  <TextInput
                    style={[
                      styles.slotNameInput,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={slot.name}
                    onChangeText={(text) =>
                      handleSlotChange(index, "name", text)
                    }
                    placeholder={t("onboarding.namePlaceholder", {
                      example: t(
                        NAME_EXAMPLE_KEYS[index] ?? "slot.default.generic",
                      ),
                    })}
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TimePickerRow
                    startTime={slot.start}
                    endTime={slot.end}
                    onStartChange={(time) =>
                      handleSlotChange(index, "start", time)
                    }
                    onEndChange={(time) => handleSlotChange(index, "end", time)}
                  />
                  {/* Quiet heads-up that this row carries a record today, so
                      deleting it isn't a surprise at save time. */}
                  {log?.entries[slot.id]?.taken && (
                    <View style={styles.takenNote}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={colors.greenDark}
                      />
                      <Text
                        style={[
                          styles.takenNoteText,
                          { color: colors.greenDark },
                        ]}
                      >
                        {t("onboarding.takenToday")}
                      </Text>
                    </View>
                  )}
                </View>
                {slots.length > 1 && (
                  <TouchableOpacity
                    style={styles.slotDeleteButton}
                    onPress={() => handleDeleteSlot(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Sticky bottom button */}
        <View
          style={[
            styles.bottomContainer,
            { borderColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          {/* First run always lets you through; in settings there's nothing to
              save until something actually changed. */}
          <TouchableOpacity
            style={[
              styles.startButton,
              {
                backgroundColor: saveDisabled
                  ? colors.unchecked
                  : colors.greenDark,
              },
            ]}
            onPress={handleStart}
            disabled={saveDisabled}
          >
            <Text
              style={[
                styles.startButtonText,
                {
                  color: saveDisabled ? colors.textSecondary : colors.greenText,
                },
              ]}
            >
              {isEditingSettings ? t("onboarding.save") : t("onboarding.start")}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  backButton: {
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  subheader: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  stepperContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  stepperLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  stepperButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperInput: {
    width: 50,
    height: 44,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  slotsContainer: {
    gap: 16,
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  slotIconContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  slotContent: {
    flex: 1,
    gap: 12,
  },
  slotDeleteButton: {
    marginLeft: 8,
    padding: 4,
  },
  slotNameInput: {
    fontSize: 16,
    fontWeight: "500",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  takenNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  takenNoteText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  startButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
