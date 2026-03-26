"use client";

import { forwardRef } from "react";

interface MiniCamProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status?: "loading" | "active" | "error";
}

export const MiniCam = forwardRef<HTMLDivElement, MiniCamProps>(
  ({ canvasRef, videoRef, status = "active" }, ref) => {
    return (
      <div
        ref={ref}
        className="relative rounded-xl overflow-hidden border border-white/10"
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
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: "scaleX(-1)" }}
        />
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
            <div
              className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-400"
              style={{ animation: "spin 0.8s linear infinite" }}
            />
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 rounded px-1.5 py-0.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: status === "active" ? "#22c55e" : "#f59e0b",
              boxShadow: status === "active" ? "0 0 4px #22c55e" : undefined,
            }}
          />
          <span className="text-[9px] text-white/70 font-medium uppercase tracking-wide">
            Live
          </span>
        </div>
      </div>
    );
  }
);

MiniCam.displayName = "MiniCam";
