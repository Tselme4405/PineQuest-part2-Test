"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import type { MonitoringState, EventType } from "@/types";
import { postEvent } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estimateRawHeadDir(
  lm: Array<{ x: number; y: number; z: number }>
): "left" | "right" | "center" {
  const nose = lm[1], lc = lm[234], rc = lm[454];
  if (!nose || !lc || !rc) return "center";
  const cx = (lc.x + rc.x) / 2;
  const w = Math.abs(rc.x - lc.x);
  if (w < 0.04) return "center";
  const off = (nose.x - cx) / w;
  if (off < -0.07) return "left";
  if (off > 0.07) return "right";
  return "center";
}

function rawToUi(r: "left" | "right" | "center"): "left" | "right" | "center" {
  if (r === "left") return "right";
  if (r === "right") return "left";
  return "center";
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ─── Main hook ────────────────────────────────────────────────────────────────

interface UseMonitoringOptions {
  sessionId: string;
  enabled: boolean;
  onEvent?: (type: EventType, eventId: string) => void;
}

export function useMonitoring({ sessionId, enabled, onEvent }: UseMonitoringOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const faceRef = useRef<FaceLandmarker | null>(null);
  const detectorRef = useRef<cocoSsd.ObjectDetection | null>(null);

  const lastTimeRef = useRef(-1);
  const lastDirRef = useRef<"left" | "right" | "center" | "no-face">("no-face");

  // Frame counters & cooldowns
  const headFrames = useRef(0);
  const noFaceFrames = useRef(0);
  const phoneFrames = useRef(0);
  const headCooldown = useRef(0);
  const noFaceCooldown = useRef(0);
  const phoneCooldown = useRef(0);

  const [modelLoading, setModelLoading] = useState(true);
  const [camError, setCamError] = useState(false);
  const [state, setState] = useState<MonitoringState>({
    faceVisible: false,
    multipleFaces: false,
    phoneDetected: false,
    tabActive: true,
    warningCount: 0,
  });

  // ── Tab visibility ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    function onVisible() {
      if (document.hidden) {
        setState((s) => ({ ...s, tabActive: false }));
        fireEvent("TAB_SWITCH");
      } else {
        setState((s) => ({ ...s, tabActive: true }));
      }
    }

    function onBlur() {
      setState((s) => ({ ...s, tabActive: false }));
      fireEvent("WINDOW_BLUR");
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Event emitter ──────────────────────────────────────────────────────────
  const fireEvent = useCallback(async (type: EventType) => {
    if (!sessionId) return;
    try {
      const { event } = await postEvent(sessionId, type);
      onEvent?.(type, event.id);
    } catch {
      // best-effort
    }
  }, [sessionId, onEvent]);

  // ── Camera + AI setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true, // needed for clip recording
        });
        if (!alive || !videoRef.current) return;
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
        );
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          },
          runningMode: "VIDEO",
          numFaces: 2, // detect up to 2 for multiple-face check
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
        const detector = await cocoSsd.load({ base: "lite_mobilenet_v2" });

        if (!alive) return;
        faceRef.current = faceLandmarker;
        detectorRef.current = detector;
        setModelLoading(false);
        startLoop();
      } catch {
        if (!alive) return;
        setCamError(true);
        setModelLoading(false);
      }
    }

    function startLoop() {
      const tick = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const face = faceRef.current;
        const det = detectorRef.current;
        if (!video || !canvas || !face || !det) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }
        if (video.readyState < 2 || video.videoWidth === 0) {
          rafRef.current = requestAnimationFrame(tick); return;
        }

        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const now = Date.now();

        // ── Face detection ──
        let faceCount = 0;
        let headDir: "left" | "right" | "center" | "no-face" = lastDirRef.current;

        if (video.currentTime !== lastTimeRef.current) {
          lastTimeRef.current = video.currentTime;
          const result = face.detectForVideo(video, performance.now());

          if (result.faceLandmarks && result.faceLandmarks.length > 0) {
            faceCount = result.faceLandmarks.length;
            const lm = result.faceLandmarks[0];
            const raw = estimateRawHeadDir(lm);
            const ui = rawToUi(raw);
            headDir = ui;
            lastDirRef.current = ui;
            noFaceFrames.current = 0;

            for (let i = 0; i < lm.length; i += 5) {
              const p = lm[i];
              ctx.beginPath();
              ctx.arc(p.x * canvas.width, p.y * canvas.height, 1.5, 0, Math.PI * 2);
              ctx.fillStyle = "rgba(56,189,248,0.75)";
              ctx.fill();
            }
            const nose = lm[1];
            if (nose) {
              ctx.beginPath();
              ctx.arc(nose.x * canvas.width, nose.y * canvas.height, 5, 0, Math.PI * 2);
              ctx.fillStyle = "#f59e0b";
              ctx.fill();
            }
          } else {
            faceCount = 0;
            headDir = "no-face";
            lastDirRef.current = "no-face";
            noFaceFrames.current += 1;
          }
        }

        const faceVisible = faceCount > 0;
        const multipleFaces = faceCount > 1;

        // ── No-face alert ──
        if (!faceVisible && noFaceFrames.current >= 12 && now > noFaceCooldown.current) {
          fireEvent("NO_FACE");
          noFaceCooldown.current = now + 5000;
          noFaceFrames.current = 0;
        }

        // ── Multiple faces ──
        if (multipleFaces && now > headCooldown.current) {
          fireEvent("MULTIPLE_FACES");
          headCooldown.current = now + 5000;
        }

        // ── Head direction ──
        if (headDir === "left" || headDir === "right") {
          headFrames.current += 1;
        } else {
          headFrames.current = 0;
        }
        if ((headDir === "left" || headDir === "right") && headFrames.current >= 10 && now > headCooldown.current) {
          fireEvent("LOOKING_AWAY");
          headCooldown.current = now + 4000;
          headFrames.current = 0;
        }

        // ── Phone detection ──
        const preds = await det.detect(video);
        const phones = preds.filter(
          (p) => p.class?.toLowerCase() === "cell phone" && (p.score ?? 0) >= 0.45
        );
        const phoneDetected = phones.length > 0;

        for (const p of phones) {
          const [bx, by, bw, bh] = p.bbox;
          roundRect(ctx, bx, by, bw, bh, 10);
          ctx.strokeStyle = "rgba(239,68,68,0.95)";
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.fillStyle = "rgba(239,68,68,0.90)";
          roundRect(ctx, bx, Math.max(0, by - 26), 110, 22, 6);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px sans-serif";
          ctx.fillText(`Утас ${Math.round((p.score ?? 0) * 100)}%`, bx + 6, Math.max(14, by - 10));
        }

        if (phoneDetected) phoneFrames.current += 1;
        else phoneFrames.current = 0;

        if (phoneDetected && phoneFrames.current >= 8 && now > phoneCooldown.current) {
          fireEvent("PHONE_DETECTED");
          phoneCooldown.current = now + 4500;
          phoneFrames.current = 0;
        }

        setState((s) => ({
          ...s,
          faceVisible,
          multipleFaces,
          phoneDetected,
        }));

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    setup();
    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      faceRef.current?.close?.();
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    videoRef,
    canvasRef,
    streamRef,
    state,
    setState,
    modelLoading,
    camError,
  };
}
