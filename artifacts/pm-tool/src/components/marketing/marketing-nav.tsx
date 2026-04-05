import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { getSignInPath } from "@/lib/app-entry";
import logoImg from "../../assets/logo.png";
const signInPath = getSignInPath();

type NavActive = "technology" | "pricing";

export function MarketingNav({ active }: { active: NavActive }) {
  const [loc] = useLocation();

  const techActive = active === "technology" || (active !== "pricing" && (loc === "/" || loc === ""));
  const pricingActive = active === "pricing" || loc.startsWith("/pricing");

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050807]/75 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 pb-3 pt-3 sm:px-6 sm:pb-0 sm:pt-0 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4 sm:h-16">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <img src={logoImg} alt="" className="h-9 w-9 rounded-lg shadow-md shadow-primary/20" />
          <span className="font-display text-lg font-bold tracking-tight">Market Mind</span>
        </Link>

        <nav className="hidden sm:flex flex-1 items-center justify-center gap-10 text-sm font-medium text-white/60">
          <Link
            href="/"
            className={`border-b-2 border-transparent pb-0.5 transition-colors hover:text-white ${
              techActive ? "border-primary text-white" : ""
            }`}
          >
            Technology
          </Link>
          <Link
            href="/pricing"
            className={`border-b-2 border-transparent pb-0.5 transition-colors hover:text-white ${
              pricingActive ? "border-primary text-white" : ""
            }`}
          >
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <Link
            href={signInPath}
            className="hidden text-sm font-medium text-white/55 transition-colors hover:text-white sm:inline"
          >
            Log In
          </Link>
          <Button
            asChild
            className="h-10 rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            <Link href={signInPath}>
              <span className="hidden sm:inline">Get Started</span>
              <span className="sm:hidden">Start</span>
            </Link>
          </Button>
        </div>
        </div>

        <nav className="flex justify-center gap-8 border-t border-white/[0.06] pt-3 text-sm font-medium text-white/60 sm:hidden">
          <Link
            href="/"
            className={techActive ? "text-white" : ""}
          >
            Technology
          </Link>
          <Link
            href="/pricing"
            className={pricingActive ? "text-white" : ""}
          >
            Pricing
          </Link>
        </nav>
      </div>
    </header>
  );
}
