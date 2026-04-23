import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import TechnologyLanding from "@/pages/technology-landing";
import PricingLanding from "@/pages/pricing-landing";
import ResourcesLanding from "@/pages/resources-landing";
import FeatureDemo from "@/pages/feature-demo";
import { getSignInPath } from "@/lib/app-entry";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";

const queryClient = new QueryClient();

const signInPath = getSignInPath();

function RegisterToLoginRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(signInPath);
  }, [setLocation]);
  return null;
}

function Router() {
  const [location] = useLocation();
  return (
    <>
      <div className="fixed bottom-2 right-2 z-[9999] rounded bg-black/80 px-2 py-1 text-[10px] font-mono text-white">
        route: {location}
      </div>
      <Switch>
        <Route path="/" component={TechnologyLanding} />
        <Route path="/pricing" component={PricingLanding} />
        <Route path="/resources" component={ResourcesLanding} />
        <Route path={signInPath} component={Login} />
        <Route path="/demo" component={FeatureDemo} />
        <Route path="/register" component={RegisterToLoginRedirect} />

        <Route path="/dashboard">
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        </Route>
        <Route path="/projects">
          <ProtectedRoute><Projects /></ProtectedRoute>
        </Route>
        <Route path="/projects/:id">
          <ProtectedRoute><ProjectDetail /></ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
