// ── Database row types (exact Supabase schema) ─────────────────────────────

export type AppRole = "boss" | "head" | "worker";

export type Language = "en" | "es";

export interface DbWorker {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  app_role: AppRole;
  skills: string[] | null;
  status: string | null;
  hire_date: string | null;
  is_active: boolean;
  notes: string | null;
  preferred_language: Language;
}

export interface DbDailyPlan {
  id: string;
  date: string; // YYYY-MM-DD
  created_by?: string | null;
  status: "draft" | "published";
}

export interface DbJob {
  id: string;
  plan_id: string;
  boat_name: string;
  captain_name: string | null;
  location: string | null;
  description: string | null;
  estimated_hours: number | null;
  priority: number | null;
  required_skills: string[] | null;
  change_request: string | null;
  change_request_by: string | null;
  change_request_at: string | null;
}

export interface DbAssignment {
  id: string;
  job_id: string;
  worker_id: string;
  status: "assigned" | "active" | "completed";
  order_index: number | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface DbWorkerWeeklyHours {
  worker_id: string;
  hours_this_week: number;
}

export interface DbWorkerGroup {
  id: string;
  name: string;
  created_at?: string;
}

export interface DbMeeting {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  notes: string | null;
  organizer_worker_id: string;
  attendee_worker_id: string;
}

// ── Composite types returned by nested Supabase queries ────────────────────

export type AssignmentWithWorker = DbAssignment & {
  worker: Pick<DbWorker, "id" | "name" | "job_title" | "app_role">;
};

export type JobWithAssignments = DbJob & {
  assignments: AssignmentWithWorker[];
};

export type PlanWithJobs = DbDailyPlan & {
  jobs: Array<
    DbJob & {
      assignments: Array<
        DbAssignment & { worker: Pick<DbWorker, "id" | "name"> }
      >;
    }
  >;
};

export type WorkerWithHours = DbWorker & { hours_this_week: number };

export type AssignmentWithJob = Pick<DbAssignment, "id" | "status" | "notes"> & {
  job: Pick<
    DbJob,
    "id" | "boat_name" | "location" | "description" | "estimated_hours" | "priority"
  >;
};

export type AuthWorker = Pick<
  DbWorker,
  "id" | "name" | "email" | "app_role" | "preferred_language"
>;

export type WorkerGroupWithMembers = DbWorkerGroup & { member_ids: string[] };

export type MeetingWithNames = DbMeeting & {
  organizer: Pick<DbWorker, "id" | "name">;
  attendee: Pick<DbWorker, "id" | "name">;
};

// ── Derived UI types ────────────────────────────────────────────────────────

export type JobStatus = "pending" | "in-progress" | "completed" | "on-hold";

export function deriveJobStatus(
  assignments: Pick<DbAssignment, "status">[]
): JobStatus {
  if (assignments.length === 0) return "pending";
  if (assignments.some((a) => a.status === "active")) return "in-progress";
  if (assignments.every((a) => a.status === "completed")) return "completed";
  return "pending";
}

