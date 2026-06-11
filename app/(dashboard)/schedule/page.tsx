export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorker } from "@/lib/auth";
import { ScheduleContent } from "@/components/schedule-content";
import type { MeetingWithNames, PlanWithJobs } from "@/lib/types";

export default async function SchedulePage() {
  const currentWorker = await getCurrentWorker();
  if (!currentWorker) {
    redirect("/login");
  }
  if (currentWorker.app_role === "worker") {
    redirect("/daily-jobs");
  }

  const supabase = createAdminClient();

  // Fetch ~3 months of plans so client-side week navigation works without refetching
  const today = new Date();
  const rangeStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const rangeEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);

  const { data: rawPlans } = await supabase
    .from("daily_plans")
    .select(
      `id, date, status,
       jobs(
         id, plan_id, boat_name, captain_name, location, description,
         estimated_hours, priority, required_skills,
         assignments(
           id, job_id, worker_id, status,
           worker:workers(id, name)
         )
       )`
    )
    .gte("date", rangeStart.toISOString().split("T")[0])
    .lte("date", rangeEnd.toISOString().split("T")[0])
    .order("date");

  const plans = (rawPlans ?? []) as unknown as PlanWithJobs[];

  const { data: rawMeetings } = await supabase
    .from("meetings")
    .select(
      `id, title, starts_at, duration_minutes, notes, organizer_worker_id, attendee_worker_id,
       organizer:workers!organizer_worker_id(id, name),
       attendee:workers!attendee_worker_id(id, name)`
    )
    .or(`organizer_worker_id.eq.${currentWorker.id},attendee_worker_id.eq.${currentWorker.id}`)
    .gte("starts_at", rangeStart.toISOString())
    .lte("starts_at", rangeEnd.toISOString())
    .order("starts_at", { ascending: true });

  const meetings = (rawMeetings ?? []) as unknown as MeetingWithNames[];

  return (
    <ScheduleContent
      initialPlans={plans}
      meetings={meetings}
      currentWorkerId={currentWorker.id}
      today={today.toISOString().split("T")[0]}
    />
  );
}
