"use client";

import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

const statusStyles: Record<JobStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
  "in-progress":
    "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
  completed:
    "bg-green-50 text-green-700 border-green-200 hover:bg-green-50",
  "on-hold":
    "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-50",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { t } = useLanguage();
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", statusStyles[status])}
    >
      {t(`jobStatus.${status}`)}
    </Badge>
  );
}
