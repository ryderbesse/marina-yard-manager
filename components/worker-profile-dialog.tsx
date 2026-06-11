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
import { useLanguage } from "@/lib/i18n/language-context";
import { formatDate, formatDateTime } from "@/lib/i18n/format";
import type { DbWorker, MeetingWithNames, WorkerWithHours } from "@/lib/types";

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
  const { t } = useLanguage();
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
              ? t("workerProfile.editTitle", { name: worker.name })
              : mode === "schedule"
                ? t("workerProfile.scheduleTitle", { name: worker.name })
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
  const { language, t } = useLanguage();
  const [isPending, startTransition] = useTransition();

  const handleDeleteMeeting = (meetingId: string) => {
    startTransition(async () => {
      await deleteMeeting(meetingId);
    });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{t(`roles.${worker.app_role}`)}</Badge>
        {worker.job_title && (
          <Badge variant="outline" className="text-muted-foreground">
            <Briefcase className="mr-1 h-3 w-3" />
            {worker.job_title}
          </Badge>
        )}
        {!worker.is_active && (
          <Badge variant="outline" className="border-destructive/30 text-destructive">
            {t("settings.fields.inactive")}
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
            {t("settings.hiredOn", {
              date: formatDate(worker.hire_date + "T12:00:00", language, {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
            })}
          </p>
        )}
        <p className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {t("settings.hoursValue", { hours: worker.hours_this_week })}
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
          <Label className="text-xs text-muted-foreground">{t("settings.fields.notes")}</Label>
          <p className="rounded-md bg-muted px-3 py-2 text-sm">{worker.notes}</p>
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{t("workerProfile.upcomingMeetings")}</Label>
        {meetings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("workerProfile.noMeetings")}</p>
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
                      {t("workerProfile.meetingDetails", {
                        date: formatDateTime(m.starts_at, language, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }),
                        duration: m.duration_minutes,
                        name: otherParty.name,
                      })}
                    </p>
                    {m.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">{m.notes}</p>
                    )}
                  </div>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      title={t("workerProfile.cancelMeeting")}
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
            {t("workerProfile.scheduleMeetingButton")}
          </Button>
        )}
        {canEdit && (
          <Button onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            {t("common.edit")}
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
  const { t } = useLanguage();
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
        <Label htmlFor="editName">{t("workerProfile.fullName")}</Label>
        <Input
          id="editName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="editJobTitle">{t("settings.fields.jobTitle")}</Label>
        <Input
          id="editJobTitle"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t("settings.fields.role")}</Label>
          <Select
            value={appRole}
            onValueChange={(v) => v && setAppRole(v as DbWorker["app_role"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["boss", "head", "worker"] as DbWorker["app_role"][]).map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`roles.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("settings.fields.status")}</Label>
          <Select
            value={isActive ? "active" : "inactive"}
            onValueChange={(v) => v && setIsActive(v === "active")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("settings.fields.active")}</SelectItem>
              <SelectItem value="inactive">{t("settings.fields.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="editEmail">{t("settings.fields.email")}</Label>
          <Input
            id="editEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="editPhone">{t("settings.fields.phone")}</Label>
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
          {t("settings.fields.skills")}{" "}
          <span className="text-xs text-muted-foreground font-normal">
            {t("workerProfile.skillsHint")}
          </span>
        </Label>
        <Input
          id="editSkills"
          value={skillsInput}
          onChange={(e) => setSkillsInput(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="editNotes">{t("settings.fields.notes")}</Label>
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
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={!name || isPending}>
          {isPending ? t("common.saving") : t("workerProfile.saveChanges")}
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
  const { t } = useLanguage();
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
      setError(t("workerProfile.invalidDateTime"));
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
        <Label htmlFor="meetingTitle">{t("workerProfile.meetingTitle")}</Label>
        <Input
          id="meetingTitle"
          placeholder={t("workerProfile.meetingTitlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="meetingDate">{t("workerProfile.date")}</Label>
          <Input
            id="meetingDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meetingTime">{t("workerProfile.time")}</Label>
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
        <Label>{t("workerProfile.duration")}</Label>
        <Select value={duration} onValueChange={(v) => v && setDuration(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">{t("workerProfile.durationOptions.15")}</SelectItem>
            <SelectItem value="30">{t("workerProfile.durationOptions.30")}</SelectItem>
            <SelectItem value="45">{t("workerProfile.durationOptions.45")}</SelectItem>
            <SelectItem value="60">{t("workerProfile.durationOptions.60")}</SelectItem>
            <SelectItem value="90">{t("workerProfile.durationOptions.90")}</SelectItem>
            <SelectItem value="120">{t("workerProfile.durationOptions.120")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meetingNotes">
          {t("settings.fields.notes")}{" "}
          <span className="text-xs text-muted-foreground font-normal">{t("workerProfile.optional")}</span>
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
          {t("workerProfile.back")}
        </Button>
        <Button type="submit" disabled={!title || !date || !time || isPending}>
          {isPending ? t("workerProfile.scheduling") : t("workerProfile.scheduleMeetingButton")}
        </Button>
      </div>
    </form>
  );
}
