"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/auth-context";
import { Button, Input, Alert } from "../components/ui";
import { Sparkles, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in all fields");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      await login(email, password);
    } catch (e: any) {
      setErrorMsg(e.message || "Invalid credentials");
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setLoading(true);
    setErrorMsg("");
    setEmail(demoEmail);
    setPassword(demoPass);
    try {
      await login(demoEmail, demoPass);
    } catch (e: any) {
      setErrorMsg(e.message || "Demo login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] text-[#fafafa] relative overflow-hidden px-4">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 flex flex-col space-y-6">
        {/* Logo and header */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="p-3 bg-primary rounded-xl text-primary-foreground shadow-lg shadow-primary/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AI Business OS</h1>
          <p className="text-xs text-zinc-400">Digitize all your enterprise operations with AI-powered insights</p>
        </div>

        {/* Card Form */}
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-8 shadow-2xl relative">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <Alert variant="error" title="Login Error">
                {errorMsg}
              </Alert>
            )}

            <Input
              type="email"
              label="Business Email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-500"
              required
            />

            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-500"
              required
            />

            <Button type="submit" className="w-full justify-center mt-6" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Registration link */}
          <p className="text-center text-xs text-zinc-500 mt-6">
            Looking to shop?{" "}
            <Link href="/register" className="text-primary hover:underline font-semibold">
              Create a customer portal account
            </Link>
          </p>
        </div>

        {/* Quick Demo Logins Panel */}
        <div className="bg-[#121214]/50 border border-zinc-800/60 rounded-xl p-6 flex flex-col space-y-3">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Developer Sandbox Quick Login</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickLogin("admin@businessos.ai", "admin123")}
              disabled={loading}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:border-zinc-700 transition font-medium text-left truncate"
            >
              👑 <span className="font-semibold text-zinc-200">Super Admin</span>
            </button>
            <button
              onClick={() => handleQuickLogin("owner@businessos.ai", "owner123")}
              disabled={loading}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:border-zinc-700 transition font-medium text-left truncate"
            >
              💼 <span className="font-semibold text-zinc-200">Business Owner</span>
            </button>
            <button
              onClick={() => handleQuickLogin("manager@businessos.ai", "manager123")}
              disabled={loading}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:border-zinc-700 transition font-medium text-left truncate"
            >
              👔 <span className="font-semibold text-zinc-200">Store Manager</span>
            </button>
            <button
              onClick={() => handleQuickLogin("employee@businessos.ai", "employee123")}
              disabled={loading}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:border-zinc-700 transition font-medium text-left truncate"
            >
              🛠️ <span className="font-semibold text-zinc-200">Store Employee</span>
            </button>
          </div>
          <button
            onClick={() => handleQuickLogin("customer@businessos.ai", "customer123")}
            disabled={loading}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:border-zinc-700 transition font-medium text-xs text-left"
          >
            🛒 <span className="font-semibold text-zinc-200">Jane Doe (Customer Portal)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
