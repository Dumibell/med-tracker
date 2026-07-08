# 약 복용 트래커 앱 - 프로젝트 컨텍스트

## 프로젝트 개요

개인용 약 복용 체크 앱. "약을 먹었는지 안 먹었는지 모른다"는 불확실성을 해결하는 게 목표.

- **핵심 UX**: 앱을 켜자마자 "지금 이 약 먹었나?"에 답이 보여야 함. 켜서 → 큰 원 한 번 탭이 기본 동선.
- **로컬 우선**: 로그인/계정 없이 로컬 저장만으로 동작 (나중에 클라우드 동기화 대비 설계됨)

## 기술 스택

- **Expo SDK 57** + TypeScript + expo-router (파일 기반 라우팅)
- **react-native-mmkv**: 로컬 저장소 (빠르고 동기적)
- **expo-haptics**: 탭 시 햅틱 피드백
- **@react-native-picker/picker**: 시간 선택
- **@expo/vector-icons** (Ionicons): 아이콘

## 프로젝트 구조

```
med-tracker/
├── app/                    # expo-router 페이지
│   ├── _layout.tsx         # 루트 레이아웃 (Stack)
│   ├── index.tsx           # 진입점 - 온보딩 완료 여부 체크 후 라우팅
│   ├── onboarding.tsx      # 온보딩 화면 (복용 횟수/시간대 설정)
│   └── main.tsx            # 메인 화면 (큰 원 + 캘린더)
├── src/
│   ├── types.ts            # DoseSlot, DoseLog, MedRepository 타입
│   ├── repository/
│   │   ├── LocalRepository.ts  # MMKV 기반 저장소 구현
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useRepository.ts    # useSlots, useTodayLog, useStreak, useCalendarData
│   │   ├── useColors.ts        # 다크모드 대응 색상
│   │   └── index.ts
│   ├── components/
│   │   ├── TimePickerRow.tsx   # 시간 선택 (시작~종료)
│   │   ├── Calendar.tsx        # 월 캘린더 (복용 기록 시각화)
│   │   └── index.ts
│   ├── constants/
│   │   └── colors.ts       # 색상 정의 (light/dark)
│   └── utils/
│       └── time.ts         # 시간→아이콘, pickActiveSlot, 스트릭 계산 등
├── app.json
├── package.json
└── tsconfig.json
```

## 데이터 모델

```typescript
type DoseSlot = {
  id: string; // UUID
  name: string; // "아침", "저녁" 등
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  order: number;
  updatedAt: string; // ISO
  deletedAt?: string; // 소프트 삭제
};

type DoseLog = {
  date: string; // "YYYY-MM-DD"
  entries: Record<string, { taken: boolean; at?: string }>; // key = slotId
  updatedAt: string;
};
```

## 핵심 로직

1. **시각 → 아이콘**: 5~11시=sunrise, 11~16시=sun, 16~21시=sunset, 그 외=moon
2. **pickActiveSlot**: 현재 시간대 슬롯 자동 선택 (start≤now≤end → 해당 슬롯, 없으면 다음 슬롯)
3. **스트릭**: 모든 슬롯을 먹은 날만 연속 카운트
4. **캘린더 색**: 완료율에 따라 연한 초록 → 진한 초록

## 현재 상태

- ✅ 프로젝트 스캐폴드 완료
- ✅ 타입, 저장소, 훅, 유틸 구현 완료
- ✅ 온보딩 화면 구현 완료 (스텝퍼, 시간 선택, 하단 고정 버튼)
- ✅ 메인 화면 구현 완료 (슬롯 토글, 큰 원, 캘린더)
- ⏳ 실제 디바이스/시뮬레이터 테스트 필요 (MMKV는 웹에서 안 됨)

## 실행 방법

```bash
# Node 20+ 필요
source ~/.nvm/nvm.sh && nvm use 20
npm start
# 또는
npx expo start --ios
```

## 남은 작업 / 오픈 이슈

- Xcode 설정 후 iOS 시뮬레이터 테스트
- 실제 기기에서 MMKV 동작 확인
- (후순위) expo-notifications로 알림 기능
- (후순위) 클라우드 동기화

## 디자인 노트

- 초록 액센트: 연함 #C0DD97, 중간 #97C459, 진함 #639922
- 스트릭 pill: 앰버/warning 톤
- 라이트/다크 모드 모두 대응
- UI 카피는 한국어

## 원본 스펙 문서 요약

### 화면 스펙

**온보딩**: 하루 복용 횟수 스텝퍼(1~10) + 각 항목별 이름/시간대 설정 + 하단 고정 "시작하기" 버튼
**메인**: 헤더(오늘의 약 + 스트릭 pill + 설정) → 상단 슬롯 토글(완료 시 체크 표시) → 중앙 큰 원(140px, 탭하여 체크/취소) → 요약 텍스트 → 월 캘린더

### 초기 테스트용 기본 설정

- 아침 07:00~11:00
- 저녁 17:00~21:00
- 취침 전 22:00~24:00
