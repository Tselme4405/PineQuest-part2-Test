import type { ReactNode } from "react";

type BadgeTone = "good" | "warn" | "danger" | "neutral" | "info";

const toneClasses: Record<BadgeTone, string> = {
  good:    "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
  warn:    "bg-amber-500/15   text-amber-300   border border-amber-500/25",
  danger:  "bg-red-500/15    text-red-300     border border-red-500/25",
  neutral: "bg-white/5       text-slate-400   border border-white/10",
  info:    "bg-indigo-500/15  text-indigo-300  border border-indigo-500/25",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}

export function Badge({ tone = "neutral", children, dot, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${toneClasses[tone]} ${className}`}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background:
              tone === "good" ? "#34d399" :
              tone === "warn" ? "#fbbf24" :
              tone === "danger" ? "#f87171" :
              tone === "info" ? "#818cf8" : "#64748b",
          }}
        />
      )}
      {children}
    </span>
  );
}

interface StatusPillProps {
  label: string;
  value: string;
  tone?: BadgeTone;
}

export function StatusPill({ label, value, tone = "neutral" }: StatusPillProps) {
  const c: Record<BadgeTone, { bg: string; border: string; label: string; value: string }> = {
    good:    { bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.20)",  label: "#86efac", value: "#dcfce7" },
    warn:    { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.20)", label: "#fcd34d", value: "#fef3c7" },
    danger:  { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.20)",  label: "#fca5a5", value: "#fee2e2" },
    neutral: { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)", label: "#94a3b8", value: "#e2e8f0" },
    info:    { bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.20)", label: "#a5b4fc", value: "#e0e7ff" },
  };
  const s = c[tone];
  return (
    <div
      className="p-3 rounded-xl"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: s.label }}>
        {label}
      </div>
      <div className="text-sm font-bold" style={{ color: s.value }}>
        {value}
      </div>
    </div>
  );
}
