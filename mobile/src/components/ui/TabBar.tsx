import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "../../theme";
import Ionicons from "@expo/vector-icons/Ionicons";

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: "grid-outline",
  Menu: "restaurant-outline",
  Orders: "document-text-outline",
  Support: "chatbubble-ellipses-outline",
  Dashboard: "speedometer-outline",
  Profile: "ellipsis-horizontal-circle-outline",
};

const TabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.palette.surface }]}>
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
            style={[
              styles.tab,
              isFocused && {
                backgroundColor: theme.palette.accentSoft,
              },
            ]}
          >
            <Ionicons
              name={iconName}
              size={20}
              color={isFocused ? "#f59e0b" : theme.palette.muted}
            />
            <Text
              style={[
                styles.label,
                { color: isFocused ? "#f59e0b" : theme.palette.muted },
              ]}
            >
              {label as string}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginHorizontal: 2,
    marginBottom: 5,
    marginTop: -50,
    borderRadius: 32,
    paddingVertical: 10,
    paddingHorizontal: 1,
    elevation: 5,
  },
  tab: {
    flex: 1,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export default TabBar;
