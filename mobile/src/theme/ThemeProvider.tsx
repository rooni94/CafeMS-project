import React, { createContext, useContext, useMemo, useState } from "react";
import { I18nManager } from "react-native";
import { PaperProvider } from "react-native-paper";
import { AppRole, createRoleTheme, RoleTheme } from "./theme";

I18nManager.allowRTL(true);

export type ThemeContextValue = RoleTheme & {
  setRole: (role: AppRole) => void;
};

const defaultTheme = createRoleTheme("customer");

const ThemeContext = createContext<ThemeContextValue>({
  ...defaultTheme,
  setRole: () => {},
});

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialRole?: AppRole;
}> = ({ children, initialRole = "customer" }) => {
  const [role, setRole] = useState<AppRole>(initialRole);
  const theme = useMemo(() => createRoleTheme(role), [role]);

  return (
    <ThemeContext.Provider value={{ ...theme, setRole }}>
      <PaperProvider theme={theme.paper}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  return useContext(ThemeContext);
};
