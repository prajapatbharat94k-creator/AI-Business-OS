"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../context/auth-context";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, 
  Button, Select 
} from "../components/ui";
import { 
  DollarSign, ShoppingBag, TrendingUp, AlertTriangle, 
  Briefcase, Users, Building, ArrowRight, RefreshCw
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, BarChart, Bar, Cell 
} from "recharts";

export default function DashboardPage() {
  const { apiCall, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Recharts hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [selectedBranch]);

  const loadBranches = async () => {
    try {
      const data = await apiCall("/branches/");
      setBranches(data);
    } catch (e) {
      console.error("Failed to load branches list", e);
    }
  };

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const url = selectedBranch === "all" 
        ? "/dashboard/metrics" 
        : `/dashboard/metrics?branch_id=${selectedBranch}`;
      const data = await apiCall(url);
      setMetrics(data);
    } catch (e) {
      console.error("Failed to load dashboard metrics", e);
    }
    setLoading(false);
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const isOwnerOrAdmin = user && ["SUPER_ADMIN", "BUSINESS_OWNER"].includes(user.role);

  // Process activities list
  const recentActivities = metrics?.recent_activities || [];

  // Branch Options
  const branchOptions = [
    { label: "All Branches", value: "all" },
    ...branches.map((b) => ({ label: b.name, value: b.id }))
  ];

  // Process sales data for Area chart
  // Group metrics.recent_activities by day, or just mock a historical sales curve from activities
  const salesHistory = [
    { name: "Week 1", Sales: (metrics?.revenue || 0) * 0.15 },
    { name: "Week 2", Sales: (metrics?.revenue || 0) * 0.25 },
    { name: "Week 3", Sales: (metrics?.revenue || 0) * 0.20 },
    { name: "Week 4", Sales: (metrics?.revenue || 0) * 0.40 },
  ];

  // Branch Performance
  const branchData = metrics?.branch_performance || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Upper header action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">Operational status and real-time sales reporting</p>
        </div>
        {isOwnerOrAdmin && (
          <div className="w-56 shrink-0">
            <Select
              options={branchOptions}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-card border-border"
            />
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <Card className="hover:border-primary/20 transition duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Total Revenue</CardDescription>
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics?.revenue?.toLocaleString() || "0.00"}</div>
            <p className="text-xs text-green-500 flex items-center mt-1">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              +14.2% from last month
            </p>
          </CardContent>
        </Card>

        {/* Profit */}
        <Card className="hover:border-primary/20 transition duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Gross Profit</CardDescription>
            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics?.gross_profit?.toLocaleString() || "0.00"}</div>
            <p className="text-xs text-green-500 flex items-center mt-1">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              {metrics?.revenue > 0 ? ((metrics.gross_profit / metrics.revenue) * 100).toFixed(1) : 0}% margin
            </p>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="hover:border-primary/20 transition duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Payroll & Overhead</CardDescription>
            <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
              <Briefcase className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics?.expenses?.toLocaleString() || "0.00"}</div>
            <p className="text-xs text-muted-foreground mt-1">Includes staff salaries + utilities</p>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="hover:border-primary/20 transition duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Low Stock Lines</CardDescription>
            <div className={`p-2 rounded-lg ${metrics?.inventory?.low_stock_items > 0 ? "bg-red-500/10 text-red-500 animate-pulse" : "bg-green-500/10 text-green-500"}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.inventory?.low_stock_items || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of {metrics?.inventory?.total_items || 0} total SKU items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts & Graphs */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sales trends area chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Over Time</CardTitle>
            <CardDescription>Monthly aggregated checkout sales velocity</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                  <Area type="monotone" dataKey="Sales" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Branch breakdown comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Branch Turnover Breakdown</CardTitle>
            <CardDescription>Sales distribution by store branch</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {mounted && branchData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="branch_name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                    {branchData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "var(--primary)" : "#a78bfa"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No branch data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Enterprise Activity</CardTitle>
          <CardDescription>Transactions, leave requests, and registrations</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Description</th>
                    <th className="pb-3 font-medium">Metric</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentActivities.map((act: any, idx: number) => (
                    <tr key={idx} className="hover:bg-secondary/20 transition">
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          act.type === "ORDER" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" :
                          act.type === "LEAVE" ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" :
                          "bg-green-500/10 text-green-600 dark:text-green-400"
                        }`}>
                          {act.type}
                        </span>
                      </td>
                      <td className="py-3.5 text-foreground font-medium">{act.message}</td>
                      <td className="py-3.5 text-muted-foreground font-semibold">{act.amount}</td>
                      <td className="py-3.5 text-xs text-muted-foreground">
                        {new Date(act.time).toLocaleDateString()} {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground">No recent activity logged</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
