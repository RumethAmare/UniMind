"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useState } from "react";
import type React from "react";
import { api } from "@/lib/api/client";
import { clearTokens, getAccessToken, setTokens } from "@/lib/auth/tokens";
import { queryKeys } from "@/lib/query/keys";
import type { TokenPair, UserRead } from "@/types/api";

type AuthContextValue = {
  user: UserRead | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  acceptTokens: (tokens: TokenPair) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(() => Boolean(getAccessToken()));
  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: api.me,
    enabled: hasToken
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isAuthenticated: Boolean(meQuery.data),
      isLoading: meQuery.isLoading || meQuery.isFetching,
      async acceptTokens(tokens) {
        setTokens(tokens.access_token, tokens.refresh_token);
        setHasToken(true);
        await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      },
      logout() {
        clearTokens();
        setHasToken(false);
        queryClient.clear();
      }
    }),
    [meQuery.data, meQuery.isFetching, meQuery.isLoading, queryClient]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
