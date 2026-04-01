import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  GitBranch,
  FileSpreadsheet,
  FileDown,
  Mail,
  Sparkles,
  ArrowLeft,
  Play,
  Pause,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSignInPath } from "@/lib/app-entry";
import logoImg from "../assets/logo.png";

const SLIDE_MS = 5200;

const features = [
  {
    id: "dashboard",
    title: "Command-center dashboard",
    blurb:
      "See every project at a glance with stats, progress, and behind-schedule signals so nothing slips through.",
    Icon: LayoutDashboard,
    tint: "from-emerald-500/25 to-teal-600/10",
    mock: "dashboard",
  },
  {
    id: "projects",
    title: "Projects, tasks & views",
    blurb:
      "Organize work in list, board, or calendar layouts. Edit project details, owners, dates, and status in one place.",
    Icon: FolderKanban,
    tint: "from-cyan-500/20 to-blue-600/10",
    mock: "board",
  },
  {
    id: "gantt",
    title: "Gantt, subtasks & dependencies",
    blurb:
      "Plan timelines visually, nest subtasks, and link blockers so dependencies stay visible across the plan.",
    Icon: GitBranch,
    tint: "from-violet-500/20 to-indigo-600/10",
    mock: "gantt",
  },
  {
    id: "excel",
    title: "Excel import with Qwen",
    blurb:
      "Upload a spreadsheet and let your local Qwen model suggest column-to-field mapping—then import tasks in bulk.",
    Icon: FileSpreadsheet,
    tint: "from-amber-500/20 to-orange-600/10",
    mock: "excel",
  },
  {
    id: "export",
    title: "PDF report export",
    blurb:
      "Generate a branded cover, executive summary, and Gantt—including subtasks—for stakeholders in one click.",
    Icon: FileDown,
    tint: "from-rose-500/20 to-pink-600/10",
    mock: "pdf",
  },
  {
    id: "email",
    title: "Team email notifications",
    blurb:
      "Optional branded emails on project and task changes, with deep links back into the app for your team.",
    Icon: Mail,
    tint: "from-sky-500/20 to-cyan-600/10",
    mock: "email",
  },
  {
    id: "ai",
    title: "AI description rephrase",
    blurb:
      "Polish project descriptions with your Ollama model—concise, professional wording without leaving the editor.",
    Icon: Sparkles,
    tint: "from-fuchsia-500/20 to-purple-600/10",
    mock: "ai",
  },
] as const;

function MockChrome({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden shadow-2xl shadow-black/40 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-white/5">
        <span className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </span>
        <span className="text-[10px] text-white/40 font-mono truncate flex-1 text-center">
          market-mind · project workspace
        </span>
      </div>
      <div className="p-4 min-h-[200px] relative">{children}</div>
    </div>
  );
}

