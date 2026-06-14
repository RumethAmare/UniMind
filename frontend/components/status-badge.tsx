import { clsx } from "clsx";
import type { DocumentStatus } from "@/types/api";

const styles: Record<DocumentStatus, string> = {
  uploaded: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  processing: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  ready: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-200",
  failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
  deleted: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return <span className={clsx("rounded px-2 py-1 text-xs font-medium", styles[status])}>{status}</span>;
}
