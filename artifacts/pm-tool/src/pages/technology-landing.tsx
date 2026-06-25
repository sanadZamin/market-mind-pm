import { Link } from "wouter";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";
import { getSignInPath } from "@/lib/app-entry";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  FileText,
  Github,
  Infinity as InfinityIcon,
  Layers,
  LineChart,
  Network,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";

const signInPath = getSignInPath();

const PIPELINE_STAGES = [
  "Data",
  "Intelligence",
  "Alpha",
  "Portfolio",
  "Execution",
  "Risk",
  "Attribution",
  "Learning",
] as const;

const PROBLEM_CARDS = [
  {
    icon: BrainCircuit,
    title: "AI essential to Alpha",
    body: "Traditional quant funds layer AI onto legacy pipelines. The result: quant funds that can't read earnings calls, macro signals, and news in real time, and systematically underperform.",
  },
  {
    icon: Layers,
    title: "Fragmented Platforms",
    body: "No commercial product covers more than 8 of 12 quant lifecycle stages. Data, signals, execution, and learning remain siloed. Top quant and hedge funds will not share their platforms commercially.",
  },
  {
    icon: Users,
    title: "Traditional Managers Underserved",
    body: "Managers running $50M–$500M need institutional-grade alpha, risk, execution & reporting — but can't afford a full quant team and infrastructure to build it.",
  },
] as const;

const SOLUTION_CARDS = [
  {
    badge: "AI",
    icon: Layers,
    title: "Hybrid AI Stack",
    body: "ML for stock ranking · Deep Reinforcement Learning for portfolio allocation · Financial LLMs for language signals · AI agents for orchestration and trading.",
  },
  {
    badge: "12",
    icon: Workflow,
    title: "End-to-end 12-Stage trading system",
    body: "Market environment, regime detection, alpha signals, portfolio construction, trade execution, risk control, performance attribution, strategy iteration.",
  },
  {
    badge: "∞",
    icon: InfinityIcon,
    title: "Continuous Learning Loop forms a flywheel",
    body: "Every trade improves data quality, feature engineering, and signal discovery. Models retrain automatically from live results.",
  },
  {
    badge: "✓",
    icon: BadgeCheck,
    title: "Leading open-source team turns commercial",
    body: "Proven on our own capital via IBKR managed accounts. Every external claim ships with a live track record.",
  },
] as const;

const MOATS = [
  {
    icon: Github,
    title: "Open-Source Team & Ecosystem",
    body: "FinGPT · FinRL · FinRobot: 57K GitHub stars, 200K+ monthly active users — R&D depth job postings can't replicate.",
  },
  {
    icon: Workflow,
    title: "AI-Native Full Loop",
    body: "Only product covering all 12 lifecycle stages. Models are common; the closed loop that learns from every trade is rare.",
  },
  {
    icon: FileText,
    title: "Financial LLM Edge",
    body: "News, filings, earnings calls, macro — all converted to decay-tracked, quantifiable factors via Financial LLMs.",
  },
  {
    icon: LineChart,
    title: "Trading Feedback Data",
    body: "Live trading feedback compounds against the S&P benchmark. As the fund trades, the dataset becomes a moat competitors can't recreate.",
  },
  {
    icon: ShieldCheck,
    title: "Fund-First Validation",
    body: "We prove the platform on our own capital before selling it. No 'platform before proof' — every claim ships with a live track record.",
  },
  {
    icon: Target,
    title: "Traditional Manager Wedge",
    body: "Large funds won't buy an external OS. Mid managers must. We start where build-vs-buy is obvious and price discipline matters.",
  },
] as const;

function SectionEyebrow({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
        {index}
      </span>
      <span className="text-xs font-bold uppercase tracking-[0.28em] text-primary">{label}</span>
    </div>
  );
}

