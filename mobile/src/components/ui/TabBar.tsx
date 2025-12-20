import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "../../theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: "grid-outline",
  Menu: "restaurant-outline",
  Orders: "document-text-outline",
  Support: "chatbubble-ellipses-outline",
  MyHR: "calendar-outline",
  Dashboard: "speedometer-outline",
  Profile: "ellipsis-horizontal-circle-outline",
};

const TabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.outer,
        {
          paddingBottom: Math.max(insets.bottom, 10) + 6,
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.palette.surface,
            borderColor: theme.palette.border,
            shadowColor: "#000",
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = icons[route.name] || "ellipse-outline";

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              style={({ pressed }) => [
                styles.tab,
                {
                  backgroundColor: isFocused ? theme.palette.accent : "transparent",
                  borderColor: isFocused ? `${theme.palette.accent}26` : "transparent",
                },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: isFocused ? "rgba(255,255,255,0.18)" : theme.palette.surfaceAlt,
                    borderColor: isFocused ? "rgba(255,255,255,0.22)" : theme.palette.border,
                  },
                ]}
              >
                <Ionicons name={iconName} size={18} color={isFocused ? "#ffffff" : theme.palette.muted} />
              </View>
              <Text
                numberOfLines={1}
                style={[styles.label, { color: isFocused ? "#ffffff" : theme.palette.muted }]}
              >
                {String(label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 8,
    paddingTop: 6,
    backgroundColor: "transparent",
  },
  container: {
    flexDirection: "row",
    borderRadius: 28,
    padding: 6,
    borderWidth: 1,
    elevation: 10,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  tab: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginHorizontal: 3,
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    writingDirection: "rtl",
  },
});

export default TabBar;
