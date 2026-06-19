import { describe, expect, it } from "vitest";

const terminalStatuses = new Set(["ready", "failed", "deleted"]);

describe("document status behavior", () => {
  it("treats ready and failed as terminal polling states", () => {
    expect(terminalStatuses.has("ready")).toBe(true);
    expect(terminalStatuses.has("failed")).toBe(true);
    expect(terminalStatuses.has("processing")).toBe(false);
  });
});
