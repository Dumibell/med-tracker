---
name: ui-conventions
description: 먹었다 앱의 UI를 만들거나 수정할 때 적용하는 시각 규칙. 색 토큰, 로고 사용법, 복용 탭의 두 축(선택=보더 두께+굵은 텍스트 / 먹음=초록 보더색) 상태 모델과 4가지 상태·레이아웃 밀림 방지, 탭 인터랙션(체크/해제 비대칭), 캘린더 색 표현, 시간대 아이콘. 컴포넌트·스타일·애니메이션·아이콘 작업 시 참고.
---

# 먹었다 — UI 컨벤션

플랫·미니멀, 라이트/다크 모두 지원. **초록은 "먹음(완료)"에만** 사용하고, 선택 등 다른 상태는 중립색(채움/그림자)으로 표현한다. 초록의 의미를 하나로 유지하는 것이 이 앱 UI의 핵심 규칙이다.

## 색 토큰

- 브랜드/채움 초록(primary): `#6BA43A` — 큰 원의 "먹음" 채움, 로고 등.
- 전경 초록(greenDark): 텍스트·체크·아이콘처럼 얇은 요소에 쓰는 살짝 진한 초록(대비 확보용). 예: `#4E8A28`~`#5C9A30`. 밝은 배경 위 초록 글자는 `#6BA43A`보다 이쪽을 쓴다.
- 캘린더 진행 램프: 연함 `#C0DD97` · 중간 `#97C459` · 진함 `#639922`
- 그 외 표면(surface)·보더·텍스트는 테마 토큰을 사용(하드코딩 지양). 선택 채움에 쓰는 "떠오른 표면색"은 라이트/다크 각각의 elevated surface로 매핑.

## 로고

- 앱 아이콘/스플래시: 컬러 버전(초록 스퀘어 + 흰 캡슐 + 체크). `assets/logo-appicon.svg`.
- 탭 원 안/틴트: 모노 심볼(`currentColor`). `assets/logo-symbol.svg`. 미복용 시 회색으로 틴트, 복용 시 원이 초록으로 차며 체크로 전환.
- `react-native-svg`로 컴포넌트화. 모노 심볼은 `color` prop으로 틴트.

## 시간대 아이콘 (timeIcon)

복용 항목의 시작 시각(hour)에서 자동 파생. 앱이 일정을 추측하지 않는다.

- `5–10` → sunrise · `11–15` → sun · `16–20` → sunset · 그 외(밤) → moon

## 복용 탭 (상단 토글)

항목이 곧 오늘의 진행 바. **두 가지 정보를 각각 다른 축으로 표현한다. 절대 하나로 묶지 않는다.**

- **선택 축 = 보더를 더 굵게 + 텍스트·아이콘을 굵게(bold).** 배경 채움이나 그림자는 쓰지 않는다 — 순전히 보더 두께와 폰트 굵기로만 "선택됨"을 표시.
- **먹음 축 = 초록 체크 + 초록 텍스트 + 초록 보더 색.** 선택 여부와 무관.
- **초록은 오직 먹음에만.** 선택에 초록을 쓰면 "먹음+선택"이 "먹음+미선택"과 구분되지 않는다(실제로 발생했던 문제).
- **보더는 모든 상태에 항상 존재한다** (색은 먹음 축, 두께는 선택 축 — 서로 다른 속성이라 절대 안 부딪힌다). 먹음이 아니면 옅은 중립 보더(`colors.border`), 먹음이면 옅은 초록 보더. 두께는 미선택 `1.5`, 선택 `2`.
- 배경은 항상 투명. 선택/먹음 어떤 조합이든 배경 채움을 쓰지 않는다.

### 4가지 상태

| 상태               | 배경 | 보더 색            | 보더 두께 | 아이콘              | 라벨       |
| ------------------ | ---- | ------------------- | --------- | ------------------- | ---------- |
| 기본 (미선택·아직) | 투명 | 옅은 중립 (`border`) | 1.5       | 시간대 아이콘(회색) | 회색       |
| 선택 · 아직        | 투명 | 옅은 중립 (`border`) | 2         | 시간대 아이콘(진함) | 기본색, 굵게 |
| 먹음 · 미선택      | 투명 | 옅은 초록            | 1.5       | 체크(초록, 얇음)     | 초록       |
| 먹음 · 선택        | 투명 | 옅은 초록            | 2         | 체크(초록, **굵음**) | 초록, 굵게 |

### 구현: 상태 조합으로 분기하지 말 것

`selected`와 `taken`을 **독립 속성으로 합친다.** 색은 `taken`이, 두께는 `selected`가 각각 정하고 절대 하나의 if/else 트리로 합치지 않는다 — 그래야 두 축이 서로 안 밟고 네 조합이 자동으로 구분된다.

