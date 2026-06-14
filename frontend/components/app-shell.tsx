"use client";

import {
  BookOpen,
  FileText,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  Settings,
  Sparkles,
  Sun
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type React from "react";
import { clsx } from "clsx";
import { useAuth } from "@/features/auth/auth-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/study", label: "Study", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-neutral-950 dark:text-neutral-100">
      <div className="flex min-h-screen">
        <aside
          className={clsx(
            "fixed inset-y-0 left-0 z-40 w-72 border-r border-line bg-paper/95 p-4 transition lg:static lg:translate-x-0 dark:bg-neutral-950/95",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-full flex-col">
            <div className="mb-6 flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <span className="grid size-9 place-items-center rounded-md bg-ink text-white dark:bg-white dark:text-ink">
                  <Sparkles size={18} />
                </span>
                <span>UniMind</span>
              </Link>
              <Button variant="ghost" className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close sidebar">
                <PanelLeftClose size={18} />
              </Button>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition",
                      active ? "bg-ink text-white dark:bg-white dark:text-ink" : "hover:bg-black/5 dark:hover:bg-white/10"
                    )}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3 border-t border-line pt-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user?.full_name ?? "Student"}</p>
                <p className="truncate text-xs text-neutral-500">{user?.email ?? "Not signed in"}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={toggleTheme} aria-label="Toggle theme">
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </Button>
                <Button variant="secondary" className="flex-1" onClick={handleLogout} aria-label="Sign out">
                  <LogOut size={16} />
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur dark:bg-neutral-950/90">
            <Button variant="ghost" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open sidebar">
              <Menu size={18} />
            </Button>
            <div className="min-w-0">
              <p className="text-sm font-medium">AI Study Workspace</p>
              <p className="text-xs text-neutral-500">Grounded answers from your course materials</p>
            </div>
          </header>

          <main className="grid flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0 p-4 lg:p-6">{children}</section>
            {aside ? <aside className="hidden border-l border-line p-4 xl:block">{aside}</aside> : null}
          </main>
        </div>
      </div>
    </div>
  );
}
