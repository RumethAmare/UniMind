"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { CitationDrawer } from "@/components/citation-drawer";
import { Button, Panel, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type { SourceCitation } from "@/types/api";

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [latestSources, setLatestSources] = useState<SourceCitation[]>([]);
  const sessions = useQuery({ queryKey: queryKeys.chatSessions, queryFn: api.listChatSessions });
  const messages = useQuery({
    queryKey: queryKeys.chatMessages(selectedSessionId),
    queryFn: () => api.listMessages(selectedSessionId as string),
    enabled: Boolean(selectedSessionId)
  });
  const courses = useQuery({ queryKey: queryKeys.courses, queryFn: api.listCourses });
  const [courseId, setCourseId] = useState("");

  useEffect(() => {
    if (!selectedSessionId && sessions.data?.[0]) setSelectedSessionId(sessions.data[0].id);
  }, [selectedSessionId, sessions.data]);

  const createSession = useMutation({
    mutationFn: () => api.createChatSession({ course_id: courseId || null, title: "New chat" }),
    async onSuccess(session) {
      setSelectedSessionId(session.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions });
    }
  });

  const deleteSession = useMutation({
    mutationFn: (sessionId: string) => api.deleteChatSession(sessionId),
    async onSuccess(_, deletedSessionId) {
      const remainingSessions = (sessions.data ?? []).filter((session) => session.id !== deletedSessionId);
      queryClient.removeQueries({ queryKey: queryKeys.chatMessages(deletedSessionId) });
      setLatestSources([]);
      if (selectedSessionId === deletedSessionId) {
        setSelectedSessionId(remainingSessions[0]?.id ?? null);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions });
    }
  });

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
              <Select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
                <option value="">All courses</option>
                {(courses.data ?? []).map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </Select>
              <Button onClick={() => createSession.mutate()} disabled={createSession.isPending}>
                <Plus size={16} /> New chat
              </Button>
            </div>
            <div className="space-y-1">
              {(sessions.data ?? []).map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-1 rounded-md transition ${
                    selectedSessionId === session.id ? "bg-ink text-white dark:bg-white dark:text-ink" : "hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  <button className="min-w-0 flex-1 px-3 py-2 text-left text-sm" onClick={() => setSelectedSessionId(session.id)}>
                    <span className="block truncate">{session.title}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${session.title}`}
                    className={`mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition ${
                      selectedSessionId === session.id
                        ? "hover:bg-white/15 dark:hover:bg-black/10"
                        : "text-neutral-500 hover:bg-black/10 hover:text-red-600 dark:hover:bg-white/10"
                    }`}
                    disabled={deleteSession.isPending}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (window.confirm("Delete this chat? This cannot be undone.")) {
                        deleteSession.mutate(session.id);
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            {deleteSession.error ? <p className="mt-3 text-sm text-red-600">{deleteSession.error.message}</p> : null}
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
      </AppShell>
    </AuthGuard>
  );
}
