"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Clock, MapPin, MessageSquarePlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkerPicker } from "@/components/worker-picker";
import {
  requestJobChange,
  updateAssignmentNotes,
  updateAssignmentStatus,
  updateJobWorkers,
} from "@/lib/actions";
import {
  APP_ROLE_LABELS,
  type AssignmentWithWorker,
  type DbAssignment,
  type DbDailyPlan,
  type DbWorker,
  type JobWithAssignments,
  type WorkerGroupWithMembers,
} from "@/lib/types";

const assignmentStatusOptions: { value: DbAssignment["status"]; label: string }[] = [
  { value: "assigned", label: "Assigned" },
  { value: "active", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

interface Props {
  plan: DbDailyPlan | null;
  jobs: JobWithAssignments[];
  workers: Pick<DbWorker, "id" | "name" | "job_title" | "app_role" | "is_active">[];
  groups: WorkerGroupWithMembers[];
  today: string;
}

export function HeadDailyPlanContent({ plan, jobs, workers, groups, today }: Props) {
  const dateLabel = new Date(today + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const isPublished = plan?.status === "published";

  const [editingCrewJob, setEditingCrewJob] = useState<JobWithAssignments | null>(null);
  const [requestingChangeJob, setRequestingChangeJob] = useState<JobWithAssignments | null>(
    null
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Today&apos;s Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
      </div>

      {!isPublished ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
            <p>The boss hasn&apos;t published today&apos;s plan yet.</p>
          </CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
            <p>No jobs scheduled for today.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const sortedAssignments = [...job.assignments].sort(
              (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
            );
            return (
              <Card key={job.id}>
                <CardHeader className="gap-2 pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>{job.boat_name}</CardTitle>
                      {job.captain_name && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Capt. {job.captain_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location ?? "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {job.estimated_hours ?? "—"}h
                      </span>
                    </div>
                  </div>
                  {job.description && (
                    <p className="text-sm text-muted-foreground">{job.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => setEditingCrewJob(job)}>
                      <Users className="mr-2 h-3.5 w-3.5" />
                      Edit Crew
                    </Button>
                    {!job.change_request && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRequestingChangeJob(job)}
                      >
                        <MessageSquarePlus className="mr-2 h-3.5 w-3.5" />
                        Request Change
                      </Button>
                    )}
                  </div>

                  {job.change_request && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800">
                          Change request pending review
                        </p>
                        <p className="text-amber-700">{job.change_request}</p>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {sortedAssignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Unassigned</p>
                  ) : (
                    sortedAssignments.map((assignment) => (
                      <AssignmentRow key={assignment.id} assignment={assignment} />
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editingCrewJob && (
        <Dialog open onOpenChange={(o) => !o && setEditingCrewJob(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Crew — {editingCrewJob.boat_name}</DialogTitle>
            </DialogHeader>
            <EditCrewForm
              job={editingCrewJob}
              workers={workers}
              groups={groups}
              onClose={() => setEditingCrewJob(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {requestingChangeJob && (
        <Dialog open onOpenChange={(o) => !o && setRequestingChangeJob(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request Change — {requestingChangeJob.boat_name}</DialogTitle>
            </DialogHeader>
            <RequestChangeForm
              jobId={requestingChangeJob.id}
              onClose={() => setRequestingChangeJob(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AssignmentRow({ assignment }: { assignment: AssignmentWithWorker }) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(assignment.notes ?? "");

  const handleStatusChange = (status: DbAssignment["status"] | null) => {
    if (!status) return;
    startTransition(async () => {
      await updateAssignmentStatus(assignment.id, status);
    });
  };

  const handleNotesBlur = () => {
    if (notes !== (assignment.notes ?? "")) {
      startTransition(async () => {
        await updateAssignmentNotes(assignment.id, notes);
      });
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">{assignment.worker.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {assignment.worker.job_title ?? APP_ROLE_LABELS[assignment.worker.app_role]}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:max-w-md sm:flex-1">
        <Input
          placeholder="Add a note…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          disabled={isPending}
          className="h-8 text-sm"
        />
        <Select value={assignment.status} onValueChange={handleStatusChange}>
          <SelectTrigger size="sm" className="w-32 shrink-0" disabled={isPending}>
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
    </div>
  );
}

function EditCrewForm({
  job,
  workers,
  groups,
  onClose,
}: {
  job: JobWithAssignments;
  workers: Pick<DbWorker, "id" | "name" | "job_title" | "app_role">[];
  groups: WorkerGroupWithMembers[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    job.assignments.map((a) => a.worker_id)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateJobWorkers(job.id, selectedIds);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <WorkerPicker
        workers={workers}
        groups={groups}
        selectedIds={selectedIds}
        onChange={setSelectedIds}
      />
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Crew"}
        </Button>
      </div>
    </form>
  );
}

function RequestChangeForm({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestJobChange(jobId, message);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label htmlFor="changeMessage">What would you like to change?</Label>
        <Textarea
          id="changeMessage"
          rows={3}
          placeholder="e.g. This job needs another hour and an extra mechanic…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={!message.trim() || isPending}>
          {isPending ? "Sending…" : "Send Request"}
        </Button>
      </div>
    </form>
  );
}
