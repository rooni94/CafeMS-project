import React from "react";
import { StyleSheet, ViewStyle, StyleProp, ViewProps } from "react-native";
import { Card as PaperCard } from "react-native-paper";

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onLayout?: ViewProps["onLayout"];
};

const Card: React.FC<CardProps> = ({ children, style, contentStyle, onLayout }) => {
  return (
    <PaperCard style={[styles.card, style]} mode="elevated" onLayout={onLayout}>
      <PaperCard.Content style={[styles.content, contentStyle]}>
        {children}
      </PaperCard.Content>
    </PaperCard>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
  },
  content: {
    paddingVertical: 16,
    gap: 12,
  },
});

export default Card;
