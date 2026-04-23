import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";
const logoImg = "/logo.png";
const glassLogoImg = "/logo.png";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await loginMutation.mutateAsync({ data });
      setAuth(res);
      toast({ title: "Welcome back!" });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Please check your credentials",
      });
    }
  };

  return (
    <div className="dark min-h-screen w-full flex bg-background relative overflow-hidden">
      {/* Market Mind Brand Background */}
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5" style={{ background: "radial-gradient(circle, #13eac1 0%, transparent 60%)" }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(#13eac1 1px, transparent 1px), linear-gradient(90deg, #13eac1 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        {/* Glass 3D logo — bottom left corner decoration */}
        <motion.img
          src={glassLogoImg}
          alt=""
          aria-hidden="true"
          className="absolute bottom-0 left-0 w-[520px] select-none pointer-events-none"
          style={{
            opacity: 0.72,
            transform: "translate(-8%, 12%)",
            mixBlendMode: "screen",
          }}
          animate={{ y: [0, -10, 0], opacity: [0.62, 0.82, 0.62] }}
          transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/4 right-[16%] w-3 h-3 rounded-full bg-primary/50"
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.9, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[60%] left-[14%] w-2.5 h-2.5 rounded-full bg-accent/60"
          animate={{ y: [0, -16, 0], x: [0, 8, 0], opacity: [0.2, 0.75, 0.2], scale: [0.9, 1.25, 0.9] }}
          transition={{ duration: 5.1, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-6 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-3 mb-8 justify-center">
            <img src={logoImg} alt="Market Mind" className="w-12 h-12 rounded-2xl shadow-lg shadow-primary/30" />
            <span className="font-bold text-3xl tracking-tight text-white">Market Mind</span>
          </div>

          <motion.div
            className="glass-panel p-8 rounded-3xl"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
          >
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-white mb-2 font-display">Sign in to your account</h1>
              <p className="text-white/55 text-sm">Enter your details to access your workspace</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80 font-medium">Email</Label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <Input 
                    id="email" 
                    placeholder="name@company.com" 
                    className="pl-10 h-12 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-primary focus-visible:border-primary/60 transition-all rounded-xl"
                    {...form.register("email")}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-xs text-red-400 mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                {/* Grid keeps the same visual layout, but the DOM order is Label -> Password input -> Forgot link.
                    That ensures keyboard `Tab` moves from email to password first. */}
                <div className="grid grid-cols-[1fr_auto] items-center gap-x-2">
                  <Label
                    htmlFor="password"
                    className="text-white/80 font-medium"
                  >
                    Password
                  </Label>

                  <div className="relative col-span-2">
                    <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 h-12 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-primary focus-visible:border-primary/60 transition-all rounded-xl"
                      {...form.register("password")}
                    />
                  </div>

                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-xs text-primary hover:text-primary/80 transition-colors col-start-2 row-start-1"
                  >
                    Forgot password?
                  </a>
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-red-400 mt-1">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-black shadow-lg shadow-primary/25 transition-all group mt-2"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/demo"
                className="text-sm text-white/45 hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                View animated feature tour
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
