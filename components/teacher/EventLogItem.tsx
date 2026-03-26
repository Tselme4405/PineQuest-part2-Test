"use client";

import type { AlertEvent } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const EVENT_LABELS: Record<string, string> = {
  NO_FACE:         "Царай илрэхгүй",
  MULTIPLE_FACES:  "Олон хүн илэрлээ",
  LOOKING_AWAY:    "Тийш харав",
  PHONE_DETECTED:  "Утас илэрлээ",
  TAB_SWITCH:      "Таб сэлгэв",
  WINDOW_BLUR:     "Цонх сэлгэв",
  FULLSCREEN_EXIT: "Дэлгэцнээс гарав",
};

const EVENT_TONE: Record<string, "danger" | "warn"> = {
  NO_FACE:         "warn",
  MULTIPLE_FACES:  "danger",
  LOOKING_AWAY:    "warn",
  PHONE_DETECTED:  "danger",
  TAB_SWITCH:      "warn",
  WINDOW_BLUR:     "warn",
  FULLSCREEN_EXIT: "warn",
};

interface EventLogItemProps {
  event: AlertEvent;
  onWarn: () => void;
  onInvalidate: () => void;
  disabled?: boolean;
}

export function EventLogItem({
  event,
  onWarn,
  onInvalidate,
  disabled,
}: EventLogItemProps) {
  const label = EVENT_LABELS[event.type] ?? event.type;
  const tone = EVENT_TONE[event.type] ?? "warn";
  const time = new Date(event.timestamp).toLocaleTimeString("mn-MN");

  return (
    <div
      className="rounded-xl border p-3 gap-3"
      style={{
        borderColor: tone === "danger" ? "rgba(239,68,68,0.18)" : "rgba(245,158,11,0.18)",
        background: tone === "danger" ? "rgba(127,29,29,0.18)" : "rgba(120,53,15,0.18)",
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: tone === "danger" ? "#ef4444" : "#f59e0b" }}
          />
          <span
            className="text-sm font-bold"
            style={{ color: tone === "danger" ? "#fca5a5" : "#fde68a" }}
          >
            {label}
          </span>
        </div>
        <span className="text-xs text-slate-500 shrink-0">{time}</span>
      </div>

      {/* Clip placeholder */}
      {event.clipId ? (
        <div className="mb-2">
          <video
            src={`/api/clips?filename=${event.clipId}`}
            className="w-full rounded-lg"
            controls
            style={{ maxHeight: 80 }}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-14 rounded-lg border border-dashed border-white/10 mb-2 text-xs text-slate-600">
          5 сек бичлэг оруулаагүй
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="warn"
          size="sm"
          onClick={onWarn}
          disabled={disabled}
          className="flex-1"
        >
          Анхааруулах
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onInvalidate}
          disabled={disabled}
          className="flex-1"
        >
          Хүчингүй болгох
        </Button>
      </div>
    </div>
  );
}
