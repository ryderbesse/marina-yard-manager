export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorker } from "@/lib/auth";
import { DailyJobsContent } from "@/components/daily-jobs-content";
import { HeadDailyPlanContent } from "@/components/head-daily-plan-content";
import { MyAssignmentsContent } from "@/components/my-assignments-content";
import type {
  AssignmentWithJob,
  JobWithAssignments,
  DbWorker,
  MeetingWithNames,
  WorkerGroupWithMembers,
} from "@/lib/types";

export default async function DailyJobsPage() {
  const currentWorker = await getCurrentWorker();
  if (!currentWorker) {
    redirect("/login");
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // Get today's plan (may not exist yet)
  const { data: plan } = await supabase
    .from("daily_plans")
    .select("id, date, status")
    .eq("date", today)
    .maybeSingle();

  if (currentWorker.app_role === "worker") {
    const { data: rawAssignments } = plan
      ? await supabase
          .from("assignments")
          .select(
            `id, status, notes,
             job:jobs!inner(id, boat_name, location, description, estimated_hours, priority)`
          )
          .eq("worker_id", currentWorker.id)
          .eq("job.plan_id", plan.id)
          .order("order_index", { ascending: true, nullsFirst: false })
      : { data: null };

    const assignments = (rawAssignments ?? []) as unknown as AssignmentWithJob[];

    const { data: rawMeetings } = await supabase
      .from("meetings")
      .select(
        `id, title, starts_at, duration_minutes, notes, organizer_worker_id, attendee_worker_id,
         organizer:workers!organizer_worker_id(id, name),
         attendee:workers!attendee_worker_id(id, name)`
      )
      .eq("attendee_worker_id", currentWorker.id)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true });

    const meetings = (rawMeetings ?? []) as unknown as MeetingWithNames[];

    return (
      <MyAssignmentsContent
        assignments={assignments}
        meetings={meetings}
        workerName={currentWorker.name}
        today={today}
      />
    );
  }

  // Boss and head share the jobs + assignments query
  const { data: rawJobs } = plan
    ? await supabase
        .from("jobs")
        .select(
          `id, plan_id, boat_name, captain_name, location, description,
           estimated_hours, priority, required_skills,
           change_request, change_request_by, change_request_at,
           assignments(
             id, job_id, worker_id, status, order_index, notes, started_at, completed_at,
             worker:workers(id, name, job_title, app_role)
           )`
        )
        .eq("plan_id", plan.id)
        .order("priority", { ascending: true, nullsFirst: false })
    : { data: null };

  const jobs = (rawJobs ?? []) as unknown as JobWithAssignments[];

  // Worker groups, used by both head and boss for crew-assignment pickers
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

  if (currentWorker.app_role === "head") {
    const visibleJobs = plan?.status === "published" ? jobs : [];

    const { data: rawWorkers } = await supabase
      .from("workers")
      .select("id, name, job_title, app_role, is_active")
      .eq("is_active", true)
      .order("name");

    const workers = (rawWorkers ?? []) as unknown as Pick<
      DbWorker,
      "id" | "name" | "job_title" | "app_role" | "is_active"
    >[];

    return (
      <HeadDailyPlanContent
        plan={plan ?? null}
        jobs={visibleJobs}
        workers={workers}
        groups={groups}
        today={today}
      />
    );
  }

  // Boss: also load active workers for the Add/Edit Job form
  const { data: rawWorkers } = await supabase
    .from("workers")
    .select("id, name, job_title, app_role, is_active")
    .eq("is_active", true)
    .order("name");

  const workers = (rawWorkers ?? []) as unknown as Pick<
    DbWorker,
    "id" | "name" | "job_title" | "app_role" | "is_active"
  >[];

  return (
    <DailyJobsContent
      plan={plan ?? null}
      jobs={jobs}
      workers={workers}
      groups={groups}
      today={today}
    />
  );
}
