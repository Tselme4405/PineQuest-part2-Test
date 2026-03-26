"use client";

import type { MonitoringState } from "@/types";
import { StatusPill } from "@/components/ui/Badge";

interface MonitoringPanelProps {
  state: MonitoringState;
  sessionId: string;
}

const EVENT_LABELS: Record<string, string> = {
  NO_FACE: "Царай байхгүй",
  MULTIPLE_FACES: "Олон хүн",
  LOOKING_AWAY: "Тийш харав",
  PHONE_DETECTED: "Утас илэрлээ",
  TAB_SWITCH: "Таб солив",
  WINDOW_BLUR: "Цонх солив",
  FULLSCREEN_EXIT: "Дэлгэц гарав",
};

export function MonitoringPanel({ state }: MonitoringPanelProps) {
  const headTone =
    !state.faceVisible ? "danger" :
    state.multipleFaces ? "warn" : "good";

  const headValue =
    !state.faceVisible ? "Илрэхгүй" :
    state.multipleFaces ? "Олон хүн" : "Харагдаж байна";

  const warnTone =
    state.warningCount >= 3 ? "danger" :
    state.warningCount > 0 ? "warn" : "good";

  return (
    <div className="grid grid-cols-2 gap-2">
      <StatusPill
        label="Царай"
        value={headValue}
        tone={headTone}
      />
      <StatusPill
        label="Утас"
        value={state.phoneDetected ? "Илэрлээ" : "Цэвэр"}
        tone={state.phoneDetected ? "danger" : "good"}
      />
      <StatusPill
        label="Таб"
        value={state.tabActive ? "Идэвхтэй" : "Идэвхгүй"}
        tone={state.tabActive ? "good" : "warn"}
      />
      <StatusPill
        label="Анхааруулга"
        value={`${state.warningCount} / 3`}
        tone={warnTone}
      />
    </div>
  );
}

export { EVENT_LABELS };
