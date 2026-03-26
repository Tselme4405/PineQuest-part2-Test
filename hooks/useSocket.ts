"use client";

import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "@/lib/socket-client";

interface UseSocketOptions {
  room?: string;     // "teachers" or "session:<id>"
  events?: Record<string, (data: unknown) => void>;
  enabled?: boolean;
}

export function useSocket({ room, events, enabled = true }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    socketRef.current = socket;

    if (room === "teachers") {
      socket.emit("join:teacher");
    } else if (room) {
      socket.emit("join:session", room);
    }

    const registered: string[] = [];
    if (events) {
      for (const [ev, handler] of Object.entries(events)) {
        socket.on(ev, handler);
        registered.push(ev);
      }
    }

    return () => {
      for (const ev of registered) {
        socket.off(ev);
      }
    };
  }, [room, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return socketRef;
}
