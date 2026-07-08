import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useColors } from '../hooks';

type Props = {
  startTime: string;
  endTime: string;
  onStartChange: (time: string) => void;
  onEndChange: (time: string) => void;
};

function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours < 12 ? '오전' : '오후';
  const displayHours = hours % 12 || 12;
  return `${period} ${displayHours}:${String(minutes).padStart(2, '0')}`;
}

export function TimePickerRow({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
}: Props) {
  const colors = useColors();
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);
  const [tempTime, setTempTime] = useState({ hours: 0, minutes: 0 });

  const openPicker = (type: 'start' | 'end') => {
    const time = type === 'start' ? startTime : endTime;
    const [hours, minutes] = time.split(':').map(Number);
    setTempTime({ hours, minutes });
    setShowPicker(type);
  };

  const confirmPicker = () => {
    const timeStr = `${String(tempTime.hours).padStart(2, '0')}:${String(tempTime.minutes).padStart(2, '0')}`;
    if (showPicker === 'start') {
      onStartChange(timeStr);
    } else {
      onEndChange(timeStr);
    }
    setShowPicker(null);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.timeButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
        onPress={() => openPicker('start')}
      >
        <Text style={[styles.timeText, { color: colors.text }]}>
          {formatTimeDisplay(startTime)}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.separator, { color: colors.textSecondary }]}>~</Text>

      <TouchableOpacity
        style={[styles.timeButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
        onPress={() => openPicker('end')}
      >
        <Text style={[styles.timeText, { color: colors.text }]}>
          {formatTimeDisplay(endTime)}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowPicker(null)}>
                <Text style={[styles.modalButton, { color: colors.textSecondary }]}>
                  취소
                </Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {showPicker === 'start' ? '시작 시각' : '종료 시각'}
              </Text>
              <TouchableOpacity onPress={confirmPicker}>
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
                    label={`${hour < 12 ? '오전' : '오후'} ${hour % 12 || 12}시`}
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
                    label={`${String(min).padStart(2, '0')}분`}
                    value={min}
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 15,
    fontWeight: '500',
  },
  separator: {
    marginHorizontal: 12,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalButton: {
    fontSize: 17,
    fontWeight: '500',
  },
  pickerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  picker: {
    flex: 1,
    height: 200,
  },
});
