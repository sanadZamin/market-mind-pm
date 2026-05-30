import { motion } from "framer-motion";

const CANDLES = [
  { x: 8, h: 42, body: 18, up: true },
  { x: 14, h: 28, body: 12, up: false },
  { x: 20, h: 55, body: 22, up: true },
  { x: 26, h: 36, body: 14, up: true },
  { x: 32, h: 48, body: 16, up: false },
  { x: 38, h: 62, body: 24, up: true },
  { x: 44, h: 40, body: 15, up: false },
  { x: 50, h: 52, body: 20, up: true },
  { x: 56, h: 34, body: 11, up: false },
  { x: 62, h: 58, body: 21, up: true },
  { x: 68, h: 45, body: 17, up: true },
  { x: 74, h: 30, body: 10, up: false },
  { x: 80, h: 50, body: 19, up: true },
  { x: 86, h: 38, body: 13, up: false },
  { x: 92, h: 44, body: 16, up: true },
];

const TICKERS = [
  { label: "SPX", value: "+1.24%", x: "12%", y: "22%" },
  { label: "BTC", value: "68,420", x: "78%", y: "18%" },
  { label: "EUR/USD", value: "1.0842", x: "84%", y: "38%" },
  { label: "VIX", value: "14.2", x: "10%", y: "42%" },
];

export function HeroTradingBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-0 overflow-hidden"
      aria-hidden
    >
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-background/80 to-background dark:from-primary/[0.12] dark:via-background/90" />

      {/* Perspective trading floor grid */}
      <div
        className="absolute bottom-0 left-1/2 h-[55%] w-[160%] -translate-x-1/2 opacity-[0.35] dark:opacity-[0.5]"
        style={{
          transform: "translateX(-50%) perspective(520px) rotateX(68deg)",
          transformOrigin: "50% 100%",
        }}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary) / 0.35) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary) / 0.25) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
            maskImage: "linear-gradient(to top, black 20%, transparent 95%)",
            WebkitMaskImage: "linear-gradient(to top, black 20%, transparent 95%)",
          }}
        />
      </div>

      {/* Animated chart + candles */}
      <svg
        className="absolute bottom-0 left-0 h-[45%] w-full opacity-50 dark:opacity-65"
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="heroChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="heroChartLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(160 80% 55%)" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        <motion.path
          d="M0,38 C8,36 12,32 18,30 S28,22 35,24 S48,18 55,20 S68,12 75,14 S88,8 100,6 L100,50 L0,50 Z"
          fill="url(#heroChartFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
        />
        <motion.path
          d="M0,38 C8,36 12,32 18,30 S28,22 35,24 S48,18 55,20 S68,12 75,14 S88,8 100,6"
          stroke="url(#heroChartLine)"
          strokeWidth="0.35"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0.5 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.2, ease: "easeOut" }}
        />

        {CANDLES.map((c, i) => {
          const yBase = 50 - c.h * 0.35;
          const bodyTop = c.up ? yBase - c.body * 0.35 : yBase;
          const bodyH = c.body * 0.35;
          const color = c.up ? "hsl(160 75% 48%)" : "hsl(0 72% 58%)";
          return (
            <g key={i} opacity={0.55 + (i % 3) * 0.12}>
              <line
                x1={c.x}
                x2={c.x}
                y1={yBase - c.h * 0.35}
                y2={yBase + 2}
                stroke={color}
                strokeWidth="0.15"
                vectorEffect="non-scaling-stroke"
              />
              <motion.rect
                x={c.x - 0.9}
                y={bodyTop}
                width={1.8}
                height={bodyH}
                fill={color}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: [0.45, 0.95, 0.45] }}
                transition={{ duration: 2.5 + (i % 4) * 0.3, repeat: Infinity, delay: i * 0.08 }}
              />
            </g>
          );
        })}
      </svg>

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
        animate={{ top: ["18%", "72%", "18%"] }}
        transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
      />

      {/* Floating ticker readouts */}
      {TICKERS.map((t) => (
        <motion.div
          key={t.label}
          className="absolute rounded-md border border-primary/20 bg-background/40 px-2 py-1 font-mono text-[10px] backdrop-blur-sm sm:text-xs"
          style={{ left: t.x, top: t.y }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0.35, 0.75, 0.35], y: [0, -4, 0] }}
          transition={{ duration: 4 + TICKERS.indexOf(t), repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-muted-foreground">{t.label}</span>{" "}
          <span className="font-semibold text-primary">{t.value}</span>
        </motion.div>
      ))}

      {/* Neural nodes / order flow */}
      <svg className="absolute inset-0 h-full w-full opacity-30 dark:opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {[...Array(6)].map((_, i) => (
          <motion.circle
            key={i}
            cx={15 + i * 14}
            cy={28 + (i % 3) * 8}
            r={2}
            fill="hsl(var(--primary))"
            animate={{
              opacity: [0.2, 0.9, 0.2],
              r: [1.5, 2.5, 1.5],
            }}
            transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.35 }}
          />
        ))}
        <motion.polyline
          points="15,32 29,36 43,30 57,38 71,34 85,40"
          stroke="hsl(var(--primary))"
          strokeWidth="0.4"
          strokeOpacity="0.4"
          fill="none"
          strokeDasharray="2 3"
          vectorEffect="non-scaling-stroke"
          animate={{ strokeDashoffset: [0, -10] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      {/* Top vignette for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-transparent" />
    </div>
  );
}
