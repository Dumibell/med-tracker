import Svg, { G, Rect, Line, Path } from "react-native-svg";

type Props = {
  size?: number;
  color: string;
};

export function LogoSymbol({ size = 24, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G
        transform="rotate(-25 50 50)"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Rect x={21} y={39} width={58} height={22} rx={11} strokeWidth={5} />
        <Line x1={50} y1={39} x2={50} y2={61} strokeWidth={5} opacity={0.9} />
        <Path d="M31 50 l4.5 4.5 l9 -10" strokeWidth={4} />
      </G>
    </Svg>
  );
}
