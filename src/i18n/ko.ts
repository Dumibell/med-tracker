/**
 * 한국어 사전. 이 파일이 키의 단일 출처다 — `TranslationKey`가 여기서 파생되고,
 * `en.ts`는 같은 키를 전부 채워야 타입 체크를 통과한다.
 *
 * 복수형: 기본 키가 곧 복수 규칙의 "other" 형태다. 한국어는 복수 구분이 없어
 * 기본 키 하나로 끝나고, 영어만 `_one`을 따로 둔다(`en.ts` 참고).
 */
export const ko = {
  "common.cancel": "취소",
  "common.confirm": "확인",
  "common.close": "닫기",
  "common.loading": "로딩 중...",

  // 브랜드명은 번역하지 않는다.
  "app.name": "먹었다",

  "main.streak": "{count}일째 잘 챙기고 있어요",
  "main.tapToCheck": "탭하여 체크",
  "main.takenAt": "{time}에 먹음",
  "main.editTime": "시각 수정",
  "main.summary": "오늘 {completed}/{total} 완료",

  "main.a11y.taken": "{name} 먹음",
  "main.a11y.notTaken": "{name} 아직 안 먹음",
  "main.a11y.hintCheck": "탭하면 체크돼요",
  "main.a11y.hintUncheck": "탭하면 체크를 취소해요",

  "main.uncheck.title": "취소하시겠어요?",
  "main.uncheck.bodyWithTime": "이미 {time}에 드셨어요. 취소하시겠어요?",
  "main.uncheck.body": "이미 체크된 항목이에요. 취소하시겠어요?",
  "main.uncheck.keep": "아니요",
  "main.uncheck.undo": "취소할게요",

  "relative.justNow": "방금 전",
  "relative.minutesAgo": "{count}분 전",
  "relative.hoursAgo": "{count}시간 전",

  "timeSheet.start": "시작 시각",
  "timeSheet.end": "종료 시각",
  "timeSheet.edit": "시각 수정",

  "onboarding.header": "약 알림 설정",
  "onboarding.tagline": "약 먹었는지 확인하는 가장 빠른 방법",
  "onboarding.subheader":
    "하루에 몇 번 약을 드시나요?\n각 복용 시간대를 설정해주세요.",
  "onboarding.countLabel": "하루 복용 횟수",
  "onboarding.namePlaceholder": "예: {example}",
  "onboarding.takenToday": "오늘 체크함",
  "onboarding.save": "저장하기",
  "onboarding.start": "시작하기",

  "onboarding.discard.title": "저장하지 않고 나갈까요?",
  "onboarding.discard.body": "변경한 내용이 사라져요.",
  "onboarding.discard.keep": "계속 편집",
  "onboarding.discard.leave": "나가기",

  "onboarding.deleteWarn.title": "오늘 기록도 함께 지워져요",
  "onboarding.deleteWarn.body":
    "{names}은(는) 오늘 이미 체크했어요. 이 항목을 지우면 오늘 기록도 함께 사라져요.",
  "onboarding.deleteWarn.confirm": "지우고 저장",

  // 온보딩에서 슬롯을 만들 때 이름의 기본값으로 한 번 저장된다. 저장된 뒤에는
  // 사용자 데이터이므로 나중에 폰 언어를 바꿔도 다시 번역하지 않는다.
  "slot.default.morning": "아침",
  "slot.default.noon": "점심",
  "slot.default.evening": "저녁",
  "slot.default.bedtime": "취침 전",
  "slot.default.nth": "복용 {n}",
  "slot.default.generic": "복용 시간",

  "calendar.title": "복용 기록",
  "calendar.legend.some": "일부",
  "calendar.legend.most": "절반 이상",
  "calendar.legend.all": "완료",
  "calendar.tapHint": "날짜를 눌러 그날 기록을 확인·정정",

  // 지난 날짜를 눌러 그날 복용을 바로잡는 시트.
  "dateEdit.summary": "{total}개 중 {completed}개 챙겼어요",
  "dateEdit.empty": "이 날은 챙길 약이 없었어요",
  "dateEdit.markedTaken": "챙김으로 표시함",
  "dateEdit.hint":
    "먹은 시간까지는 몰라도 돼요.\n챙겼는지만 눌러 두면 기록이 맞춰져요.",
  "dateEdit.a11y.taken": "{name} 챙김, 탭하면 해제",
  "dateEdit.a11y.notTaken": "{name} 아직 안 챙김, 탭하면 챙김",

  "notification.body": "💊 오늘 {name} 챙기셨어요?",
} as const;

export type TranslationKey = keyof typeof ko;
