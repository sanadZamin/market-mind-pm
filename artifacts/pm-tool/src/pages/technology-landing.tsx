import { Link } from "wouter";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";
import { getSignInPath } from "@/lib/app-entry";
import { Check, Cpu, Network, Newspaper, Share2 } from "lucide-react";

const signInPath = getSignInPath();

function NeuralGlowVisual() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-[#061210] via-[#0a1814] to-[#050807]">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 45%, hsl(var(--primary) / 0.35) 0%, transparent 55%)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-48 w-48 sm:h-56 sm:w-56">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]"
              style={{
                transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-5.5rem)`,
              }}
            />
          ))}
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/30 bg-primary/5 shadow-[0_0_60px_-10px_hsl(var(--primary))]" />
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
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-4 pb-20 pt-12 text-center sm:px-6 sm:pt-16 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
            Neural Engine · Core v4.1
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            The Anatomy of{" "}
            <span className="bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent">
              Financial Intelligence
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#94a3b8] sm:text-lg">
            Beyond traditional algorithmic trading, Market Mind leverages a multi-layered neural architecture to predict
            market volatility and execute with microsecond precision.
          </p>
        </section>

        {/* Bento */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8 md:min-h-[280px]">
              <h2 className="font-display text-xl font-bold text-white sm:text-2xl">Machine Learning (ML)</h2>
              <p className="mt-4 text-sm leading-relaxed text-[#94a3b8] sm:text-base">
                Our supervised learning models ingest 40+ years of historical market cycles, identifying patterns invisible
                to human analysts and surfacing regime shifts before they propagate across venues.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/55">
                  Data ingestion
                </span>
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/55">
                  Pattern recognition
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-lg font-bold text-white sm:text-xl">Predictive Latency</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#94a3b8]">
                Execution is reduced to sub-microsecond latency through co-located inference and adaptive batching
                across our edge mesh.
              </p>
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-white/45">
                  <span>Accuracy</span>
                  <span className="text-primary">94.2%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full w-[94.2%] rounded-full bg-gradient-to-r from-primary to-emerald-400" />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8">
              <h2 className="font-display text-lg font-bold text-white sm:text-xl">Deep Reinforcement Learning (DRL)</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#94a3b8]">
                DRL agents act as autonomous traders within a simulated environment, continuously optimizing policies
                against slippage, fees, and adverse selection.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-6 text-xs">
                <div>
                  <p className="font-semibold uppercase tracking-wider text-white/40">Objective</p>
                  <p className="mt-1 text-white/80">Reward maximization</p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wider text-white/40">Output</p>
                  <p className="mt-1 text-white/80">State-action maps</p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8">
              <h2 className="font-display text-lg font-bold text-white sm:text-xl">Semantic Intelligence</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#94a3b8]">
                Our large language models scan thousands of news outlets, social signals, and SEC filings to quantify
                narrative risk in real time.
              </p>
              <div className="mt-5 flex items-center gap-3 text-white/35">
                <Share2 className="h-4 w-4" aria-hidden />
                <Newspaper className="h-4 w-4" aria-hidden />
                <span className="text-lg font-bold leading-none text-white/25">𝕏</span>
              </div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-primary/90">
                Sentiment analysis engine 3.0
              </p>
            </article>
          </div>
        </section>

        {/* Architecture */}
        <section className="border-y border-white/[0.06] bg-black/20 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-primary">Unified platform architecture</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-center font-display text-2xl font-bold text-white sm:text-3xl">
              The symbiotic relationship between raw data, intelligence, and execution.
            </h2>

            <div className="mt-16 grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
              <div className="flex flex-col gap-4">
                <ArchCard title="Data layer" body="Multi-source high-frequency ticks, order book deltas, and cross-venue liquidity signals normalized to a single stream." />
                <ArchCard title="Semantic layer" body="LLM-driven market news, filings, and alt-data fused into structured features for downstream agents." />
              </div>

              <div className="relative flex justify-center py-4 lg:py-0">
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 hidden h-px w-[120%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/45 to-transparent lg:block"
                  style={{ maxWidth: "min(100vw, 28rem)" }}
                />
                <div className="relative z-[1] flex h-36 w-36 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 shadow-[0_0_48px_-12px_hsl(var(--primary))] sm:h-40 sm:w-40">
                  <Network className="h-14 w-14 text-primary" strokeWidth={1.15} />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <ArchCard title="Decision layer" body="DRL policy evaluation and ensemble scoring before orders leave the neural core." />
                <ArchCard title="Execution layer" body="Smart order routing, dark pool access, and latency-aware venue selection." />
              </div>
            </div>
          </div>
        </section>

        {/* Risk */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <NeuralGlowVisual />
            <div>
              <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                Hyper-Dimensional{" "}
                <span className="bg-gradient-to-r from-primary to-teal-300 bg-clip-text text-transparent">
                  Risk Management
                </span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-[#94a3b8]">
                Every potential trade is stress-tested against 10,000 synthetic market scenarios. Our DRL engine
                doesn&apos;t just look for profit; it solves for survivability in extreme tail-risk events.
              </p>
              <ul className="mt-8 space-y-4">
                {["Auto-hedging protocols", "Real-time slippage optimization"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-medium text-white/90">
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

function ArchCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm">
      <h3 className="text-xs font-bold uppercase tracking-wider text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">{body}</p>
    </div>
  );
}
