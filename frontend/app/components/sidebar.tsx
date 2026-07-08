"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/auth-context";
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Users, 
  UserCheck, 
  ShoppingBag, 
  Brain, 
  GitMerge, 
  LogOut,
  Sparkles,
  ShoppingBasket
} from "lucide-react";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  // Filter menu items by user role
  const isOwnerOrAdmin = ["SUPER_ADMIN", "BUSINESS_OWNER"].includes(user.role);
  const isManager = user.role === "MANAGER";
  const isEmployee = user.role === "EMPLOYEE";
  const isCustomer = user.role === "CUSTOMER";

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      show: !isCustomer
    },
    {
      name: "Branches",
      path: "/dashboard/branches",
      icon: GitMerge,
      show: isOwnerOrAdmin
    },
    {
      name: "Inventory",
      path: "/dashboard/inventory",
      icon: Package,
      show: !isCustomer
    },
    {
      name: "Orders",
      path: "/dashboard/orders",
      icon: ShoppingBag,
      show: !isCustomer
    },
    {
      name: "Billing & GST",
      path: "/dashboard/billing",
      icon: FileText,
      show: !isCustomer
    },
    {
      name: "Customers & CRM",
      path: "/dashboard/customers",
      icon: UserCheck,
      show: !isCustomer
    },
    {
      name: "Employees",
      path: "/dashboard/employees",
      icon: Users,
      show: isOwnerOrAdmin || isManager || isEmployee
    },
    {
      name: "AI Insights",
      path: "/dashboard/ai",
      icon: Brain,
      show: isOwnerOrAdmin || isManager
    },
    {
      name: "Customer Portal",
      path: "/portal",
      icon: ShoppingBasket,
      show: true
    }
  ];

  return (
    <aside className="w-64 bg-card text-card-foreground border-r border-border flex flex-col h-screen sticky top-0 shrink-0">
      {/* Title / Logo */}
      <div className="p-6 border-b border-border flex items-center space-x-2">
        <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight">AI Business OS</h1>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Enterprise</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems
          .filter((item) => item.show)
          .map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
      </nav>

      {/* Profile Box */}
      <div className="p-4 border-t border-border flex flex-col space-y-3 bg-secondary/35">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-semibold text-foreground truncate">{user.name}</h2>
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
              {user.role.replace("_", " ")}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center justify-center space-x-2 w-full px-3 py-1.5 border border-border hover:bg-destructive hover:text-destructive-foreground hover:border-transparent rounded-lg text-xs font-semibold text-muted-foreground transition duration-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
