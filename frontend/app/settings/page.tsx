"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { Button, Input, Panel } from "@/components/ui";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuth } from "@/features/auth/auth-provider";
import { api, API_BASE_URL } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const health = useQuery({ queryKey: queryKeys.health, queryFn: api.health });

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-neutral-500">Profile, theme, and backend status.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="p-4">
              <h2 className="mb-3 text-sm font-semibold">Profile</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">Name</dt>
                  <dd className="text-right">{user?.full_name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">Email</dt>
                  <dd className="text-right">{user?.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">Role</dt>
                  <dd className="text-right">{user?.role}</dd>
                </div>
              </dl>
            </Panel>

            <Panel className="p-4">
              <h2 className="mb-3 text-sm font-semibold">System</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">API</dt>
                  <dd className="break-all text-right">{API_BASE_URL}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">Health</dt>
                  <dd>{health.data?.status ?? "unknown"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-neutral-500">Theme</dt>
                  <dd>
                    <Button variant="secondary" onClick={toggleTheme}>
                      {theme}
                    </Button>
                  </dd>
                </div>
              </dl>
            </Panel>
          </div>

          <CourseManager enabled={Boolean(user)} />
        </div>
      </AppShell>
    </AuthGuard>
  );
}

function CourseManager({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const courses = useQuery({ queryKey: queryKeys.courses, queryFn: api.listCourses, enabled });
  const create = useMutation({
    mutationFn: () => api.createCourse({ name, description: description || undefined }),
    async onSuccess() {
      setName("");
      setDescription("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.courses });
    }
  });
  const remove = useMutation({
    mutationFn: api.deleteCourse,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses })
  });

  return (
    <Panel className="p-4">
      <h2 className="mb-3 text-sm font-semibold">Courses</h2>
      <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)_120px]">
        <Input placeholder="Course name" value={name} onChange={(event) => setName(event.target.value)} />
        <Input placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
        <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
          <Plus size={16} /> Add
        </Button>
      </div>
      {create.error ? <p className="mt-2 text-sm text-red-600">{create.error.message}</p> : null}
      <div className="mt-4 space-y-2">
        {(courses.data ?? []).map((course) => (
          <div key={course.id} className="flex items-center justify-between gap-3 rounded-md border border-line p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{course.name}</p>
              <p className="truncate text-xs text-neutral-500">{course.description || "No description"}</p>
            </div>
            <Button variant="ghost" onClick={() => remove.mutate(course.id)} aria-label="Delete course">
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
