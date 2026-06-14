import { getAccessToken } from "@/lib/auth/tokens";
import type {
  AskResponse,
  ChatAskResponse,
  ChatMessageRead,
  ChatSessionRead,
  CourseRead,
  DocumentRead,
  StudyArtifactRead,
  TokenPair,
  UserRead,
  UUID
} from "@/types/api";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

export const API_BASE_URL =
  configuredApiBaseUrl && configuredApiBaseUrl.length > 0
    ? configuredApiBaseUrl
    : "/api/v1";

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const isForm = options.body instanceof FormData;
  if (!isForm && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.error ?? body.detail ?? message;
    } catch {
      // Keep response status text.
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  register(payload: { email: string; full_name: string; password: string }) {
    return request<TokenPair>("/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload)
    });
  },
  login(payload: { email: string; password: string }) {
    return request<TokenPair>("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload)
    });
  },
  refresh(refreshToken: string) {
    return request<TokenPair>("/auth/refresh", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ refresh_token: refreshToken })
    });
  },
  me() {
    return request<UserRead>("/auth/me");
  },
  listCourses() {
    return request<CourseRead[]>("/courses");
  },
  createCourse(payload: { name: string; description?: string }) {
    return request<CourseRead>("/courses", { method: "POST", body: JSON.stringify(payload) });
  },
  updateCourse(courseId: UUID, payload: { name?: string; description?: string | null }) {
    return request<CourseRead>(`/courses/${courseId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  deleteCourse(courseId: UUID) {
    return request<void>(`/courses/${courseId}`, { method: "DELETE" });
  },
  listDocuments() {
    return request<DocumentRead[]>("/documents");
  },
  uploadDocument(payload: { file: File; title?: string; course_id?: UUID | null }) {
    const form = new FormData();
    form.set("file", payload.file);
    if (payload.title) form.set("title", payload.title);
    if (payload.course_id) form.set("course_id", payload.course_id);
    return request<DocumentRead>("/documents/upload", { method: "POST", body: form });
  },
  deleteDocument(documentId: UUID) {
    return request<void>(`/documents/${documentId}`, { method: "DELETE" });
  },
  listChatSessions() {
    return request<ChatSessionRead[]>("/chat/sessions");
  },
  createChatSession(payload: { course_id?: UUID | null; title?: string }) {
    return request<ChatSessionRead>("/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ title: payload.title ?? "New chat", course_id: payload.course_id ?? null })
    });
  },
  deleteChatSession(sessionId: UUID) {
    return request<void>(`/chat/sessions/${sessionId}`, { method: "DELETE" });
  },
  listMessages(sessionId: UUID) {
    return request<ChatMessageRead[]>(`/chat/sessions/${sessionId}/messages`);
  },
  ask(sessionId: UUID, payload: { question: string; top_k?: number }) {
    return request<ChatAskResponse>(`/chat/sessions/${sessionId}/ask`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  ragQuery(payload: { question: string; course_id?: UUID | null; document_id?: UUID | null; top_k?: number }) {
    return request<AskResponse>("/rag/query", { method: "POST", body: JSON.stringify(payload) });
  },
  generateStudy(kind: "summary" | "flashcards" | "mcqs" | "guide", payload: { course_id?: UUID | null; document_id?: UUID | null; title?: string }) {
    return request<StudyArtifactRead>(`/study/${kind}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  health() {
    return request<{ status: string }>("/health", { auth: false });
  }
};