```tsx
const tabStyle = [
  styles.tabBase, // borderRadius/padding만, 색·두께는 아래서 인라인으로
  {
    borderColor: taken ? greenBorder : neutralBorder, // 먹음 축: 색
    borderWidth: selected ? 2 : 1.5, // 선택 축: 두께
  },
];

const tint = taken ? greenDark : selected ? textStrong : textMuted;
const textColor = tint;
const textWeight = selected ? "600" : "500";

// 아이콘도 선택 축에 반응해야 한다 — 벡터 글리프는 fontWeight로 안 굵어지므로
// "굵은 변형 아이콘"을 따로 골라야 함. 체크가 taken일 때 항상 굵으면 선택 여부가
// 구분이 안 되니, **굵은 체크(check-bold)는 taken && selected일 때만** 쓴다.
// taken && !selected는 얇은 Ionicons "checkmark" 그대로.
{taken ? (
  selected ? (
    <MaterialCommunityIcons name="check-bold" size={16} color={tint} />
  ) : (
    <Ionicons name="checkmark" size={16} color={tint} />
  )
) : (
  <Ionicons name={timeIcon(slot.start)} size={16} color={tint} />
)}
```

```tsx
tabBase: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
// neutralBorder = colors.border, greenBorder = colors.greenLight(또는 옅은 초록 예: #CBE7B3)
```

두께 변화는 1px 미만 차이라 옆 탭 레이아웃이 흔들리지 않는다. 라이트/다크 동일하게 동작한다(보더 색 토큰만 테마별로 바뀌면 됨).

### 레이아웃 밀림 방지 (중요)

먹음 표시로 체크를 붙일 때 탭 너비가 바뀌면 옆 탭이 밀린다. **취소선 금지.** 대신:

- 아이콘을 **고정폭 컨테이너**(예: `width: 18`)로 감싸고, 평소엔 시간대 아이콘, 먹으면 **같은 자리의 글리프만 체크로 교체**. 너비 불변, 빈 공백 없음.

```tsx
<View style={{ width: 18, alignItems: "center" }}>
  {taken ? (
    selected ? (
      <MaterialCommunityIcons name="check-bold" size={16} color={tint} />
    ) : (
      <Ionicons name="checkmark" size={16} color={tint} />
    )
  ) : (
    <Ionicons name={timeIcon(slot.start)} size={16} color={tint} />
  )}
</View>
<Text style={{ color: textColor, fontWeight: textWeight }}>{slot.name}</Text>
```

## 탭 인터랙션 (체크/해제 비대칭)

체크는 이 앱의 핵심 긍정 순간 → 보람있게. 해제는 정정 → 담백하게. 단 "화려"가 아니라 **crisp & rewarding**, 0.5초 이내 절제. 컨페티·사운드 금지(하루에 여러 번 하는 동작).

- **체크**: `Haptics.notificationAsync(Success)` + 오버슈트 팝(spring, 0.9→1 튀며 정착) + 링이 **12시에서 시계방향**으로 한 바퀴 채워지며 완료, 그 안에 체크가 도장처럼.
- **해제**: `Haptics.impactAsync(Light)` + 대칭 딥(0.94→1).

> 링을 시계방향으로 채우려면 SVG 원을 `-90deg` 회전시켜 시작점을 12시로 올린다.

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

  // Ring sweeps in (strokeDashoffset can't use the native driver)
  sweepAnim.setValue(0);
  Animated.timing(sweepAnim, {
    toValue: 1,
    duration: 280,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: false,
  }).start(() => {
    // Flash right as the ring lands
    flashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  });
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
  // No reverse sweep — ring just disappears, quickly
  Animated.timing(sweepAnim, {
    toValue: 0,
    duration: 120,
    easing: Easing.linear,
    useNativeDriver: false,
  }).start();
}
```

SVG 링(원 위에 겹쳐 깔기, `react-native-svg`의 `Circle`을 `Animated.createAnimatedComponent`로 감싼 것):

```tsx
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
// r = (CIRCLE_SIZE - STROKE_WIDTH) / 2, circumference = 2 * Math.PI * r

<Svg
  width={CIRCLE_SIZE}
  height={CIRCLE_SIZE}
  style={StyleSheet.absoluteFill}
  pointerEvents="none"
>
  <AnimatedCircle
    cx={CIRCLE_SIZE / 2}
    cy={CIRCLE_SIZE / 2}
    r={r}
    stroke={greenDark}
    strokeWidth={STROKE_WIDTH}
    fill="none"
    strokeLinecap="round"
    transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
    strokeDasharray={[circumference, circumference]}
    strokeDashoffset={sweepAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [circumference, 0],
    })}
  />
</Svg>;

{
  /* 플래시: 완성 순간 잠깐 밝아짐 */
}
<Animated.View
  pointerEvents="none"
  style={{
    position: "absolute",
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: greenDark,
    opacity: flashAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.35],
    }),
  }}
/>;
```

## 큰 원 (선택된 항목)

- 미복용: 얇은 링 + 모노 알약 심볼(중립색). "탭하여 체크".
- 복용: 초록 링(시계방향으로 채워짐) + 그 안에 **체크**(알약 아님). "됐다"에 집중. 무슨 약인지 맥락은 상단 탭이 이미 준다.

## 캘린더

- 각 날짜를 그날 완료 비율로 칠한다: `0` → 회색 · `<0.5` → 연함 · `<1` → 중간 · `1` → 진함.
- 오늘 칸은 테두리 강조.
- 톤은 "기록·증거". 연속 실패를 부각하는 압박형 연출 금지.
