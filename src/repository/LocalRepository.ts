import type { DoseSlot, DoseLog, MedRepository } from '../types';

const KEYS = {
  SLOTS: 'med_slots',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  LOG_PREFIX: 'log_', // log_YYYY-MM-DD
} as const;

// Lazy-load MMKV to avoid issues with native modules during type checking
let mmkvInstance: any = null;

function getStorage() {
  if (!mmkvInstance) {
    const { createMMKV } = require('react-native-mmkv');
    mmkvInstance = createMMKV({ id: 'med-tracker-storage' });
  }
  return mmkvInstance;
}

export class LocalRepository implements MedRepository {
  private get storage() {
    return getStorage();
  }

  async getSlots(): Promise<DoseSlot[]> {
    const data = this.storage.getString(KEYS.SLOTS);
    if (!data) return [];

    try {
      const slots: DoseSlot[] = JSON.parse(data);
      // Filter out soft-deleted slots for normal use
      return slots.filter((slot) => !slot.deletedAt).sort((a, b) => a.order - b.order);
    } catch {
      return [];
    }
  }

  async getAllSlotsIncludingDeleted(): Promise<DoseSlot[]> {
    const data = this.storage.getString(KEYS.SLOTS);
    if (!data) return [];

    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async saveSlots(slots: DoseSlot[]): Promise<void> {
    // Merge with existing deleted slots to preserve them
    const existingAll = await this.getAllSlotsIncludingDeleted();
    const existingDeleted = existingAll.filter((s) => s.deletedAt);

    const newSlotIds = new Set(slots.map((s) => s.id));
    const deletedToKeep = existingDeleted.filter((s) => !newSlotIds.has(s.id));

    const allSlots = [...slots, ...deletedToKeep];
    this.storage.set(KEYS.SLOTS, JSON.stringify(allSlots));
  }

  async getLog(date: string): Promise<DoseLog | null> {
    const key = `${KEYS.LOG_PREFIX}${date}`;
    const data = this.storage.getString(key);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async setDose(
    date: string,
    slotId: string,
    taken: boolean,
    at?: string
  ): Promise<void> {
    const key = `${KEYS.LOG_PREFIX}${date}`;
    let log = await this.getLog(date);

    if (!log) {
      log = {
        date,
        entries: {},
        updatedAt: new Date().toISOString(),
      };
    }

    log.entries[slotId] = {
      taken,
      at: taken ? at || new Date().toISOString() : undefined,
    };
    log.updatedAt = new Date().toISOString();

    this.storage.set(key, JSON.stringify(log));
  }

  async getRange(startDate: string, endDate: string): Promise<DoseLog[]> {
    const logs: DoseLog[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    const current = new Date(start);
    while (current <= end) {
      const dateStr = this.formatDate(current);
      const log = await this.getLog(dateStr);
      if (log) {
        logs.push(log);
      }
      current.setDate(current.getDate() + 1);
    }

    return logs;
  }

  async hasCompletedOnboarding(): Promise<boolean> {
    return this.storage.getBoolean(KEYS.ONBOARDING_COMPLETE) ?? false;
  }

  async setOnboardingComplete(complete: boolean): Promise<void> {
    this.storage.set(KEYS.ONBOARDING_COMPLETE, complete);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// Singleton instance
export const repository = new LocalRepository();
