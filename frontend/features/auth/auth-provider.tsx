"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type React from "react";
import { api, ApiError } from "@/lib/api/client";
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
    enabled: hasToken,
    retry: false
  });

  useEffect(() => {
    if (meQuery.error instanceof ApiError && meQuery.error.status === 401) {
      clearTokens();
      setHasToken(false);
      queryClient.clear();
    }
  }, [meQuery.error, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isAuthenticated: Boolean(meQuery.data),
      isLoading: meQuery.isLoading || meQuery.isFetching,
      async acceptTokens(tokens) {
        setTokens(tokens.access_token, tokens.refresh_token);
        setHasToken(true);
        const user = await queryClient.fetchQuery({
          queryKey: queryKeys.me,
          queryFn: api.me,
          staleTime: 20_000
        });
        queryClient.setQueryData(queryKeys.me, user);
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
