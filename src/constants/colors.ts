export const Colors = {
  light: {
    background: "#FFFFFF",
    surface: "#F7F7F5",
    text: "#1A1A1A",
    textSecondary: "#6B6E68",
    border: "#E6E7E3",

    // Green accent ramp (completion/calendar)
    greenLight: "#C0DD97",
    greenMedium: "#97C459",
    greenDark: "#639922",
    greenText: "#FFFFFF", // text on dark green

    // Weekend day labels: the Korean calendar habit, toned down
    sunday: "#C4524A",
    saturday: "#4A6FA5",

    // Unchecked state
    unchecked: "#E6E7E3",
    uncheckedBorder: "#D3D5CF",
    // Big-circle fill while untaken. Light lifts the circle with a soft shadow
    // (see `circleLift` in main.tsx), so the fill itself stays pure white.
    untakenFill: "#FFFFFF",
  },
  dark: {
    background: "#0F0F0F",
    surface: "#1A1A1A",
    text: "#F7F7F5",
    textSecondary: "#9A9C97",
    border: "#2E302C",

    // Green accent ramp
    greenLight: "#3D5A1E",
    greenMedium: "#4D7A23",
    greenDark: "#639922",
    greenText: "#D4EDBC",

    // Weekend day labels
    sunday: "#D9766F",
    saturday: "#7B9BCB",

    // Unchecked state
    unchecked: "#2E302C",
    uncheckedBorder: "#4A4D47",
    // Shadows read as nothing on a near-black background, so dark lifts the
    // circle by going *lighter* than the background instead.
    untakenFill: "#1A1A1A",
  },
} as const;

export type ColorScheme = keyof typeof Colors;
