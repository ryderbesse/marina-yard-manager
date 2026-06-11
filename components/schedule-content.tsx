"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JobStatusBadge } from "@/components/job-status-badge";
import type { MeetingWithNames, PlanWithJobs } from "@/lib/types";
import { deriveJobStatus } from "@/lib/types";

interface Props {
  initialPlans: PlanWithJobs[];
  meetings: MeetingWithNames[];
  currentWorkerId: string;
  today: string;
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ScheduleContent({ initialPlans, meetings, currentWorkerId, today }: Props) {
  const [weekStart, setWeekStart] = useState(() =>
    getMondayOf(new Date(today + "T12:00:00"))
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekLabel = `${weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${addDays(weekStart, 6).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  const plansByDate = new Map(initialPlans.map((p) => [p.date, p]));

  const meetingsByDate = new Map<string, MeetingWithNames[]>();
  for (const m of meetings) {
    const dateStr = new Date(m.starts_at).toISOString().split("T")[0];
    const list = meetingsByDate.get(dateStr) ?? [];
    list.push(m);
    meetingsByDate.set(dateStr, list);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setWeekStart(getMondayOf(new Date(today + "T12:00:00")))
            }
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {weekDays.map((day, i) => {
          const dateStr = toDateStr(day);
          const isToday = dateStr === today;
          const plan = plansByDate.get(dateStr);
          const dayJobs = plan?.jobs ?? [];
          const dayMeetings = meetingsByDate.get(dateStr) ?? [];

          return (
            <div key={dateStr} className="min-w-0">
              <div
                className={`mb-2 rounded-md px-2 py-1.5 text-center ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <p className="text-xs font-medium">{DAY_LABELS[i]}</p>
                <p
                  className={`mt-0.5 text-lg font-bold leading-none ${
                    isToday ? "text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {day.getDate()}
                </p>
              </div>

              <div className="space-y-2">
                {dayJobs.length === 0 && dayMeetings.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border py-6 text-center">
                    <p className="text-xs text-muted-foreground">No jobs</p>
                  </div>
                ) : (
                  <>
                    {dayJobs.map((job) => {
                      const status = deriveJobStatus(job.assignments);
                      return (
                        <Card
                          key={job.id}
                          className="border-l-[3px] border-l-primary py-0"
                        >
                          <CardContent className="p-2.5 space-y-1.5">
                            <p className="text-xs font-semibold leading-snug truncate text-foreground">
                              {job.boat_name}
                            </p>
                            {job.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {job.description}
                              </p>
                            )}
                            <JobStatusBadge status={status} />
                            <div className="pt-0.5">
                              {job.assignments.map((a) => (
                                <p
                                  key={a.id}
                                  className="text-xs text-muted-foreground truncate"
                                >
                                  {a.worker.name}
                                </p>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {dayMeetings.map((m) => {
                      const otherParty =
                        m.organizer_worker_id === currentWorkerId ? m.attendee : m.organizer;
                      return (
                        <Card key={m.id} className="border-l-[3px] border-l-amber-400 py-0">
                          <CardContent className="p-2.5 space-y-1.5">
                            <p className="text-xs font-semibold leading-snug truncate text-foreground">
                              {m.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(m.starts_at).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}{" "}
                              · {m.duration_minutes} min
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              with {otherParty.name}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
