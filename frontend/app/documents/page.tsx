"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { StatusBadge } from "@/components/status-badge";
import { Button, Input, Panel, Select } from "@/components/ui";
import { useAuth } from "@/features/auth/auth-provider";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const docs = useQuery({
    queryKey: queryKeys.documents,
    queryFn: api.listDocuments,
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 6000 : false
  });
  const courses = useQuery({ queryKey: queryKeys.courses, queryFn: api.listCourses, enabled: isAuthenticated });

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Choose a PDF, DOCX, or TXT file.");
      return api.uploadDocument({ file, title: title || undefined, course_id: courseId || null });
    },
    onSuccess() {
      setFile(null);
      setTitle("");
      queryClient.invalidateQueries({ queryKey: queryKeys.documents });
    }
  });

  const remove = useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents })
  });

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Document Library</h1>
            <p className="text-sm text-neutral-500">Upload course material for grounded answers.</p>
          </div>

          <Panel className="p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_160px]">
              <Input placeholder="Optional title" value={title} onChange={(event) => setTitle(event.target.value)} />
              <Select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
                <option value="">No course</option>
                {(courses.data ?? []).map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </Select>
              <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-line text-sm hover:bg-black/5 dark:hover:bg-white/10">
                <Upload size={16} />
                <span>{file ? file.name : "Choose file"}</span>
                <input
                  className="sr-only"
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            {upload.error ? <p className="mt-3 text-sm text-red-600">{upload.error.message}</p> : null}
            <Button className="mt-3" onClick={() => upload.mutate()} disabled={upload.isPending}>
              {upload.isPending ? "Uploading..." : "Upload document"}
            </Button>
          </Panel>

          <div className="space-y-3">
            {(docs.data ?? []).map((doc) => (
              <Panel key={doc.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-semibold">{doc.title}</h2>
                      <StatusBadge status={doc.status} />
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      {doc.filename} · {(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB · {doc.page_count ?? "?"} pages
                    </p>
                    {doc.error_message ? <p className="mt-2 text-sm text-red-600">{doc.error_message}</p> : null}
                  </div>
                  <Button variant="danger" onClick={() => remove.mutate(doc.id)} aria-label="Delete document">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </Panel>
            ))}
            {(docs.data ?? []).length === 0 ? <Panel className="p-6 text-sm text-neutral-500">No documents uploaded.</Panel> : null}
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
