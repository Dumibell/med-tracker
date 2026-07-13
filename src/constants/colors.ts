export const Colors = {
  light: {
    background: "#FFFFFF",
    surface: "#F8F9FA",
    text: "#1A1A1A",
    textSecondary: "#6B7280",
    border: "#E5E7EB",

    // Green accent ramp (completion/calendar)
    greenLight: "#C0DD97",
    greenMedium: "#97C459",
    greenDark: "#639922",
    greenText: "#FFFFFF", // text on dark green

    // Streak pill (amber/warning)
    amber: "#F59E0B",
    amberLight: "#FEF3C7",
    amberText: "#92400E",

    // Unchecked state
    unchecked: "#E5E7EB",
    uncheckedBorder: "#D1D5DB",
    // Big-circle fill while untaken. Light lifts the circle with a soft shadow
    // (see `circleLift` in main.tsx), so the fill itself stays pure white.
    untakenFill: "#FFFFFF",
  },
  dark: {
    background: "#0F0F0F",
    surface: "#1A1A1A",
    text: "#F9FAFB",
    textSecondary: "#9CA3AF",
    border: "#374151",

    // Green accent ramp
    greenLight: "#3D5A1E",
    greenMedium: "#4D7A23",
    greenDark: "#639922",
    greenText: "#D4EDBC",

    // Streak pill
    amber: "#F59E0B",
    amberLight: "#451A03",
    amberText: "#FDE68A",

    // Unchecked state
    unchecked: "#374151",
    uncheckedBorder: "#4B5563",
    // Shadows read as nothing on a near-black background, so dark lifts the
    // circle by going *lighter* than the background instead.
    untakenFill: "#1A1A1A",
  },
} as const;

export type ColorScheme = keyof typeof Colors;
