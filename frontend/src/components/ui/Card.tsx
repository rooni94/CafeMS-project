// src/components/ui/Card.tsx
import React from "react";
import { motion } from "framer-motion";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <motion.div
    whileHover={{ scale: 1.02, translateY: -2 }}
    className={`bg-white rounded-2xl shadow-md p-4 ${className}`}
  >
    {children}
  </motion.div>
);
