"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, MessageSquare, Server } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { Panel } from "@/components/ui";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

export default function DashboardPage() {
  const docs = useQuery({ queryKey: queryKeys.documents, queryFn: api.listDocuments });
  const chats = useQuery({ queryKey: queryKeys.chatSessions, queryFn: api.listChatSessions });
  const courses = useQuery({ queryKey: queryKeys.courses, queryFn: api.listCourses });
  const health = useQuery({ queryKey: queryKeys.health, queryFn: api.health, refetchInterval: 30000 });

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-neutral-500">Your study workspace at a glance.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Stat icon={FileText} label="Documents" value={docs.data?.length ?? 0} />
            <Stat icon={MessageSquare} label="Chats" value={chats.data?.length ?? 0} />
            <Stat icon={BookOpen} label="Courses" value={courses.data?.length ?? 0} />
            <Stat icon={Server} label="API" value={health.data?.status ?? "offline"} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="p-4">
              <h2 className="mb-3 text-sm font-semibold">Recent Documents</h2>
              <div className="space-y-2">
                {(docs.data ?? []).slice(0, 5).map((doc) => (
                  <Link key={doc.id} href="/documents" className="block rounded-md p-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
                    <span className="font-medium">{doc.title}</span>
                    <span className="ml-2 text-xs text-neutral-500">{doc.status}</span>
                  </Link>
                ))}
                {(docs.data ?? []).length === 0 ? <p className="text-sm text-neutral-500">No documents yet.</p> : null}
              </div>
            </Panel>

            <Panel className="p-4">
              <h2 className="mb-3 text-sm font-semibold">Quick Actions</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link className="rounded-md border border-line p-3 text-sm hover:bg-black/5 dark:hover:bg-white/10" href="/documents">
                  Upload material
                </Link>
                <Link className="rounded-md border border-line p-3 text-sm hover:bg-black/5 dark:hover:bg-white/10" href="/chat">
                  Ask a question
                </Link>
                <Link className="rounded-md border border-line p-3 text-sm hover:bg-black/5 dark:hover:bg-white/10" href="/study">
                  Generate study tools
                </Link>
                <Link className="rounded-md border border-line p-3 text-sm hover:bg-black/5 dark:hover:bg-white/10" href="/settings">
                  Check settings
                </Link>
              </div>
            </Panel>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <Panel className="p-4">
      <Icon size={18} className="mb-3 text-neutral-500" />
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </Panel>
  );
}
