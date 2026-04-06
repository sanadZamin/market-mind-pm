import { Link } from "wouter";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExternalLink, Search, Terminal, Users } from "lucide-react";
import { useState } from "react";

const faqItems = [
  {
    q: "How do I authenticate my AI agent via the API?",
    a: "Create a project-scoped API key in the console, then pass it as a Bearer token on every request. Agent runtimes inherit the same credentials through the injected secret store.",
  },
  {
    q: "What are the rate limits for the WebSocket feed?",
    a: "Starter streams are capped at 50 messages per second per connection; Pro and Sovereign tiers get burstable limits with dedicated partitions on the ingress mesh.",
  },
  {
    q: "Is there a sandbox environment for backtesting?",
    a: "Yes — every workspace includes a paper-trading sandbox with replayable historical tape and shock scenarios without live capital.",
  },
  {
    q: "Can I deploy my own LLM for sentiment processing?",
    a: "Sovereign Core supports customer-managed inference endpoints via VPC peering. Pro tier can attach approved third-party models through our adapter SDK.",
  },
];

const avatars = ["AR", "MK", "JL", "SV"];

export default function ResourcesLanding() {
  const [email, setEmail] = useState("");

  return (
    <MarketingLayout>
      <MarketingNav active="resources" />

      <main className="relative">
        <section className="mx-auto max-w-4xl px-4 pb-12 pt-12 text-center sm:px-6 sm:pt-16 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Support ecosystem</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            How can we assist your <span className="text-primary">Intelligence</span>?
          </h1>
          <div className="relative mx-auto mt-10 max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" aria-hidden />
            <Input
              type="search"
              placeholder="Search documentation, APIs, or community threads..."
              className="h-12 rounded-2xl border-white/12 bg-white/[0.05] pl-12 text-white placeholder:text-white/35 focus-visible:border-primary/50 focus-visible:ring-primary/20"
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <article className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8 lg:col-span-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Developer hub</p>
              <h2 className="mt-2 max-w-md font-display text-2xl font-bold text-white">AI agent framework &amp; API</h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-[#94a3b8]">
                Complete documentation for deploying autonomous trading agents using the Market Mind protocol. SDKs are
                available for Python, Rust, and TypeScript.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-8 h-10 rounded-xl border-white/15 bg-black/30 text-white hover:bg-white/5"
              >
                <a href="#">
                  View docs <span aria-hidden>→</span>
                </a>
              </Button>
              <div className="pointer-events-none absolute -right-8 bottom-0 top-8 hidden w-[45%] opacity-40 md:block">
                <svg viewBox="0 0 200 120" className="h-full w-full text-primary" aria-hidden>
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    d="M0 90 Q 50 20 100 60 T 200 40"
                    opacity="0.5"
                  />
                  <path fill="none" stroke="currentColor" strokeWidth="0.8" d="M0 70 Q 60 100 120 50 T 200 65" opacity="0.35" />
                </svg>
              </div>
            </article>

            <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8 lg:col-span-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h2 className="mt-4 font-display text-lg font-bold text-white">Community port</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
                Join 50,000+ quantitative traders and developers sharing strategies and custom modules.
              </p>
              <a
                href="#"
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary hover:underline"
                onClick={(e) => e.preventDefault()}
              >
                Explore forum
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </article>

            <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8 lg:col-span-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Terminal className="h-5 w-5 text-primary" />
              </div>
              <h2 className="mt-4 font-display text-lg font-bold text-white">Open source</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
                Contribute to our core liquidity engine and sentiment analysis libraries on GitHub.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 border-t border-white/[0.06] pt-5 text-xs text-white/45">
                <span>
                  <span className="font-semibold text-white/70">v2.4.1</span> Stable
                </span>
                <span>
                  <span className="font-semibold text-white/70">134</span> contributors
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8 lg:col-span-7">
              <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Contributor spotlight</p>
                  <h2 className="mt-2 font-display text-xl font-bold text-white">Community strategies</h2>
                  <p className="mt-4 text-sm leading-relaxed text-[#94a3b8]">
                    Browse battle-tested playbooks, notebooks, and deployment recipes contributed by core members and desk
                    partners.
                  </p>
                  <Button asChild className="mt-6 h-10 rounded-xl bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/20">
                    <Link href="/demo">Browse library</Link>
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-end">
                  {avatars.map((ini) => (
                    <div
                      key={ini}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-primary/25 to-white/5 text-xs font-bold text-white"
                    >
                      {ini}
                    </div>
                  ))}
                  <div className="flex h-12 min-w-[3.5rem] items-center justify-center rounded-full border border-primary/30 bg-primary/15 px-3 text-xs font-bold text-primary">
                    +12k
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-2xl font-bold text-white sm:text-3xl">Technical intelligence base</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[#94a3b8]">
            Instant answers to the most common technical and trading inquiries.
          </p>
          <Accordion type="single" collapsible className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-2 sm:px-4">
            {faqItems.map((item, i) => (
              <AccordionItem key={item.q} value={`item-${i}`} className="border-white/[0.06] px-3">
                <AccordionTrigger className="py-5 text-left text-white hover:no-underline [&>svg]:text-primary">
                  <span className="flex gap-4">
                    <span className="w-8 shrink-0 font-mono text-sm text-primary/80">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium">{item.q}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5 pl-12 text-[#94a3b8]">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-white/50">Didn&apos;t find what you were looking for?</p>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-xl border-primary/35 bg-primary/10 font-semibold uppercase tracking-wider text-primary hover:bg-primary/15"
            >
              <a href="#" onClick={(e) => e.preventDefault()}>
                Contact core support
              </a>
            </Button>
          </div>
        </section>

        <section className="relative overflow-hidden border-y border-primary/20 bg-primary py-12 text-primary-foreground">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `repeating-linear-gradient(-18deg, transparent, transparent 12px, currentColor 12px, currentColor 13px)`,
            }}
          />
          <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div className="max-w-lg">
              <h2 className="font-display text-2xl font-bold text-primary-foreground">Neural intelligence updates</h2>
              <p className="mt-2 text-sm leading-relaxed text-primary-foreground/85">
                Stay informed on API changes, new trading modules, and community events.
              </p>
            </div>
            <form
              className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center"
              onSubmit={(e) => {
                e.preventDefault();
                setEmail("");
              }}
            >
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@desk.com"
                className="h-11 flex-1 rounded-xl border-black/10 bg-black/15 text-primary-foreground placeholder:text-primary-foreground/50"
              />
              <Button type="submit" className="h-11 shrink-0 rounded-xl bg-black/90 font-semibold text-primary hover:bg-black">
                Sign up
              </Button>
            </form>
          </div>
        </section>
      </main>

      <MarketingFooter linkTone="primary" />
    </MarketingLayout>
  );
}
