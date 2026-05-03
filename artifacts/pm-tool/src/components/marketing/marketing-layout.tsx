import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/use-theme";

export function MarketingLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  useTheme();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  if (!isLoading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/25">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full opacity-[0.12] dark:opacity-[0.12]"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 68%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute top-1/3 -right-32 h-[420px] w-[420px] rounded-full opacity-[0.08] dark:opacity-[0.1]"
          style={{
            background: "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 65%)",
            filter: "blur(50px)",
          }}
        />
      </div>
      {children}
    </div>
  );
}
