import { Link } from "wouter";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSignInPath } from "@/lib/app-entry";
import { useTheme } from "@/hooks/use-theme";
const logoImg = "/logo.png";

const signInPath = getSignInPath();

export type MarketingNavActive = "technology" | "pricing" | "resources";

function navLinkClass(active: boolean) {
  return `border-b-2 border-transparent pb-0.5 transition-colors hover:text-foreground ${
    active ? "border-primary text-foreground" : ""
  }`;
}

export function MarketingNav({ active }: { active: MarketingNavActive }) {
  const { theme, toggle } = useTheme();
  const techActive = active === "technology";
  const pricingActive = active === "pricing";
  const resourcesActive = active === "resources";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 pb-3 pt-3 sm:px-6 sm:pb-0 sm:pt-0 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4 sm:h-16">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img src={logoImg} alt="" className="h-9 w-9 rounded-lg shadow-md shadow-primary/20" />
            <span className="font-display text-lg font-bold tracking-tight">Market Mind</span>
          </Link>

          <nav className="hidden md:flex flex-1 items-center justify-center gap-8 text-sm font-medium text-muted-foreground lg:gap-10">
            <Link href="/" className={navLinkClass(techActive)}>
              Technology
            </Link>
            <Link href="/pricing" className={navLinkClass(pricingActive)}>
              Pricing
            </Link>
            <Link href="/resources" className={navLinkClass(resourcesActive)}>
              Resources
            </Link>
          </nav>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/60 text-muted-foreground transition-colors hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              href={signInPath}
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
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

        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-border/60 pt-3 text-sm font-medium text-muted-foreground md:hidden">
          <Link href="/" className={techActive ? "text-foreground" : ""}>
            Technology
          </Link>
          <Link href="/pricing" className={pricingActive ? "text-foreground" : ""}>
            Pricing
          </Link>
          <Link href="/resources" className={resourcesActive ? "text-foreground" : ""}>
            Resources
          </Link>
          <Link href={signInPath} className="text-muted-foreground">
            Log In
          </Link>
        </nav>
      </div>
    </header>
  );
}
