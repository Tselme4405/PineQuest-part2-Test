import type { ReactNode, CSSProperties } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Card({ title, children, right, className = "", style }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.07] bg-slate-900/80 backdrop-blur-xl shadow-2xl ${className}`}
      style={style}
    >
      {title && (
        <div className="flex items-center justify-between px-5 pt-5 pb-0 mb-4">
          <span className="text-sm font-bold text-slate-200 tracking-tight">
            {title}
          </span>
          {right}
        </div>
      )}
      <div className={title ? "px-5 pb-5" : "p-5"}>{children}</div>
    </div>
  );
}
