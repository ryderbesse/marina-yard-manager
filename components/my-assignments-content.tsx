"use client";

import { useTransition } from "react";
import { Clock, Flag, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAssignmentStatus } from "@/lib/actions";
import type { AssignmentWithJob, DbAssignment, MeetingWithNames } from "@/lib/types";

const assignmentStatusOptions: { value: DbAssignment["status"]; label: string }[] = [
  { value: "assigned", label: "Assigned" },
  { value: "active", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

interface Props {
  assignments: AssignmentWithJob[];
  meetings: MeetingWithNames[];
  workerName: string;
  today: string;
}

export function MyAssignmentsContent({ assignments, meetings, workerName, today }: Props) {
  const dateLabel = new Date(today + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Jobs Today</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {dateLabel} · {workerName}
        </p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
            <p>No jobs assigned to you today.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <AssignmentCard key={a.id} assignment={a} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upcoming Meetings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {meetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No meetings scheduled.</p>
          ) : (
            meetings.map((m) => (
              <div key={m.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.starts_at).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  · {m.duration_minutes} min · with {m.organizer.name}
                </p>
                {m.notes && (
                  <p className="mt-1 text-xs text-muted-foreground">{m.notes}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AssignmentCard({ assignment: a }: { assignment: AssignmentWithJob }) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (status: DbAssignment["status"] | null) => {
    if (!status) return;
    startTransition(async () => {
      await updateAssignmentStatus(a.id, status);
    });
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{a.job.boat_name}</p>
            <span className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {a.job.location ?? "—"}
            </span>
          </div>
          <Select value={a.status} onValueChange={handleStatusChange}>
            <SelectTrigger size="sm" className="w-36 shrink-0" disabled={isPending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assignmentStatusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {a.job.description && (
          <p className="text-sm text-foreground/90">{a.job.description}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {a.job.estimated_hours ?? "—"}h
          </span>
          {a.job.priority != null && (
            <span className="flex items-center gap-1">
              <Flag className="h-3.5 w-3.5" />
              Priority {a.job.priority}
            </span>
          )}
        </div>

        {a.notes && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Note: {a.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
