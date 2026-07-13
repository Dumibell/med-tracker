import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useColors } from "../hooks";
import { t } from "../i18n";
import { clockToDate, dateToClock } from "../utils/time";

type Props = {
  visible: boolean;
  title: string;
  initialTime: string; // "HH:MM"
  /** "HH:MM" 상한. 미래 시각을 고를 수 없어야 하는 곳(체크 시각 수정)에서 쓴다. */
  maximumTime?: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
};

/**
 * 시각 선택 시트. 네이티브 시간 피커를 그대로 쓰므로 오전/오후·시·분 휠 구성과
 * 12/24시간제가 기기 설정을 따라간다 — 우리가 직접 컬럼을 만들지 않는다.
 *
 * iOS는 우리 바텀시트 안에 휠을 인라인으로 얹지만, Android의 피커는 스스로
 * 다이얼로그를 띄우므로 모달 껍데기 없이 그대로 렌더한다(모달이 겹치지 않게).
 */
export function TimeSheet({
  visible,
  title,
  initialTime,
  maximumTime,
  onConfirm,
  onCancel,
}: Props) {
  const colors = useColors();
  const [value, setValue] = useState(() => clockToDate(initialTime));

  useEffect(() => {
    if (visible) setValue(clockToDate(initialTime));
  }, [visible, initialTime]);

  const maximumDate = maximumTime ? clockToDate(maximumTime) : undefined;

  if (Platform.OS !== "ios") {
    if (!visible) return null;
    return (
      <DateTimePicker
        mode="time"
        display="spinner"
        value={value}
        maximumDate={maximumDate}
        onChange={(event: DateTimePickerEvent, date?: Date) => {
          if (event.type === "set" && date) onConfirm(dateToClock(date));
          else onCancel();
        }}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderColor: colors.border }]}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={[styles.button, { color: colors.textSecondary }]}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={() => onConfirm(dateToClock(value))}>
              <Text style={[styles.button, { color: colors.greenDark }]}>
                {t("common.confirm")}
              </Text>
            </TouchableOpacity>
          </View>

          <DateTimePicker
            mode="time"
            display="spinner"
            value={value}
            maximumDate={maximumDate}
            onChange={(_event: DateTimePickerEvent, date?: Date) => {
              if (date) setValue(date);
            }}
            style={styles.picker}
          />
        </View>
      </View>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  button: {
    fontSize: 17,
    fontWeight: "500",
  },
  picker: {
    height: 200,
  },
});
