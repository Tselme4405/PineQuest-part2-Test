/**
 * In-memory store — no database required to run.
 * The Prisma schema in prisma/schema.prisma mirrors this structure.
 * To switch to PostgreSQL: set USE_DATABASE=true in .env and run `npx prisma db push`.
 */

import type {
  Exam,
  ExamSession,
  AlertEvent,
  TeacherAction,
  Clip,
  EventType,
} from "@/types";

// ─── Seed data ─────────────────────────────────────────────────────────────────

export const DEFAULT_EXAM: Exam = {
  id: "exam-default",
  title: "Ерөнхий мэдлэгийн шалгалт",
  durationSec: 30 * 60, // 30 minutes
  questions: [
    {
      id: "q1",
      text: "Монгол улсын нийслэл хот аль нь вэ?",
      options: ["Дархан", "Улаанбаатар", "Эрдэнэт", "Чойбалсан"],
    },
    {
      id: "q2",
      text: "2 + 2 × 2 = ?",
      options: ["4", "6", "8", "16"],
    },
    {
      id: "q3",
      text: "Дэлхийн хамгийн том тив аль нь вэ?",
      options: ["Африк", "Ази", "Европ", "Хойд Америк"],
    },
  ],
};

// ─── Store maps ────────────────────────────────────────────────────────────────

export const exams = new Map<string, Exam>([
  [DEFAULT_EXAM.id, DEFAULT_EXAM],
]);

export const sessions = new Map<string, ExamSession>();

// Face data keyed by studentId
export const faceProfiles = new Map<string, string>();

// Clip binaries keyed by filename
export const clipBuffers = new Map<string, Buffer>();

// ─── CRUD helpers ──────────────────────────────────────────────────────────────

export function getSession(id: string): ExamSession | undefined {
  return sessions.get(id);
}

export function getAllSessions(): ExamSession[] {
  return Array.from(sessions.values());
}

export function createSession(
  studentName: string,
  studentId: string,
  examId: string
): ExamSession {
  const id = crypto.randomUUID();
  const session: ExamSession = {
    id,
    studentId,
    studentName,
    examId,
    status: "active",
    startedAt: new Date().toISOString(),
    warningCount: 0,
    answers: {},
    events: [],
    actions: [],
    clips: [],
    faceRegistered: false,
  };
  sessions.set(id, session);
  return session;
}

export function registerFace(sessionId: string, imageData: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.faceRegistered = true;
  faceProfiles.set(session.studentId, imageData);
}

export function addEvent(
  sessionId: string,
  type: EventType
): AlertEvent | null {
  const session = sessions.get(sessionId);
  if (!session || session.status !== "active") return null;

  const event: AlertEvent = {
    id: crypto.randomUUID(),
    sessionId,
    type,
    timestamp: new Date().toISOString(),
  };
  session.events.push(event);
  return event;
}

export function addClip(
  sessionId: string,
  eventId: string,
  filename: string,
  buffer: Buffer
): Clip {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");

  const clip: Clip = {
    id: crypto.randomUUID(),
    sessionId,
    eventId,
    filename,
    createdAt: new Date().toISOString(),
  };

  // Update event with clip reference
  const evt = session.events.find((e) => e.id === eventId);
  if (evt) evt.clipId = clip.id;

  session.clips.push(clip);
  clipBuffers.set(filename, buffer);
  return clip;
}

export function warnStudent(sessionId: string): ExamSession | null {
  const session = sessions.get(sessionId);
  if (!session || session.status !== "active") return null;

  session.warningCount += 1;
  const action: TeacherAction = {
    id: crypto.randomUUID(),
    sessionId,
    type: "warn",
    timestamp: new Date().toISOString(),
  };
  session.actions.push(action);

  if (session.warningCount >= 3) {
    session.status = "invalid";
    session.completedAt = new Date().toISOString();
  }

  return session;
}

export function invalidateSession(sessionId: string): ExamSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  session.status = "invalid";
  session.completedAt = new Date().toISOString();

  const action: TeacherAction = {
    id: crypto.randomUUID(),
    sessionId,
    type: "invalidate",
    timestamp: new Date().toISOString(),
  };
  session.actions.push(action);

  return session;
}

export function submitAnswers(
  sessionId: string,
  answers: Record<string, number>
): ExamSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  session.answers = answers;
  if (session.status === "active") {
    session.status = "completed";
    session.completedAt = new Date().toISOString();
  }

  return session;
}
