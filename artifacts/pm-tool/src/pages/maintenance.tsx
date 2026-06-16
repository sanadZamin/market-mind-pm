import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import { getSignInPath } from "@/lib/app-entry";
import { useTheme } from "@/hooks/use-theme";

const logoImg = "/logo.png";
const signInPath = getSignInPath();

export default function Maintenance() {
  const { theme, toggle } = useTheme();

  return (
    <MarketingLayout>
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="" className="h-9 w-9 rounded-lg shadow-md shadow-primary/20" />
            <span className="font-display text-lg font-bold tracking-tight">Market Mind</span>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/60 text-muted-foreground transition-colors hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-16 sm:px-6">
        <motion.div
          className="relative w-full max-w-xl text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            Underway
          </div>

          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Something new is{" "}
            <span className="font-serif italic font-semibold text-primary">underway</span>
          </h1>

          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            We&apos;re refreshing the Market Mind experience. The project management workspace remains
            available while we build what&apos;s next.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl bg-primary px-8 font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
            >
              <Link href={signInPath}>
                Open PM Tool
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Already signed in?{" "}
            <Link href="/dashboard" className="font-medium text-primary underline-offset-4 hover:underline">
              Go to dashboard
            </Link>
          </p>
        </motion.div>

        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 dark:opacity-25"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
            filter: "blur(48px)",
          }}
        />
      </main>
    </MarketingLayout>
  );
}
