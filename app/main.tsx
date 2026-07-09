import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSlots, useTodayLog, useStreak, useColors } from '../src/hooks';
import type { DoseSlot } from '../src/types';
import { pickActiveSlot, getIconForTime, formatTimeDisplay } from '../src/utils/time';

export default function MainScreen() {
  const router = useRouter();
  const colors = useColors();
  const { slots, loading: slotsLoading, refreshSlots } = useSlots();
  const { log, toggleDose, completedCount, refreshLog } = useTodayLog(slots);
  const { streak } = useStreak(slots);

  const [selectedSlot, setSelectedSlot] = useState<DoseSlot | null>(null);
  const [scaleAnim] = useState(new Animated.Value(1));

  // Auto-select active slot on load
  useEffect(() => {
    if (slots.length > 0 && !selectedSlot) {
      const active = pickActiveSlot(slots);
      setSelectedSlot(active);
    }
  }, [slots, selectedSlot]);

  // Refresh data whenever this screen regains focus (e.g. returning from settings)
  useFocusEffect(
    useCallback(() => {
      refreshSlots();
      refreshLog();
    }, [refreshSlots, refreshLog])
  );

  const handleCircleTap = useCallback(async () => {
    if (!selectedSlot) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Scale animation
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

    await toggleDose(selectedSlot.id);
  }, [selectedSlot, toggleDose, scaleAnim]);

  const getIconName = (startTime: string) => {
    const icon = getIconForTime(startTime);
    switch (icon) {
      case 'sunrise':
        return 'sunny-outline';
      case 'sun':
        return 'sunny';
      case 'sunset':
        return 'partly-sunny-outline';
      case 'moon':
        return 'moon-outline';
    }
  };

  const isSlotCompleted = (slotId: string) => {
    return log?.entries[slotId]?.taken ?? false;
  };

  const selectedEntry = selectedSlot ? log?.entries[selectedSlot.id] : null;
  const isSelectedCompleted = selectedEntry?.taken ?? false;

  if (slotsLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.textSecondary }}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>오늘의 약</Text>
          <View style={styles.headerRight}>
            {streak > 0 && (
              <View style={[styles.streakPill, { backgroundColor: colors.amberLight }]}>
                <Text style={[styles.streakText, { color: colors.amberText }]}>
                  🔥 {streak}일 연속
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/calendar')}
            >
              <Ionicons name="calendar-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/onboarding')}
            >
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Slot toggles */}
        <View style={styles.slotToggles}>
          {slots.map((slot) => {
            const isSelected = selectedSlot?.id === slot.id;
            const isCompleted = isSlotCompleted(slot.id);

            return (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.slotToggle,
                  {
                    borderColor:
                      isSelected || isCompleted ? colors.greenDark : colors.border,
                    backgroundColor: isCompleted
                      ? colors.greenDark
                      : isSelected
                        ? colors.greenLight + '30'
                        : 'transparent',
                  },
                ]}
                onPress={() => setSelectedSlot(slot)}
              >
                <View style={styles.slotToggleContent}>
                  <Ionicons
                    name={getIconName(slot.start)}
                    size={20}
                    color={
                      isCompleted
                        ? colors.greenText
                        : isSelected
                          ? colors.greenDark
                          : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.slotToggleName,
                      {
                        color: isCompleted
                          ? colors.greenText
                          : isSelected
                            ? colors.greenDark
                            : colors.text,
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
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[
                styles.mainCircle,
                {
                  backgroundColor: isSelectedCompleted
                    ? colors.greenDark
                    : 'transparent',
                  borderColor: isSelectedCompleted
                    ? colors.greenDark
                    : colors.uncheckedBorder,
                },
              ]}
              onPress={handleCircleTap}
              activeOpacity={0.8}
            >
              {isSelectedCompleted ? (
                <>
                  <Ionicons name="checkmark" size={76} color={colors.greenText} />
                </>
              ) : (
                <>
                  {selectedSlot && (
                    <MaterialCommunityIcons
                      name="pill"
                      size={60}
                      color={colors.textSecondary}
                    />
                  )}
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text
            style={[
              styles.circleLabel,
              { color: isSelectedCompleted ? colors.greenDark : colors.textSecondary },
            ]}
          >
            {isSelectedCompleted && selectedEntry?.at
              ? `${formatTimeDisplay(selectedEntry.at)}에 먹음 · 다시 탭하면 취소`
              : '탭하여 체크'}
          </Text>
        </View>

        {/* Summary */}
        <Text style={[styles.summary, { color: colors.textSecondary }]}>
          오늘 {completedCount}/{slots.length} 완료
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsButton: {
    padding: 4,
  },
  slotToggles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  slotToggle: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  slotToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotToggleName: {
    fontSize: 15,
    fontWeight: '500',
  },
  circleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleLabel: {
    marginTop: 16,
    fontSize: 14,
  },
  summary: {
    textAlign: 'center',
    fontSize: 16,
  },
});
