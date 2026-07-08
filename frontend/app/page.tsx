"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/auth-context";
import { RefreshCw } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        if (user.role === "CUSTOMER") {
          router.push("/portal");
        } else {
          router.push("/dashboard");
        }
      } else {
        router.push("/login");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center space-y-4">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-semibold">Configuring environment session...</p>
      </div>
    </div>
  );
}
