import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useSlots } from "../src/hooks";
import { Calendar } from "../src/components/Calendar";
import { t } from "../src/i18n";

export default function CalendarScreen() {
  const router = useRouter();
  const colors = useColors();
  const { slots } = useSlots();
  // 지난 알림을 눌러 들어오면 그날을 골라 기록을 바로 보여준다.
  const { date } = useLocalSearchParams<{ date?: string }>();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.header, { color: colors.text }]}>
          {t("calendar.title")}
        </Text>
        <Calendar slots={slots} openDate={date ?? null} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  backButton: {
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
  },
});
