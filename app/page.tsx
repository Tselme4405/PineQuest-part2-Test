"use client";

import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  FaceLandmarker,
  FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

type AlertItem = {
  id: number;
  type: "LOOKING_AWAY";
  message: string;
  time: string;
};

type HeadDirection = "CENTER" | "LEFT" | "RIGHT" | "NO_FACE";

export default function Page() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRunRef = useRef<number>(0);
  const awayStartRef = useRef<number | null>(null);
  const alertIdRef = useRef<number>(1);

  const stableDirectionRef = useRef<HeadDirection>("CENTER");
  const stableCountRef = useRef<number>(0);
  const detectingRef = useRef(false);
  const mountedRef = useRef(false);

  const [status, setStatus] = useState("Starting...");
  const [headDirection, setHeadDirection] = useState<HeadDirection>("NO_FACE");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);

  const addAlert = (message: string) => {
    const now = Date.now();

    setAlerts((prev) => {
      const recentSameAlert = prev.find(
        (item) =>
          item.message === message &&
          now - new Date(item.time).getTime() < 5000,
      );

      if (recentSameAlert) return prev;

      const item: AlertItem = {
        id: alertIdRef.current++,
        type: "LOOKING_AWAY",
        message,
        time: new Date().toISOString(),
      };

      return [item, ...prev].slice(0, 10);
    });
  };

  const getHeadDirection = (result: FaceLandmarkerResult): HeadDirection => {
    const face = result.faceLandmarks?.[0];
    if (!face || face.length === 0) return "NO_FACE";

    const nose = face[1];
    const leftFace = face[234];
    const rightFace = face[454];

    if (!nose || !leftFace || !rightFace) {
      return "NO_FACE";
    }

    const faceCenterX = (leftFace.x + rightFace.x) / 2;
    const faceWidth = Math.abs(rightFace.x - leftFace.x);

    if (faceWidth < 0.01) return "NO_FACE";

    // Small eye movement / reading movement should stay CENTER
    const normalizedOffset = (nose.x - faceCenterX) / faceWidth;

    // Increase threshold so only real head turns are counted
    if (normalizedOffset < -0.14) return "LEFT";
    if (normalizedOffset > 0.14) return "RIGHT";

    return "CENTER";
  };

  useEffect(() => {
    mountedRef.current = true;
    let stream: MediaStream | null = null;

    const init = async () => {
      try {
        setStatus("Opening camera...");

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 960,
            height: 540,
            facingMode: "user",
          },
          audio: false,
        });

        if (!mountedRef.current || !videoRef.current) return;

        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        await new Promise<void>((resolve) => {
          if (!videoRef.current) {
            resolve();
            return;
          }

          const currentVideo = videoRef.current;

          if (currentVideo.readyState >= 2) {
            resolve();
            return;
          }

          const onLoaded = () => {
            currentVideo.removeEventListener("loadeddata", onLoaded);
            resolve();
          };

          currentVideo.addEventListener("loadeddata", onLoaded);
        });

        if (!mountedRef.current) return;

        setStatus("Loading face model...");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm",
        );

        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });

        if (!mountedRef.current) {
          faceLandmarker.close();
          return;
        }

        faceLandmarkerRef.current = faceLandmarker;

        // Give the camera/model a moment before first inference
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (!mountedRef.current) return;

        setIsReady(true);
        setStatus("Monitoring started");
      } catch (error) {
        console.log("Initialization skipped");
        setStatus("Failed to load face model");
      }
    };

    init();

    return () => {
      mountedRef.current = false;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      detectingRef.current = false;

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const loop = () => {
      if (!mountedRef.current) return;

      const video = videoRef.current;
      const faceLandmarker = faceLandmarkerRef.current;

      if (!video || !faceLandmarker) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();

      // Run less often to reduce MediaPipe overlap issues
      if (now - lastRunRef.current > 550) {
        lastRunRef.current = now;

        const isVideoReady =
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          video.videoHeight > 0 &&
          !video.paused &&
          !video.ended;

        if (isVideoReady && !detectingRef.current) {
          detectingRef.current = true;

          try {
            const result = faceLandmarker.detectForVideo(video, now);
            const direction = getHeadDirection(result);

            if (!mountedRef.current) {
              detectingRef.current = false;
              return;
            }

            setHeadDirection(direction);

            if (direction === stableDirectionRef.current) {
              stableCountRef.current += 1;
            } else {
              stableDirectionRef.current = direction;
              stableCountRef.current = 1;
            }

            // Only alert for real, stable LEFT/RIGHT head turns
            if (
              (direction === "LEFT" || direction === "RIGHT") &&
              stableCountRef.current >= 6
            ) {
              if (!awayStartRef.current) {
                awayStartRef.current = Date.now();
              }

              const awayMs = Date.now() - awayStartRef.current;

              if (awayMs > 3500) {
                addAlert(
                  `Student turned head ${direction.toLowerCase()} for more than 3.5 seconds.`,
                );
                awayStartRef.current = Date.now();
              }
            } else if (direction === "CENTER" || direction === "NO_FACE") {
              awayStartRef.current = null;
            }
          } catch {
            // Avoid Next dev overlay from console.error spam
            setStatus("Monitoring started");
          } finally {
            detectingRef.current = false;
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      detectingRef.current = false;
    };
  }, [isReady]);

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "Arial, sans-serif",
        background: "#000",
        minHeight: "100vh",
        color: "#fff",
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
        AI Proctoring Demo
      </h1>
      <p style={{ marginBottom: 20 }}>
        Detects real head turns to the left or right.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div>
          <video
            ref={videoRef}
            muted
            autoPlay
            playsInline
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid #444",
              display: "block",
              transform: "scaleX(-1)",
              background: "#111",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
            <StatusCard label="System" value={status} />
            <StatusCard label="Head" value={headDirection} />
          </div>
        </div>

        <div
          style={{
            border: "1px solid #444",
            borderRadius: 12,
            padding: 16,
            minHeight: 420,
            background: "#050505",
          }}
        >
          <h2 style={{ fontSize: 24, marginBottom: 12 }}>Alerts</h2>

          {alerts.length === 0 ? (
            <p>No suspicious events yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {alerts.map((a) => (
                <div
                  key={a.id}
                  style={{
                    border: "1px solid #333",
                    borderRadius: 10,
                    padding: 12,
                    background: "#111",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{a.type}</div>
                  <div style={{ marginTop: 6 }}>{a.message}</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                    {new Date(a.time).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #444",
        borderRadius: 10,
        padding: "10px 14px",
        minWidth: 180,
        background: "#111",
        color: "#fff",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
