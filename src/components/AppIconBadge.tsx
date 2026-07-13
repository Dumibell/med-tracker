import Svg, { G, Rect, Line, Path } from "react-native-svg";

type Props = {
  size?: number;
};

// 런처 앱아이콘(assets/logo-appicon.svg)의 축소판. 방금 눌러서 연 아이콘과
// 헤더가 일치하도록 픽셀 그대로 옮긴다. 테마와 무관하게 항상 같은 브랜드 룩
// (초록 스퀘어 + 흰 캡슐 + 초록 체크)이라 색은 고정한다.
export function AppIconBadge({ size = 26 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect width={100} height={100} rx={22} fill="#6BA43A" />
      <G transform="rotate(-25 50 50)">
        <Rect
          x={14.9}
          y={37.65}
          width={70.2}
          height={24.7}
          rx={12.35}
          fill="#FFFFFF"
        />
        <Line
          x1={50}
          y1={37.65}
          x2={50}
          y2={62.35}
          stroke="#6BA43A"
          strokeWidth={2.34}
          opacity={0.55}
        />
        <Path
          d="M25.95 50 l5.46 5.46 l11.18 -12.35"
          fill="none"
          stroke="#6BA43A"
          strokeWidth={4.16}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}
