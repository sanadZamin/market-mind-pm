import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, AuthResponse } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { getSignInPath } from "@/lib/app-entry";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (data: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("pm_token");
      const storedUser = localStorage.getItem("pm_user");

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem("pm_token");
          localStorage.removeItem("pm_user");
        }
      }
    } catch {
      // localStorage may be unavailable in restricted contexts; continue unauthenticated.
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setAuth = (data: AuthResponse) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("pm_token", data.token);
    localStorage.setItem("pm_user", JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("pm_token");
    localStorage.removeItem("pm_user");
    setLocation(getSignInPath());
  };

  // Keep a ref so the event listener always calls the latest logout
  const logoutRef = useRef(logout);
  useEffect(() => { logoutRef.current = logout; });

  // Auto-logout when any API call returns 401 (session expired)
  useEffect(() => {
    const handler = () => logoutRef.current();
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation(getSignInPath());
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  return user ? (
    <>{children}</>
  ) : (
    <div className="h-screen w-full flex items-center justify-center bg-background text-muted-foreground">
      Redirecting to sign in...
    </div>
  );
}
