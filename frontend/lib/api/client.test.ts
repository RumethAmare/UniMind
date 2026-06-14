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

  it("sends delete requests for chat sessions", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await api.deleteChatSession("session-id");

    const call = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    expect(call[0]).toBe("/api/v1/chat/sessions/session-id");
    expect(call[1].method).toBe("DELETE");
  });
});
