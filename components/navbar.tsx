import Link from "next/link";
import { NavbarScroll } from "./navbar-scroll";
import { NavSlideUp } from "./nav-slide-up";

export function Navbar() {
  return (
    <NavbarScroll>
    <header
      className="h-[100px] grid grid-cols-2 items-center bg-white border-b border-black/10"
      style={{ paddingLeft: '8rem', paddingRight: '8rem' }}
    >
      {/* Left: Logo */}
      <div className="flex items-center justify-start">
        <NavSlideUp delay={0.1}>
          <span className="text-[#0E2554] font-serif font-bold italic text-[32px] tracking-tight">
            SSEP
          </span>
        </NavSlideUp>
      </div>

      {/* Right: Get Started */}
      <div className="flex items-center justify-end">
        <NavSlideUp delay={0.25}>
          <Link
            href="/auth/login"
            className="inline-block bg-citadel-blue text-white text-[14px] font-medium tracking-[0.04em] px-8 py-4 cursor-pointer transition-colors hover:bg-[#243e7a]"
          >
            Get Started
          </Link>
        </NavSlideUp>
      </div>
    </header>
    </NavbarScroll>
  );
}
