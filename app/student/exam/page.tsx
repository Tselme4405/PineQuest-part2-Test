"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getDefaultExam, submitAnswers } from "@/lib/api";
import { useMonitoring } from "@/hooks/useMonitoring";
import { useVideoBuffer } from "@/hooks/useVideoBuffer";
import { useSocket } from "@/hooks/useSocket";
import type { Exam, EventType, MonitoringState } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/Badge";
import { AlertStack } from "@/components/monitoring/AlertBanner";
import { MiniCam } from "@/components/monitoring/MiniCam";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiveAlert {
  id: string;
  text: string;
  isPhone: boolean;
}

const EVENT_ALERT: Partial<Record<EventType, { text: string; isPhone?: boolean }>> = {
  NO_FACE:        { text: "Царай илрээгүй" },
  MULTIPLE_FACES: { text: "Олон хүн илэрлээ", isPhone: false },
  LOOKING_AWAY:   { text: "Тийш харав" },
  PHONE_DETECTED: { text: "Утас илэрлээ", isPhone: true },
  TAB_SWITCH:     { text: "Таб сэлгэсэн зөрчил" },
  WINDOW_BLUR:    { text: "Цонх сэлгэсэн зөрчил" },
};

// ─── Timer ───────────────────────────────────────────────────────────────────

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Question card ────────────────────────────────────────────────────────────

