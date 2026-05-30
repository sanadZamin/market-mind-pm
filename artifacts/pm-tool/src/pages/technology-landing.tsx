import { Link } from "wouter";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";
import { getSignInPath } from "@/lib/app-entry";
import { motion } from "framer-motion";
import {
  Check,
  Database,
  Network,
  Newspaper,
  Search,
  Share2,
  Zap,
} from "lucide-react";

const signInPath = getSignInPath();

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
        <section className="mx-auto max-w-4xl px-4 pb-20 pt-12 text-center sm:px-6 sm:pt-16 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
            Engine: Neural Core v2.0
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
            The Anatomy of{" "}
            <span className="font-serif italic font-semibold text-primary">Financial Intelligence</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Market Mind is an AI-native quantitative investment platform that spans the full workflow from data-driven
            strategy generation to execution. Built by the AI4Finance community, it combines machine learning,
            reinforcement learning, and financial LLMs to deliver real-time market intelligence and institutional-grade
            tooling.
          </p>
        </section>

        {/* Bento */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-border/70 bg-card/70 p-6 backdrop-blur-sm sm:p-8 md:min-h-[300px]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Core capability</p>
              <h2 className="mt-2 font-display text-xl font-bold text-foreground sm:text-2xl">Machine Learning (ML)</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Our supervised learning models ingest 40+ years of historical market cycles, identifying patterns invisible
                to human analysts and surfacing regime shifts before they propagate across venues.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-secondary/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Database className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Data ingestion
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-secondary/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Search className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Pattern recognition
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card/70 p-6 backdrop-blur-sm sm:p-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">Predictive Latency</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Execution pipelines are tuned for sub-8ms end-to-end lag with deterministic scheduling across our
                inference mesh.
              </p>
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Performance</span>
                  <span className="text-primary">94.2%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-[94.2%] rounded-full bg-gradient-to-r from-primary to-emerald-400" />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card/70 p-6 backdrop-blur-sm sm:p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/90">Strategic execution</p>
              <h2 className="mt-2 font-display text-lg font-bold text-foreground sm:text-xl">Deep Reinforcement Learning (DRL)</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                DRL agents act as autonomous traders within high-fidelity simulators, continuously optimizing policies for
                alpha generation under realistic microstructure.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/70 bg-secondary/50 px-3 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Policy gradient</p>
                  <p className="mt-1 text-xs font-medium text-foreground">Reward maximization</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-secondary/50 px-3 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Q-learning</p>
                  <p className="mt-1 text-xs font-medium text-foreground">State-action maps</p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card/70 p-6 backdrop-blur-sm sm:p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/90">Cognitive processing</p>
              <h2 className="mt-2 font-display text-lg font-bold text-foreground sm:text-xl">Semantic Intelligence</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Our large language models scan thousands of news outlets, social signals, and SEC filings to produce
                structured sentiment scores and event graphs.
              </p>
              <div className="mt-5 flex items-center gap-3 text-muted-foreground/70">
                <Newspaper className="h-4 w-4" aria-hidden />
                <Share2 className="h-4 w-4" aria-hidden />
                <span className="text-lg font-bold leading-none text-muted-foreground/60">𝕏</span>
              </div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-primary/90">
                Cross-signal correlation
              </p>
            </article>
          </div>
        </section>

        {/* Five-layer architecture */}
        <section className="border-y border-border/70 bg-secondary/30 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-primary">
              Unified platform architecture
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl text-center font-display text-2xl font-bold text-foreground sm:text-3xl">
              The symbiotic relationship between raw data, intelligence, and execution.
            </h2>

            <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <PipelineCard
                title="Data source layer"
                body="Real-time market ticks, depth-of-book updates, and institutional news wires normalized into a single chronological stream."
              />
              <PipelineCard
                title="Data engineering layer"
                body="Sentiment scoring, feature stores, and vector indexes prepared for low-latency retrieval by strategy agents."
              />
              <PipelineCard
                title="Financial LLMs"
                body="FinGPT, FinMA, and FinML variants specialized for filings, transcripts, and macro commentary — with guardrailed tool use."
                highlight
                tags={["FinGPT", "FinMA", "FinML"]}
              />
              <PipelineCard
                title="Task layer"
                body="Market forecasting jobs, automated research memos, and compliance summaries orchestrated as durable agent workflows."
              />
              <PipelineCard
                title="Foundation models"
                body="Llama 2, Claude 3, and Gemini adapters with strict tenancy isolation and encrypted weight caches."
                tags={["Llama 2", "Claude 3", "Gemini"]}
                className="sm:col-span-2 lg:col-span-1"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <NeuralGlowVisual />
            <div>
              <h2 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                Hyper-Dimensional <span className="text-primary">Risk Management</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                Every potential trade is stress-tested against 10,000 synthetic market scenarios. Our DRL engine
                doesn&apos;t just look for profit; it solves for survivability in extreme tail-risk events.
              </p>
              <ul className="mt-8 space-y-4">
                {["Auto-Hedging Protocols", "Real-Time Slippage Optimization"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-4 w-4 text-primary" strokeWidth={2.5} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-10 h-11 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-lg shadow-primary/20"
              >
                <Link href={signInPath}>Get Started</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </MarketingLayout>
  );
}

function PipelineCard({
  title,
  body,
  highlight,
  tags,
  className = "",
}: {
  title: string;
  body: string;
  highlight?: boolean;
  tags?: string[];
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border bg-card/70 p-5 backdrop-blur-sm ${highlight ? "border-primary/45 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.35)]" : "border-border/70"} ${className}`}
    >
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      {tags && tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded border border-border/70 bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
