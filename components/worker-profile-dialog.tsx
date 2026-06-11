"use client";

import { useState, useTransition } from "react";
import {
  Briefcase,
  Calendar,
  CalendarPlus,
  Clock,
  Mail,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { deleteMeeting, scheduleMeeting, updateWorker } from "@/lib/actions";
import {
  APP_ROLE_LABELS,
  type DbWorker,
  type MeetingWithNames,
  type WorkerWithHours,
} from "@/lib/types";

interface Props {
  worker: WorkerWithHours;
  meetings: MeetingWithNames[];
  canEdit: boolean;
  canSchedule: boolean;
  currentWorkerId: string;
  onClose: () => void;
}

export function WorkerProfileDialog({
  worker,
  meetings,
  canEdit,
  canSchedule,
  currentWorkerId,
  onClose,
}: Props) {
  const [mode, setMode] = useState<"view" | "edit" | "schedule">("view");

  const workerMeetings = meetings
    .filter(
      (m) =>
        m.organizer_worker_id === worker.id || m.attendee_worker_id === worker.id
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? `Edit ${worker.name}`
              : mode === "schedule"
                ? `Schedule Meeting — ${worker.name}`
                : worker.name}
          </DialogTitle>
        </DialogHeader>

        {mode === "view" && (
          <ProfileView
            worker={worker}
            meetings={workerMeetings}
            canEdit={canEdit}
            canSchedule={canSchedule}
            currentWorkerId={currentWorkerId}
            onEdit={() => setMode("edit")}
            onSchedule={() => setMode("schedule")}
          />
        )}
        {mode === "edit" && (
          <EditWorkerForm worker={worker} onClose={() => setMode("view")} />
        )}
        {mode === "schedule" && (
          <ScheduleMeetingForm
            attendeeWorkerId={worker.id}
            onClose={() => setMode("view")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileView({
  worker,
  meetings,
  canEdit,
  canSchedule,
  currentWorkerId,
  onEdit,
  onSchedule,
}: {
  worker: WorkerWithHours;
  meetings: MeetingWithNames[];
  canEdit: boolean;
  canSchedule: boolean;
  currentWorkerId: string;
  onEdit: () => void;
  onSchedule: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDeleteMeeting = (meetingId: string) => {
    startTransition(async () => {
      await deleteMeeting(meetingId);
    });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{APP_ROLE_LABELS[worker.app_role]}</Badge>
        {worker.job_title && (
          <Badge variant="outline" className="text-muted-foreground">
            <Briefcase className="mr-1 h-3 w-3" />
            {worker.job_title}
          </Badge>
        )}
        {!worker.is_active && (
          <Badge variant="outline" className="border-destructive/30 text-destructive">
            Inactive
          </Badge>
        )}
      </div>

      <div className="space-y-1.5 text-sm">
        {worker.email && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            {worker.email}
          </p>
        )}
        {worker.phone && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {worker.phone}
          </p>
        )}
        {worker.hire_date && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            Hired{" "}
            {new Date(worker.hire_date + "T12:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
        <p className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {worker.hours_this_week}h this week
        </p>
      </div>

      {worker.skills && worker.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {worker.skills.map((skill) => (
            <span
              key={skill}
              className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {worker.notes && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <p className="rounded-md bg-muted px-3 py-2 text-sm">{worker.notes}</p>
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Upcoming Meetings</Label>
        {meetings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meetings scheduled.</p>
        ) : (
          <div className="space-y-2">
            {meetings.map((m) => {
              const otherParty =
                m.organizer_worker_id === worker.id ? m.attendee : m.organizer;
              const canDelete =
                canSchedule || m.organizer_worker_id === currentWorkerId;
              return (
                <div
                  key={m.id}
                  className="flex items-start justify-between gap-2 rounded-md border border-border p-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.starts_at).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      · {m.duration_minutes} min · with {otherParty.name}
                    </p>
                    {m.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">{m.notes}</p>
                    )}
                  </div>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      title="Cancel meeting"
                      disabled={isPending}
                      onClick={() => handleDeleteMeeting(m.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {canSchedule && (
          <Button variant="outline" onClick={onSchedule}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Schedule Meeting
          </Button>
        )}
        {canEdit && (
          <Button onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

function EditWorkerForm({
  worker,
  onClose,
}: {
  worker: WorkerWithHours;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(worker.name);
  const [jobTitle, setJobTitle] = useState(worker.job_title ?? "");
  const [appRole, setAppRole] = useState<DbWorker["app_role"]>(worker.app_role);
  const [email, setEmail] = useState(worker.email ?? "");
  const [phone, setPhone] = useState(worker.phone ?? "");
  const [skillsInput, setSkillsInput] = useState((worker.skills ?? []).join(", "));
  const [notes, setNotes] = useState(worker.notes ?? "");
  const [isActive, setIsActive] = useState(worker.is_active);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await updateWorker(worker.id, {
        name,
        job_title: jobTitle,
        app_role: appRole,
        email,
        phone,
        skills,
        notes,
        is_active: isActive,
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
        <Label htmlFor="editName">Full Name</Label>
        <Input
          id="editName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="editJobTitle">Job Title</Label>
        <Input
          id="editJobTitle"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>App Role</Label>
          <Select
            value={appRole}
            onValueChange={(v) => v && setAppRole(v as DbWorker["app_role"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(APP_ROLE_LABELS) as [DbWorker["app_role"], string][]
              ).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={isActive ? "active" : "inactive"}
            onValueChange={(v) => v && setIsActive(v === "active")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="editEmail">Email</Label>
          <Input
            id="editEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="editPhone">Phone</Label>
          <Input
            id="editPhone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="editSkills">
          Skills{" "}
          <span className="text-xs text-muted-foreground font-normal">
            (comma-separated)
          </span>
        </Label>
        <Input
          id="editSkills"
          value={skillsInput}
          onChange={(e) => setSkillsInput(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="editNotes">Notes</Label>
        <Textarea
          id="editNotes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
        <Button type="submit" disabled={!name || isPending}>
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

function ScheduleMeetingForm({
  attendeeWorkerId,
  onClose,
}: {
  attendeeWorkerId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const startsAt = new Date(`${date}T${time}`);
    if (Number.isNaN(startsAt.getTime())) {
      setError("Please choose a valid date and time.");
      return;
    }

    startTransition(async () => {
      const result = await scheduleMeeting({
        attendee_worker_id: attendeeWorkerId,
        title,
        starts_at: startsAt.toISOString(),
        duration_minutes: parseInt(duration, 10) || 30,
        notes,
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
        <Label htmlFor="meetingTitle">Title</Label>
        <Input
          id="meetingTitle"
          placeholder="e.g. Weekly check-in"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="meetingDate">Date</Label>
          <Input
            id="meetingDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meetingTime">Time</Label>
          <Input
            id="meetingTime"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Duration</Label>
        <Select value={duration} onValueChange={(v) => v && setDuration(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="45">45 minutes</SelectItem>
            <SelectItem value="60">1 hour</SelectItem>
            <SelectItem value="90">1.5 hours</SelectItem>
            <SelectItem value="120">2 hours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meetingNotes">
          Notes{" "}
          <span className="text-xs text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="meetingNotes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Back
        </Button>
        <Button type="submit" disabled={!title || !date || !time || isPending}>
          {isPending ? "Scheduling…" : "Schedule Meeting"}
        </Button>
      </div>
    </form>
  );
}
