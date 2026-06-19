import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/status-badge";

describe("StatusBadge", () => {
  it("renders document status text", () => {
    render(<StatusBadge status="ready" />);

    expect(screen.getByText("ready")).toBeInTheDocument();
  });
});
