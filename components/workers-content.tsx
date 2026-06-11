"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkerPicker } from "@/components/worker-picker";
import { WorkerProfileDialog } from "@/components/worker-profile-dialog";
import {
  createWorker,
  createWorkerGroup,
  deleteWorkerGroup,
  updateWorkerGroup,
} from "@/lib/actions";
import type {
  WorkerWithHours,
  JobWithAssignments,
  DbWorker,
  WorkerGroupWithMembers,
  MeetingWithNames,
} from "@/lib/types";
import { APP_ROLE_LABELS, deriveJobStatus } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

interface Props {
  workers: WorkerWithHours[];
  todayJobs: JobWithAssignments[];
  groups: WorkerGroupWithMembers[];
  meetings: MeetingWithNames[];
}

export function WorkersContent({ workers, todayJobs, groups, meetings }: Props) {
  const currentWorker = useAuth();
  const canManage = currentWorker?.app_role === "boss";
  const canSchedule =
    currentWorker?.app_role === "boss" || currentWorker?.app_role === "head";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WorkerGroupWithMembers | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<WorkerGroupWithMembers | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<WorkerWithHours | null>(null);
  const [isDeletingGroup, startDeleteGroupTransition] = useTransition();

  const totalHours = workers.reduce((sum, w) => sum + w.hours_this_week, 0);
  const activeJobCount = todayJobs.filter(
    (j) => deriveJobStatus(j.assignments) === "in-progress"
  ).length;

  const handleDeleteGroup = () => {
    if (!deletingGroup) return;
    const groupId = deletingGroup.id;
    startDeleteGroupTransition(async () => {
      await deleteWorkerGroup(groupId);
      setDeletingGroup(null);
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Workers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Team overview and weekly hours
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Worker
          </Button>
        )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Worker</DialogTitle>
            </DialogHeader>
            <AddWorkerForm onClose={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Workers" value={workers.length} color="text-foreground" />
        <StatCard label="Hours This Week" value={totalHours} color="text-foreground" />
        <StatCard label="Active Jobs Today" value={activeJobCount} color="text-blue-600" />
      </div>

      {canManage && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle>Worker Groups</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setEditingGroup(null);
                setGroupDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Group
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No groups yet. Create a group (e.g. &quot;Mechanics&quot;) to assign
                everyone in it to a job at once.
              </p>
            ) : (
              groups.map((group) => {
                const members = workers.filter((w) => group.member_ids.includes(w.id));
                return (
                  <div
                    key={group.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <p className="font-medium">{group.name}</p>
                      <div className="flex flex-wrap gap-1">
                        {members.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No members</span>
                        ) : (
                          members.map((m) => (
                            <span
                              key={m.id}
                              className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                            >
                              {m.name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Edit group"
                        onClick={() => {
                          setEditingGroup(group);
                          setGroupDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Delete group"
                        onClick={() => setDeletingGroup(group)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "New Group"}</DialogTitle>
          </DialogHeader>
          <WorkerGroupForm
            workers={workers}
            group={editingGroup ?? undefined}
            onClose={() => setGroupDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingGroup}
        onOpenChange={(open) => !open && setDeletingGroup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this group?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingGroup && (
                <>
                  This will permanently remove the group{" "}
                  <strong>{deletingGroup.name}</strong>. Workers themselves are not
                  affected.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingGroup}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteGroup}
              disabled={isDeletingGroup}
            >
              {isDeletingGroup ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title / Role</TableHead>
              <TableHead>Hours This Week</TableHead>
              <TableHead>Today&apos;s Jobs</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((worker) => {
              const workerTodayJobs = todayJobs.filter((j) =>
                j.assignments.some((a) => a.worker_id === worker.id)
              );
              const isActive = workerTodayJobs.some(
                (j) => deriveJobStatus(j.assignments) === "in-progress"
              );

              return (
                <TableRow key={worker.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setSelectedWorker(worker)}
                      className="text-left font-medium text-foreground hover:underline"
                    >
                      {worker.name}
                    </button>
                    {worker.email && (
                      <p className="text-xs text-muted-foreground">
                        {worker.email}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {worker.job_title && (
                        <p className="text-sm">{worker.job_title}</p>
                      )}
                      <Badge
                        variant="outline"
                        className="text-xs text-muted-foreground"
                      >
                        {APP_ROLE_LABELS[worker.app_role]}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.min(
                              (worker.hours_this_week / 40) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="tabular-nums text-sm">
                        {worker.hours_this_week}h
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {workerTodayJobs.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <div className="space-y-0.5">
                        {workerTodayJobs.map((j) => (
                          <p key={j.id} className="text-sm">
                            {j.boat_name}
                            {j.location ? ` — ${j.location}` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isActive ? (
                      <Badge className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50">
                        Active
                      </Badge>
                    ) : workerTodayJobs.length > 0 ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        Assigned
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Available
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {selectedWorker && (
        <WorkerProfileDialog
          worker={selectedWorker}
          meetings={meetings}
          canEdit={canManage}
          canSchedule={canSchedule}
          currentWorkerId={currentWorker?.id ?? ""}
          onClose={() => setSelectedWorker(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
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

function WorkerGroupForm({
  workers,
  group,
  onClose,
}: {
  workers: WorkerWithHours[];
  group?: WorkerGroupWithMembers;
  onClose: () => void;
}) {
  const isEdit = !!group;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(group?.name ?? "");
  const [memberIds, setMemberIds] = useState<string[]>(group?.member_ids ?? []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateWorkerGroup(group.id, name, memberIds)
        : await createWorkerGroup(name, memberIds);
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
        <Label htmlFor="groupName">Group Name</Label>
        <Input
          id="groupName"
          placeholder="e.g. Mechanics"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>
          Members
          {memberIds.length > 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground font-normal">
              ({memberIds.length} selected)
            </span>
          )}
        </Label>
        <WorkerPicker workers={workers} selectedIds={memberIds} onChange={setMemberIds} />
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
        <Button type="submit" disabled={!name || isPending}>
          {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Group"}
        </Button>
      </div>
    </form>
  );
}

function AddWorkerForm({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [appRole, setAppRole] = useState<DbWorker["app_role"] | "">("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appRole) return;
    setError(null);

    startTransition(async () => {
      const result = await createWorker({
        name,
        job_title: jobTitle,
        app_role: appRole,
        email: email || undefined,
        phone: phone || undefined,
      });
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
        <Label htmlFor="workerName">Full Name</Label>
        <Input
          id="workerName"
          placeholder="e.g. Sam Rivera"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="jobTitle">Job Title</Label>
        <Input
          id="jobTitle"
          placeholder="e.g. Lead Mechanic"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>App Role</Label>
        <Select
          value={appRole}
          onValueChange={(v) =>
            setAppRole((v ?? "") as DbWorker["app_role"] | "")
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {(
              Object.entries(APP_ROLE_LABELS) as [
                DbWorker["app_role"],
                string
              ][]
            ).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">
            Email{" "}
            <span className="text-xs text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="sam@marina.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">
            Phone{" "}
            <span className="text-xs text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="555-0110"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
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
        <Button type="submit" disabled={!name || !appRole || isPending}>
          {isPending ? "Adding…" : "Add Worker"}
        </Button>
      </div>
    </form>
  );
}
