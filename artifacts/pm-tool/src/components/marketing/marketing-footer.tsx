import { Link } from "wouter";
const logoImg = "/logo.png";

const footerLinks = [
  { label: "Documentation", href: "#" },
  { label: "Support", href: "#" },
  { label: "Community", href: "#" },
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
] as const;

export function MarketingFooter({ linkTone = "muted" }: { linkTone?: "muted" | "primary" }) {
  const linkClass =
    linkTone === "primary"
      ? "text-primary/90 transition-colors hover:text-primary"
      : "text-muted-foreground transition-colors hover:text-primary";

  return (
    <footer className="relative border-t border-border/70 bg-background/90">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8">
          <Link href="/" className="flex flex-col items-center gap-3 sm:flex-row sm:gap-2.5">
            <img src={logoImg} alt="" className="h-10 w-10 rounded-xl shadow-md shadow-primary/15" />
            <span className="font-display text-center text-xl font-bold tracking-tight">
              <span className="text-foreground">MARKET</span>
              <span className="text-primary">MIND</span>
              <span className="ml-1 text-sm font-semibold text-muted-foreground">AI</span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            {footerLinks.map(({ label, href }) => (
              <a key={label} href={href} className={linkClass} onClick={(e) => e.preventDefault()}>
                {label}
              </a>
            ))}
          </nav>

          <p className="max-w-lg text-center text-[11px] font-medium uppercase leading-relaxed tracking-[0.18em] text-muted-foreground">
            © {new Date().getFullYear()} Market Mind AI · Secured by neural encryption
          </p>
        </div>
      </div>
    </footer>
  );
}
