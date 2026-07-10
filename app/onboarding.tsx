import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useSlots, useOnboarding } from "../src/hooks";
import type { DoseSlot } from "../src/types";
import { generateId, getIconForTime, sortSlotsByTime } from "../src/utils/time";
import { TimePickerRow } from "../src/components/TimePickerRow";

const DEFAULT_SLOTS: Omit<DoseSlot, "id" | "updatedAt">[] = [
  { name: "아침", start: "07:00", end: "09:00", order: 0 },
  { name: "저녁", start: "18:00", end: "20:00", order: 1 },
  { name: "취침 전", start: "22:00", end: "23:00", order: 2 },
];

function createDefaultSlot(index: number): DoseSlot {
  const defaults = DEFAULT_SLOTS[index];
  if (defaults) {
    return {
      id: generateId(),
      ...defaults,
      updatedAt: new Date().toISOString(),
    };
  }

  // Generate sensible defaults for additional slots
  const baseHour = 8 + index * 4;
  const hour = baseHour % 24;
  const startTime = `${String(hour).padStart(2, "0")}:00`;
  const endTime = `${String((hour + 2) % 24).padStart(2, "0")}:00`;

  return {
    id: generateId(),
    name: `복용 ${index + 1}`,
    start: startTime,
    end: endTime,
    order: index,
    updatedAt: new Date().toISOString(),
  };
}

export default function Onboarding() {
  const router = useRouter();
  const colors = useColors();
  const {
    slots: existingSlots,
    loading: existingSlotsLoading,
    saveSlots,
  } = useSlots();
  const { hasCompleted, completeOnboarding } = useOnboarding();
  const isEditingSettings = hasCompleted === true;

  const [count, setCount] = useState(3);
  const [slots, setLocalSlots] = useState<DoseSlot[]>(() =>
    Array.from({ length: 3 }, (_, i) => createDefaultSlot(i)),
  );
  const [hydratedFromExisting, setHydratedFromExisting] = useState(false);

  useEffect(() => {
    if (!existingSlotsLoading && !hydratedFromExisting) {
      if (existingSlots.length > 0) {
        setLocalSlots(sortSlotsByTime(existingSlots));
        setCount(existingSlots.length);
      }
      setHydratedFromExisting(true);
    }
  }, [existingSlotsLoading, existingSlots, hydratedFromExisting]);

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

  const handleStart = async () => {
    await saveSlots(slots);
    if (isEditingSettings) {
      router.back();
    } else {
      await completeOnboarding();
      router.replace("/main");
    }
  };

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
            약 알림 설정
          </Text>
          {!isEditingSettings && (
            <Text style={[styles.tagline, { color: colors.greenDark }]}>
              약 먹었는지 확인하는 가장 빠른 방법
            </Text>
          )}
          <Text style={[styles.subheader, { color: colors.textSecondary }]}>
            하루에 몇 번 약을 드시나요?{"\n"}각 복용 시간대를 설정해주세요.
          </Text>

          {/* Stepper */}
          <View style={styles.stepperContainer}>
            <Text style={[styles.stepperLabel, { color: colors.text }]}>
              하루 복용 횟수
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
                    placeholder={`예: ${["아침", "점심", "저녁", "취침 전"][index] || "복용 시간"}`}
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
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.greenDark }]}
            onPress={handleStart}
          >
            <Text style={[styles.startButtonText, { color: colors.greenText }]}>
              {isEditingSettings ? "저장하기" : "시작하기"}
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
