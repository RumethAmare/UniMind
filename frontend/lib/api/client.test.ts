import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { setTokens, clearTokens } from "@/lib/auth/tokens";

describe("api client", () => {
  afterEach(() => {
    clearTokens();
    vi.restoreAllMocks();
  });

  it("attaches bearer token for authenticated requests", async () => {
    setTokens("access-token", "refresh-token");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await api.listDocuments();

    const call = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    const headers = call[1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer access-token");
  });

  it("refreshes an expired access token and retries once", async () => {
    setTokens("expired-token", "refresh-token");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/auth/refresh")) {
        return new Response(
          JSON.stringify({ access_token: "new-token", refresh_token: "new-refresh", token_type: "bearer" }),
          { status: 200 }
        );
      }
      const calls = fetchMock.mock.calls.length;
      return calls === 1
        ? new Response(JSON.stringify({ detail: "expired" }), { status: 401 })
        : new Response(JSON.stringify([]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.listDocuments()).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retry = fetchMock.mock.calls[2] as unknown as [RequestInfo | URL, RequestInit];
    expect((retry[1].headers as Headers).get("Authorization")).toBe("Bearer new-token");
  });
});
