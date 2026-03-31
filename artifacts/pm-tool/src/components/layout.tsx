import { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { useTheme } from "@/hooks/use-theme";
import { motion } from "framer-motion";

export function Layout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-background/50 backdrop-blur-xl px-4 sticky top-0 z-10">
            <SidebarTrigger className="hover-elevate text-muted-foreground hover:text-foreground" />
            <div className="flex-1" />
            <button
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </header>
          <main className="flex-1 overflow-auto bg-gradient-to-br from-background to-secondary/20 relative">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute -top-24 -left-24 w-72 h-72 rounded-full"
                style={{ background: "radial-gradient(circle, hsl(169 85% 50% / 0.12) 0%, transparent 70%)", filter: "blur(26px)" }}
                animate={{ x: [0, 26, 0], y: [0, 12, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute bottom-[-120px] right-[-100px] w-80 h-80 rounded-full"
                style={{ background: "radial-gradient(circle, hsl(199 79% 52% / 0.1) 0%, transparent 72%)", filter: "blur(30px)" }}
                animate={{ x: [0, -22, 0], y: [0, -14, 0], scale: [1.06, 1, 1.06] }}
                transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              />
            </div>
            <div className="h-full w-full relative z-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