function NeuralGlowVisual() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-white via-emerald-50 to-cyan-50 shadow-xl shadow-primary/10 dark:from-[#061210] dark:via-[#0a1814] dark:to-[#050807]">
      <div
        className="absolute inset-0 opacity-30 dark:opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 45%, hsl(var(--primary) / 0.35) 0%, transparent 55%)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-48 w-48 sm:h-56 sm:w-56">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]"
              style={{
                transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-5.5rem)`,
              }}
              animate={{
                opacity: [0.35, 1, 0.35],
                scale: [0.85, 1.25, 0.85],
                boxShadow: [
                  "0 0 8px hsl(var(--primary) / 0.45)",
                  "0 0 18px hsl(var(--primary) / 0.9)",
                  "0 0 8px hsl(var(--primary) / 0.45)",
                ],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.12,
              }}
            />
          ))}
          <motion.div
            className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/35 bg-background/70 shadow-[0_0_60px_-10px_hsl(var(--primary))] dark:bg-primary/5"
            animate={{
              scale: [1, 1.06, 1],
              boxShadow: [
                "0 0 40px -14px hsl(var(--primary) / 0.45)",
                "0 0 75px -8px hsl(var(--primary) / 0.85)",
                "0 0 40px -14px hsl(var(--primary) / 0.45)",
              ],
            }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <Network className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-primary" strokeWidth={1.25} />
        </div>
      </div>
    </div>
  );
}

export default function TechnologyLanding() {
  return (
    <MarketingLayout>
      <MarketingNav active="technology" />

      <main className="relative">
        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                AI-Native Quant Fund Operating System
              </div>
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
                The Operating System for{" "}
                <span className="font-serif italic font-semibold text-primary">AI-Native Quant Funds</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Founded by the core technical team behind a leading financial open-source community, Market Mind is
                one closed loop covering all 12 stages of the quant lifecycle — from raw data to continuous strategy
                improvement.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-xl bg-primary px-8 font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
                >
                  <Link href={signInPath}>
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <a
                  href="#solution"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-border/70 px-6 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
                >
                  See the platform
                </a>
              </div>

              {/* Lifecycle pipeline */}
              <div className="mt-10 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm font-medium text-muted-foreground">
                {PIPELINE_STAGES.map((stage, i) => (
                  <span key={stage} className="flex items-center gap-1.5">
                    <span className="rounded-md border border-border/60 bg-secondary/50 px-2.5 py-1 text-foreground">
                      {stage}
                    </span>
                    {i < PIPELINE_STAGES.length - 1 && <span className="text-primary">→</span>}
                  </span>
                ))}
              </div>
            </div>

            <NeuralGlowVisual />
          </div>
        </section>

        {/* ── THE PROBLEM ──────────────────────────────────────── */}
        <section className="border-t border-border/70 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionEyebrow index="1" label="The Problem" />
            <h2 className="mx-auto mt-4 max-w-3xl text-center font-display text-2xl font-bold leading-tight text-foreground sm:text-4xl">
              Quant Investing Infrastructure Is Broken in the AI Age
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
              AI has changed the signal universe: news, earnings calls, filings, macro, and flows are now
              machine-readable alpha inputs.
            </p>

            <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {PROBLEM_CARDS.map(({ icon: Icon, title, body }, i) => (
                <article
                  key={title}
                  className="flex flex-col rounded-2xl border border-border/70 bg-card/70 p-6 backdrop-blur-sm sm:p-7"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-display text-2xl font-bold text-primary/30">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-foreground">{title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>

            {/* Market opportunity */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-primary/30 bg-primary/[0.06] p-6 shadow-[0_0_40px_-18px_hsl(var(--primary)/0.45)] sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <p className="font-display text-lg font-bold text-foreground">Market Opportunity</p>
                </div>
                <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Global algorithmic trading is projected to reach{" "}
                    <span className="font-semibold text-primary">$50B+ by 2030</span>.
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Explosive AI adoption in wealth & asset management — today's top quant firms hold only{" "}
                    <span className="font-semibold text-primary">~1%</span> of total AUM.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── OUR SOLUTION ─────────────────────────────────────── */}
        <section id="solution" className="border-y border-border/70 bg-secondary/30 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionEyebrow index="2" label="Our Solution" />
            <h2 className="mx-auto mt-4 max-w-3xl text-center font-display text-2xl font-bold leading-tight text-foreground sm:text-4xl">
              An AI-Native Quant Fund Operating System
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
              One close loop covering all 12 stages of the quant lifecycle, combining a hybrid AI stack with a
              continuous learning flywheel.
            </p>

            <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
              {SOLUTION_CARDS.map(({ badge, icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="flex flex-col rounded-2xl border border-border/70 bg-card/70 p-6 backdrop-blur-sm sm:p-8"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 font-display text-sm font-bold text-primary">
                      {badge}
                    </span>
                    <Icon className="h-5 w-5 text-primary/70" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground sm:text-xl">{title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY WE'RE DIFFERENT ──────────────────────────────── */}
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionEyebrow index="3" label="Why We're Different" />
            <h2 className="mx-auto mt-4 max-w-3xl text-center font-display text-2xl font-bold leading-tight text-foreground sm:text-4xl">
              Six Compounding Moats. The System Is the Moat.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
              No competitor covers all 12 stages. Each moat reinforces the next.
            </p>

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MOATS.map(({ icon: Icon, title, body }, i) => (
                <article
                  key={title}
                  className="flex flex-col rounded-2xl border border-border/70 bg-card/70 p-6 backdrop-blur-sm transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-display text-2xl font-bold text-primary/30">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-base font-bold text-foreground">{title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className="border-t border-border/70 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              Prove it on capital. Then <span className="text-primary">scale it.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              Every claim ships with a live track record. Step into the operating system built for the AI age of
              quant investing.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-9 h-12 rounded-xl bg-primary px-8 font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
            >
              <Link href={signInPath}>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </MarketingLayout>
  );
}
