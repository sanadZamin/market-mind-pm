import { Link } from "wouter";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";
import { getSignInPath } from "@/lib/app-entry";
import { Check } from "lucide-react";

const signInPath = getSignInPath();

type PlanFeature = { label: string; included: boolean };

const plans: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  cta: string;
  featured: boolean;
  primary: boolean;
}[] = [
  {
    name: "Tactical Base",
    price: "$249",
    period: "/mo",
    description: "Precision tools for the individual quantitative trader.",
    features: [
      { label: "3 AI deployment agents", included: true },
      { label: "24h historical depth", included: true },
      { label: "Standard API access", included: true },
      { label: "Advanced risk modeling", included: false },
    ],
    cta: "Initialize Basic",
    featured: false,
    primary: false,
  },
  {
    name: "Market Pro",
    price: "$899",
    period: "/mo",
    description: "High-frequency neural processing for serious capital allocation.",
    features: [
      { label: "15 AI deployment agents", included: true },
      { label: "2-year historical depth", included: true },
      { label: "High-speed WebSocket API", included: true },
      { label: "Advanced risk modeling", included: true },
      { label: "Neural sentiment analysis", included: true },
    ],
    cta: "Launch Market Pro",
    featured: true,
    primary: true,
  },
  {
    name: "Sovereign Core",
    price: "$4,500",
    period: "/mo",
    description: "The full power of Market Mind for desks and institutions.",
    features: [
      { label: "Unlimited AI swarms", included: true },
      { label: "Infinite historical depth", included: true },
      { label: "Dedicated bare-metal node", included: true },
      { label: "Custom model training", included: true },
    ],
    cta: "Contact Enterprise",
    featured: false,
    primary: false,
  },
];

const specRows: { cap: string; starter: string; pro: string; sovereign: string }[] = [
  { cap: "Neural agents", starter: "3 total", pro: "15 total", sovereign: "Unlimited swarm" },
  { cap: "API latency", starter: "Standard (50ms)", pro: "Optimized (8ms)", sovereign: "Zero-link (<1ms)" },
  { cap: "Data horizon", starter: "24 hours", pro: "2 years", sovereign: "Genesis archive" },
  { cap: "Neural tuning", starter: "—", pro: "check", sovereign: "check" },
  { cap: "Compliance suite", starter: "—", pro: "—", sovereign: "check" },
];

function CommandCenterVisual() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-white via-emerald-50 to-sky-50 shadow-xl shadow-primary/10 dark:border-white/[0.08] dark:from-[#0a1012] dark:via-[#060a0c] dark:to-[#050807]">
      <div className="absolute inset-3 grid grid-cols-2 gap-2 sm:inset-4 sm:gap-3">
        <div className="rounded-lg border border-primary/20 bg-white/75 p-2 shadow-inner shadow-primary/10 dark:bg-black/40 dark:shadow-black/60">
          <div className="mb-2 h-1 w-8 rounded-full bg-primary/40" />
          <div className="flex h-16 items-end gap-0.5 px-1 sm:h-20">
            {[40, 65, 35, 80, 55, 90, 48, 72].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-primary/30" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border/70 bg-white/70 p-2 dark:border-white/10 dark:bg-black/35">
          <div className="mb-2 flex gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-400/80" />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/25 dark:bg-white/20" />
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
        <div className="col-span-2 rounded-lg border border-border/70 bg-white/65 p-2 sm:p-3 dark:border-white/10 dark:bg-black/30">
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
        className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-30"
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
    return <span className="text-muted-foreground/50">—</span>;
  }
  return <span>{value}</span>;
}

function FeatureRow({ feature }: { feature: PlanFeature }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      {feature.included ? (
        <>
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
          <span className="text-muted-foreground">{feature.label}</span>
        </>
      ) : (
        <>
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border/70 bg-secondary/50" />
          <span className="text-muted-foreground/60 line-through decoration-muted-foreground/30">{feature.label}</span>
        </>
      )}
    </li>
  );
}

export default function PricingLanding() {
  return (
    <MarketingLayout>
      <MarketingNav active="technology" />

      <main className="relative">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 text-center sm:px-6 sm:pt-16 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
            Scalable intelligence
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
            The Cost of{" "}
            <span className="bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent">
              Superior Alpha
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Choose the neural depth that aligns with your capital requirements. From individual tactical execution to
            institutional-grade swarm intelligence.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3 lg:gap-5">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 backdrop-blur-sm sm:p-8 ${
                  plan.featured
                    ? "border-primary/45 bg-card/80 shadow-[0_0_60px_-20px_hsl(var(--primary)/0.45)] lg:-my-2 lg:scale-[1.02] lg:px-7 lg:py-10"
                    : "border-border/70 bg-card/70"
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/40 bg-background px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                    Recommended
                  </span>
                )}
                <h2 className="font-display text-lg font-bold uppercase tracking-wide text-foreground">{plan.name}</h2>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="mt-3 text-left text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
                <ul className="mt-8 flex flex-1 flex-col gap-3 text-left">
                  {plan.features.map((f) => (
                    <FeatureRow key={f.label} feature={f} />
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
                    className="mt-8 h-11 w-full rounded-xl border-border/70 bg-transparent font-semibold text-foreground hover:bg-secondary/60"
                  >
                    <Link href={signInPath}>{plan.cta}</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border/70 bg-secondary/30 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center font-display text-2xl font-bold text-foreground sm:text-3xl">
              Protocol specifications
            </h2>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border/70">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Capability</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Starter</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-primary">Pro</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sovereign</th>
                  </tr>
                </thead>
                <tbody>
                  {specRows.map((row) => (
                    <tr key={row.cap} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-4 font-medium text-foreground">{row.cap}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <CellValue value={row.starter} />
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <CellValue value={row.pro} />
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <CellValue value={row.sovereign} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                Ready to augment your capital?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                Deploy your first neural agent in under five minutes. No credit card required for initial tactical testing.
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
                  className="h-11 rounded-xl border-border/70 bg-secondary/50 text-foreground hover:bg-secondary"
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
