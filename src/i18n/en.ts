import type { TranslationKey } from "./ko";

/**
 * `Record<TranslationKey, string>`이라서 `ko.ts`에 키를 추가하면 여기를 채울
 * 때까지 타입 체크가 실패한다 — 번역 누락이 컴파일 에러로 잡힌다.
 *
 * 기본 키는 복수 규칙의 "other" 형태이고, 영어는 여기에 `_one`을 더한다
 * (`ko.ts` 주석 참고).
 */
type EnDict = Record<TranslationKey, string> & {
  "main.streak_one": string;
  "relative.minutesAgo_one": string;
  "relative.hoursAgo_one": string;
};

export const en: EnDict = {
  "common.cancel": "Cancel",
  "common.confirm": "Done",
  "common.close": "Close",
  "common.loading": "Loading…",

  "app.name": "먹었다",

  "main.streak_one": "{count} day in a row",
  "main.streak": "{count} days in a row",
  "main.tapToCheck": "Tap to check",
  "main.takenAt": "Taken at {time}",
  "main.editTime": "Edit time",
  "main.summary": "{completed} of {total} today",

  "main.a11y.taken": "{name}, taken",
  "main.a11y.notTaken": "{name}, not taken yet",
  "main.a11y.hintCheck": "Tap to check",
  "main.a11y.hintUncheck": "Tap to undo the check",

  "main.uncheck.title": "Undo this check?",
  "main.uncheck.bodyWithTime": "You took this at {time}. Undo the check?",
  "main.uncheck.body": "This one is already checked. Undo it?",
  "main.uncheck.keep": "Keep it",
  "main.uncheck.undo": "Undo",

  "relative.justNow": "Just now",
  "relative.minutesAgo_one": "{count} minute ago",
  "relative.minutesAgo": "{count} minutes ago",
  "relative.hoursAgo_one": "{count} hour ago",
  "relative.hoursAgo": "{count} hours ago",

  "timeSheet.start": "Start time",
  "timeSheet.end": "End time",
  "timeSheet.edit": "Edit time",

  "onboarding.header": "Dose schedule",
  "onboarding.subheader":
    "How many times a day do you take it?\nSet each dose window.",
  "onboarding.countLabel": "Doses per day",
  "onboarding.namePlaceholder": "e.g. {example}",
  "onboarding.save": "Save",
  "onboarding.start": "Get started",

  "onboarding.discard.title": "Leave without saving?",
  "onboarding.discard.body": "Your changes will be lost.",
  "onboarding.discard.keep": "Keep editing",
  "onboarding.discard.leave": "Leave",

  "onboarding.deleteWarn.title": "Today's record goes too",
  "onboarding.deleteWarn.body":
    "{names} is already checked today. Deleting it also removes today's record.",
  "onboarding.deleteWarn.confirm": "Delete and save",

  "slot.default.morning": "Morning",
  "slot.default.noon": "Noon",
  "slot.default.evening": "Evening",
  "slot.default.bedtime": "Bedtime",
  "slot.default.nth": "Dose {n}",
  "slot.default.generic": "Dose",

  "calendar.title": "History",
  "calendar.legend.some": "Some",
  "calendar.legend.most": "Most",
  "calendar.legend.all": "All",

  "dateEdit.summary": "{completed} of {total} taken",
  "dateEdit.empty": "Nothing to take on this day",
  "dateEdit.markedTaken": "Marked as taken",
  "dateEdit.hint":
    "You don't need the exact time.\nJust mark what you took and the record catches up.",
  "dateEdit.a11y.taken": "{name} taken, tap to undo",
  "dateEdit.a11y.notTaken": "{name} not taken, tap to mark taken",

  "notification.body": "Did you take your {name} dose today?",
};
