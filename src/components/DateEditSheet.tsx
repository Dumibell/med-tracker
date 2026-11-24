import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
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
  visible: boolean;
  /** 정정할 날짜 "YYYY-MM-DD". null이면 시트는 닫힌 상태. */
  date: string | null;
  slots: DoseSlot[];
  onClose: () => void;
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
 * 지난 날짜의 복용을 바로잡는 바텀 시트. 메인의 큰 원이 "오늘"을 다룬다면 이건
 * "그날"을 다룬다 — 깜빡한 체크를 조용히 채우는 곳.
 *
 * 체크는 기본적으로 시각 없이 taken만 남긴다 — 과거엔 몇 시에 먹었는지 대개
 * 기억나지 않으므로 가짜 시각을 지어내지 않는다. 다만 기억난다면 체크된 줄을 눌러
 * 시각을 직접 넣을 수 있다(메인의 "시각 수정"과 같은 시트).
 */
export function DateEditSheet({
  visible,
  date,
  slots,
  onClose,
  onChanged,
}: Props) {
  const colors = useColors();
  const [log, setLog] = useState<DoseLog | null>(null);
  // 시각을 입력하려고 연 슬롯. null이면 시각 시트는 닫힘.
  const [timeSlot, setTimeSlot] = useState<string | null>(null);

  useEffect(() => {
    if (visible && date) {
      repository.getLog(date).then(setLog);
    }
  }, [visible, date]);

  const reload = useCallback(async () => {
    if (!date) return;
    const fresh = await repository.getLog(date);
    setLog(fresh);
    onChanged?.();
  }, [date, onChanged]);

  const toggle = useCallback(
    async (slotId: string) => {
      if (!date) return;
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
      if (!date || !timeSlot) return;
      const [hours, minutes] = time.split(":").map(Number);
      const at = new Date(`${date}T00:00:00`);
      at.setHours(hours, minutes, 0, 0);

      await repository.setDose(date, timeSlot, true, at.toISOString());
      setTimeSlot(null);
      await reload();
    },
    [date, timeSlot, reload],
  );

  const daySlots = date ? slotsForDate(slots, date) : [];
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, { backgroundColor: colors.background }]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          <View style={[styles.header, { borderColor: colors.border }]}>
            <Text style={[styles.date, { color: colors.text }]}>
              {date ? formatSheetDate(date) : ""}
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
                            style={[
                              styles.timeChipText,
                              { color: colors.text },
                            ]}
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
                          style={[
                            styles.doseMeta,
                            { color: colors.textSecondary },
                          ]}
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
                        taken
                          ? "dateEdit.a11y.taken"
                          : "dateEdit.a11y.notTaken",
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
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color="#FFFFFF"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.foot}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={[styles.close, { color: colors.textSecondary }]}>
                {t("common.close")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* 체크된 줄을 눌러 먹은 시각을 직접 넣을 때. 오늘이면 미래 시각은 막는다.
            이 시트의 Modal 안에 두어야 그 위에 겹쳐 뜬다 — 형제 Modal로 두면 이미
            떠 있는 시트 때문에 iOS에서 present되지 않아 아무것도 열리지 않는다. */}
      <TimeSheet
        visible={timeSlot !== null}
        title={t("timeSheet.edit")}
        initialTime={initialTime}
        maximumTime={isToday ? dateToClock(new Date()) : undefined}
        onConfirm={handleTimeConfirm}
        onCancel={() => setTimeSlot(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 32,
  },
  grabber: {
    width: 38,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
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
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  dose: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
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
  foot: {
    alignItems: "center",
    paddingTop: 16,
  },
  close: {
    fontSize: 15,
    fontWeight: "500",
    padding: 6,
  },
});
