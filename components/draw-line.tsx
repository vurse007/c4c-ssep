"use client";

import { motion } from "motion/react";

export function DrawLine({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ scaleY: 0 }}
      whileInView={{ scaleY: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay }}
      style={{ transformOrigin: "top" }}
      className="w-px bg-black/10 self-stretch mx-8"
    />
  );
}
