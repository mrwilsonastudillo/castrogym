"use client";
import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

// Button
type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}
export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: BtnProps) {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<BtnVariant, string> = {
    primary: "bg-sky-500 hover:bg-sky-600 text-white",
    secondary: "bg-white border border-gray-200 hover:bg-gray-50 text-gray-700",
    ghost: "hover:bg-gray-100 text-gray-700",
    danger: "bg-red-500 hover:bg-red-600 text-white",
  };
  const sizes = { sm: "text-sm px-3 py-1.5", md: "text-sm px-4 py-2", lg: "px-6 py-3" };
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}

// Input
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        className={cn(
          "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-colors",
          error && "border-red-400",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";

// Select
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        id={id}
        ref={ref}
        className={cn(
          "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 bg-white transition-colors",
          error && "border-red-400",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
);
Select.displayName = "Select";

// Card
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}
export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-6 pt-5 pb-3", className)}>{children}</div>;
}
export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h2 className={cn("text-lg font-semibold text-gray-900", className)}>{children}</h2>;
}
export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-6 pb-6", className)}>{children}</div>;
}

// Badge
type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";
export function Badge({ variant = "default", children }: { variant?: BadgeVariant; children: ReactNode }) {
  const v: Record<BadgeVariant, string> = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-sky-100 text-sky-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", v[variant])}>
      {children}
    </span>
  );
}

// Spinner
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent",
        className
      )}
    />
  );
}

// Alert
export function Alert({ type = "error", children, className }: { type?: "error" | "success" | "info"; children: ReactNode; className?: string }) {
  const v = {
    error: "bg-red-50 text-red-700 border-red-200",
    success: "bg-green-50 text-green-700 border-green-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
  };
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", v[type], className)}>{children}</div>
  );
}

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}
export function Textarea({ label, id, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 resize-none transition-colors",
          className
        )}
        rows={3}
        {...props}
      />
    </div>
  );
}
