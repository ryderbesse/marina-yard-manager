"use client";

import { Fragment, useState, useTransition } from "react";
import { Plus, Clock, MapPin, Pencil, Trash2, Sparkles, Send, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JobStatusBadge } from "@/components/job-status-badge";
import { WorkerPicker } from "@/components/worker-picker";
import {
  createJob,
  deleteJob,
  publishPlan,
  resolveJobChange,
  updateJob,
} from "@/lib/actions";
import type {
  DbDailyPlan,
  DbWorker,
  JobWithAssignments,
  JobStatus,
  WorkerGroupWithMembers,
} from "@/lib/types";
import { deriveJobStatus } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { formatDate } from "@/lib/i18n/format";

type StatusFilter = "all" | JobStatus;

const statusFilterValues: StatusFilter[] = [
  "all",
  "pending",
  "in-progress",
  "completed",
  "on-hold",
];

interface Props {
  plan: DbDailyPlan | null;
  jobs: JobWithAssignments[];
  workers: Pick<DbWorker, "id" | "name" | "job_title" | "app_role" | "is_active">[];
  groups: WorkerGroupWithMembers[];
  today: string;
}

export function DailyJobsContent({ plan, jobs, workers, groups, today }: Props) {
  const { language, t } = useLanguage();
  const worker = useAuth();
  const isBoss = worker?.app_role === "boss";
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobWithAssignments | null>(null);
  const [deletingJob, setDeletingJob] = useState<JobWithAssignments | null>(null);
  const [isPublishing, startPublishTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isResolving, startResolveTransition] = useTransition();

  const handleResolveChange = (jobId: string) => {
    startResolveTransition(async () => {
      await resolveJobChange(jobId);
    });
  };

  const jobsWithStatus = jobs.map((j) => ({
    ...j,
    derivedStatus: deriveJobStatus(j.assignments),
  }));

  const filtered =
    filter === "all"
      ? jobsWithStatus
      : jobsWithStatus.filter((j) => j.derivedStatus === filter);

  const counts: Record<StatusFilter, number> = {
    all: jobsWithStatus.length,
    pending: jobsWithStatus.filter((j) => j.derivedStatus === "pending").length,
    "in-progress": jobsWithStatus.filter((j) => j.derivedStatus === "in-progress").length,
    completed: jobsWithStatus.filter((j) => j.derivedStatus === "completed").length,
    "on-hold": jobsWithStatus.filter((j) => j.derivedStatus === "on-hold").length,
  };

  const dateLabel = formatDate(today + "T12:00:00", language, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const openCreateDialog = () => {
    setEditingJob(null);
    setDialogOpen(true);
  };

  const openEditDialog = (job: JobWithAssignments) => {
    setEditingJob(job);
    setDialogOpen(true);
  };

  const handlePublish = () => {
    if (!plan) return;
    startPublishTransition(async () => {
      await publishPlan(plan.id);
    });
  };

  const handleDelete = () => {
    if (!deletingJob) return;
    const jobId = deletingJob.id;
    startDeleteTransition(async () => {
      await deleteJob(jobId);
      setDeletingJob(null);
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("dailyJobs.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        {isBoss && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled title={t("dailyJobs.optimizeTooltip")}>
              <Sparkles className="mr-2 h-4 w-4" />
              {t("dailyJobs.optimizeWithAi")}
              <span className="ml-1.5 text-xs text-muted-foreground">{t("dailyJobs.inDevelopment")}</span>
            </Button>
            {plan?.status === "published" ? (
              <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                <Send className="h-3 w-3" />
                {t("dailyJobs.published")}
              </Badge>
            ) : (
              plan &&
              jobs.length > 0 && (
                <Button variant="secondary" onClick={handlePublish} disabled={isPublishing}>
                  <Send className="mr-2 h-4 w-4" />
                  {isPublishing ? t("dailyJobs.publishing") : t("dailyJobs.publishPlan")}
                </Button>
              )
            )}
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {t("dailyJobs.addJob")}
            </Button>
          </div>
        )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingJob ? t("dailyJobs.editWorkOrder") : t("dailyJobs.newWorkOrder")}</DialogTitle>
            </DialogHeader>
            <JobForm
              workers={workers}
              groups={groups}
              today={today}
              job={editingJob ?? undefined}
              onClose={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label={t("dailyJobs.summary.totalJobs")} value={counts.all} color="text-foreground" />
        <SummaryCard label={t("jobStatus.in-progress")} value={counts["in-progress"]} color="text-blue-600" />
        <SummaryCard label={t("jobStatus.pending")} value={counts.pending} color="text-amber-600" />
        <SummaryCard label={t("jobStatus.completed")} value={counts.completed} color="text-green-600" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-1 flex-wrap">
            {statusFilterValues.map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {value === "all" ? t("dailyJobs.filters.all") : t(`jobStatus.${value}`)}
                <span className="ml-1.5 tabular-nums text-xs opacity-70">
                  ({counts[value]})
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-muted-foreground">
              <p>{plan ? t("dailyJobs.noJobsFilter") : t("dailyJobs.noPlanYet")}</p>
              {!plan && (
                <p className="text-xs">{t("dailyJobs.addJobHint")}</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dailyJobs.table.boat")}</TableHead>
                  <TableHead>{t("dailyJobs.table.location")}</TableHead>
                  <TableHead>{t("dailyJobs.table.description")}</TableHead>
                  <TableHead>{t("dailyJobs.table.assigned")}</TableHead>
                  <TableHead>{t("dailyJobs.table.estHours")}</TableHead>
                  <TableHead>{t("dailyJobs.table.status")}</TableHead>
                  {isBoss && <TableHead className="text-right">{t("dailyJobs.table.actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((job) => (
                  <Fragment key={job.id}>
                  <TableRow>
                    <TableCell>
                      <p className="font-medium">{job.boat_name}</p>
                      {job.captain_name && (
                        <p className="text-xs text-muted-foreground">
                          {t("headPlan.captain", { name: job.captain_name })}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {job.location ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-48 truncate text-sm">
                        {job.description ?? "—"}
                      </p>
                      {job.required_skills && job.required_skills.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {job.required_skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {job.assignments.length === 0 ? (
                          <span className="text-sm text-muted-foreground">{t("headPlan.unassigned")}</span>
                        ) : (
                          job.assignments.map((a) => (
                            <div key={a.id} className="text-sm">
                              {a.worker.name}
                            </div>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {job.estimated_hours ?? "—"}h
                      </span>
                    </TableCell>
                    <TableCell>
                      <JobStatusBadge status={job.derivedStatus} />
                    </TableCell>
                    {isBoss && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title={t("dailyJobs.editJob")}
                            onClick={() => openEditDialog(job)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title={t("dailyJobs.deleteJob")}
                            onClick={() => setDeletingJob(job)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  {job.change_request && (
                    <TableRow className="bg-amber-50 hover:bg-amber-50">
                      <TableCell colSpan={isBoss ? 7 : 6} className="py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <div>
                              <p className="font-medium text-amber-800">
                                {t("dailyJobs.changeRequestedBy", {
                                  name:
                                    workers.find((w) => w.id === job.change_request_by)?.name ??
                                    t("roles.head"),
                                })}
                              </p>
                              <p className="text-amber-700">{job.change_request}</p>
                            </div>
                          </div>
                          {isBoss && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0 border-amber-300 bg-white hover:bg-amber-100"
                              onClick={() => handleResolveChange(job.id)}
                              disabled={isResolving}
                            >
                              {isResolving ? t("dailyJobs.resolving") : t("dailyJobs.resolve")}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deletingJob}
        onOpenChange={(open) => !open && setDeletingJob(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dailyJobs.deleteJobConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingJob && (
                <>
                  {t("dailyJobs.deleteJobConfirmPre")}{" "}
                  <strong>{deletingJob.boat_name}</strong>{" "}
                  {t("dailyJobs.deleteJobConfirmPost")}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function JobForm({
  workers,
  groups,
  today,
  job,
  onClose,
}: {
  workers: Pick<DbWorker, "id" | "name" | "job_title" | "app_role">[];
  groups: WorkerGroupWithMembers[];
  today: string;
  job?: JobWithAssignments;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const isEdit = !!job;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(today);
  const [boatName, setBoatName] = useState(job?.boat_name ?? "");
  const [captainName, setCaptainName] = useState(job?.captain_name ?? "");
  const [location, setLocation] = useState(job?.location ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [skillsInput, setSkillsInput] = useState((job?.required_skills ?? []).join(", "));
  const [estimatedHours, setEstimatedHours] = useState(
    job?.estimated_hours != null ? String(job.estimated_hours) : ""
  );
  const [assignedWorkerIds, setAssignedWorkerIds] = useState<string[]>(
    job?.assignments.map((a) => a.worker_id) ?? []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const required_skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      boat_name: boatName,
      captain_name: captainName,
      location,
      description,
      estimated_hours: parseFloat(estimatedHours) || 0,
      required_skills,
      worker_ids: assignedWorkerIds,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateJob(job.id, payload)
        : await createJob({ ...payload, date });
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {!isEdit && (
        <div className="space-y-1.5">
          <Label htmlFor="date">{t("workerProfile.date")}</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="boatName">{t("dailyJobs.boatName")}</Label>
          <Input
            id="boatName"
            placeholder={t("dailyJobs.boatNamePlaceholder")}
            value={boatName}
            onChange={(e) => setBoatName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="captainName">
            {t("dailyJobs.captain")}{" "}
            <span className="text-xs text-muted-foreground font-normal">{t("workerProfile.optional")}</span>
          </Label>
          <Input
            id="captainName"
            placeholder={t("dailyJobs.captainPlaceholder")}
            value={captainName}
            onChange={(e) => setCaptainName(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="location">{t("dailyJobs.location")}</Label>
          <Input
            id="location"
            placeholder={t("dailyJobs.locationPlaceholder")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="estimatedHours">{t("dailyJobs.estimatedHours")}</Label>
          <Input
            id="estimatedHours"
            type="number"
            min="0.5"
            step="0.5"
            placeholder={t("dailyJobs.estimatedHoursPlaceholder")}
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">{t("dailyJobs.description")}</Label>
        <Textarea
          id="description"
          placeholder={t("dailyJobs.descriptionPlaceholder")}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="skills">
          {t("dailyJobs.requiredSkills")}{" "}
          <span className="text-xs text-muted-foreground font-normal">
            {t("workerProfile.skillsHint")}
          </span>
        </Label>
        <Input
          id="skills"
          placeholder={t("dailyJobs.skillsPlaceholder")}
          value={skillsInput}
          onChange={(e) => setSkillsInput(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>
          {t("dailyJobs.assignWorkers")}
          {assignedWorkerIds.length > 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground font-normal">
              {t("workers.selectedCount", { count: assignedWorkerIds.length })}
            </span>
          )}
        </Label>
        <WorkerPicker
          workers={workers}
          groups={groups}
          selectedIds={assignedWorkerIds}
          onChange={setAssignedWorkerIds}
        />
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isEdit
              ? t("common.saving")
              : t("dailyJobs.creating")
            : isEdit
              ? t("workerProfile.saveChanges")
              : t("dailyJobs.createJob")}
        </Button>
      </div>
    </form>
  );
}
