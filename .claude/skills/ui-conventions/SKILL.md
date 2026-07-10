---
name: ui-conventions
description: 먹었다 앱의 UI를 만들거나 수정할 때 적용하는 시각 규칙. 색 토큰, 로고 사용법, 슬롯 네비게이터(점 인디케이터+스와이프, 먹음=초록 채움 / 현재=크기+중립 링의 두 축), 슬롯 이름 타이틀, 탭 인터랙션(체크/해제 비대칭), 캘린더 색 표현, 시간대 아이콘. 컴포넌트·스타일·애니메이션·아이콘 작업 시 참고.
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

## 슬롯 네비게이터 (점 인디케이터 + 스와이프)

화면의 주인공은 **큰 원 하나**다. "지금 이 약 먹었나?"에 켜자마자 답이 보여야 하므로, 여러 슬롯을 나열하는 상단 탭 바를 두지 않는다. 대신:

- 켜면 `pickActiveSlot`이 고른 **지금 시간대 슬롯**이 큰 원에 뜬다.
- **어느 슬롯인지**는 큰 원 바로 위 **슬롯 이름 타이틀**이 준다(예: "점심", `fontSize 18 / 600`). 탭 바가 주던 맥락을 이게 대신한다.
- **오늘 다른 시간대**로 이동은 원을 **가로 스와이프**하거나, 원 아래 **점을 탭**. 점 줄은 곧 오늘의 진행 바를 겸한다.

### 점 인디케이터 — 두 축을 절대 하나로 묶지 않는다

상단 토글과 동일한 핵심 규칙이 점에도 그대로 적용된다. **먹음**과 **현재 위치**는 서로 다른 시각 속성으로 표현한다.

- **먹음 축 = 초록 채움.** `taken`이면 `greenDark`로 꽉 채운다(+같은 초록 보더). 아니면 투명 + 옅은 중립 보더(`colors.border`).
- **현재 축 = 크기 + 중립 링.** 현재 슬롯은 지름을 키우고(`9→12`) 보더를 중립색(`colors.uncheckedBorder`)으로. **절대 색(초록)으로 현재를 표시하지 않는다** — 초록을 현재에 쓰면 "먹음+현재"가 "먹음+비현재"와 구분되지 않는다(상단 토글에서 겪었던 문제와 동형).
- 이렇게 채움=먹음 / 크기·링=현재로 분리하면 네 조합(먹음·현재)이 자동으로 구분된다.
- 슬롯이 하나뿐이면 점 줄 자체를 숨긴다(`sortedSlots.length > 1`).

```tsx
const taken = isSlotCompleted(slot.id);
const isCurrent = i === currentIndex;

<View
  style={[
    styles.dot, // width/height 9, borderRadius 4.5, borderWidth 1.5
    {
      backgroundColor: taken ? colors.greenDark : "transparent", // 먹음 축: 채움
      borderColor: taken ? colors.greenDark : colors.border,
    },
    isCurrent && [
      styles.dotCurrent, // width/height 12, borderRadius 6
      { borderColor: colors.uncheckedBorder }, // 현재 축: 크기 + 중립 링
    ],
  ]}
/>;
```

- 점은 시간순(`sortSlotsByTime`). 탭하면 `selectByIndex(i)`로 그 슬롯을 큰 원에 올린다. `hitSlop`으로 탭 영역을 넉넉히.

### 스와이프 (원을 넘겨 시간대 이동)

새 의존성 없이 RN 내장 `PanResponder`로 처리. **가로 드래그가 명확할 때만** 제스처를 잡아, 원의 탭(체크/해제)과 세로 스크롤은 그대로 통과시킨다. 양 끝에서 멈춘다(wrap 안 함).

```tsx
// swipeState 를 ref로 두어, 한 번 만든 PanResponder가 항상 최신 인덱스 기준으로 이동.
onMoveShouldSetPanResponder: (_, g) =>
  Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
onPanResponderRelease: (_, g) => {
  const { currentIndex, selectByIndex } = swipeState.current;
  if (g.dx < -40) selectByIndex(currentIndex + 1); // 다음(늦은 시각)
  else if (g.dx > 40) selectByIndex(currentIndex - 1); // 이전
},
```

`panResponder.panHandlers`는 큰 원 래퍼 `View`에 스프레드한다.

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

- 미복용: 얇은 링 + 모노 알약 심볼(중립색). 원 아래 "탭하여 체크".
- 복용: 초록 링(시계방향으로 채워짐) + 그 안에 **체크(초록) + 먹은 시각("오후 3:00에 먹음") + 상대시간("2시간 전")**을 세로로 쌓는다. 이 앱은 "언제 먹었나"를 확인시켜주는 게 핵심이므로, 그 정보를 화면 밖 라벨이 아니라 **시선이 가는 원 안**에 둔다. 무슨 약인지 맥락은 원 위 슬롯 이름 타이틀이 준다.
- 원 아래 라벨은 상호작용 힌트만 담는다: 복용 시 "다시 탭하면 취소", 미복용 시 "탭하여 체크". **라벨/링크 영역은 고정 높이**(`circleFooter`, `64`)라 복용 여부로 원이 위아래로 밀리지 않는다.

## 캘린더

- 각 날짜를 그날 완료 비율로 칠한다: `0` → 회색 · `<0.5` → 연함 · `<1` → 중간 · `1` → 진함.
- 오늘 칸은 테두리 강조.
- 톤은 "기록·증거". 연속 실패를 부각하는 압박형 연출 금지.
