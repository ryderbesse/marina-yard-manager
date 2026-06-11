"use client";

import { Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/language-context";
import type { DbWorker, WorkerGroupWithMembers } from "@/lib/types";

interface Props {
  workers: Pick<DbWorker, "id" | "name" | "job_title" | "app_role">[];
  groups?: WorkerGroupWithMembers[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function WorkerPicker({ workers, groups = [], selectedIds, onChange }: Props) {
  const { t } = useLanguage();

  const toggleWorker = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((w) => w !== id)
        : [...selectedIds, id]
    );
  };

  const toggleGroup = (group: WorkerGroupWithMembers) => {
    const allSelected =
      group.member_ids.length > 0 &&
      group.member_ids.every((id) => selectedIds.includes(id));

    if (allSelected) {
      onChange(selectedIds.filter((id) => !group.member_ids.includes(id)));
    } else {
      const next = new Set(selectedIds);
      group.member_ids.forEach((id) => next.add(id));
      onChange(Array.from(next));
    }
  };

  return (
    <div className="space-y-2">
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {groups.map((group) => {
            const allSelected =
              group.member_ids.length > 0 &&
              group.member_ids.every((id) => selectedIds.includes(id));
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => toggleGroup(group)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  allSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Users className="h-3 w-3" />
                {group.name}
                <span className="opacity-70">({group.member_ids.length})</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {workers.map((w) => {
          const selected = selectedIds.includes(w.id);
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => toggleWorker(w.id)}
              className={cn(
                "flex items-start gap-2.5 rounded-md border p-2.5 text-left text-sm transition-colors",
                selected
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  selected ? "border-primary bg-primary" : "border-input"
                )}
              >
                {selected && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <div className="min-w-0">
                <p className="font-medium leading-snug truncate">{w.name}</p>
                <p className="text-xs opacity-70">
                  {w.job_title ?? t(`roles.${w.app_role}`)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
