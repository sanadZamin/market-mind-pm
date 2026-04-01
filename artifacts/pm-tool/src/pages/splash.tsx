import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { LineChart, Brain, Users, Percent } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import logoImg from "../assets/logo.png";
import glassLogoImg from "../assets/glass-logo-nobg.png";

const featureBlocks: { title: string; description: string; Icon: LucideIcon }[] = [
  {
    title: "Analytics",
    description: "Make data-informed Trading.",
    Icon: LineChart,
  },
  {
    title: "Advanced AI",
    description: "Smarter AI with proprietary algorithms.",
    Icon: Brain,
  },
  {
    title: "Community",
    description: "Leverage open source community members.",
    Icon: Users,
  },
  {
    title: "Minimized Risk",
    description: "Better Trading Gains Through Reduced Risk.",
    Icon: Percent,
  },
];

export default function Splash() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/dashboard");
    }
  }, [isLoading, user, setLocation]);

  if (!isLoading && user) {
    return (
      <div className="dark min-h-screen w-full flex items-center justify-center bg-[hsl(160_65%_5%)]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="dark min-h-screen w-full flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0" style={{ background: "hsl(160 65% 5%)" }} />
        <motion.div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #13eac1 0%, transparent 70%)", filter: "blur(80px)" }}
          animate={{ x: [0, 30, 0], y: [0, 16, 0], scale: [1, 1.12, 1], opacity: [0.18, 0.34, 0.18] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-28"
          style={{ background: "radial-gradient(circle, #23a7e5 0%, transparent 70%)", filter: "blur(80px)" }}
          animate={{ x: [0, -26, 0], y: [0, -20, 0], scale: [1.08, 1, 1.08], opacity: [0.16, 0.3, 0.16] }}
          transition={{ duration: 8.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#13eac1 1px, transparent 1px), linear-gradient(90deg, #13eac1 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(125deg, transparent, transparent 100px, rgba(19, 234, 193, 0.12) 100px, rgba(19, 234, 193, 0.12) 101px)",
          }}
        />
        <motion.img
          src={glassLogoImg}
          alt=""
          aria-hidden="true"
          className="absolute bottom-0 left-0 w-[min(92vw,520px)] select-none pointer-events-none max-w-none"
          style={{
            opacity: 0.72,
            transform: "translate(-8%, 12%)",
            mixBlendMode: "screen",
          }}
          animate={{ y: [0, -10, 0], opacity: [0.62, 0.82, 0.62] }}
          transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="max-w-3xl text-center"
        >
          <div className="flex flex-col items-center gap-4 mb-6">
            <img src={logoImg} alt="Market Mind" className="w-16 h-16 rounded-2xl shadow-lg shadow-primary/30" />
            <h1 className="font-bold text-4xl md:text-5xl tracking-tight text-white font-display">Market Mind</h1>
          </div>
          <p className="text-xl md:text-2xl font-semibold text-white/90 leading-snug mb-6 font-display">
            AI-Native Trading. Reinvented.
          </p>
          <p className="text-base md:text-lg text-white/65 leading-relaxed">
            Smarter, faster, and more adaptive — MarketMind is redefining trading with the power of cutting-edge AI. We
            integrate machine learning, deep reinforcement learning (DRL), large language models (LLMs), and autonomous
            AI agents into one unified platform built for the future of finance.
          </p>
        </motion.div>

        <motion.div
          className="w-full max-w-6xl mt-14 md:mt-20"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {featureBlocks.map(({ title, description, Icon }, i) => (
              <motion.article
                key={title}
                className="group rounded-2xl bg-zinc-200/95 p-5 md:p-6 shadow-lg shadow-black/20 border border-white/10 text-left cursor-default"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2 + i * 0.07 }}
                whileHover={{
                  y: -6,
                  scale: 1.02,
                  boxShadow:
                    "0 24px 48px -12px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(19, 234, 193, 0.35)",
                  transition: { type: "spring", stiffness: 420, damping: 26 },
                }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3">
                  <Icon className="h-5 w-5 text-[hsl(160_55%_14%)] transition-colors duration-300 group-hover:text-[hsl(160_55%_22%)]" strokeWidth={2} aria-hidden />
                </div>
                <h2 className="font-bold text-[hsl(160_50%_8%)] text-base md:text-lg leading-tight mb-2">{title}</h2>
                <p className="text-sm text-zinc-600 leading-relaxed">{description}</p>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
