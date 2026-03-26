"use client";

import { useEffect, useState } from "react";

interface AlertBannerProps {
  text: string;
  isPhone?: boolean;
  onDismiss?: () => void;
}

export function AlertBanner({ text, isPhone, onDismiss }: AlertBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 3500);
    return () => clearTimeout(t);
  }, [text, onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg"
      style={{
        background: isPhone ? "rgba(239,68,68,0.95)" : "rgba(234,88,12,0.94)",
        borderLeft: `4px solid ${isPhone ? "#fca5a5" : "#fed7aa"}`,
        animation: "slideIn 0.2s ease",
      }}
    >
      <span className="text-lg">{isPhone ? "📱" : "⚠️"}</span>
      {text}
    </div>
  );
}

interface AlertStackProps {
  alerts: Array<{ id: string; text: string; isPhone?: boolean }>;
  onRemove: (id: string) => void;
}

export function AlertStack({ alerts, onRemove }: AlertStackProps) {
  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a) => (
        <AlertBanner
          key={a.id}
          text={a.text}
          isPhone={a.isPhone}
          onDismiss={() => onRemove(a.id)}
        />
      ))}
    </div>
  );
}
