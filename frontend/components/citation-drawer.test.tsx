import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CitationDrawer } from "@/components/citation-drawer";

describe("CitationDrawer", () => {
  it("renders citation source details", () => {
    render(
      <CitationDrawer
        sources={[
          {
            document_name: "Operating Systems",
            page_number: 12,
            chunk_id: "0a7cbb0f-056f-4895-a92f-a8de6f176572"
          }
        ]}
      />
    );

    expect(screen.getByText("Operating Systems")).toBeInTheDocument();
    expect(screen.getByText("Page 12")).toBeInTheDocument();
  });
});
