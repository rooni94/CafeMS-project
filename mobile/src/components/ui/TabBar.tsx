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
          paddingBottom: Math.max(insets.bottom, 10),
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
                { flex: isFocused ? 1.08 : 1 },
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
                  <Ionicons name={iconName} size={22} color={isFocused ? "#ffffff" : theme.palette.muted} />
                </View>
                {badge != null && badge !== 0 ? (
                  <View style={[styles.badge, { borderColor: theme.palette.surface, backgroundColor: theme.palette.danger }]}>
                    <Text style={styles.badgeText} numberOfLines={1}>
                      {typeof badge === "number" ? String(badge) : String(badge)}
                    </Text>
                  </View>
                ) : null}
              </View>
              {!isFocused ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    styles.labelInactive,
                    { color: theme.palette.muted },
                  ]}
                >
                  {String(label)}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    paddingTop: 6,
    marginTop: -46,
    left: 0,
    right: 0,
    bottom: 0,
    marginBottom:-33,
    paddingHorizontal: 0,
    paddingVertical: 0,
    margin: 0,
    backgroundColor: "transparent",
  },
  container: {
    flexDirection: "row",
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    elevation: 10,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  tab: {
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 6,
    marginHorizontal: 1,
    minHeight: 46,
  },
  tabActive: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  tabInactive: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
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
    width: 32,
    height: 32,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    width: 32,
    height: 32,
    borderRadius: 13,
  },
  iconWrapInactive: {
    width: 30,
    height: 30,
    borderRadius: 12,
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
    lineHeight: 14,
    flexShrink: 1,
  },
  labelActive: {
    fontSize: 12,
    marginRight: 3,
  },
  labelInactive: {
    fontSize: 11,
    marginTop: 3,
  },
});

export default TabBar;
