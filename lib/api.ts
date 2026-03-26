/**
 * Typed API client for all backend endpoints.
 * Call these from client components.
 */

import type { Exam, ExamSession, AlertEvent, EventType, Clip } from "@/types";

const BASE = "";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || res.statusText);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, { cache: "no-store" });
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<T>;
}

// ─── Auth / Session start ──────────────────────────────────────────────────────

export function startSession(
  studentName: string,
  studentId: string,
  examId: string
): Promise<{ session: ExamSession }> {
  return post("/api/sessions", { studentName, studentId, examId });
}

// ─── Exam ──────────────────────────────────────────────────────────────────────

export function getExam(id: string): Promise<{ exam: Exam }> {
  return get(`/api/exams/${id}`);
}

export function getDefaultExam(): Promise<{ exam: Exam }> {
  return get("/api/exams/default");
}

// ─── Session ──────────────────────────────────────────────────────────────────

export function getSession(id: string): Promise<{ session: ExamSession }> {
  return get(`/api/sessions/${id}`);
}

export function getAllSessions(): Promise<{ sessions: ExamSession[] }> {
  return get("/api/sessions");
}

export function submitAnswers(
  sessionId: string,
  answers: Record<string, number>
): Promise<{ session: ExamSession }> {
  return post(`/api/sessions/${sessionId}/submit`, { answers });
}

// ─── Monitoring events ────────────────────────────────────────────────────────

export function postEvent(
  sessionId: string,
  type: EventType
): Promise<{ event: AlertEvent }> {
  return post(`/api/sessions/${sessionId}/events`, { type });
}

// ─── Face registration ────────────────────────────────────────────────────────

export function registerFace(
  sessionId: string,
  imageData: string
): Promise<{ ok: boolean }> {
  return post("/api/face", { sessionId, imageData });
}

// ─── Clips ────────────────────────────────────────────────────────────────────

export async function uploadClip(
  sessionId: string,
  eventId: string,
  blob: Blob
): Promise<{ clip: Clip }> {
  const form = new FormData();
  form.append("sessionId", sessionId);
  form.append("eventId", eventId);
  form.append("clip", blob, "clip.webm");

  const res = await fetch("/api/clips", { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ clip: Clip }>;
}

// ─── Teacher actions ──────────────────────────────────────────────────────────

export function warnStudent(
  sessionId: string
): Promise<{ session: ExamSession }> {
  return post(`/api/sessions/${sessionId}/warn`, {});
}

export function invalidateExam(
  sessionId: string
): Promise<{ session: ExamSession }> {
  return post(`/api/sessions/${sessionId}/invalidate`, {});
}
