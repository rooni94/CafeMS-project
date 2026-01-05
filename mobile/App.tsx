import "react-native-gesture-handler";
import "react-native-reanimated";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nManager, View } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import { StoreSettingsProvider } from "./src/context/StoreSettingsContext";
import { ThemeProvider } from "./src/theme";
import SupportChatFloating from "./src/components/support/SupportChatFloating";

const queryClient = new QueryClient();

export default function App() {
  const direction = I18nManager.isRTL ? "rtl" : "ltr";

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <StoreSettingsProvider>
            <AuthProvider>
              <CartProvider>
                <StatusBar style="dark" />
                <View style={{ flex: 1, direction, writingDirection: direction }}>
                  <AppNavigator />
                  <SupportChatFloating />
                </View>
              </CartProvider>
            </AuthProvider>
          </StoreSettingsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
