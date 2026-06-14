"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { WandSparkles } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { Button, Panel, Select } from "@/components/ui";
import { InteractiveMcqs } from "@/features/study/interactive-mcqs";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type { StudyArtifactRead } from "@/types/api";
import type { McqQuestion } from "@/features/study/interactive-mcqs";

type StudyKind = "summary" | "flashcards" | "mcqs" | "guide";

export default function StudyPage() {
  const [kind, setKind] = useState<StudyKind>("summary");
  const [courseId, setCourseId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [artifact, setArtifact] = useState<StudyArtifactRead | null>(null);
  const courses = useQuery({ queryKey: queryKeys.courses, queryFn: api.listCourses });
  const documents = useQuery({ queryKey: queryKeys.documents, queryFn: api.listDocuments });

  const generate = useMutation({
    mutationFn: () =>
      api.generateStudy(kind, {
        course_id: courseId || null,
        document_id: documentId || null
      }),
    onSuccess: setArtifact
  });

  return (
    <AuthGuard>
      <AppShell>
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

          <StudyResult artifact={artifact} />
        </div>
      </AppShell>
    </AuthGuard>
  );
}

function StudyResult({ artifact }: { artifact: StudyArtifactRead | null }) {
  if (!artifact) return <Panel className="p-6 text-sm text-neutral-500">No generated study material yet.</Panel>;

  const mcqs = artifact.artifact_type === "mcqs" ? getMcqs(artifact.content) : null;

  return (
    <Panel className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{artifact.title}</h2>
        <p className="text-xs text-neutral-500">{artifact.artifact_type}</p>
      </div>
      {mcqs ? <InteractiveMcqs mcqs={mcqs} /> : <JsonValue value={artifact.content} />}
    </Panel>
  );
}

function getMcqs(content: Record<string, unknown>): McqQuestion[] | null {
  const mcqs = content.mcqs;
  if (!Array.isArray(mcqs)) return null;
  const parsed = mcqs.filter((item): item is McqQuestion => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return (
      typeof record.question === "string" &&
      Array.isArray(record.options) &&
      record.options.length > 0 &&
      record.options.every((option) => typeof option === "string") &&
      typeof record.correct_answer === "string" &&
      typeof record.explanation === "string"
    );
  });
  return parsed.length > 0 ? parsed : null;
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
