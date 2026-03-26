"use client";

import { useRef, useCallback } from "react";
import { uploadClip } from "@/lib/api";

const BUFFER_MS = 5000;
const MIME = "video/webm;codecs=vp8,opus";

export function useVideoBuffer(sessionId: string) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobEvent["data"][]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback((stream: MediaStream) => {
    if (!MediaRecorder.isTypeSupported(MIME)) return;
    streamRef.current = stream;

    // Rolling recorder — restart every BUFFER_MS to maintain a fresh clip
    function startChunk() {
      const mr = new MediaRecorder(stream, { mimeType: MIME });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        // Keep only the last chunk (the 5-second window)
        if (chunksRef.current.length > 1) {
          chunksRef.current = chunksRef.current.slice(-1);
        }
        startChunk();
      };

      mr.start();
      setTimeout(() => {
        if (mr.state === "recording") mr.stop();
      }, BUFFER_MS);
    }

    startChunk();
  }, []);

  const captureAndUpload = useCallback(
    async (eventId: string): Promise<void> => {
      if (!sessionId || !eventId) return;
      if (chunksRef.current.length === 0) return;

      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      try {
        await uploadClip(sessionId, eventId, blob);
      } catch {
        // Non-critical — clip upload failure shouldn't crash the exam
      }
    },
    [sessionId]
  );

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  return { start, captureAndUpload, stop };
}
