"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startSession, registerFace } from "@/lib/api";
import { Button } from "@/components/ui/Button";

type Step = "register" | "camera" | "face" | "warning" | "ready";

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div
      className="w-3 h-3 rounded-full border-2 transition-all duration-300"
      style={{
        background: done ? "#6366f1" : active ? "#6366f1" : "transparent",
        borderColor: done || active ? "#6366f1" : "#334155",
      }}
    />
  );
}

export default function StudentPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>("register");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [faceImage, setFaceImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [camLoading, setCamLoading] = useState(false);
  const [camError, setCamError] = useState("");

  const steps: Step[] = ["register", "camera", "face", "warning", "ready"];
  const stepIdx = steps.indexOf(step);

  // ── Camera lifecycle ───────────────────────────────────────────────────────
  // Fires after the video element is in the DOM (after paint).
  // "camera" step → request getUserMedia and attach stream.
  // "face" step   → re-attach the already-running stream to the freshly-
  //                 mounted video element (conditional render swaps elements).

  useEffect(() => {
    if (step === "camera") {
      startCamera();
    } else if (step === "face" && streamRef.current) {
      // The "face" step mounts a new <video> element; re-attach the stream.
      const video = videoRef.current;
      if (video) {
        video.srcObject = streamRef.current;
        video.play().catch(() => {});
      }
    }
    // Cleanup: stop tracks when leaving the camera flow entirely.
    return () => {
      if (step === "warning" || step === "ready") {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  async function startCamera() {
    setCamLoading(true);
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
    } catch {
      setCamError("Камерт нэвтрэх боломжгүй. Браузерын зөвшөөрлийг шалгана уу.");
    } finally {
      setCamLoading(false);
    }
  }

  // ── Step 1: Register ──────────────────────────────────────────────────────
  // No camera work here — camera starts automatically via useEffect above.

  async function handleRegister() {
    if (!name.trim() || !studentId.trim()) {
      setError("Нэр болон оюутны дугаараа оруулна уу.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { session } = await startSession(name.trim(), studentId.trim(), "exam-default");
      setSessionId(session.id);
      setStep("camera"); // useEffect handles camera start after render
    } catch {
      setError("Сервертэй холбогдоход алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: Face registration — only captures, does NOT start camera ──────

  const captureface = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setFaceImage(dataUrl);
    setLoading(true);

    try {
      await registerFace(sessionId, dataUrl);
      setStep("warning");
    } catch {
      setError("Царай бүртгэхэд алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  function handleStartExam() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    router.push(`/student/exam?session=${sessionId}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 20% 10%, #1e293b 0%, #0f172a 50%, #020617 100%)",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div className="w-full max-w-lg">
        {/* Back */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-8 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Буцах
        </button>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <StepDot active={step === s} done={stepIdx > i} />
              {i < steps.length - 1 && (
                <div
                  className="h-px flex-1 w-8 transition-all duration-300"
                  style={{ background: stepIdx > i ? "#6366f1" : "#1e293b" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/[0.07] bg-slate-900/80 backdrop-blur-xl p-8 shadow-2xl">

          {/* ── Step: Register ── */}
          {step === "register" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-1">Нэвтрэх</h2>
              <p className="text-slate-500 text-sm mb-8">Шалгалтанд орохын тулд мэдээллээ оруулна уу.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Овог нэр
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Жишээ нь: Болд Батаа"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Оюутны дугаар
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Жишээ нь: 20B12345"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 text-sm transition-all"
                  />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button
                  onClick={handleRegister}
                  disabled={loading}
                  size="lg"
                  className="w-full mt-2"
                >
                  {loading ? "Уншиж байна..." : "Үргэлжлүүлэх →"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step: Camera ── */}
          {step === "camera" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-1">Камер</h2>
              <p className="text-slate-500 text-sm mb-6">
                Камерт нүүр тань тод харагдаж байгааг шалгана уу.
              </p>
              <div
                className="relative rounded-2xl overflow-hidden border border-white/10 mb-6"
                style={{ aspectRatio: "4/3", background: "#020617" }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                {/* Loading overlay — shown while getUserMedia is in-flight */}
                {camLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80">
                    <div
                      className="w-9 h-9 rounded-full border-[3px] border-indigo-500/20 border-t-indigo-400"
                      style={{ animation: "spin 0.85s linear infinite" }}
                    />
                    <span className="text-slate-400 text-sm font-medium">
                      Камер нээж байна...
                    </span>
                  </div>
                )}
              </div>
              {/* Camera permission error */}
              {camError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-500/25 bg-red-500/8 mb-4 text-sm text-red-400">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  {camError}
                </div>
              )}
              <Button
                onClick={() => setStep("face")}
                disabled={camLoading || !!camError}
                size="lg"
                className="w-full"
              >
                Царай бүртгэх →
              </Button>
            </div>
          )}

          {/* ── Step: Face capture ── */}
          {step === "face" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-1">Царай бүртгэх</h2>
              <p className="text-slate-500 text-sm mb-6">
                Нүүр тань тод харагдах байрлалд сууж товчлуурыг дарна уу.
              </p>
              <div
                className="relative rounded-2xl overflow-hidden border border-white/10 mb-6"
                style={{ aspectRatio: "4/3", background: "#020617" }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="w-40 h-52 rounded-full border-2 border-dashed border-indigo-400/60"
                    style={{ boxShadow: "0 0 0 9999px rgba(2,6,23,0.40)" }}
                  />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <Button
                onClick={captureface}
                disabled={loading}
                size="lg"
                className="w-full"
              >
                {loading ? "Бүртгэж байна..." : "📸 Царай бүртгэх"}
              </Button>
            </div>
          )}

          {/* ── Step: Warning ── */}
          {step === "warning" && (
            <div>
              {faceImage && (
                <div className="flex justify-center mb-6">
                  <img
                    src={faceImage}
                    alt="Бүртгэгдсэн царай"
                    className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500/50 shadow-lg shadow-emerald-900/30"
                  />
                </div>
              )}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/8 mb-6">
                <span className="text-2xl">✅</span>
                <div>
                  <div className="font-bold text-emerald-400 text-sm">Царай амжилттай бүртгэгдлээ</div>
                  <div className="text-emerald-500/70 text-xs mt-0.5">Таны нүүр шалгалтын туршид хянагдана</div>
                </div>
              </div>

              <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider mb-3">
                ⚠️ Анхааруулга — заавал уншина уу
              </h3>

              <div className="space-y-2 mb-6">
                {[
                  "Нүүр тань шалгалтын туршид бүрэн харагдаж байх ёстой.",
                  "Өөр хүн дэлгэцэнд харагдвал шалгалт хүчингүй болно.",
                  "Байн байн тийш харвал зөрчил бүртгэгдэнэ.",
                  "Утас болон сэжигтэй зүйл гарвал автоматаар мэдэгдэнэ.",
                  "Вебсайтаас гарвал шалгалт зогсоно.",
                  "Таб сэлгэх эсвэл өөр аппликейшн нээвэл зөрчил болно.",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/5 border border-red-500/12">
                    <span className="text-red-400 text-sm mt-0.5 flex-shrink-0">•</span>
                    <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/6 mb-6 text-sm text-amber-300 text-center font-semibold">
                3 анхааруулга авбал шалгалт автоматаар хүчингүй болно.
              </div>

              <Button onClick={() => setStep("ready")} size="lg" className="w-full">
                Ойлголоо, үргэлжлүүлэх →
              </Button>
            </div>
          )}

          {/* ── Step: Ready ── */}
          {step === "ready" && (
            <div className="text-center">
              <div className="text-6xl mb-6">🚀</div>
              <h2 className="text-2xl font-bold text-slate-100 mb-2">Бэлэн боллоо!</h2>
              <p className="text-slate-400 text-sm mb-2">
                <span className="font-semibold text-slate-200">{name}</span> — Шалгалт эхлэхэд
                бэлэн үү?
              </p>
              <p className="text-slate-500 text-xs mb-8">
                Шалгалтын хугацаа: 30 минут · 3 асуулт
              </p>
              <Button onClick={handleStartExam} size="lg" className="w-full text-base">
                Шалгалт эхлүүлэх
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
