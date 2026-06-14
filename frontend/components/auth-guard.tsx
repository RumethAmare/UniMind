"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type React from "react";
import { useAuth } from "@/features/auth/auth-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/login") router.replace("/login");
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center bg-paper text-sm dark:bg-neutral-950">Loading UniMind...</div>;
  }

  if (!isAuthenticated && pathname !== "/login") return null;

  return <>{children}</>;
}
