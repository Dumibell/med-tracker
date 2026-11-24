import { getLocales } from "expo-localization";
import { ko, type TranslationKey } from "./ko";
import { en } from "./en";

/**
 * 로케일은 앱 실행 시점에 한 번만 정한다. iOS/Android 모두 시스템 언어를 바꾸면
 * 앱이 재시작되므로, 리액티브하게 다시 읽을 이유가 없다.
 */
const deviceLocale = getLocales()[0];
const language = deviceLocale?.languageCode === "ko" ? "ko" : "en";

/** 날짜·시간 포맷을 Intl에 넘길 때 쓰는 BCP47 태그 ("ko-KR", "en-US" 등). */
export const locale = deviceLocale?.languageTag ?? "en-US";

const dict: Record<string, string> = language === "ko" ? ko : en;

type Params = Record<string, string | number>;

/**
 * Hermes의 Intl에는 `PluralRules`가 없다. 지원 언어가 ko/en 둘뿐이라 규칙이
 * 자명하므로 직접 고른다 — 한국어는 복수 구분이 없어 항상 기본 키로 모인다.
 */
function pluralSuffix(count: number): string {
  if (language === "ko") return "";
  return count === 1 ? "_one" : "";
}

/**
 * `params.count`가 있으면 복수 규칙에 맞는 `key_one` 같은 변형을 먼저 찾고,
 * 없으면 기본 키로 떨어진다(기본 키가 곧 "other" 형태다).
 */
export function t(key: TranslationKey, params?: Params): string {
  let template = dict[key];

  if (params?.count !== undefined) {
    const suffix = pluralSuffix(Number(params.count));
    if (suffix) template = dict[`${key}${suffix}`] ?? template;
  }

  if (template === undefined) return key;
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** "오전 8:12" / "8:12 AM" — 12·24시간제는 기기 설정을 따른다. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** 캘린더 아래 그날 기록의 헤더: "7월 14일 (월)" / "Mon, Jul 14". 연도는 붙이지 않는다. */
export function formatSheetDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

/** 캘린더 헤더: "2026년 7월" / "July 2026". */
export function formatMonthTitle(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
  });
}

/** 캘린더 요일 헤더: ["일", "월", …] / ["Sun", "Mon", …]. 일요일 시작. */
export function weekdayNames(): string[] {
  // 2023-01-01은 일요일 — 요일 이름만 뽑기 위한 앵커.
  const sunday = new Date(2023, 0, 1);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    return day.toLocaleDateString(locale, { weekday: "short" });
  });
}

export type { TranslationKey };
