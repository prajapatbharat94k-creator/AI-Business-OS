"use client";

import React from "react";

// Button Component
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyle = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:pointer-events-none";
    
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-opacity-90 shadow-sm",
      secondary: "bg-secondary text-secondary-foreground hover:bg-opacity-80",
      outline: "border border-border bg-transparent text-foreground hover:bg-secondary",
      destructive: "bg-destructive text-destructive-foreground hover:bg-opacity-90 shadow-sm",
      ghost: "hover:bg-secondary text-foreground hover:text-secondary-foreground"
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base"
    };

    return (
      <button
        ref={ref}
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// Input Component
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, type = "text", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={`w-full px-3 py-2 text-sm bg-card border ${
            error ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
          } rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:border-transparent transition-all duration-200 ${className}`}
          {...props}
        />
        {error && <span className="block mt-1 text-xs text-destructive">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

// Select Component
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", label, error, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`w-full px-3 py-2 text-sm bg-card border ${
              error ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
            } rounded-lg text-foreground focus:outline-none focus:ring-1 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-card">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
        {error && <span className="block mt-1 text-xs text-destructive">{error}</span>}
      </div>
    );
  }
);
Select.displayName = "Select";

// Card Component
export const Card = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`bg-card text-card-foreground border border-border rounded-xl shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 border-b border-border flex flex-col space-y-1.5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-muted-foreground ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 border-t border-border flex items-center ${className}`} {...props}>
    {children}
  </div>
);

// Badge Component
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "destructive";
}

export const Badge = ({ className = "", variant = "primary", children, ...props }: BadgeProps) => {
  const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border";
  const variants = {
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary text-secondary-foreground border-border",
    success: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20"
  };

  return (
    <span className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};

// Alert Component
export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "warning" | "error" | "success";
  title?: string;
}

export const Alert = ({ className = "", variant = "info", title, children, ...props }: AlertProps) => {
  const variants = {
    info: "bg-blue-500/10 text-blue-800 dark:text-blue-200 border-blue-500/20",
    warning: "bg-yellow-500/10 text-yellow-800 dark:text-yellow-200 border-yellow-500/20",
    error: "bg-destructive/10 text-destructive border-destructive/20",
    success: "bg-green-500/10 text-green-800 dark:text-green-200 border-green-500/20"
  };

  return (
    <div className={`p-4 border rounded-lg flex flex-col space-y-1 ${variants[variant]} ${className}`} {...props}>
      {title && <span className="font-semibold text-sm">{title}</span>}
      <div className="text-xs">{children}</div>
    </div>
  );
};

// Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-200">
      <div 
        className="w-full max-w-lg bg-card text-card-foreground border border-border rounded-xl shadow-lg flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
