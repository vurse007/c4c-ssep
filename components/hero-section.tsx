"use client";

import { motion } from "motion/react";
import { SlideInLeft } from "./slide-in-left";

export function HeroSection() {
  return (
    <section className="relative w-full h-[calc(92vh-100px)] flex justify-end bg-white overflow-visible">
      <div className="relative w-full md:w-[95%] h-full bg-[#0C1829] overflow-hidden">
        <img
          src="/hero-placeholder.svg"
          alt="Hero background"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Title */}
        <div className="absolute top-[44.5%] -translate-y-1/2 left-10 md:left-20 z-20 max-w-4xl">
          <SlideInLeft delay={0.3}>
            <h1 className="text-white font-serif font-bold text-[clamp(40px,6vw,80px)] leading-[1.05] tracking-[-0.02em]">
              Simulated Stress<br />Exposure Program
            </h1>
          </SlideInLeft>
        </div>

        {/* Blue bar — clips in from left, text fades in after */}
        <motion.div
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0% 0 0)" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
          className="absolute bottom-0 left-0 w-[95%] bg-[#1B3468]/50 border-t border-white/25 z-30"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)" }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="px-10 md:px-16 py-8"
          >
            <p className="text-white text-[15px] md:text-[16px] leading-[1.65] font-normal">
              SSEP is an interactive workshop that transforms stress into a learning experience. Students complete cognitive challenges under varying <br/> levels of pressure, learn research-backed coping strategies, and discover how small changes can improve focus and performance.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
