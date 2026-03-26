import type { Server } from "socket.io";

/** Attach io to global so API routes can emit after custom server sets it up. */
export function setIO(io: Server): void {
  (global as unknown as Record<string, unknown>).__io = io;
}

function getIO(): Server | null {
  return (global as unknown as Record<string, unknown>).__io as Server | null;
}

export function emitToTeachers(event: string, data: unknown): void {
  getIO()?.to("teachers").emit(event, data);
}

export function emitToSession(
  sessionId: string,
  event: string,
  data: unknown
): void {
  getIO()?.to(`session:${sessionId}`).emit(event, data);
}
