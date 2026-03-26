"use client";

import type { ExamSession } from "@/types";
import { Badge } from "@/components/ui/Badge";

interface StudentCardProps {
  session: ExamSession;
  selected?: boolean;
  onClick: () => void;
}

const statusConfig = {
  active: { label: "Идэвхтэй", tone: "good" as const },
  completed: { label: "Дууссан", tone: "info" as const },
  invalid: { label: "Хүчингүй", tone: "danger" as const },
};

export function StudentCard({ session, selected, onClick }: StudentCardProps) {
  const cfg = statusConfig[session.status];
  const warnTone =
    session.warningCount >= 3 ? "danger" :
    session.warningCount > 0 ? "warn" : "neutral";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
        selected
          ? "border-indigo-500/50 bg-indigo-500/10"
          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-semibold text-slate-200 text-sm truncate">
            {session.studentName}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{session.studentId}</div>
        </div>
        <Badge tone={cfg.tone} dot>
          {cfg.label}
        </Badge>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-slate-500">Анхааруулга:</span>
        <Badge tone={warnTone}>{session.warningCount}</Badge>
        <span className="text-xs text-slate-500 ml-auto">
          {session.events.length} үйл явдал
        </span>
      </div>
    </button>
  );
}
