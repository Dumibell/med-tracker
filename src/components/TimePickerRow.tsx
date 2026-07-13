import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "../hooks";
import { t } from "../i18n";
import { formatClockTime } from "../utils/time";
import { TimeSheet } from "./TimeSheet";

type Props = {
  startTime: string;
  endTime: string;
  onStartChange: (time: string) => void;
  onEndChange: (time: string) => void;
};

export function TimePickerRow({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
}: Props) {
  const colors = useColors();
  const [editing, setEditing] = useState<"start" | "end" | null>(null);

  const confirm = (time: string) => {
    if (editing === "start") onStartChange(time);
    else if (editing === "end") onEndChange(time);
    setEditing(null);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.timeButton,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
        onPress={() => setEditing("start")}
      >
        <Text style={[styles.timeText, { color: colors.text }]}>
          {formatClockTime(startTime)}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.separator, { color: colors.textSecondary }]}>~</Text>

      <TouchableOpacity
        style={[
          styles.timeButton,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
        onPress={() => setEditing("end")}
      >
        <Text style={[styles.timeText, { color: colors.text }]}>
          {formatClockTime(endTime)}
        </Text>
      </TouchableOpacity>

      <TimeSheet
        visible={editing !== null}
        title={editing === "end" ? t("timeSheet.end") : t("timeSheet.start")}
        initialTime={editing === "end" ? endTime : startTime}
        onConfirm={confirm}
        onCancel={() => setEditing(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
  },
  timeText: {
    fontSize: 15,
    fontWeight: "500",
  },
  separator: {
    marginHorizontal: 12,
    fontSize: 16,
  },
});
