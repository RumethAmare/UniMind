import { FileText } from "lucide-react";
import type { SourceCitation } from "@/types/api";
import { Panel } from "@/components/ui";

export function CitationDrawer({ sources }: { sources: SourceCitation[] }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Citations</h2>
        <p className="text-xs text-neutral-500">Sources used in the latest answer.</p>
      </div>
      {sources.length === 0 ? (
        <Panel className="p-4 text-sm text-neutral-500">No citations yet.</Panel>
      ) : (
        sources.map((source) => (
          <Panel key={source.chunk_id} className="p-3">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 shrink-0" size={16} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{source.document_name}</p>
                <p className="text-xs text-neutral-500">Page {source.page_number ?? "unknown"}</p>
                <p className="mt-2 break-all text-xs text-neutral-500">{source.chunk_id}</p>
              </div>
            </div>
          </Panel>
        ))
      )}
    </div>
  );
}
