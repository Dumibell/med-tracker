import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "../hooks";
import { repository } from "../repository";
import { t, formatTime, formatSheetDate } from "../i18n";
import type { DoseSlot, DoseLog } from "../types";
import {
  slotsForDate,
  getIconForTime,
  formatClockTime,
  dateToClock,
  getTodayDate,
} from "../utils/time";
import { TimeSheet } from "./TimeSheet";

type Props = {
  /** 보여줄 날짜 "YYYY-MM-DD". */
  date: string;
  slots: DoseSlot[];
  /** 토글로 기록이 바뀔 때마다 호출 — 캘린더 색·스트릭을 다시 계산시킨다. */
  onChanged?: () => void;
};

function iconName(start: string) {
  switch (getIconForTime(start)) {
    case "sunrise":
      return "sunny-outline" as const;
    case "sun":
      return "sunny" as const;
    case "sunset":
      return "partly-sunny-outline" as const;
    case "moon":
      return "moon-outline" as const;
  }
}

/**
 * 캘린더 아래에 붙는 "그날 먹었나?"의 답. 메인의 큰 원이 "지금"에 답한다면 이건
 * 고른 날에 답한다. 깜빡한 체크를 채우는 정정은 여기서 하는 보조 동작이다.
 *
 * 체크는 기본적으로 시각 없이 taken만 남긴다 — 과거엔 몇 시에 먹었는지 대개
 * 기억나지 않으므로 가짜 시각을 지어내지 않는다. 다만 기억난다면 시각 칩을 눌러
 * 직접 넣을 수 있다(메인의 "시각 수정"과 같은 시트).
 */
export function DayRecord({ date, slots, onChanged }: Props) {
  const colors = useColors();
  const [log, setLog] = useState<DoseLog | null>(null);
  // 시각을 입력하려고 연 슬롯. null이면 시각 시트는 닫힘.
  const [timeSlot, setTimeSlot] = useState<string | null>(null);

  useEffect(() => {
    repository.getLog(date).then(setLog);
  }, [date]);

  const reload = useCallback(async () => {
    const fresh = await repository.getLog(date);
    setLog(fresh);
    onChanged?.();
  }, [date, onChanged]);

  const toggle = useCallback(
    async (slotId: string) => {
      const taken = !(log?.entries[slotId]?.taken ?? false);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // 기본 정정은 시각 없이 taken만. 시각은 아래 시트에서 선택적으로 붙인다.
      await repository.setDose(date, slotId, taken);
      await reload();
    },
    [date, log, reload],
  );

  const handleTimeConfirm = useCallback(
    async (time: string) => {
      if (!timeSlot) return;
      const [hours, minutes] = time.split(":").map(Number);
      const at = new Date(`${date}T00:00:00`);
      at.setHours(hours, minutes, 0, 0);

      await repository.setDose(date, timeSlot, true, at.toISOString());
      setTimeSlot(null);
      await reload();
    },
    [date, timeSlot, reload],
  );

  const daySlots = slotsForDate(slots, date);
  const completed = daySlots.filter((s) => log?.entries[s.id]?.taken).length;

  // 시각 시트의 초기값: 이미 넣은 시각이 있으면 그것, 없으면 그 시간대의 시작 시각.
  const timeSlotObj = timeSlot ? daySlots.find((s) => s.id === timeSlot) : null;
  const timeSlotAt = timeSlot ? log?.entries[timeSlot]?.at : undefined;
  const initialTime = timeSlotAt
    ? dateToClock(new Date(timeSlotAt))
    : (timeSlotObj?.start ?? "12:00");
  // 오늘을 정정할 땐 아직 오지 않은 시각을 막는다. 지난 날은 하루 전체가 열려 있다.
  const isToday = date === getTodayDate();

  return (
    <View>
      <View style={[styles.header, { borderColor: colors.border }]}>
        <Text style={[styles.date, { color: colors.text }]}>
          {formatSheetDate(date)}
        </Text>
        {daySlots.length > 0 && (
          <Text style={[styles.summary, { color: colors.textSecondary }]}>
            {t("dateEdit.summary", {
              completed,
              total: daySlots.length,
            })}
          </Text>
        )}
      </View>

      {daySlots.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          {t("dateEdit.empty")}
        </Text>
      ) : (
        <View style={styles.list}>
          {daySlots.map((slot) => {
            const entry = log?.entries[slot.id];
            const taken = entry?.taken ?? false;
            const slotWindow = `${formatClockTime(slot.start)} – ${formatClockTime(slot.end)}`;

            return (
              <View
                key={slot.id}
                style={[styles.dose, { borderColor: colors.border }]}
              >
                <Ionicons
                  name={iconName(slot.start)}
                  size={20}
                  color={colors.greenDark}
                />
                <View style={styles.doseBody}>
                  <Text style={[styles.doseName, { color: colors.text }]}>
                    {slot.name}
                  </Text>
                  {/* 체크된 줄은 시각 칩(설정 화면의 시간 버튼과 같은 모양 =
                          눌러서 시각을 바꾼다), 미체크는 시간대 정보. */}
                  {taken ? (
                    <TouchableOpacity
                      style={[
                        styles.timeChip,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                        },
                      ]}
                      onPress={() => setTimeSlot(slot.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 2, right: 20 }}
                    >
                      <Text
                        style={[styles.timeChipText, { color: colors.text }]}
                      >
                        {entry?.at
                          ? formatTime(new Date(entry.at))
                          : t("dateEdit.addTime")}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={14}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  ) : (
                    <Text
                      style={[styles.doseMeta, { color: colors.textSecondary }]}
                    >
                      {slotWindow}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => toggle(slot.id)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: taken }}
                  accessibilityLabel={t(
                    taken ? "dateEdit.a11y.taken" : "dateEdit.a11y.notTaken",
                    { name: slot.name },
                  )}
                >
                  <View
                    style={[
                      styles.toggle,
                      {
                        backgroundColor: taken
                          ? colors.greenDark
                          : "transparent",
                        borderColor: taken
                          ? colors.greenDark
                          : colors.uncheckedBorder,
                      },
                    ]}
                  >
                    {taken && (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* 시각 칩을 눌러 먹은 시각을 직접 넣을 때. 오늘이면 미래 시각은 막는다. */}
      <TimeSheet
        visible={timeSlot !== null}
        title={t("timeSheet.edit")}
        initialTime={initialTime}
        maximumTime={isToday ? dateToClock(new Date()) : undefined}
        onConfirm={handleTimeConfirm}
        onCancel={() => setTimeSlot(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  date: {
    fontSize: 18,
    fontWeight: "700",
  },
  summary: {
    fontSize: 13,
    marginTop: 3,
  },
  list: {
    paddingTop: 4,
  },
  dose: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  doseBody: {
    flex: 1,
    gap: 2,
  },
  doseName: {
    fontSize: 15,
    fontWeight: "600",
  },
  doseMeta: {
    fontSize: 12,
  },
  // 체크된 줄의 시각 칩. 설정 화면 시간 버튼(TimePickerRow)과 같은 모양이라
  // "회색 박스 = 눌러서 시각 바꾸기"가 앱 전체에서 한 규칙이 된다.
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  toggle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    fontSize: 15,
    textAlign: "center",
    paddingVertical: 28,
  },
});
