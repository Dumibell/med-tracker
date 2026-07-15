export type DoseSlot = {
  id: string;
  name: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  createdAt: string; // ISO — 정렬 tiebreaker 겸 "언제부터 있던 슬롯인지"의 기준
  updatedAt: string; // ISO
  deletedAt?: string; // soft delete
};

export type DoseEntry = {
  taken: boolean;
  at?: string; // ISO timestamp when checked
};

export type DoseLog = {
  date: string; // "YYYY-MM-DD"
  entries: Record<string, DoseEntry>; // key = DoseSlot.id
  updatedAt: string; // ISO
};

export interface MedRepository {
  getSlots(): Promise<DoseSlot[]>;
  saveSlots(slots: DoseSlot[]): Promise<void>;

  getLog(date: string): Promise<DoseLog | null>;
  setDose(
    date: string,
    slotId: string,
    taken: boolean,
    at?: string,
  ): Promise<void>;

  getRange(startDate: string, endDate: string): Promise<DoseLog[]>;

  hasCompletedOnboarding(): Promise<boolean>;
  setOnboardingComplete(complete: boolean): Promise<void>;
}