function MockContent({ keyId }: { keyId: string }) {
  return (
    <AnimatePresence mode="wait">
      {keyId === "dashboard" && (
        <motion.div
          key="d"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="space-y-3"
        >
          <div className="grid grid-cols-3 gap-2">
            {[0.85, 0.65, 0.4].map((w, i) => (
              <motion.div
                key={i}
                className="h-14 rounded-lg bg-white/10 border border-white/10"
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05 * i, type: "spring", stiffness: 260, damping: 22 }}
              >
                <div className="p-2 space-y-1.5">
                  <div className="h-2 w-8 rounded bg-white/30" />
                  <motion.div
                    className="h-1.5 rounded bg-primary/70"
                    initial={{ width: 0 }}
                    animate={{ width: `${w * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.08 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div
            className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <div className="h-2 w-32 rounded bg-white/25" />
          </motion.div>
        </motion.div>
      )}
      {keyId === "board" && (
        <motion.div
          key="b"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex gap-2"
        >
          {["Todo", "Doing", "Done"].map((col, ci) => (
            <div key={col} className="flex-1 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold px-1">{col}</div>
              {[0, 1].map((r) => (
                <motion.div
                  key={r}
                  className="h-16 rounded-lg bg-white/10 border border-white/10 p-2"
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 * ci + 0.08 * r }}
                >
                  <div className="h-2 w-[85%] rounded bg-white/35" />
                  <div className="h-1.5 w-[60%] mt-2 rounded bg-white/15" />
                </motion.div>
              ))}
            </div>
          ))}
        </motion.div>
      )}
      {keyId === "gantt" && (
        <motion.div key="g" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-2">
              <div className="w-16 shrink-0 h-2 rounded bg-white/20" />
              <div className="flex-1 h-6 bg-white/5 rounded relative overflow-hidden">
                <motion.div
                  className="absolute top-1 bottom-1 rounded bg-gradient-to-r from-primary/80 to-cyan-400/70"
                  initial={{ left: "4%", width: 0 }}
                  animate={{ left: `${8 + row * 6}%`, width: `${28 + (row % 2) * 12}%` }}
                  transition={{ duration: 0.6, delay: row * 0.12, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </motion.div>
      )}
      {keyId === "excel" && (
        <motion.div
          key="x"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-2"
        >
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="h-8 rounded border border-white/10 bg-white/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              />
            ))}
          </div>
          <motion.div
            className="flex items-center gap-2 text-[10px] text-emerald-300/90 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Qwen · mapping columns → tasks
          </motion.div>
        </motion.div>
      )}
      {keyId === "pdf" && (
        <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
          <div className="h-24 rounded-lg border border-white/15 bg-gradient-to-br from-white/15 to-transparent flex items-center justify-center">
            <motion.div
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <FileDown className="w-8 h-8 mx-auto text-primary mb-1" />
              <div className="h-2 w-28 mx-auto rounded bg-white/30" />
            </motion.div>
          </div>
          <div className="space-y-2">
            {[40, 72, 55].map((pct, i) => (
              <div key={i} className="h-2 rounded bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-white/35 rounded"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                />
              </div>
            ))}
          </div>
        </motion.div>
      )}
      {keyId === "email" && (
        <motion.div key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
          <div className="rounded-lg border border-white/15 bg-white/8 p-3 space-y-2">
            <div className="h-2 w-1/2 rounded bg-white/35" />
            <div className="h-1.5 w-full rounded bg-white/15" />
            <div className="h-1.5 w-4/5 rounded bg-white/15" />
            <motion.div
              className="h-7 rounded-md bg-primary/40 mt-2 flex items-center justify-center text-[10px] font-medium text-black"
              initial={{ scale: 0.95 }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              Open in Market Mind
            </motion.div>
          </div>
        </motion.div>
      )}
      {keyId === "ai" && (
        <motion.div key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
          <div className="rounded-lg border border-white/15 bg-white/5 p-3 space-y-2">
            <div className="h-1.5 w-full rounded bg-white/20" />
            <div className="h-1.5 w-[92%] rounded bg-white/15" />
            <div className="h-1.5 w-4/5 rounded bg-white/10" />
          </div>
          <motion.div
            className="h-20 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 p-3 space-y-2"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="h-1.5 w-full rounded bg-white/40" />
            <div className="h-1.5 w-full rounded bg-white/30" />
            <div className="h-1.5 w-3/4 rounded bg-white/25" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function FeatureDemo() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const f = features[index];

  const next = useCallback(() => setIndex((i) => (i + 1) % features.length), []);
  const prev = useCallback(() => setIndex((i) => (i - 1 + features.length) % features.length), []);

  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(next, SLIDE_MS);
    return () => window.clearInterval(t);
  }, [playing, next]);

  return (
    <div className="dark min-h-screen w-full bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[hsl(160_65%_5%)]" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-[min(80vw,560px)] aspect-square rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, #13eac1 0%, transparent 68%)", filter: "blur(60px)" }}
          animate={{ x: [0, 40, 0], y: [0, 24, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[min(70vw,480px)] aspect-square rounded-full opacity-22"
          style={{ background: "radial-gradient(circle, #23a7e5 0%, transparent 68%)", filter: "blur(55px)" }}
          animate={{ x: [0, -32, 0], y: [0, -28, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 md:py-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <Link href={getSignInPath()}>
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white -ml-2 gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Button>
          </Link>
          <div className="flex items-center gap-2 justify-center sm:justify-end">
            <img src={logoImg} alt="" className="w-9 h-9 rounded-xl shadow-lg shadow-primary/20" />
            <span className="font-bold text-lg text-white tracking-tight">Market Mind</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 md:mb-12"
        >
          <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-2">Product tour</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white font-display mb-3">See what the PM workspace does</h1>
          <p className="text-white/55 max-w-xl mx-auto text-sm md:text-base">
            A quick animated walkthrough—no login required. Use the controls to pause or step through features.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-start">
          <motion.div
            layout
            className={`rounded-3xl border border-white/10 bg-gradient-to-br ${f.tint} p-6 md:p-8 backdrop-blur-md shadow-xl`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.35 }}
                className="space-y-4"
              >
                <div className="inline-flex p-3 rounded-2xl bg-black/30 border border-white/10">
                  <f.Icon className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-white leading-tight">{f.title}</h2>
                <p className="text-white/70 text-sm md:text-base leading-relaxed">{f.blurb}</p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/20 bg-black/20 text-white hover:bg-white/10 gap-1.5"
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {playing ? "Pause" : "Play"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/20 bg-black/20 text-white hover:bg-white/10"
                onClick={prev}
              >
                Previous
              </Button>
              <Button type="button" size="sm" className="bg-primary text-primary-foreground gap-1" onClick={next}>
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 justify-center md:justify-start">
              {features.map((feat, i) => (
                <button
                  key={feat.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? "w-8 bg-primary" : "w-2 bg-white/25 hover:bg-white/40"
                  }`}
                  aria-label={`Show ${feat.title}`}
                />
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <MockChrome>
              <MockContent keyId={f.mock} />
            </MockChrome>
            <motion.p
              className="text-center text-xs text-white/40 mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Illustrative UI mock—your live data appears after sign-in.
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
