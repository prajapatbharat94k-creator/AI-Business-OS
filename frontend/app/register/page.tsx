"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/auth-context";
import { Button, Input, Alert } from "../components/ui";
import { Sparkles, ArrowRight, RefreshCw } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setErrorMsg("Please fill in all fields");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      await register(name, email, password);
    } catch (e: any) {
      setErrorMsg(e.message || "Registration failed");
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
          <h1 className="text-2xl font-bold tracking-tight">Create Customer Account</h1>
          <p className="text-xs text-zinc-400">Join our loyalty points network and place orders instantly</p>
        </div>

        {/* Card Form */}
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-8 shadow-2xl relative">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <Alert variant="error" title="Registration Error">
                {errorMsg}
              </Alert>
            )}

            <Input
              type="text"
              label="Full Name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-500"
              required
            />

            <Input
              type="email"
              label="Email Address"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-500"
              required
            />

            <Input
              type="password"
              label="Choose Password"
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
                  Creating Account...
                </>
              ) : (
                <>
                  Register
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Login link */}
          <p className="text-center text-xs text-zinc-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-semibold">
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
