import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { Category } from "../types";
import { useTheme } from "../theme";

type CategoryPillProps = {
  category: Category;
  isActive: boolean;
  onPress: () => void;
};

const CategoryPill: React.FC<CategoryPillProps> = ({
  category,
  isActive,
  onPress,
}) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: isActive
            ? theme.palette.accent
            : theme.palette.surfaceAlt,
          borderColor: isActive
            ? theme.palette.accent
            : theme.palette.border,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: isActive ? "#fff" : theme.palette.brandDark },
        ]}
      >
        {category.name}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginEnd: 8,
    marginBottom: 8,
    flexDirection: "row",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export default CategoryPill;
