import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useCalendarData } from "../hooks";
import type { DoseSlot } from "../types";
import { formatDate, getCalendarColorBucket } from "../utils/time";
import { t, formatMonthTitle, weekdayNames } from "../i18n";
import { DateEditSheet } from "./DateEditSheet";

type Props = {
  slots: DoseSlot[];
  /** 지난 알림을 눌러 들어왔을 때 바로 열 날짜 "YYYY-MM-DD". */
  openDate?: string | null;
};

// 요일 이름은 로케일에서 파생된다(한국어 "일", 영어 "Sun"). 주 시작은 일요일 고정.
const WEEKDAYS = weekdayNames();

export function Calendar({ slots, openDate }: Props) {
  const colors = useColors();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  // 정정 시트가 열린 날짜. null이면 닫힘.
  const [editDate, setEditDate] = useState<string | null>(null);

  // 알림에서 넘어온 날짜가 있으면 그 시트를 연다. 그 달로도 이동시켜 캘린더가
  // 해당 날짜를 보여주게 한다.
  useEffect(() => {
    if (!openDate) return;
    setEditDate(openDate);
    const d = new Date(`${openDate}T00:00:00`);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }, [openDate]);

  const { data, refresh } = useCalendarData(slots, year, month);

  const todayStr = formatDate(today);

  // Get calendar grid data
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = lastDay.getDate();

  const goToPrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const getColorForBucket = (bucket: "empty" | "light" | "medium" | "full") => {
    switch (bucket) {
      case "full":
        return colors.greenDark;
      case "medium":
        return colors.greenMedium;
      case "light":
        return colors.greenLight;
      default:
        return "transparent";
    }
  };

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  // Pad to complete last row
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View>
      {/* Month navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {formatMonthTitle(year, month)}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day, i) => (
          <View key={day} style={styles.weekdayCell}>
            <Text
              style={[
                styles.weekdayText,
                {
                  color:
                    i === 0
                      ? colors.sunday
                      : i === 6
                        ? colors.saturday
                        : colors.textSecondary,
                },
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((day, cellIndex) => {
            if (day === null) {
              return <View key={cellIndex} style={styles.cell} />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayData = data.get(dateStr);
            const bucket = dayData
              ? getCalendarColorBucket(dayData.completed, dayData.total)
              : "empty";
            const bgColor = getColorForBucket(bucket);
            const isToday = dateStr === todayStr;
            const isSunday = cellIndex === 0;
            const isSaturday = cellIndex === 6;
            // 아직 오지 않은 날은 정정할 기록이 없어 흐리게, 눌리지 않는다.
            const isFuture = dateStr > todayStr;

            return (
              <TouchableOpacity
                key={cellIndex}
                style={styles.cell}
                onPress={() => setEditDate(dateStr)}
                disabled={isFuture}
                activeOpacity={0.6}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.dayCircle,
                    {
                      backgroundColor: bgColor,
                      borderWidth: isToday ? 2 : 0,
                      borderColor: isToday ? colors.greenDark : "transparent",
                      opacity: isFuture ? 0.35 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color:
                          bucket === "full"
                            ? colors.greenText
                            : isSunday
                              ? colors.sunday
                              : isSaturday
                                ? colors.saturday
                                : colors.text,
                      },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.greenLight }]}
          />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            {t("calendar.legend.some")}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.greenMedium }]}
          />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            {t("calendar.legend.most")}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.greenDark }]}
          />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            {t("calendar.legend.all")}
          </Text>
        </View>
      </View>

      <DateEditSheet
        visible={editDate !== null}
        date={editDate}
        slots={slots}
        onClose={() => setEditDate(null)}
        onChanged={refresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  dayCircle: {
    width: "85%",
    aspectRatio: 1,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
  },
});
