"use client";

import { motion } from "framer-motion";
import * as React from "react";

export function HoverCard({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.995 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function HoverButton({ className = "", children, ...props }: React.ComponentPropsWithoutRef<"button">) {
  return (
    <motion.button whileTap={{ scale: 0.985 }} transition={{ duration: 0.12 }} className={className} {...props}>
      {children}
    </motion.button>
  );
}
