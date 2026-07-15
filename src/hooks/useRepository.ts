import { useState, useEffect, useCallback } from "react";
import { repository } from "../repository";
import { useAppResume } from "./useAppResume";
import type { DoseSlot, DoseLog } from "../types";
import {
  getTodayDate,
  formatDate,
  calculateStreak,
  slotsForDate,
  sortSlotsByTime,
} from "../utils/time";

export function useSlots() {
  const [slots, setSlots] = useState<DoseSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSlots = useCallback(async () => {
    const data = await repository.getSlots();
    setSlots(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const saveSlots = useCallback(async (newSlots: DoseSlot[]) => {
    await repository.saveSlots(newSlots);
    setSlots(sortSlotsByTime(newSlots.filter((s) => !s.deletedAt)));
  }, []);

  return { slots, loading, saveSlots, refreshSlots: loadSlots };
}

export function useTodayLog(slots: DoseSlot[]) {
  const [log, setLog] = useState<DoseLog | null>(null);
  const [loading, setLoading] = useState(true);
  // "오늘"은 렌더 시점에 굳으면 안 된다. 앱이 자정을 넘겨 백그라운드에 있었다면
  // 어제 날짜가 그대로 남아, 돌아와서 체크한 약이 어제 로그에 기록된다.
  const [today, setToday] = useState(getTodayDate);

  const loadLog = useCallback(async () => {
    const data = await repository.getLog(today);
    setLog(data);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  useAppResume(
    useCallback(() => {
      // 날짜가 넘어갔으면 setToday가 loadLog를 새로 만들어 위 effect가 다시
      // 읽는다. 같은 날이면 state가 바뀌지 않으니 여기서 직접 다시 읽는다.
      setToday(getTodayDate());
      loadLog();
    }, [loadLog]),
  );

  const toggleDose = useCallback(
    async (slotId: string) => {
      const currentEntry = log?.entries[slotId];
      const newTaken = !currentEntry?.taken;

      await repository.setDose(today, slotId, newTaken);
      await loadLog();
    },
    [log, today, loadLog],
  );

  const updateDoseTime = useCallback(
    async (slotId: string, at: string) => {
      await repository.setDose(today, slotId, true, at);
      await loadLog();
    },
    [today, loadLog],
  );

  const completedCount = slots.filter(
    (slot) => log?.entries[slot.id]?.taken,
  ).length;

  return {
    log,
    loading,
    toggleDose,
    updateDoseTime,
    completedCount,
    refreshLog: loadLog,
  };
}

export function useStreak(slots: DoseSlot[]) {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStreak = async () => {
      const today = getTodayDate();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const logs = await repository.getRange(formatDate(thirtyDaysAgo), today);
      const calculatedStreak = calculateStreak(logs, slots, today);

      setStreak(calculatedStreak);
      setLoading(false);
    };

    if (slots.length > 0) {
      loadStreak();
    } else {
      setStreak(0);
      setLoading(false);
    }
  }, [slots]);

  return { streak, loading };
}

export function useOnboarding() {
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    repository.hasCompletedOnboarding().then(setHasCompleted);
  }, []);

  const completeOnboarding = useCallback(async () => {
    await repository.setOnboardingComplete(true);
    setHasCompleted(true);
  }, []);

  const resetOnboarding = useCallback(async () => {
    await repository.setOnboardingComplete(false);
    setHasCompleted(false);
  }, []);

  return { hasCompleted, completeOnboarding, resetOnboarding };
}

export function useCalendarData(
  slots: DoseSlot[],
  year: number,
  month: number,
) {
  const [data, setData] = useState<
    Map<string, { completed: number; total: number }>
  >(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const logs = await repository.getRange(
        formatDate(startDate),
        formatDate(endDate),
      );

      const logMap = new Map(logs.map((log) => [log.date, log]));
      const result = new Map<string, { completed: number; total: number }>();

      const current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = formatDate(current);
        const log = logMap.get(dateStr);

        // 분모는 "지금의 슬롯 목록"이 아니라 그날 실제로 존재했던 슬롯이다.
        // 그러지 않으면 슬롯을 하나 추가하는 순간 지난달 전체가 "덜 챙긴 날"로
        // 물든다.
        const due = slotsForDate(slots, dateStr);

        let completed = 0;
        if (log) {
          for (const slot of due) {
            if (log.entries[slot.id]?.taken) {
              completed++;
            }
          }
        }

        result.set(dateStr, { completed, total: due.length });
        current.setDate(current.getDate() + 1);
      }

      setData(result);
      setLoading(false);
    };

    if (slots.length > 0) {
      loadData();
    }
  }, [slots, year, month]);

  return { data, loading };
}
