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
          const badge = options.tabBarBadge;

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

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const iconName = icons[route.name] || "ellipse-outline";

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              style={({ pressed }) => [
                styles.tab,
                isFocused ? styles.tabActive : styles.tabInactive,
                {
                  backgroundColor: isFocused ? theme.palette.accent : "transparent",
                  borderColor: isFocused ? `${theme.palette.accent}26` : "transparent",
                },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.iconSlot}>
                <View
                  style={[
                    styles.iconWrap,
                    isFocused ? styles.iconWrapActive : styles.iconWrapInactive,
                    {
                      backgroundColor: isFocused ? "rgba(255,255,255,0.18)" : theme.palette.surfaceAlt,
                      borderColor: isFocused ? "rgba(255,255,255,0.22)" : theme.palette.border,
                    },
                  ]}
                >
                  <Ionicons name={iconName} size={18} color={isFocused ? "#ffffff" : theme.palette.muted} />
                </View>
                {badge != null && badge !== 0 ? (
                  <View style={[styles.badge, { borderColor: theme.palette.surface, backgroundColor: theme.palette.danger }]}>
                    <Text style={styles.badgeText} numberOfLines={1}>
                      {typeof badge === "number" ? String(badge) : String(badge)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={2}
                style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive, { color: isFocused ? "#ffffff" : theme.palette.muted }]}
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
    paddingVertical: 10,
    marginHorizontal: 3,
    minHeight: 52,
  },
  tabActive: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  tabInactive: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  iconSlot: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    width: 34,
    height: 34,
    borderRadius: 14,
  },
  iconWrapInactive: {
    width: 32,
    height: 32,
    borderRadius: 13,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 14,
    flexShrink: 1,
  },
  labelActive: {
    fontSize: 12,
    marginRight: 8,
  },
  labelInactive: {
    fontSize: 11,
    marginTop: 4,
  },
});

export default TabBar;
