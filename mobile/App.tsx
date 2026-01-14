import "react-native-gesture-handler";
import "react-native-reanimated";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import { StoreSettingsProvider } from "./src/context/StoreSettingsContext";
import { ThemeProvider } from "./src/theme";
import SupportChatFloating from "./src/components/support/SupportChatFloating";
import { LanguageProvider, useI18n } from "./src/i18n";

const queryClient = new QueryClient();

const AppShell = () => {
  const { isRTL } = useI18n();
  const direction = isRTL ? "rtl" : "ltr";

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <StoreSettingsProvider>
            <AuthProvider>
              <CartProvider>
                <StatusBar style="dark" />
                <GestureHandlerRootView style={{ flex: 1, direction, writingDirection: direction }}>
                  <AppNavigator />
                  <SupportChatFloating />
                </GestureHandlerRootView>
              </CartProvider>
            </AuthProvider>
          </StoreSettingsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  );
}
