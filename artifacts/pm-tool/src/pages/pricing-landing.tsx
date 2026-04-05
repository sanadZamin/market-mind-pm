import { Link } from "wouter";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";
import { getSignInPath } from "@/lib/app-entry";
import { Check } from "lucide-react";

const signInPath = getSignInPath();

const plans = [
  {
    name: "Tactical Base",
    price: "$249",
    period: "/mo",
    features: ["3 AI agents", "24-h depth", "Standard API"],
    cta: "Initialize Basic",
    featured: false,
    primary: false,
  },
  {
    name: "Market Pro",
    price: "$899",
    period: "/mo",
    features: ["10 AI agents", "2-year depth", "High-speed WebSocket API", "Risk modeling", "Sentiment analysis"],
    cta: "Launch Market Pro",
    featured: true,
    primary: true,
  },
  {
    name: "Sovereign Core",
    price: "$4,500",
    period: "/mo",
    features: ["Unlimited AI swarms", "Infinite depth", "Dedicated bare metal node", "Custom model training"],
    cta: "Contact Enterprise",
    featured: false,
    primary: false,
  },
] as const;

const specRows: { cap: string; tactical: string; pro: string; sovereign: string }[] = [
  { cap: "Neural agents", tactical: "3 total", pro: "10 total", sovereign: "Unlimited swarm" },
  { cap: "API latency", tactical: "Standard (17ms)", pro: "Optimized (7ms)", sovereign: "Zero-link (<1ms)" },
  { cap: "Data horizon", tactical: "24 hours", pro: "2 years", sovereign: "Ultradeep archive" },
  { cap: "Neural tuning", tactical: "—", pro: "check", sovereign: "check" },
  { cap: "Compliance suite", tactical: "—", pro: "—", sovereign: "check" },
];

function CommandCenterVisual() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0a1012] via-[#060a0c] to-[#050807]">
      <div className="absolute inset-3 grid grid-cols-2 gap-2 sm:inset-4 sm:gap-3">
        <div className="rounded-lg border border-primary/15 bg-black/40 p-2 shadow-inner shadow-black/60">
          <div className="mb-2 h-1 w-8 rounded-full bg-primary/40" />
          <div className="flex h-16 items-end gap-0.5 px-1 sm:h-20">
            {[40, 65, 35, 80, 55, 90, 48, 72].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-primary/30" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/35 p-2">
          <div className="mb-2 flex gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-400/80" />
            <div className="h-2 w-2 rounded-full bg-white/20" />
          </div>
          <svg viewBox="0 0 120 60" className="h-full w-full text-primary/50" aria-hidden>
            <path
              d="M0 45 Q 30 10 60 30 T 120 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-primary/60"
            />
          </svg>
        </div>
        <div className="col-span-2 rounded-lg border border-white/10 bg-black/30 p-2 sm:p-3">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-2 flex-1 rounded bg-primary/20" />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-6 gap-1">
            {[...Array(18)].map((_, i) => (
              <div key={i} className="aspect-square rounded-sm bg-primary/10" />
            ))}
          </div>
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 70% 30%, hsl(var(--primary) / 0.25), transparent 50%)",
        }}
      />
    </div>
  );
}

function CellValue({ value }: { value: string }) {
  if (value === "check") {
    return (
      <span className="inline-flex justify-center">
        <Check className="h-5 w-5 text-primary" strokeWidth={2.5} />
      </span>
    );
  }
  if (value === "—") {
    return <span className="text-white/25">—</span>;
  }
  return <span>{value}</span>;
}

export default function PricingLanding() {
  return (
    <MarketingLayout>
      <MarketingNav active="pricing" />

      <main className="relative">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 text-center sm:px-6 sm:pt-16 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
            Scalable intelligence
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            The Cost of{" "}
            <span className="bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent">
              Superior Alpha
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#94a3b8] sm:text-lg">
            Choose the neural depth that aligns with your capital requirements. From individual tactical execution to
            institutional-grade swarm intelligence.
          </p>
        </section>

        {/* Pricing cards */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 backdrop-blur-sm sm:p-8 ${
                  plan.featured
                    ? "border-primary/40 bg-white/[0.05] shadow-[0_0_60px_-20px_hsl(var(--primary)/0.45)]"
                    : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/40 bg-[#050807] px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                    Recommended
                  </span>
                )}
                <h2 className="font-display text-lg font-bold text-white">{plan.name}</h2>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-white">{plan.price}</span>
                  <span className="text-sm text-white/45">{plan.period}</span>
                </div>
                <ul className="mt-8 flex flex-1 flex-col gap-3 text-left text-sm text-[#94a3b8]">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {plan.primary ? (
                  <Button
                    asChild
                    className="mt-8 h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
                  >
                    <Link href={signInPath}>{plan.cta}</Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="outline"
                    className="mt-8 h-11 w-full rounded-xl border-white/15 bg-transparent font-semibold text-white hover:bg-white/5"
                  >
                    <Link href={signInPath}>{plan.cta}</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Spec table */}
        <section className="border-y border-white/[0.06] bg-black/25 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center font-display text-2xl font-bold text-white sm:text-3xl">Protocol specifications</h2>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-5 py-4 font-semibold uppercase tracking-wider text-white/45">Capability</th>
                    <th className="px-5 py-4 font-semibold uppercase tracking-wider text-white/45">Tactical</th>
                    <th className="px-5 py-4 font-semibold uppercase tracking-wider text-primary">Pro</th>
                    <th className="px-5 py-4 font-semibold uppercase tracking-wider text-white/45">Sovereign</th>
                  </tr>
                </thead>
                <tbody>
                  {specRows.map((row) => (
                    <tr key={row.cap} className="border-b border-white/[0.05] last:border-0">
                      <td className="px-5 py-4 font-medium text-white/85">{row.cap}</td>
                      <td className="px-5 py-4 text-[#94a3b8]">
                        <CellValue value={row.tactical} />
                      </td>
                      <td className="px-5 py-4 text-[#94a3b8]">
                        <CellValue value={row.pro} />
                      </td>
                      <td className="px-5 py-4 text-[#94a3b8]">
                        <CellValue value={row.sovereign} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                Ready to augment your capital?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-[#94a3b8]">
                Deploy your first neural agent in under five minutes. No credit card required to explore the console —
                upgrade when you&apos;re ready for production throughput.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  className="h-11 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-lg shadow-primary/25"
                >
                  <Link href={signInPath}>Start free trial</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-xl border-white/20 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                >
                  <Link href="/demo">Request live demo</Link>
                </Button>
              </div>
            </div>
            <CommandCenterVisual />
          </div>
        </section>
      </main>

      <MarketingFooter />
    </MarketingLayout>
  );
}
