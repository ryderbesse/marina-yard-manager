"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorker } from "@/lib/auth";
import type { DbAssignment, Language } from "@/lib/types";

export async function createJob(data: {
  date: string;
  boat_name: string;
  captain_name: string;
  location: string;
  description: string;
  estimated_hours: number;
  required_skills: string[];
  worker_ids: string[];
  priority?: number;
}): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  // Find or create the daily_plan for this date
  let planId: string;
  const { data: existingPlan } = await supabase
    .from("daily_plans")
    .select("id")
    .eq("date", data.date)
    .maybeSingle();

  if (existingPlan) {
    planId = existingPlan.id;
  } else {
    const { data: newPlan, error: planError } = await supabase
      .from("daily_plans")
      .insert({ date: data.date, status: "draft" })
      .select("id")
      .single();

    if (planError || !newPlan) {
      return { error: planError?.message ?? "Failed to create daily plan" };
    }
    planId = newPlan.id;
  }

  // Insert the job
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      plan_id: planId,
      boat_name: data.boat_name,
      captain_name: data.captain_name || null,
      location: data.location || null,
      description: data.description || null,
      estimated_hours: data.estimated_hours || null,
      priority: data.priority ?? null,
      required_skills:
        data.required_skills.length > 0 ? data.required_skills : null,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return { error: jobError?.message ?? "Failed to create job" };
  }

  // Create assignments for each worker
  if (data.worker_ids.length > 0) {
    const { error: assignError } = await supabase.from("assignments").insert(
      data.worker_ids.map((worker_id, i) => ({
        job_id: job.id,
        worker_id,
        status: "assigned" as const,
        order_index: i,
      }))
    );

    if (assignError) {
      return { error: assignError.message };
    }
  }

  revalidatePath("/daily-jobs");
  revalidatePath("/schedule");
  return {};
}

async function requireScheduler() {
  const worker = await getCurrentWorker();
  if (!worker || (worker.app_role !== "boss" && worker.app_role !== "head")) {
    return null;
  }
  return worker;
}

async function requireBoss() {
  const worker = await getCurrentWorker();
  if (!worker || worker.app_role !== "boss") {
    return null;
  }
  return worker;
}

// Keeps existing assignment rows (status/notes/order) for retained workers,
// drops removed workers, and appends new ones.
async function reconcileAssignments(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string,
  workerIds: string[]
): Promise<{ error?: string }> {
  const { data: existingAssignments } = await supabase
    .from("assignments")
    .select("id, worker_id, order_index")
    .eq("job_id", jobId);

  const existing = existingAssignments ?? [];
  const existingWorkerIds = new Set(existing.map((a) => a.worker_id));
  const nextWorkerIds = new Set(workerIds);

  const toRemove = existing.filter((a) => !nextWorkerIds.has(a.worker_id));
  const toAdd = workerIds.filter((id) => !existingWorkerIds.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("assignments")
      .delete()
      .in(
        "id",
        toRemove.map((a) => a.id)
      );
    if (error) return { error: error.message };
  }

  if (toAdd.length > 0) {
    const maxOrder = existing.reduce(
      (max, a) => Math.max(max, a.order_index ?? -1),
      -1
    );
    const { error } = await supabase.from("assignments").insert(
      toAdd.map((worker_id, i) => ({
        job_id: jobId,
        worker_id,
        status: "assigned" as const,
        order_index: maxOrder + 1 + i,
      }))
    );
    if (error) return { error: error.message };
  }

  return {};
}

