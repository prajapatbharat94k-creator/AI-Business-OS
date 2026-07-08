"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../context/auth-context";
import { useTheme } from "./theme-provider";
import { Sun, Moon, Clock, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { Button } from "./ui";

export default function Header() {
  const { user, apiCall } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isStaff = user && ["MANAGER", "EMPLOYEE"].includes(user.role);

  // Check attendance status for today
  useEffect(() => {
    if (isStaff) {
      checkTodayAttendance();
    }
  }, [user]);

  const checkTodayAttendance = async () => {
    try {
      const history = await apiCall("/employees/attendance/history");
      const todayStr = new Date().toISOString().split("T")[0];
      const hasToday = history.some((h: any) => h.date === todayStr);
      const todayRecord = history.find((h: any) => h.date === todayStr);
      setIsCheckedIn(hasToday && !todayRecord?.check_out);
    } catch (e) {
      console.error("Failed to load today's attendance status", e);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await apiCall("/employees/attendance/check-in", { method: "POST" });
      setIsCheckedIn(true);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to check in");
    }
    setLoading(false);
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await apiCall("/employees/attendance/check-out", { method: "POST" });
      setIsCheckedIn(false);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to check out");
    }
    setLoading(false);
  };

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Title / Module Name */}
      <div className="flex items-center space-x-3">
        <h2 className="text-sm font-semibold text-foreground">Overview</h2>
        {isStaff && (
          <div className="flex items-center space-x-2 border-l border-border pl-3">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Status: {isCheckedIn ? (
                <span className="text-green-500 font-semibold">Working</span>
              ) : (
                <span className="text-yellow-500 font-semibold">Off-duty</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Quick Settings Actions */}
      <div className="flex items-center space-x-4">
        {/* Error message popover */}
        {errorMsg && (
          <span className="text-xs text-destructive bg-destructive/10 px-2.5 py-1 rounded-md max-w-xs truncate">
            {errorMsg}
          </span>
        )}

        {/* Check in / out action */}
        {isStaff && (
          <div className="flex items-center space-x-2">
            {!isCheckedIn ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCheckIn} 
                disabled={loading}
                className="text-xs border-green-500/30 text-green-600 hover:bg-green-500/10 hover:text-green-600"
              >
                {loading ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
                Check In
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCheckOut} 
                disabled={loading}
                className="text-xs border-orange-500/30 text-orange-600 hover:bg-orange-500/10 hover:text-orange-600"
              >
                {loading ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                Check Out
              </Button>
            )}
          </div>
        )}

        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 border border-border"
          title="Toggle light/dark mode"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User initials bubble */}
        {user && (
          <div className="flex items-center space-x-2.5 pl-2 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-foreground leading-none">{user.name}</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-0.5 uppercase tracking-wider">{user.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
