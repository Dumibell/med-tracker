import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useCalendarData } from "../hooks";
import type { DoseSlot } from "../types";
import { formatDate, getCalendarColorBucket } from "../utils/time";

type Props = {
  slots: DoseSlot[];
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

export function Calendar({ slots }: Props) {
  const colors = useColors();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { data } = useCalendarData(slots, year, month);

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
    <View style={[styles.container, { borderColor: colors.border }]}>
      {/* Month navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {year}년 {MONTHS[month]}
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
                      ? "#EF4444"
                      : i === 6
                        ? "#3B82F6"
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

            return (
              <View key={cellIndex} style={styles.cell}>
                <View
                  style={[
                    styles.dayCircle,
                    {
                      backgroundColor: bgColor,
                      borderWidth: isToday ? 2 : 0,
                      borderColor: isToday ? colors.greenDark : "transparent",
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
                              ? "#EF4444"
                              : isSaturday
                                ? "#3B82F6"
                                : colors.text,
                      },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </View>
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
            일부
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.greenMedium }]}
          />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            절반 이상
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.greenDark }]}
          />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            완료
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
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
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
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
