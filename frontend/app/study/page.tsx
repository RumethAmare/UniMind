"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, WandSparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { Button, Panel, Select } from "@/components/ui";
import { useAuth } from "@/features/auth/auth-provider";
import { InteractiveMcqs, type McqQuestion } from "@/features/study/interactive-mcqs";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type { StudyArtifactRead, StudyArtifactSummary } from "@/types/api";

type StudyKind = "summary" | "flashcards" | "mcqs" | "guide";

function scopeLabel(item: StudyArtifactSummary, courses: { id: string; name: string }[], documents: { id: string; title: string }[]) {
  const documentName = documents.find((document) => document.id === item.document_id)?.title;
  if (documentName) return documentName;
  const courseName = courses.find((course) => course.id === item.course_id)?.name;
  return courseName ?? "All materials";
}

export default function StudyPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [kind, setKind] = useState<StudyKind>("summary");
  const [courseId, setCourseId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudyArtifactSummary | null>(null);
  const courses = useQuery({ queryKey: queryKeys.courses, queryFn: api.listCourses, enabled: isAuthenticated });
  const documents = useQuery({ queryKey: queryKeys.documents, queryFn: api.listDocuments, enabled: isAuthenticated });
  const artifacts = useQuery({ queryKey: queryKeys.studyArtifacts, queryFn: api.listStudyArtifacts, enabled: isAuthenticated });
  const selectedArtifactExists = Boolean(
    selectedArtifactId && artifacts.data?.some((item) => item.id === selectedArtifactId)
  );
  const artifact = useQuery({
    queryKey: queryKeys.studyArtifact(selectedArtifactId),
    queryFn: () => api.getStudyArtifact(selectedArtifactId as string),
    enabled: isAuthenticated && selectedArtifactExists
  });

  useEffect(() => {
    if (!artifacts.data) return;
    if (selectedArtifactId && !artifacts.data.some((item) => item.id === selectedArtifactId)) {
      setSelectedArtifactId(artifacts.data[0]?.id ?? null);
      return;
    }
    if (!selectedArtifactId && artifacts.data[0]) setSelectedArtifactId(artifacts.data[0].id);
  }, [artifacts.data, selectedArtifactId]);

  const generate = useMutation({
    mutationFn: () =>
      api.generateStudy(kind, {
        course_id: courseId || null,
        document_id: documentId || null
      }),
    async onSuccess(result) {
      queryClient.setQueryData(queryKeys.studyArtifact(result.id), result);
      setSelectedArtifactId(result.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.studyArtifacts });
    }
  });

  const deleteArtifact = useMutation({
    mutationFn: api.deleteStudyArtifact,
    async onSuccess(_, artifactId) {
      const nextArtifact = (artifacts.data ?? []).find((item) => item.id !== artifactId);
      setSelectedArtifactId(nextArtifact?.id ?? null);
      setDeleteTarget(null);
      queryClient.removeQueries({ queryKey: queryKeys.studyArtifact(artifactId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.studyArtifacts });
    }
  });

  return (
    <AuthGuard>
      <AppShell>
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Panel className="p-3">
            <h2 className="mb-3 text-sm font-semibold">Saved sessions</h2>
            <div className="space-y-1">
              {(artifacts.data ?? []).map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center rounded-md transition ${
                    selectedArtifactId === item.id
                      ? "bg-ink text-white dark:bg-white dark:text-ink"
                      : "hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  <button className="min-w-0 flex-1 px-3 py-2 text-left" onClick={() => setSelectedArtifactId(item.id)}>
                    <span className="block truncate text-sm">{item.title}</span>
                    <span className="block truncate text-xs opacity-70">
                      {item.artifact_type.replace("_", " ")} · {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    <span className="block truncate text-xs opacity-70">
                      {scopeLabel(item, courses.data ?? [], documents.data ?? [])}
                    </span>
                  </button>
                  <Button
                    className="mr-1 h-8 w-8 shrink-0 px-0"
                    variant="ghost"
                    aria-label={`Delete ${item.title}`}
                    title="Delete session"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              ))}
              {(artifacts.data ?? []).length === 0 ? <p className="px-2 py-3 text-sm text-neutral-500">No saved sessions.</p> : null}
            </div>
          </Panel>

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">Study Tools</h1>
              <p className="text-sm text-neutral-500">Generate summaries, flashcards, MCQs, and revision guides.</p>
            </div>

            <Panel className="p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Select value={kind} onChange={(event) => setKind(event.target.value as StudyKind)}>
                <option value="summary">Summary</option>
                <option value="flashcards">Flashcards</option>
                <option value="mcqs">MCQs</option>
                <option value="guide">Study guide</option>
              </Select>
              <Select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
                <option value="">Any course</option>
                {(courses.data ?? []).map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </Select>
              <Select value={documentId} onChange={(event) => setDocumentId(event.target.value)}>
                <option value="">Any document</option>
                {(documents.data ?? []).map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.title}
                  </option>
                ))}
              </Select>
              <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
                <WandSparkles size={16} /> {generate.isPending ? "Generating..." : "Generate"}
              </Button>
            </div>
            {generate.error ? <p className="mt-3 text-sm text-red-600">{generate.error.message}</p> : null}
            </Panel>

            <StudyResult artifact={artifact.data ?? null} />
          </div>
        </div>
        {deleteTarget ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
            <Panel className="w-full max-w-sm p-4" role="dialog" aria-modal="true" aria-labelledby="delete-study-title">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="delete-study-title" className="text-base font-semibold">Delete session?</h2>
                  <p className="mt-2 text-sm text-neutral-500">This permanently removes “{deleteTarget.title}”.</p>
                </div>
                <Button className="h-8 w-8 px-0" variant="ghost" aria-label="Close confirmation" onClick={() => setDeleteTarget(null)}>
                  <X size={16} />
                </Button>
              </div>
              {deleteArtifact.error ? <p className="mt-3 text-sm text-red-600">{deleteArtifact.error.message}</p> : null}
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleteArtifact.isPending}>Cancel</Button>
                <Button variant="danger" onClick={() => deleteArtifact.mutate(deleteTarget.id)} disabled={deleteArtifact.isPending}>
                  {deleteArtifact.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </Panel>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}

