---
name: data-layer
description: 먹었다 앱의 데이터·저장·도메인 로직을 다룰 때 참고. 데이터 모델(DoseSlot, DoseLog)과 동기화 대비 규칙, MedRepository 인터페이스와 로컬/클라우드 구현, 탭 정렬 규칙, 활성 탭 선택(pickActive), 연속 기록(streak) 계산. 저장·상태·복용 로그·정렬·통계 관련 작업 시 참고.
---

# 먹었다 — 데이터 레이어

UI는 저장소 구현을 직접 모른다. 반드시 `MedRepository` 인터페이스에만 의존한다.

## 데이터 모델

동기화 대비를 위해 항상: **고정 UUID, 날짜(ISO) 키, 모든 레코드 `updatedAt`, 삭제는 `deletedAt` 소프트 삭제.** 로그는 배열 인덱스가 아니라 **slot id로 키잉**한다(항목 순서 변경·추가에 안전).

```ts
type DoseSlot = {
  id: string; // uuid, 고정
  name: string; // 유저 지정 ("아침", "취침 전" 등)
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  createdAt: string; // ISO — 정렬 tiebreaker 겸 동기화용
  updatedAt: string; // ISO
  deletedAt?: string; // 소프트 삭제
};

type DoseLog = {
  date: string; // "YYYY-MM-DD" (로컬 기준)
  entries: Record<string, { taken: boolean; at?: string }>; // key = DoseSlot.id
  updatedAt: string;
};
```

## Repository 인터페이스

```ts
interface MedRepository {
  getSlots(): Promise<DoseSlot[]>;
  saveSlots(slots: DoseSlot[]): Promise<void>;
  getLog(date: string): Promise<DoseLog | null>;
  setDose(
    date: string,
    slotId: string,
    taken: boolean,
    at?: string,
  ): Promise<void>;
  getRange(startDate: string, endDate: string): Promise<DoseLog[]>; // 캘린더용
}
```

- 지금은 `LocalRepository`(react-native-mmkv, JSON 직렬화)만 사용.
- 클라우드 단계가 오면 `CloudRepository`로 드롭인(UI 무변경). 오프라인 우선 동기화 엔진(PowerSync/Legend-State 등) 또는 Supabase 중 택. **Repository만 잘 유지하면 이 결정은 미뤄도 된다.**

## 탭 정렬 규칙

수동 순서를 저장하지 않는다. **시간이 순서를 정한다.** 항상 아래로 정렬해서 표시하고, 새 슬롯은 시간에 맞는 자리에 자동 삽입된다.

1. `start` 오름차순
2. 같으면 → `end` 오름차순
3. 그것도 같으면 → `createdAt`(추가 순서)

마지막 tiebreaker 덕분에 동시각 항목도 렌더마다 안 흔들리고, "같은 시간이면 먼저 추가한 게 앞"이라는 예측 가능한 규칙이 된다. (`order` 필드는 두지 않는다. 추후 수동 재정렬이 필요해지면 그때 도입.)

```ts
const toMin = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
slots.sort(
  (a, b) =>
    toMin(a.start) - toMin(b.start) ||
    toMin(a.end) - toMin(b.end) ||
    a.createdAt.localeCompare(b.createdAt),
);
```

## 활성 탭 선택 (pickActive)

앱을 켜면 현재 시각에 해당하는 항목이 자동 선택된다.

1. `start ≤ now ≤ end`인 항목이 있으면 그 항목
2. 없으면 아직 안 온 항목 중 `start`가 가장 가까운 것(다음 차례)
3. 그것도 없으면 마지막 항목

## 연속 기록 (streak)

"그날 **모든** 항목을 먹은 날"만 연속으로 카운트. 오늘이 완료면 오늘부터, 아니면 어제부터 과거로 센다.

> 참고: 이 스트릭은 "증거/기록"으로만 부드럽게 노출한다. 실패를 부각하는 압박형 UX 금지(→ ui-conventions).

## 참고

- `timeIcon`(시각→아이콘) 등 표현 로직은 ui-conventions 스킬 참고.
- 순수 로직(정렬, pickActive, streak)은 UI에서 분리해 단위 테스트 대상으로 둔다.
