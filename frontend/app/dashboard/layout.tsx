"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/auth-context";
import Sidebar from "../components/sidebar";
import Header from "../components/header";
import { RefreshCw } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user && user.role === "CUSTOMER") {
        router.push("/portal");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-semibold">Loading dashboard profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role === "CUSTOMER")) {
    return null; // prevents flash of content during redirect
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Dynamic Sidebar */}
      <Sidebar />

      {/* Main Panel Content Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Dynamic Header */}
        <Header />

        {/* Scrollable Child Routing Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