function StudyResult({ artifact }: { artifact: StudyArtifactRead | null }) {
  if (!artifact) return <Panel className="p-6 text-sm text-neutral-500">No generated study material yet.</Panel>;
  const mcqs = artifact.artifact_type === "mcqs" ? readMcqs(artifact.content) : null;

  return (
    <Panel className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{artifact.title}</h2>
        <p className="text-xs text-neutral-500">{artifact.artifact_type}</p>
      </div>
      {mcqs ? <InteractiveMcqs key={artifact.id} mcqs={mcqs} /> : <JsonValue value={artifact.content} />}
    </Panel>
  );
}

function readMcqs(content: Record<string, unknown>): McqQuestion[] | null {
  const value = content.mcqs;
  if (!Array.isArray(value) || value.length === 0) return null;
  const mcqs = value.filter((item): item is McqQuestion => {
    if (!item || typeof item !== "object") return false;
    const question = item as Partial<McqQuestion>;
    return (
      typeof question.question === "string" &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      question.options.every((option) => typeof option === "string" && option.trim()) &&
      new Set(question.options).size === 4 &&
      typeof question.correct_answer === "string" &&
      question.options.includes(question.correct_answer) &&
      typeof question.explanation === "string"
    );
  });
  return mcqs.length === value.length ? mcqs : null;
}

function JsonValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={index} className="rounded-md border border-line p-3">
            <JsonValue value={item} />
          </div>
        ))}
      </div>
    );
  }
  if (value && typeof value === "object") {
    return (
      <div className="space-y-3">
        {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
          <div key={key}>
            <p className="mb-1 text-xs font-semibold uppercase text-neutral-500">{key.replaceAll("_", " ")}</p>
            <JsonValue value={item} />
          </div>
        ))}
      </div>
    );
  }
  return <p className="whitespace-pre-wrap text-sm">{String(value ?? "")}</p>;
}
