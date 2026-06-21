export type UUID = string;

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type UserRead = {
  id: UUID;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

export type CourseRead = {
  id: UUID;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed" | "deleted";

export type DocumentRead = {
  id: UUID;
  course_id: UUID | null;
  title: string;
  filename: string;
  mime_type: string;
  file_size_bytes: number;
  status: DocumentStatus;
  error_message: string | null;
  page_count: number | null;
  created_at: string;
  updated_at: string;
};

export type SourceCitation = {
  document_name: string;
  page_number: number | null;
  chunk_id: UUID;
};

export type AskResponse = {
  answer: string;
  confidence_score: number;
  sources: SourceCitation[];
};

export type ChatSessionRead = {
  id: UUID;
  course_id: UUID | null;
  document_ids: UUID[];
  scope_mode: "all" | "course" | "documents" | "course_documents";
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRead = {
  id: UUID;
  role: "user" | "assistant" | "system";
  content: string;
  confidence_score: number | null;
  sources: SourceCitation[];
  created_at: string;
};

export type ChatAskResponse = AskResponse & {
  session_id: UUID;
  user_message_id: UUID;
  assistant_message_id: UUID;
};

export type StudyArtifactSummary = {
  id: UUID;
  artifact_type: "summary" | "flashcards" | "mcqs" | "study_guide";
  title: string;
  course_id: UUID | null;
  document_id: UUID | null;
  created_at: string;
};

export type StudyArtifactRead = StudyArtifactSummary & {
  content: Record<string, unknown>;
};
