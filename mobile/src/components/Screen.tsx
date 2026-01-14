import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";

type ScreenProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

const Screen: React.FC<ScreenProps> = ({ children, scrollable = true, style, contentContainerStyle }) => {
  const theme = useTheme();
  const { isRTL } = useI18n();
  const direction = isRTL ? "rtl" : "ltr";
  const baseStyle = [
    { flex: 1, backgroundColor: theme.palette.background, direction, writingDirection: direction },
    style,
  ];
  // نضمن الاتساق في الهوامش داخل الـScrollView / SafeAreaView
  const containerDefaults = { paddingHorizontal: 0, paddingVertical: 0, paddingBottom: 0, gap: 0 };

  if (scrollable) {
    return (
      <SafeAreaView style={baseStyle}>
        <ScrollView
          contentContainerStyle={[{ ...containerDefaults, direction, writingDirection: direction }, contentContainerStyle]}
          style={{ flex: 1 }}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[{ flex: 1, ...containerDefaults, direction, writingDirection: direction }, ...baseStyle]}>
      {children}
    </SafeAreaView>
  );
};

export default Screen;
