"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type UserRole = "SUPER_ADMIN" | "BUSINESS_OWNER" | "MANAGER" | "EMPLOYEE" | "CUSTOMER";

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  branch_id?: number | null;
  status: string;
}

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  apiCall: (endpoint: string, options?: RequestInit) => Promise<any>;
  apiUrl: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load initial token and profile
  useEffect(() => {
    async function loadStoredAuth() {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        try {
          setToken(storedToken);
          // Fetch current user details
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Token expired or invalid
            logout();
          }
        } catch (e) {
          console.error("Failed to load user profile", e);
          logout();
        }
      }
      setIsLoading(false);
    }
    loadStoredAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Login endpoint expects form-data parameters (OAuth2PasswordRequestForm)
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Login failed");
      }

      const loginData = await response.json();
      localStorage.setItem("token", loginData.access_token);
      setToken(loginData.access_token);

      // Save user details locally immediately from response
      const profile: UserProfile = {
        id: 0, // fetched inside loadStoredAuth, but let's mock it for immediate use
        name: loginData.name,
        email: loginData.email,
        role: loginData.role,
        branch_id: loginData.branch_id,
        status: "ACTIVE"
      };
      
      setUser(profile);
      
      // Reload profile to get proper ID and status
      const reloadProfile = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${loginData.access_token}` }
      });
      if (reloadProfile.ok) {
        setUser(await reloadProfile.json());
      }
      
      // Redirect based on role
      if (loginData.role === "CUSTOMER") {
        router.push("/portal");
      } else {
        router.push("/dashboard");
      }
    } catch (e) {
      setIsLoading(false);
      throw e;
    }
    setIsLoading(false);
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Registration failed");
      }

      // Auto login
      await login(email, password);
    } catch (e) {
      setIsLoading(false);
      throw e;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  // Helper for authenticated API calls
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const activeToken = token || localStorage.getItem("token");
    const headers = new Headers(options.headers || {});
    
    if (activeToken) {
      headers.set("Authorization", `Bearer ${activeToken}`);
    }
    
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      logout();
      throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(err.detail || "Request failed");
    }

    // Return json or blob depending on headers
    const contentType = response.headers.get("content-type");
    if (contentType && (contentType.includes("application/pdf") || contentType.includes("spreadsheetml"))) {
      return response.blob();
    }
    
    return response.json();
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
        apiCall,
        apiUrl: API_BASE_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
