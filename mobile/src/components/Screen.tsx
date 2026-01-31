import React from "react";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { ScrollView, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";

type ScreenProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
};

const Screen: React.FC<ScreenProps> = ({ children, scrollable = true, style, contentContainerStyle, edges }) => {
  const theme = useTheme();
  const { isRTL } = useI18n();
  const direction: "rtl" | "ltr" = isRTL ? "rtl" : "ltr";
  const writingDirectionStyle = { writingDirection: direction } as any;
  const baseStyle = [{ flex: 1, backgroundColor: theme.palette.background, direction, ...writingDirectionStyle }, style];
  // نضمن الاتساق في الهوامش داخل الـScrollView / SafeAreaView
  const containerDefaults = { paddingHorizontal: 0, paddingVertical: 0, paddingBottom: 0, gap: 0 };

  if (scrollable) {
    return (
      <SafeAreaView style={baseStyle} edges={edges}>
        <ScrollView
          contentContainerStyle={[{ ...containerDefaults, direction, ...writingDirectionStyle }, contentContainerStyle]}
          style={{ flex: 1 }}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[{ flex: 1, ...containerDefaults, direction, ...writingDirectionStyle }, ...baseStyle]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
};

export default Screen;
