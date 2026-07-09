---
name: ui-conventions
description: 먹었다 앱의 UI를 만들거나 수정할 때 적용하는 시각 규칙. 색 토큰, 로고 사용법, 탭 상태(먹음/선택/기본)와 레이아웃 밀림 방지, 탭 탭 인터랙션(체크/해제 비대칭), 캘린더 색 표현, 시간대 아이콘. 컴포넌트·스타일·애니메이션·아이콘 작업 시 참고.
---

# 먹었다 — UI 컨벤션

다크 우선, 플랫·미니멀. **초록은 "먹음(완료)"에만** 사용하고, 선택 등 다른 상태는 중립색으로 표현한다(초록의 의미를 하나로 유지).

## 색 토큰

- 완료/브랜드 초록(primary): `#6BA43A`
- 캘린더 진행 램프: 연함 `#C0DD97` · 중간 `#97C459` · 진함 `#639922`
- 그 외 표면/보더/텍스트는 다크 테마 토큰을 사용(하드코딩 지양, 실제 테마 변수에 매핑).

## 로고

- 앱 아이콘/스플래시: 컬러 버전(초록 스퀘어 + 흰 캡슐 + 체크). `assets/logo-appicon.svg`.
- 탭 원 안/틴트: 모노 심볼(`currentColor`). `assets/logo-symbol.svg`. 미복용 시 회색으로 틴트, 복용 시 원이 초록으로 차며 체크로 전환.
- `react-native-svg`로 컴포넌트화. 모노 심볼은 `color` prop으로 틴트.

## 시간대 아이콘 (timeIcon)

복용 항목의 시작 시각(hour)에서 자동 파생. 앱이 일정을 추측하지 않는다.

- `5–10` → sunrise · `11–15` → sun · `16–20` → sunset · 그 외(밤) → moon

## 복용 탭 (상단 토글)

항목이 곧 오늘의 진행 바. 3가지 상태로 분기한다.

| 상태          | 배경                  | 아이콘              | 라벨            |
| ------------- | --------------------- | ------------------- | --------------- |
| 먹음          | 초록 채움 `#6BA43A`   | 체크(흰색)          | 흰색, 약간 굵게 |
| 선택 · 아직   | 중립 채움 + 밝은 보더 | 시간대 아이콘       | 흰색            |
| 미선택 · 아직 | 투명 + 옅은 보더      | 시간대 아이콘(회색) | 회색            |

- **선택은 중립색으로**(가운데 큰 원이 이미 선택 항목을 알려줌). 초록을 선택에 쓰지 않는다.
- 선택 + 먹음이면: 초록 채움 + 얇은 밝은 링.

### 레이아웃 밀림 방지 (중요)

먹음 표시로 체크를 붙일 때 탭 너비가 바뀌면 옆 탭이 밀린다. **취소선 금지.** 대신:

- 아이콘을 **고정폭 컨테이너**(예: `width: 18`)로 감싸고, 평소엔 시간대 아이콘, 먹으면 **같은 자리의 글리프만 체크로 교체**. 너비 불변, 빈 공백 없음.

```tsx
<View style={{ width: 18, alignItems: "center" }}>
  <Ionicons name={taken ? "checkmark" : timeIcon(slot.start)} size={16}
    color={taken ? "#fff" : muted} />
</View>
<Text style={{ color: taken ? "#fff" : label, fontWeight: taken ? "500" : "400" }}>
  {slot.name}
</Text>
```

## 탭 인터랙션 (체크/해제 비대칭)

체크는 이 앱의 핵심 긍정 순간 → 보람있게. 해제는 정정 → 담백하게. 단 "화려"가 아니라 **crisp & rewarding**, 0.5초 이내 절제. 컨페티·사운드 금지(하루에 여러 번 하는 동작).

- **체크**: `Haptics.notificationAsync(Success)` + 오버슈트 팝(spring, 0.9→1 튀며 정착) + 은은한 링 펄스(원 뒤로 한 번 퍼지며 사라짐).
- **해제**: `Haptics.impactAsync(Light)` + 대칭 딥(0.94→1).

```tsx
if (willCheck) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  Animated.sequence([
    Animated.timing(scaleAnim, {
      toValue: 0.9,
      duration: 90,
      useNativeDriver: true,
    }),
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 140,
      useNativeDriver: true,
    }),
  ]).start();
  pulseAnim.setValue(0);
  Animated.timing(pulseAnim, {
    toValue: 1,
    duration: 500,
    easing: Easing.out(Easing.ease),
    useNativeDriver: true,
  }).start();
} else {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  Animated.sequence([
    Animated.timing(scaleAnim, {
      toValue: 0.94,
      duration: 100,
      useNativeDriver: true,
    }),
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }),
  ]).start();
}
```

링 펄스 뷰(원 뒤에 깔기):

```tsx
<Animated.View
  pointerEvents="none"
  style={{
    position: "absolute",
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: "#6BA43A",
    opacity: pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 0],
    }),
    transform: [
      {
        scale: pulseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.4],
        }),
      },
    ],
  }}
/>
```

## 캘린더

- 각 날짜를 그날 완료 비율로 칠한다: `0` → 회색 · `<0.5` → 연함 · `<1` → 중간 · `1` → 진함.
- 오늘 칸은 테두리 강조.
- 톤은 "기록·증거". 연속 실패를 부각하는 압박형 연출 금지.
