"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Send, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { CitationDrawer } from "@/components/citation-drawer";
import { Button, Panel, Select, Textarea } from "@/components/ui";
import { useAuth } from "@/features/auth/auth-provider";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type { ChatSessionRead, SourceCitation } from "@/types/api";

function scopeLabel(session: ChatSessionRead, courseName?: string) {
  if (session.scope_mode === "all") return "All materials";
  if (session.scope_mode === "course") return courseName ?? "Selected course";
  if (session.scope_mode === "documents") return `${session.document_ids.length} selected document${session.document_ids.length === 1 ? "" : "s"}`;
  return `${courseName ?? "Selected course"} + ${session.document_ids.length} document${session.document_ids.length === 1 ? "" : "s"}`;
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [latestSources, setLatestSources] = useState<SourceCitation[]>([]);
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ChatSessionRead | null>(null);
  const sessions = useQuery({ queryKey: queryKeys.chatSessions, queryFn: api.listChatSessions, enabled: isAuthenticated });
  const messages = useQuery({
    queryKey: queryKeys.chatMessages(selectedSessionId),
    queryFn: () => api.listMessages(selectedSessionId as string),
    enabled: isAuthenticated && Boolean(selectedSessionId)
  });
  const courses = useQuery({ queryKey: queryKeys.courses, queryFn: api.listCourses, enabled: isAuthenticated });
  const documents = useQuery({ queryKey: queryKeys.documents, queryFn: api.listDocuments, enabled: isAuthenticated });
  const [courseId, setCourseId] = useState("");
  const readyDocuments = (documents.data ?? []).filter((document) => document.status === "ready");
  const selectableDocuments = courseId
    ? readyDocuments.filter((document) => document.course_id === courseId)
    : readyDocuments;

  useEffect(() => {
    if (!selectedSessionId && sessions.data?.[0]) setSelectedSessionId(sessions.data[0].id);
  }, [selectedSessionId, sessions.data]);

  const createSession = useMutation({
    mutationFn: () => api.createChatSession({ course_id: courseId || null, document_ids: documentIds, title: "New chat" }),
    async onSuccess(session) {
      setSelectedSessionId(session.id);
      setDocumentIds([]);
      await queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions });
    }
  });

  const deleteSession = useMutation({
    mutationFn: api.deleteChatSession,
    async onSuccess(_, sessionId) {
      const nextSession = (sessions.data ?? []).find((session) => session.id !== sessionId);
      setSelectedSessionId(nextSession?.id ?? null);
      setLatestSources([]);
      setQuestion("");
      setDeleteTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(sessionId) })
      ]);
    }
  });

  function toggleDocument(documentId: string) {
    setDocumentIds((current) =>
      current.includes(documentId) ? current.filter((id) => id !== documentId) : [...current, documentId]
    );
  }

  const ask = useMutation({
    mutationFn: () => {
      if (!selectedSessionId) throw new Error("Create a chat session first.");
      return api.ask(selectedSessionId, { question });
    },
    async onSuccess(answer) {
      setQuestion("");
      setLatestSources(answer.sources);
      await queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(selectedSessionId) });
    }
  });

  return (
    <AuthGuard>
      <AppShell aside={<CitationDrawer sources={latestSources} />}>
        <div className="grid min-h-[calc(100vh-7rem)] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Panel className="p-3">
            <div className="mb-3 grid gap-2">
              <Select
                value={courseId}
                onChange={(event) => {
                  setCourseId(event.target.value);
                  setDocumentIds([]);
                }}
              >
                <option value="">All courses</option>
                {(courses.data ?? []).map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </Select>
              {selectableDocuments.length > 0 ? (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-line p-2">
                  {selectableDocuments.map((document) => (
                    <label key={document.id} className="flex cursor-pointer items-center gap-2 px-1 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10">
                      <input
                        className="h-4 w-4 accent-neutral-900 dark:accent-white"
                        type="checkbox"
                        checked={documentIds.includes(document.id)}
                        onChange={() => toggleDocument(document.id)}
                      />
                      <span className="min-w-0 truncate">{document.title}</span>
                    </label>
                  ))}
                </div>
              ) : null}
              <Button onClick={() => createSession.mutate()} disabled={createSession.isPending}>
                <Plus size={16} /> New chat
              </Button>
            </div>
            <div className="space-y-1">
              {(sessions.data ?? []).map((session) => {
                const courseName = (courses.data ?? []).find((course) => course.id === session.course_id)?.name;
                const selected = selectedSessionId === session.id;
                return (
                  <div
                    key={session.id}
                    className={`flex items-center rounded-md transition ${
                      selected ? "bg-ink text-white dark:bg-white dark:text-ink" : "hover:bg-black/5 dark:hover:bg-white/10"
                    }`}
                  >
                    <button className="min-w-0 flex-1 px-3 py-2 text-left" onClick={() => setSelectedSessionId(session.id)}>
                      <span className="block truncate text-sm">{session.title}</span>
                      <span className="block truncate text-xs opacity-70">{scopeLabel(session, courseName)}</span>
                    </button>
                    <Button
                      className="mr-1 h-8 w-8 shrink-0 px-0"
                      variant="ghost"
                      aria-label={`Delete ${session.title}`}
                      title="Delete chat"
                      onClick={() => setDeleteTarget(session)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel className="flex min-h-[620px] flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
              {(messages.data ?? []).map((message) => (
                <div key={message.id} className={message.role === "user" ? "ml-auto max-w-2xl" : "mr-auto max-w-3xl"}>
                  <div
                    className={`rounded-lg px-4 py-3 text-sm ${
                      message.role === "user" ? "bg-ink text-white dark:bg-white dark:text-ink" : "bg-black/5 dark:bg-white/10"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.sources.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.sources.map((source) => (
                          <span key={source.chunk_id} className="rounded bg-white/20 px-2 py-1 text-xs dark:bg-black/20">
                            {source.document_name} p.{source.page_number ?? "?"}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {ask.isPending ? <div className="h-10 w-48 animate-pulse rounded-md bg-black/10 dark:bg-white/10" /> : null}
              {!selectedSessionId ? <p className="text-sm text-neutral-500">Create a chat to begin.</p> : null}
            </div>

            <form
              className="border-t border-line p-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (question.trim()) ask.mutate();
              }}
            >
              <div className="flex gap-2">
                <Textarea
                  className="min-h-12"
                  placeholder="Ask about your uploaded materials..."
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                />
                <Button className="h-auto self-stretch" type="submit" disabled={ask.isPending || !question.trim()}>
                  <Send size={16} />
                </Button>
              </div>
              {ask.error ? <p className="mt-2 text-sm text-red-600">{ask.error.message}</p> : null}
            </form>
          </Panel>
        </div>
        {deleteTarget ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
            <Panel className="w-full max-w-sm p-4" role="dialog" aria-modal="true" aria-labelledby="delete-chat-title">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="delete-chat-title" className="text-base font-semibold">Delete chat?</h2>
                  <p className="mt-2 text-sm text-neutral-500">This permanently removes “{deleteTarget.title}” and its messages.</p>
                </div>
                <Button className="h-8 w-8 px-0" variant="ghost" aria-label="Close confirmation" onClick={() => setDeleteTarget(null)}>
                  <X size={16} />
                </Button>
              </div>
              {deleteSession.error ? <p className="mt-3 text-sm text-red-600">{deleteSession.error.message}</p> : null}
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleteSession.isPending}>Cancel</Button>
                <Button variant="danger" onClick={() => deleteSession.mutate(deleteTarget.id)} disabled={deleteSession.isPending}>
                  {deleteSession.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </Panel>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
