"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAllSessions, warnStudent, invalidateExam } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import type { ExamSession, AlertEvent } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StudentCard } from "@/components/teacher/StudentCard";
import { EventLogItem } from "@/components/teacher/EventLogItem";
import { StatusPill } from "@/components/ui/Badge";

const EVENT_LABELS: Record<string, string> = {
  NO_FACE:         "Царай илрэхгүй",
  MULTIPLE_FACES:  "Олон хүн илэрлээ",
  LOOKING_AWAY:    "Тийш харав",
  PHONE_DETECTED:  "Утас илэрлээ",
  TAB_SWITCH:      "Таб сэлгэв",
  WINDOW_BLUR:     "Цонх сэлгэв",
  FULLSCREEN_EXIT: "Дэлгэцнээс гарав",
};

const STATUS_MAP = {
  active:    { label: "Идэвхтэй",  tone: "good"    as const },
  completed: { label: "Дууссан",   tone: "info"    as const },
  invalid:   { label: "Хүчингүй", tone: "danger"  as const },
};

export default function TeacherPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [selected, setSelected] = useState<ExamSession | null>(null);
  const [actioning, setActioning] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const { sessions } = await getAllSessions();
      setSessions(sessions);
      // Keep selected in sync
      if (selected) {
        const updated = sessions.find((s) => s.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch { /* best-effort */ }
  }, [selected]);

  useEffect(() => {
    loadSessions();
    // Poll every 5s as fallback
    const t = setInterval(loadSessions, 5000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time socket updates ──
  useSocket({
    room: "teachers",
    events: {
      "session:created": (data: unknown) => {
        const d = data as { session: ExamSession };
        setSessions((prev) => {
          const exists = prev.find((s) => s.id === d.session.id);
          return exists ? prev : [d.session, ...prev];
        });
      },
      "session:updated": (data: unknown) => {
        const d = data as { session: ExamSession };
        setSessions((prev) =>
          prev.map((s) => (s.id === d.session.id ? d.session : s))
        );
        setSelected((prev) =>
          prev?.id === d.session.id ? d.session : prev
        );
      },
      "session:event": (data: unknown) => {
        const d = data as { sessionId: string; event: AlertEvent };
        setSessions((prev) =>
          prev.map((s) =>
            s.id === d.sessionId
              ? { ...s, events: [...s.events, d.event] }
              : s
          )
        );
        setSelected((prev) =>
          prev?.id === d.sessionId
            ? { ...prev, events: [...prev.events, d.event] }
            : prev
        );
      },
    },
  });

  async function handleWarn(sessionId: string) {
    setActioning(true);
    try {
      const { session } = await warnStudent(sessionId);
      setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
      setSelected((prev) => (prev?.id === session.id ? session : prev));
    } catch { /* best-effort */ }
    setActioning(false);
  }

  async function handleInvalidate(sessionId: string) {
    if (!confirm("Шалгалтыг хүчингүй болгох уу?")) return;
    setActioning(true);
    try {
      const { session } = await invalidateExam(sessionId);
      setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
      setSelected((prev) => (prev?.id === session.id ? session : prev));
    } catch { /* best-effort */ }
    setActioning(false);
  }

  const activeSessions = sessions.filter((s) => s.status === "active");
  const doneSessions = sessions.filter((s) => s.status !== "active");

  return (
    <div
      className="min-h-screen"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 20% 10%, #1e293b 0%, #0f172a 50%, #020617 100%)",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <div className="border-b border-white/[0.06] bg-slate-900/60 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer mr-2"
            >
              ←
            </button>
            <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
            <span className="text-sm font-bold text-slate-200">Багшийн Хяналтын Самбар</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="good" dot>{activeSessions.length} идэвхтэй</Badge>
            <button
              onClick={loadSessions}
              className="text-slate-500 hover:text-slate-300 text-xs transition-colors cursor-pointer"
            >
              ↻ Шинэчлэх
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">

        {/* ── Left: Student list ── */}
        <div className="space-y-4">
          <Card title="Идэвхтэй оюутнууд">
            {activeSessions.length === 0 ? (
              <div className="text-slate-600 text-sm text-center py-6">
                Одоогоор шалгалт өгч буй оюутан байхгүй
              </div>
            ) : (
              <div className="space-y-2">
                {activeSessions.map((s) => (
                  <StudentCard
                    key={s.id}
                    session={s}
                    selected={selected?.id === s.id}
                    onClick={() => setSelected(s)}
                  />
                ))}
              </div>
            )}
          </Card>

          {doneSessions.length > 0 && (
            <Card title="Дууссан шалгалтууд">
              <div className="space-y-2">
                {doneSessions.map((s) => (
                  <StudentCard
                    key={s.id}
                    session={s}
                    selected={selected?.id === s.id}
                    onClick={() => setSelected(s)}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── Right: Detail panel ── */}
        {selected ? (
          <div className="space-y-4">
            {/* Student info header */}
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-slate-100">{selected.studentName}</h2>
                    <Badge tone={STATUS_MAP[selected.status].tone} dot>
                      {STATUS_MAP[selected.status].label}
                    </Badge>
                  </div>
                  <div className="text-slate-500 text-sm">
                    ID: {selected.studentId} · Эхэлсэн: {new Date(selected.startedAt).toLocaleTimeString("mn-MN")}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="warn"
                    size="sm"
                    onClick={() => handleWarn(selected.id)}
                    disabled={actioning || selected.status !== "active"}
                  >
                    Анхааруулах
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleInvalidate(selected.id)}
                    disabled={actioning || selected.status !== "active"}
                  >
                    Хүчингүй болгох
                  </Button>
                </div>
              </div>
            </Card>

            {/* Status grid */}
            <Card title="Хяналтын Төлөв">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatusPill
                  label="Статус"
                  value={STATUS_MAP[selected.status].label}
                  tone={STATUS_MAP[selected.status].tone}
                />
                <StatusPill
                  label="Анхааруулга"
                  value={`${selected.warningCount} / 3`}
                  tone={selected.warningCount >= 3 ? "danger" : selected.warningCount > 0 ? "warn" : "good"}
                />
                <StatusPill
                  label="Үйл явдал"
                  value={`${selected.events.length}`}
                  tone={selected.events.length > 5 ? "warn" : "neutral"}
                />
                <StatusPill
                  label="Бичлэг"
                  value={`${selected.clips.length}`}
                  tone="neutral"
                />
              </div>
            </Card>

            {/* Warning banner if 3+ */}
            {selected.warningCount >= 3 && (
              <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-bold text-sm flex items-center gap-3">
                <span className="text-2xl">⛔</span>
                Шалгалт автоматаар хүчингүй болсон — 3 анхааруулга хүрлээ.
              </div>
            )}

            {/* Event log */}
            <Card
              title={`Үйл явдлын бүртгэл (${selected.events.length})`}
              right={
                selected.events.length > 0 ? (
                  <Badge tone="warn">{selected.events.length}</Badge>
                ) : null
              }
            >
              {selected.events.length === 0 ? (
                <div className="text-slate-600 text-sm text-center py-8">
                  Одоогоор зөрчил бүртгэгдээгүй байна
                </div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {[...selected.events].reverse().map((event) => (
                    <EventLogItem
                      key={event.id}
                      event={event}
                      onWarn={() => handleWarn(selected.id)}
                      onInvalidate={() => handleInvalidate(selected.id)}
                      disabled={actioning || selected.status !== "active"}
                    />
                  ))}
                </div>
              )}
            </Card>

            {/* Teacher actions log */}
            {selected.actions.length > 0 && (
              <Card title="Багшийн үйлдлийн бүртгэл">
                <div className="space-y-2">
                  {selected.actions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{
                        background:
                          action.type === "invalidate"
                            ? "rgba(239,68,68,0.08)"
                            : "rgba(245,158,11,0.08)",
                        border:
                          action.type === "invalidate"
                            ? "1px solid rgba(239,68,68,0.18)"
                            : "1px solid rgba(245,158,11,0.18)",
                      }}
                    >
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color: action.type === "invalidate" ? "#fca5a5" : "#fde68a",
                        }}
                      >
                        {action.type === "invalidate" ? "⛔ Хүчингүй болгосон" : "⚠️ Анхааруулга илгээсэн"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(action.timestamp).toLocaleTimeString("mn-MN")}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-4">👆</div>
              <div className="text-slate-500 text-sm">
                Зүүн талаас оюутан сонгоно уу
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
