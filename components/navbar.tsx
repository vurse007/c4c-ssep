import Link from "next/link";
import { NavbarScroll } from "./navbar-scroll";
import { NavSlideUp } from "./nav-slide-up";

export function Navbar() {
  return (
    <NavbarScroll>
    <header
      className="h-[100px] grid grid-cols-[auto_1fr] gap-4 items-center bg-white border-b border-black/10 px-5 sm:px-10 lg:px-32"
    >
      {/* Left: Logo */}
      <div className="flex items-center justify-start">
        <NavSlideUp delay={0.1}>
          <span className="text-[#0E2554] font-serif font-bold italic text-[32px] tracking-tight">
            SSEP
          </span>
        </NavSlideUp>
      </div>

      {/* Right: Portal */}
      <div className="flex items-center justify-end">
        <NavSlideUp delay={0.25}>
          <Link
            href="/auth/login"
            className="inline-block bg-citadel-blue text-white text-[13px] sm:text-[14px] font-medium tracking-[0.04em] whitespace-nowrap px-4 sm:px-8 py-3 sm:py-4 cursor-pointer transition-colors hover:bg-[#243e7a]"
          >
            Participant Portal Login
          </Link>
        </NavSlideUp>
      </div>
    </header>
    </NavbarScroll>
  );
}
