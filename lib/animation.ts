import type { Transition, Variants } from "framer-motion";

export const draftrEase = [0.16, 1, 0.3, 1] as const;
export const draftrDuration = 0.6;

export const draftrSpring: Transition = {
  type: "spring",
  stiffness: 140,
  damping: 20,
  mass: 0.95,
  restDelta: 0.001,
};

export const draftrGentleSpring: Transition = {
  type: "spring",
  stiffness: 110,
  damping: 18,
  mass: 1.1,
  restDelta: 0.001,
};

export const draftrSnappySpring: Transition = {
  type: "spring",
  stiffness: 180,
  damping: 22,
  mass: 0.85,
  restDelta: 0.001,
};

export const viewportRevealVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: draftrSpring },
  exit: { opacity: 0, transition: draftrGentleSpring },
};

export const panelRevealVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: draftrSpring },
  exit: { opacity: 0, y: 10, transition: draftrGentleSpring },
};

export const shimmerVariants: Variants = {
  idle: {
    opacity: 0,
    rotate: 0,
    scale: 0.995,
  },
  active: {
    opacity: 1,
    rotate: 360,
    scale: 1,
    transition: {
      duration: 6,
      ease: "linear",
      repeat: Infinity,
    },
  },
};
