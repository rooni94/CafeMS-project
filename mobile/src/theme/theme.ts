import {
  configureFonts,
  MD3LightTheme,
  MD3Theme,
} from "react-native-paper";

export type AppRole =
  | "customer"
  | "cashier"
  | "driver"
  | "manager"
  | "hr";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radii = {
  xs: 6,
  sm: 12,
  md: 18,
  lg: 28,
  pill: 999,
};

export const typography = {
  fontFamily: "System",
  weightLight: "300" as const,
  weightRegular: "400" as const,
  weightMedium: "600" as const,
  weightBold: "700" as const,
};

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
};

const basePalette = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceAlt: "#f1f5f9",
  border: "#e2e8f0",
  text: "#111827",
  muted: "#64748b",
  accent: "#f59e0b",
  accentSoft: "#6138A1",
  brandDark: "#0f172a",
  success: "#15803d",
  danger: "#dc2626",
};

const rolePalettes: Record<
  AppRole,
  { primary: string; secondary: string; brandDark?: string }
> = {
  customer: { primary: "#6138A1", secondary: "#f59e0b", brandDark: "#111827" },
  cashier: { primary: "#6138A1", secondary: "#f59e0b", brandDark: "#111827" },
  driver: { primary: "#6138A1", secondary: "#f59e0b", brandDark: "#111827" },
  manager: { primary: "#6138A1", secondary: "#f59e0b", brandDark: "#111827" },
  hr: { primary: "#6138A1", secondary: "#f59e0b", brandDark: "#111827" },
};

const baseStatus = {
  success: "#22c55e",
  warning: "#facc15",
  info: "#0ea5e9",
};

export type RoleTheme = {
  role: AppRole;
  palette: typeof basePalette;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  shadows: typeof shadows;
  status: typeof baseStatus;
  paper: MD3Theme;
};

const baseFont = {
  fontFamily: typography.fontFamily,
  fontSize: 16,
  lineHeight: 22,
  letterSpacing: 0,
  fontWeight: typography.weightRegular,
};

const fontConfig = configureFonts({
  config: {
    default: baseFont,
  },
});

export const createRoleTheme = (role: AppRole = "customer"): RoleTheme => {
  const roleColors = rolePalettes[role];
  const palette = {
    ...basePalette,
    accent: roleColors.primary,
    accentSoft: roleColors.primary,
    brandDark: roleColors.brandDark || basePalette.brandDark,
  };

  const paper: MD3Theme = {
    ...MD3LightTheme,
    version: 3,
    roundness: radii.md,
    colors: {
      ...MD3LightTheme.colors,
      primary: roleColors.primary,
      onPrimary: "#ffffff",
      secondary: roleColors.secondary,
      onSecondary: "#ffffff",
      background: palette.background,
      surface: palette.surface,
      surfaceVariant: "#eceff4",
      outline: "#cbd5f5",
      error: palette.danger,
    },
    fonts: fontConfig,
  };

  return {
    role,
    palette,
    spacing,
    radii,
    typography,
    shadows,
    status: baseStatus,
    paper,
  };
};
