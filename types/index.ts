export type UserRole = "student" | "teacher";
export type ExamStatus = "active" | "completed" | "invalid";
export type EventType =
  | "NO_FACE"
  | "MULTIPLE_FACES"
  | "LOOKING_AWAY"
  | "PHONE_DETECTED"
  | "TAB_SWITCH"
  | "WINDOW_BLUR"
  | "FULLSCREEN_EXIT";

export interface ExamQuestion {
  id: string;
  text: string;
  options: string[];
}

export interface Exam {
  id: string;
  title: string;
  durationSec: number;
  questions: ExamQuestion[];
}

export interface AlertEvent {
  id: string;
  sessionId: string;
  type: EventType;
  timestamp: string;
  clipId?: string;
}

export interface TeacherAction {
  id: string;
  sessionId: string;
  type: "warn" | "invalidate";
  timestamp: string;
}

export interface Clip {
  id: string;
  sessionId: string;
  eventId: string;
  filename: string;
  createdAt: string;
}

export interface ExamSession {
  id: string;
  studentId: string;
  studentName: string;
  examId: string;
  status: ExamStatus;
  startedAt: string;
  completedAt?: string;
  warningCount: number;
  answers: Record<string, number>;
  events: AlertEvent[];
  actions: TeacherAction[];
  clips: Clip[];
  faceRegistered: boolean;
}

export interface MonitoringState {
  faceVisible: boolean;
  multipleFaces: boolean;
  phoneDetected: boolean;
  tabActive: boolean;
  warningCount: number;
}

// Socket.IO event payloads
export interface SocketEventPayload {
  sessionId: string;
  event?: AlertEvent;
  session?: ExamSession;
  warningCount?: number;
}
