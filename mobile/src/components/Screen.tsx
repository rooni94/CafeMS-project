import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../theme";

type ScreenProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

const Screen: React.FC<ScreenProps> = ({ children, scrollable = true, style, contentContainerStyle }) => {
  const theme = useTheme();
  const baseStyle = [{ flex: 1, backgroundColor: theme.palette.background }, style];
  // تقليل الحواف لتكون الشاشة أعرض (مشابهة للوحة التحكم)
  const containerDefaults = { paddingHorizontal: 0, paddingVertical: 0, paddingBottom: 0, gap: 0 };

  if (scrollable) {
    return (
      <SafeAreaView style={baseStyle}>
        <ScrollView contentContainerStyle={[containerDefaults, contentContainerStyle]} style={{ flex: 1 }}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={[{ flex: 1, ...containerDefaults }, ...baseStyle]}>{children}</SafeAreaView>;
};

export default Screen;
