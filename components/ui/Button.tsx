import type { ReactNode, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "danger" | "warn" | "ghost" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 shadow-lg shadow-indigo-900/30",
  danger:
    "bg-red-600/90 hover:bg-red-500 text-white border border-red-500/50 shadow-lg shadow-red-900/30",
  warn: "bg-amber-500/90 hover:bg-amber-400 text-white border border-amber-400/50 shadow-lg shadow-amber-900/30",
  ghost:
    "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10",
  outline:
    "bg-transparent hover:bg-white/5 text-slate-300 border border-white/20",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`
        font-semibold transition-all duration-150 cursor-pointer
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
