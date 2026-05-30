import { motion } from "framer-motion";

/** Candle layout in a fixed 800×220 viewBox — never stretched (preserveAspectRatio meet). */
const CANDLES = [
  { x: 48, h: 52, body: 22, up: true },
  { x: 88, h: 38, body: 14, up: false },
  { x: 128, h: 68, body: 28, up: true },
  { x: 168, h: 44, body: 16, up: true },
  { x: 208, h: 58, body: 20, up: false },
  { x: 248, h: 72, body: 30, up: true },
  { x: 288, h: 46, body: 17, up: false },
  { x: 328, h: 62, body: 24, up: true },
  { x: 368, h: 40, body: 13, up: false },
  { x: 408, h: 55, body: 21, up: true },
  { x: 448, h: 48, body: 18, up: true },
  { x: 488, h: 36, body: 12, up: false },
  { x: 528, h: 64, body: 26, up: true },
  { x: 568, h: 42, body: 15, up: false },
  { x: 608, h: 50, body: 19, up: true },
  { x: 648, h: 58, body: 22, up: true },
  { x: 688, h: 44, body: 16, up: false },
  { x: 728, h: 60, body: 23, up: true },
];

export function HeroTradingBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Soft ambient glow — no stretch */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-background/90 to-background dark:from-primary/[0.1]" />
      <div
        className="absolute left-1/2 top-[38%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl dark:opacity-50"
        style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.35) 0%, transparent 70%)" }}
      />

      {/* Dot grid — fixed cell size, fades at edges */}
      <div
        className="absolute inset-0 opacity-[0.22] dark:opacity-[0.28]"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--primary) / 0.45) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 70% 55% at 50% 45%, black 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 45%, black 0%, transparent 75%)",
        }}
      />

      {/* Chart panel — centered, fixed aspect ratio */}
      <div className="absolute bottom-0 left-1/2 w-full max-w-5xl -translate-x-1/2 px-4 pb-2 sm:px-6">
        <div className="relative mx-auto aspect-[800/220] w-full max-h-[min(28vh,220px)]">
          <svg
            className="h-full w-full opacity-55 dark:opacity-70"
            viewBox="0 0 800 220"
            preserveAspectRatio="xMidYMid meet"
            fill="none"
          >
            <defs>
              <linearGradient id="heroChartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="heroChartLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                <stop offset="100%" stopColor="hsl(160 75% 48%)" stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
            {[40, 80, 120, 160].map((y) => (
              <line
                key={y}
                x1={32}
                x2={768}
                y1={y}
                y2={y}
                stroke="hsl(var(--primary))"
                strokeOpacity={0.12}
                strokeWidth={1}
              />
            ))}

            <motion.path
              d="M32,148 C120,132 180,118 260,108 S420,78 520,72 S660,48 768,38 L768,200 L32,200 Z"
              fill="url(#heroChartFill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            />
            <motion.path
              d="M32,148 C120,132 180,118 260,108 S420,78 520,72 S660,48 768,38"
              stroke="url(#heroChartLine)"
              strokeWidth={2.5}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeOut" }}
            />

            {CANDLES.map((c, i) => {
              const yBase = 188;
              const top = yBase - c.h;
              const bodyTop = c.up ? yBase - c.body : yBase - c.body;
              const color = c.up ? "hsl(160 72% 42%)" : "hsl(0 68% 52%)";
              return (
                <g key={i} opacity={0.7}>
                  <line x1={c.x} x2={c.x} y1={top} y2={yBase} stroke={color} strokeWidth={1} />
                  <motion.rect
                    x={c.x - 5}
                    y={bodyTop}
                    width={10}
                    height={c.body}
                    rx={1}
                    fill={color}
                    animate={{ opacity: [0.5, 0.95, 0.5] }}
                    transition={{ duration: 2.4 + (i % 3) * 0.2, repeat: Infinity, delay: i * 0.06 }}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Readability fade over hero text */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/75 to-transparent" />
    </div>
  );
}
