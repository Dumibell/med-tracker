import { useState, useEffect, useCallback } from 'react';
import { repository } from '../repository';
import type { DoseSlot, DoseLog } from '../types';
import { getTodayDate, formatDate, calculateStreak } from '../utils/time';

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
    setSlots(newSlots.filter((s) => !s.deletedAt).sort((a, b) => a.order - b.order));
  }, []);

  return { slots, loading, saveSlots, refreshSlots: loadSlots };
}

export function useTodayLog(slots: DoseSlot[]) {
  const [log, setLog] = useState<DoseLog | null>(null);
  const [loading, setLoading] = useState(true);
  const today = getTodayDate();

  const loadLog = useCallback(async () => {
    const data = await repository.getLog(today);
    setLog(data);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  const toggleDose = useCallback(
    async (slotId: string) => {
      const currentEntry = log?.entries[slotId];
      const newTaken = !currentEntry?.taken;

      await repository.setDose(today, slotId, newTaken);
      await loadLog();
    },
    [log, today, loadLog]
  );

  const completedCount = slots.filter(
    (slot) => log?.entries[slot.id]?.taken
  ).length;

  return { log, loading, toggleDose, completedCount, refreshLog: loadLog };
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

export function useCalendarData(slots: DoseSlot[], year: number, month: number) {
  const [data, setData] = useState<Map<string, { completed: number; total: number }>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const logs = await repository.getRange(
        formatDate(startDate),
        formatDate(endDate)
      );

      const logMap = new Map(logs.map((log) => [log.date, log]));
      const result = new Map<string, { completed: number; total: number }>();

      const current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = formatDate(current);
        const log = logMap.get(dateStr);

        let completed = 0;
        if (log) {
          for (const slot of slots) {
            if (log.entries[slot.id]?.taken) {
              completed++;
            }
          }
        }

        result.set(dateStr, { completed, total: slots.length });
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
