export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorker } from "@/lib/auth";
import { WorkersContent } from "@/components/workers-content";
import type {
  WorkerWithHours,
  JobWithAssignments,
  WorkerGroupWithMembers,
  MeetingWithNames,
} from "@/lib/types";

export default async function WorkersPage() {
  const currentWorker = await getCurrentWorker();
  if (currentWorker?.app_role !== "boss" && currentWorker?.app_role !== "head") {
    redirect("/daily-jobs");
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // Active workers
  const { data: rawWorkers } = await supabase
    .from("workers")
    .select(
      "id, name, email, phone, job_title, app_role, skills, status, hire_date, notes, is_active"
    )
    .eq("is_active", true)
    .order("name");

  // Hours from the worker_weekly_hours view
  const { data: weeklyHours } = await supabase
    .from("worker_weekly_hours")
    .select("worker_id, hours_this_week");

  const hoursMap = new Map(
    (weeklyHours ?? []).map((h) => [h.worker_id, Number(h.hours_this_week)])
  );

  const workers = ((rawWorkers ?? []).map((w) => ({
    ...w,
    hours_this_week: hoursMap.get(w.id) ?? 0,
  })) as unknown) as WorkerWithHours[];

  // Today's plan → jobs → assignments for the "Today's Jobs" column
  const { data: plan } = await supabase
    .from("daily_plans")
    .select("id")
    .eq("date", today)
    .maybeSingle();

  const { data: rawTodayJobs } = plan
    ? await supabase
        .from("jobs")
        .select(
          `id, plan_id, boat_name, location, description, estimated_hours,
           priority, required_skills,
           assignments(
             id, job_id, worker_id, status,
             worker:workers(id, name, job_title, app_role)
           )`
        )
        .eq("plan_id", plan.id)
    : { data: null };

  const todayJobs = (rawTodayJobs ?? []) as unknown as JobWithAssignments[];

  // Worker groups, for the Groups management section and crew pickers
  const { data: rawGroups } = await supabase
    .from("worker_groups")
    .select(`id, name, created_at, worker_group_members(worker_id)`)
    .order("name");

  const groups = (rawGroups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    created_at: g.created_at,
    member_ids: (g.worker_group_members ?? []).map((m: { worker_id: string }) => m.worker_id),
  })) as WorkerGroupWithMembers[];

  // Upcoming meetings, for each worker's profile dialog
  const { data: rawMeetings } = await supabase
    .from("meetings")
    .select(
      `id, title, starts_at, duration_minutes, notes, organizer_worker_id, attendee_worker_id,
       organizer:workers!organizer_worker_id(id, name),
       attendee:workers!attendee_worker_id(id, name)`
    )
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  const meetings = (rawMeetings ?? []) as unknown as MeetingWithNames[];

  return (
    <WorkersContent workers={workers} todayJobs={todayJobs} groups={groups} meetings={meetings} />
  );
}
