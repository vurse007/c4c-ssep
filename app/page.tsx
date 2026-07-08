import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { FadeIn } from "@/components/fade-in";
import { DrawLine } from "@/components/draw-line";
import { SlideInLeft } from "@/components/slide-in-left";
import Link from "next/link";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-white pt-[100px]">
      <Suspense>
        <Navbar />
      </Suspense>

      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. About SSEP */}
      <section className="w-full bg-white px-10 md:px-20 pt-16 pb-24 mt-40">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-10">
            <FadeIn>
              <span className="text-[#9CA3AF] text-[12px] font-normal tracking-[0.04em] uppercase pt-2 block">
                About SSEP
              </span>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="text-[#111111] text-[22px] md:text-[26px] leading-[1.5] font-light mb-8 max-w-4xl">
                Caring for Caregivers is a student-led nonprofit focused on prevention, resilience, and support for those entering care-centered fields. Our work began with healthcare provider appreciation and has expanded into student programs that address burnout earlier through skill-building and reflection.
              </p>
              <Link
                href="https://www.caring4caregivers.org"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-citadel"
              >
                Learn More
              </Link>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 2b. Stats Row */}
      <section className="w-full bg-white px-10 md:px-20 pt-10 pb-60">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-10">
          <div />
          <div className="flex items-start">
            <DrawLine delay={0} />
            <FadeIn delay={0.15} className="flex-1">
              <span className="block text-[#111111] text-[clamp(40px,5vw,64px)] font-sans font-normal tracking-[-0.02em] leading-none mb-2">
                120<sup className="text-[0.5em] align-super">+</sup>
              </span>
              <p className="text-[#6B7280] text-[13px] leading-[1.5]">
                Healthcare providers<br/>supported
              </p>
            </FadeIn>
            <DrawLine delay={0.35} />
            <FadeIn delay={0.5} className="flex-1">
              <span className="block text-[#111111] text-[clamp(40px,5vw,64px)] font-sans font-normal tracking-[-0.02em] leading-none mb-2">
                <sup className="text-[0.5em] align-super">$</sup>3,000
              </span>
              <p className="text-[#6B7280] text-[13px] leading-[1.5]">
                Raised in<br/>funding
              </p>
            </FadeIn>
            <DrawLine delay={0.7} />
            <FadeIn delay={0.85} className="flex-1">
              <span className="block text-[#111111] text-[clamp(40px,5vw,64px)] font-sans font-normal tracking-[-0.02em] leading-none mb-2">
                200<sup className="text-[0.5em] align-super">+</sup>
              </span>
              <p className="text-[#6B7280] text-[13px] leading-[1.5]">
                Volunteers<br/>engaged
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 3. Program Credibility - Redesigned to match screenshot */}
      <section className="w-full bg-[#0C1829] px-10 md:px-20 pt-52 pb-16">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mb-16">
          <SlideInLeft>
            <h2 className="text-[clamp(36px,4.5vw,52px)] font-serif leading-[1.15] tracking-[-0.02em]">
              <span className="text-white block font-normal">University-backed</span>
              <span className="text-[#4A90D9] block font-normal">Research & Development</span>
            </h2>
          </SlideInLeft>
          <FadeIn delay={0.2}>
            <p className="text-white/80 text-[15px] md:text-[16px] leading-[1.65] mb-8 max-w-lg">
              Built with a partner neuroscience club and supported by the EmRes Program Network. Our program is connected with mentor and research links to UCLA, Stanford, and UCSF.
            </p>
          </FadeIn>
        </div>

        {/* University Logos */}
        <div className="max-w-[1440px] mx-auto pt-24 pb-[120px]">
          <div className="flex flex-wrap items-center justify-center gap-24">
            <FadeIn delay={0} className="flex items-center justify-center">
              <img src="/ucla.svg" alt="UCLA" className="h-[140px] w-auto opacity-100" />
            </FadeIn>
            <FadeIn delay={0.2} className="flex items-center justify-center">
              <img src="/stanford.svg" alt="Stanford" className="h-[180px] w-auto opacity-100" />
            </FadeIn>
            <FadeIn delay={0.4} className="flex items-center justify-center">
              <img src="/ucsf.png" alt="UCSF" className="h-[170px] w-auto opacity-100" />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#07080D] px-10 md:px-20 pt-20 pb-12">
        <div className="max-w-[1440px] mx-auto">
          {/* Logo Row */}
          <div className="flex items-center justify-between mb-12">
            <span className="text-white font-serif font-bold italic text-[24px] tracking-tight">
              SSEP
            </span>
            <div className="flex flex-col items-end gap-3">
              <Link
                href="/auth/login"
                className="text-white/60 text-[13px] hover:text-white hover:underline transition-colors"
              >
                Portal
              </Link>
              <Link
                href="https://www.caring4caregivers.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 text-[13px] hover:text-white hover:underline transition-colors"
              >
                About Caring for Caregivers
              </Link>
            </div>
          </div>

          <hr className="border-t border-white/10 mb-12" />

          {/* Copyright Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
            </div>
            <p className="text-white/40 text-[12px]">
              Copyright © 2026 Caring for Caregivers. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
