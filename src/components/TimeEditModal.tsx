import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useColors } from "../hooks";

type Props = {
  visible: boolean;
  initialTime: string; // "HH:MM"
  onConfirm: (time: string) => void;
  onCancel: () => void;
};

export function TimeEditModal({
  visible,
  initialTime,
  onConfirm,
  onCancel,
}: Props) {
  const colors = useColors();
  const [tempTime, setTempTime] = useState({ hours: 0, minutes: 0 });

  useEffect(() => {
    if (visible) {
      const [hours, minutes] = initialTime.split(":").map(Number);
      setTempTime({ hours, minutes });
    }
  }, [visible, initialTime]);

  const confirm = () => {
    const timeStr = `${String(tempTime.hours).padStart(2, "0")}:${String(
      tempTime.minutes,
    ).padStart(2, "0")}`;
    onConfirm(timeStr);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, { backgroundColor: colors.background }]}
        >
          <View style={[styles.modalHeader, { borderColor: colors.border }]}>
            <TouchableOpacity onPress={onCancel}>
              <Text
                style={[styles.modalButton, { color: colors.textSecondary }]}
              >
                취소
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              시각 수정
            </Text>
            <TouchableOpacity onPress={confirm}>
              <Text style={[styles.modalButton, { color: colors.greenDark }]}>
                확인
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={tempTime.hours}
              onValueChange={(value) =>
                setTempTime((prev) => ({ ...prev, hours: value }))
              }
              style={styles.picker}
              itemStyle={{ color: colors.text }}
            >
              {hours.map((hour) => (
                <Picker.Item
                  key={hour}
                  label={`${hour < 12 ? "오전" : "오후"} ${hour % 12 || 12}시`}
                  value={hour}
                />
              ))}
            </Picker>

            <Picker
              selectedValue={tempTime.minutes}
              onValueChange={(value) =>
                setTempTime((prev) => ({ ...prev, minutes: value }))
              }
              style={styles.picker}
              itemStyle={{ color: colors.text }}
            >
              {minutes.map((min) => (
                <Picker.Item
                  key={min}
                  label={`${String(min).padStart(2, "0")}분`}
                  value={min}
                />
              ))}
            </Picker>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  modalButton: {
    fontSize: 17,
    fontWeight: "500",
  },
  pickerContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
  },
  picker: {
    flex: 1,
    height: 200,
  },
});
