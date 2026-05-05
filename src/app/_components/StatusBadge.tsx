import { STATUS_BADGE, STATUS_LABELS } from "@/lib/review";
import type { ReviewStatus } from "@/lib/schema";

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