export async function publishPlan(planId: string): Promise<{ error?: string }> {
  if (!(await requireBoss())) {
    return { error: "Not authorized" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("daily_plans")
    .update({ status: "published" })
    .eq("id", planId);

  if (error) return { error: error.message };

  revalidatePath("/daily-jobs");
  return {};
}

export async function updateJob(
  jobId: string,
  data: {
    boat_name: string;
    captain_name: string;
    location: string;
    description: string;
    estimated_hours: number;
    required_skills: string[];
    worker_ids: string[];
    priority?: number;
  }
): Promise<{ error?: string }> {
  if (!(await requireBoss())) {
    return { error: "Not authorized" };
  }

  const supabase = createAdminClient();

  const { error: jobError } = await supabase
    .from("jobs")
    .update({
      boat_name: data.boat_name,
      captain_name: data.captain_name || null,
      location: data.location || null,
      description: data.description || null,
      estimated_hours: data.estimated_hours || null,
      priority: data.priority ?? null,
      required_skills:
        data.required_skills.length > 0 ? data.required_skills : null,
    })
    .eq("id", jobId);

  if (jobError) return { error: jobError.message };

  const reconcileResult = await reconcileAssignments(
    supabase,
    jobId,
    data.worker_ids
  );
  if (reconcileResult.error) return reconcileResult;

  revalidatePath("/daily-jobs");
  revalidatePath("/schedule");
  return {};
}

export async function updateJobWorkers(
  jobId: string,
  workerIds: string[]
): Promise<{ error?: string }> {
  if (!(await requireScheduler())) {
    return { error: "Not authorized" };
  }

  const supabase = createAdminClient();
  const result = await reconcileAssignments(supabase, jobId, workerIds);
  if (result.error) return result;

  revalidatePath("/daily-jobs");
  revalidatePath("/schedule");
  return {};
}

export async function requestJobChange(
  jobId: string,
  message: string
): Promise<{ error?: string }> {
  const worker = await requireScheduler();
  if (!worker) {
    return { error: "Not authorized" };
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return { error: "A message is required" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("jobs")
    .update({
      change_request: trimmed,
      change_request_by: worker.id,
      change_request_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) return { error: error.message };

  revalidatePath("/daily-jobs");
  return {};
}

export async function resolveJobChange(jobId: string): Promise<{ error?: string }> {
  if (!(await requireBoss())) {
    return { error: "Not authorized" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("jobs")
    .update({
      change_request: null,
      change_request_by: null,
      change_request_at: null,
    })
    .eq("id", jobId);

  if (error) return { error: error.message };

  revalidatePath("/daily-jobs");
  return {};
}

export async function deleteJob(jobId: string): Promise<{ error?: string }> {
  if (!(await requireBoss())) {
    return { error: "Not authorized" };
  }

  const supabase = createAdminClient();

  const { error: assignError } = await supabase
    .from("assignments")
    .delete()
    .eq("job_id", jobId);
  if (assignError) return { error: assignError.message };

  const { error: jobError } = await supabase.from("jobs").delete().eq("id", jobId);
  if (jobError) return { error: jobError.message };

  revalidatePath("/daily-jobs");
  revalidatePath("/schedule");
  return {};
}

export async function updateAssignmentNotes(
  assignmentId: string,
  notes: string
): Promise<{ error?: string }> {
  if (!(await requireScheduler())) {
    return { error: "Not authorized" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("assignments")
    .update({ notes: notes.trim() || null })
    .eq("id", assignmentId);

  if (error) return { error: error.message };

  revalidatePath("/daily-jobs");
  return {};
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: DbAssignment["status"]
): Promise<{ error?: string }> {
  const worker = await getCurrentWorker();
  if (!worker) {
    return { error: "Not authorized" };
  }

  const supabase = createAdminClient();

  if (worker.app_role !== "boss" && worker.app_role !== "head") {
    const { data: assignment } = await supabase
      .from("assignments")
      .select("worker_id")
      .eq("id", assignmentId)
      .maybeSingle();

    if (!assignment || assignment.worker_id !== worker.id) {
      return { error: "Not authorized" };
    }
  }

  const now = new Date().toISOString();
  const update: {
    status: DbAssignment["status"];
    started_at?: string;
    completed_at?: string;
  } = { status };

  if (status === "active") {
    update.started_at = now;
  } else if (status === "completed") {
    update.completed_at = now;
  }

  const { error } = await supabase
    .from("assignments")
    .update(update)
    .eq("id", assignmentId);

  if (error) return { error: error.message };

  revalidatePath("/daily-jobs");
  return {};
}

export async function createWorker(data: {
  name: string;
  job_title: string;
  app_role: "boss" | "head" | "worker";
  phone?: string;
  email?: string;
}): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("workers").insert({
    name: data.name,
    job_title: data.job_title || null,
    app_role: data.app_role,
    phone: data.phone || null,
    email: data.email?.trim().toLowerCase() || null,
    is_active: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/workers");
  return {};
}

export async function updateWorker(
  workerId: string,
  data: {
    name: string;
    job_title: string;
    app_role: "boss" | "head" | "worker";
    email: string;
    phone: string;
    skills: string[];
    notes: string;
    is_active: boolean;
  }
): Promise<{ error?: string }> {
  if (!(await requireBoss())) {
    return { error: "Not authorized" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("workers")
    .update({
      name: data.name,
      job_title: data.job_title || null,
      app_role: data.app_role,
      email: data.email.trim().toLowerCase() || null,
      phone: data.phone || null,
      skills: data.skills.length > 0 ? data.skills : null,
      notes: data.notes.trim() || null,
      is_active: data.is_active,
    })
    .eq("id", workerId);

  if (error) return { error: error.message };

  revalidatePath("/workers");
  revalidatePath("/daily-jobs");
  revalidatePath("/schedule");
  return {};
}

export async function updateLanguage(language: Language): Promise<{ error?: string }> {
  const worker = await getCurrentWorker();
  if (!worker) {
    return { error: "Not authorized" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("workers")
    .update({ preferred_language: language })
    .eq("id", worker.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

export async function createWorkerGroup(
  name: string,
  workerIds: string[]
): Promise<{ error?: string }> {
  if (!(await requireBoss())) {
    return { error: "Not authorized" };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Group name is required" };
  }

  const supabase = createAdminClient();
  const { data: group, error } = await supabase
    .from("worker_groups")
    .insert({ name: trimmed })
    .select("id")
    .single();

  if (error || !group) {
    return { error: error?.message ?? "Failed to create group" };
  }

  if (workerIds.length > 0) {
    const { error: memberError } = await supabase
      .from("worker_group_members")
      .insert(workerIds.map((worker_id) => ({ group_id: group.id, worker_id })));
    if (memberError) return { error: memberError.message };
  }

  revalidatePath("/workers");
  revalidatePath("/daily-jobs");
  return {};
}

export async function updateWorkerGroup(
  groupId: string,
  name: string,
  workerIds: string[]
): Promise<{ error?: string }> {
  if (!(await requireBoss())) {
    return { error: "Not authorized" };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Group name is required" };
  }

  const supabase = createAdminClient();

  const { error: nameError } = await supabase
    .from("worker_groups")
    .update({ name: trimmed })
    .eq("id", groupId);
  if (nameError) return { error: nameError.message };

  const { error: deleteError } = await supabase
    .from("worker_group_members")
    .delete()
    .eq("group_id", groupId);
  if (deleteError) return { error: deleteError.message };

  if (workerIds.length > 0) {
    const { error: insertError } = await supabase
      .from("worker_group_members")
      .insert(workerIds.map((worker_id) => ({ group_id: groupId, worker_id })));
    if (insertError) return { error: insertError.message };
  }

  revalidatePath("/workers");
  revalidatePath("/daily-jobs");
  return {};
}

export async function deleteWorkerGroup(groupId: string): Promise<{ error?: string }> {
  if (!(await requireBoss())) {
    return { error: "Not authorized" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("worker_groups").delete().eq("id", groupId);
  if (error) return { error: error.message };

  revalidatePath("/workers");
  revalidatePath("/daily-jobs");
  return {};
}

export async function scheduleMeeting(data: {
  attendee_worker_id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  notes?: string;
}): Promise<{ error?: string }> {
  const worker = await requireScheduler();
  if (!worker) {
    return { error: "Not authorized" };
  }

  const title = data.title.trim();
  if (!title) {
    return { error: "Title is required" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("meetings").insert({
    title,
    starts_at: data.starts_at,
    duration_minutes: data.duration_minutes,
    notes: data.notes?.trim() || null,
    organizer_worker_id: worker.id,
    attendee_worker_id: data.attendee_worker_id,
  });

  if (error) return { error: error.message };

  revalidatePath("/workers");
  revalidatePath("/schedule");
  revalidatePath("/daily-jobs");
  return {};
}

export async function deleteMeeting(meetingId: string): Promise<{ error?: string }> {
  const worker = await getCurrentWorker();
  if (!worker) {
    return { error: "Not authorized" };
  }

  const supabase = createAdminClient();

  if (worker.app_role !== "boss") {
    const { data: meeting } = await supabase
      .from("meetings")
      .select("organizer_worker_id")
      .eq("id", meetingId)
      .maybeSingle();

    if (!meeting || meeting.organizer_worker_id !== worker.id) {
      return { error: "Not authorized" };
    }
  }

  const { error } = await supabase.from("meetings").delete().eq("id", meetingId);
  if (error) return { error: error.message };

  revalidatePath("/workers");
  revalidatePath("/schedule");
  revalidatePath("/daily-jobs");
  return {};
}