function QuestionCard({
  q,
  index,
  total,
  selected,
  onSelect,
  onNext,
  onSubmit,
  isLast,
}: {
  q: { id: string; text: string; options: string[] };
  index: number;
  total: number;
  selected: number | undefined;
  onSelect: (i: number) => void;
  onNext: () => void;
  onSubmit: () => void;
  isLast: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Асуулт {index + 1} / {total}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className="h-1 w-8 rounded-full transition-all"
              style={{ background: i <= index ? "#6366f1" : "#1e293b" }}
            />
          ))}
        </div>
      </div>

      <h3 className="text-slate-100 text-lg font-bold leading-snug mb-6">{q.text}</h3>

      <div className="space-y-3 mb-8">
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 text-sm font-medium cursor-pointer ${
              selected === i
                ? "border-indigo-500/60 bg-indigo-500/15 text-indigo-300"
                : "border-white/[0.06] bg-white/[0.02] text-slate-300 hover:bg-white/[0.05] hover:border-white/15"
            }`}
          >
            <span className="mr-3 text-slate-500">
              {["А", "Б", "В", "Г"][i]}.
            </span>
            {opt}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        {isLast ? (
          <Button
            onClick={onSubmit}
            disabled={selected === undefined}
            size="lg"
          >
            Шалгалт дуусгах ✓
          </Button>
        ) : (
          <Button
            onClick={onNext}
            disabled={selected === undefined}
            size="lg"
          >
            Дараагийн асуулт →
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main exam page ──────────────────────────────────────────────────────────

function ExamPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session") ?? "";

  const [exam, setExam] = useState<Exam | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [submitted, setSubmitted] = useState(false);
  const [invalidated, setInvalidated] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [examStarted, setExamStarted] = useState(false);

  const addAlert = useCallback((text: string, isPhone?: boolean) => {
    const id = crypto.randomUUID();
    setLiveAlerts((prev) => [...prev, { id, text, isPhone: !!isPhone }]);
  }, []);

  const removeAlert = useCallback((id: string) => {
    setLiveAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ── Load exam ──
  useEffect(() => {
    getDefaultExam().then(({ exam }) => {
      setExam(exam);
      setTimeLeft(exam.durationSec);
    });
  }, []);

  // ── Timer ──
  useEffect(() => {
    if (!examStarted || submitted || invalidated) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, examStarted, submitted, invalidated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Monitoring events → alerts ──
  const handleEvent = useCallback((type: EventType, _eventId: string) => {
    const cfg = EVENT_ALERT[type];
    if (cfg) addAlert(cfg.text, cfg.isPhone);
  }, [addAlert]);

  const {
    videoRef,
    canvasRef,
    streamRef,
    state: monState,
    modelLoading,
  } = useMonitoring({
    sessionId,
    enabled: examStarted && !submitted && !invalidated,
    onEvent: handleEvent,
  });

  const { start: startBuffer, captureAndUpload, stop: stopBuffer } = useVideoBuffer(sessionId);

  // Start video buffer when stream is ready
  useEffect(() => {
    if (!examStarted || !streamRef.current) return;
    startBuffer(streamRef.current);
    return () => stopBuffer();
  }, [examStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Socket: real-time teacher actions ──
  useSocket({
    room: sessionId,
    enabled: !!sessionId,
    events: {
      warned: (data: unknown) => {
        const d = data as { warningCount: number; status: string };
        setWarningCount(d.warningCount);
        addAlert(`⚠️ Багш анхааруулга илгээлээ (${d.warningCount}/3)`);
        if (d.status === "invalid") setInvalidated(true);
      },
      invalidated: () => {
        setInvalidated(true);
      },
    },
  });

  // ── Submit ──
  async function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
    stopBuffer();
    if (sessionId) {
      try {
        await submitAnswers(sessionId, answers);
      } catch { /* best-effort */ }
    }
  }

  const timerRed = timeLeft < 60;

  // ── Invalidated screen ──
  if (invalidated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#020617" }}>
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-bold text-red-400 mb-3">Шалгалт хүчингүй болсон</h2>
          <p className="text-slate-400 text-sm mb-8">
            Таны шалгалт дүрэм зөрчсөн тул хүчингүй болгогдлоо.
          </p>
          <Button onClick={() => router.push("/")} variant="ghost">
            Нүүр хуудас руу буцах
          </Button>
        </div>
      </div>
    );
  }

  // ── Submitted / done screen ──
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#020617" }}>
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-2xl font-bold text-emerald-400 mb-3">Шалгалт амжилттай дууслаа!</h2>
          <p className="text-slate-400 text-sm mb-8">Хариулт хадгалагдлаа. Та гарч болно.</p>
          <Button onClick={() => router.push("/")} variant="ghost">
            Нүүр хуудас руу буцах
          </Button>
        </div>
      </div>
    );
  }

  // ── Pre-exam: waiting for models ──
  if (!examStarted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "radial-gradient(ellipse 80% 60% at 20% 10%, #1e293b 0%, #0f172a 50%, #020617 100%)" }}
      >
        <div className="text-center max-w-sm">
          <div
            className="w-12 h-12 rounded-full border-[3px] border-indigo-500/20 border-t-indigo-400 mx-auto mb-6"
            style={{ animation: "spin 0.9s linear infinite" }}
          />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Систем бэлдэж байна...</h2>
          <p className="text-slate-500 text-sm mb-8">Камер болон AI загвар ачааллаж байна.</p>

          {/* Auto-start once session ready */}
          <Button onClick={() => setExamStarted(true)} disabled={!sessionId}>
            Шалгалт эхлүүлэх
          </Button>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#020617" }}>
        <div className="text-slate-400">Ачааллаж байна...</div>
      </div>
    );
  }

  const currentQ = exam.questions[qIndex];
  const currentAnswer = answers[currentQ?.id ?? ""];

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
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
            <span className="text-sm font-semibold text-slate-200">{exam.title}</span>
          </div>
          <div className="flex items-center gap-4">
            {warningCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                ⚠️ {warningCount}/3
              </div>
            )}
            <div
              className={`font-mono text-lg font-bold px-4 py-1 rounded-xl ${
                timerRed
                  ? "text-red-400 bg-red-500/10 border border-red-500/20"
                  : "text-slate-200 bg-white/5 border border-white/10"
              }`}
            >
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Left: Question ── */}
        <Card>
          <QuestionCard
            q={currentQ}
            index={qIndex}
            total={exam.questions.length}
            selected={currentAnswer}
            onSelect={(i) => setAnswers((a) => ({ ...a, [currentQ.id]: i }))}
            onNext={() => setQIndex((i) => Math.min(i + 1, exam.questions.length - 1))}
            onSubmit={handleSubmit}
            isLast={qIndex === exam.questions.length - 1}
          />
        </Card>

        {/* ── Right: Monitoring ── */}
        <div className="space-y-4">
          {/* Live alerts */}
          <div className="min-h-[40px]">
            <AlertStack alerts={liveAlerts} onRemove={removeAlert} />
          </div>

          {/* Camera preview */}
          <Card title="Хяналтын камер" right={
            <span className="text-xs text-slate-600">{modelLoading ? "Ачааллаж байна..." : "Идэвхтэй"}</span>
          }>
            <MiniCam
              videoRef={videoRef}
              canvasRef={canvasRef}
              status={modelLoading ? "loading" : "active"}
            />
          </Card>

          {/* Monitoring status */}
          <Card title="Хяналтын төлөв">
            <div className="grid grid-cols-2 gap-2">
              <StatusPill
                label="Царай"
                value={monState.faceVisible ? "Харагдаж байна" : "Харагдахгүй"}
                tone={monState.faceVisible ? "good" : "danger"}
              />
              <StatusPill
                label="Олон хүн"
                value={monState.multipleFaces ? "Илэрлээ" : "Цэвэр"}
                tone={monState.multipleFaces ? "danger" : "good"}
              />
              <StatusPill
                label="Утас"
                value={monState.phoneDetected ? "Илэрлээ" : "Цэвэр"}
                tone={monState.phoneDetected ? "danger" : "good"}
              />
              <StatusPill
                label="Таб"
                value={monState.tabActive ? "Идэвхтэй" : "Идэвхгүй"}
                tone={monState.tabActive ? "good" : "warn"}
              />
              <div className="col-span-2">
                <StatusPill
                  label="Анхааруулга"
                  value={`${warningCount} / 3`}
                  tone={warningCount >= 3 ? "danger" : warningCount > 0 ? "warn" : "good"}
                />
              </div>
            </div>
          </Card>

          {/* Danger submit */}
          <button
            onClick={handleSubmit}
            className="w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
          >
            Шалгалтаас гарах
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#020617" }}>
        <div className="text-slate-400">Ачааллаж байна...</div>
      </div>
    }>
      <ExamPageInner />
    </Suspense>
  );
}
