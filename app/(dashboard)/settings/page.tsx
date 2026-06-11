export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorker } from "@/lib/auth";
import { SettingsContent } from "@/components/settings-content";
import type { WorkerWithHours } from "@/lib/types";

export default async function SettingsPage() {
  const currentWorker = await getCurrentWorker();
  if (!currentWorker) {
    redirect("/login");
  }

  const supabase = createAdminClient();

  const { data: rawWorker } = await supabase
    .from("workers")
    .select(
      "id, name, email, phone, job_title, app_role, skills, status, hire_date, notes, is_active, preferred_language"
    )
    .eq("id", currentWorker.id)
    .single();

  const { data: hoursRow } = await supabase
    .from("worker_weekly_hours")
    .select("hours_this_week")
    .eq("worker_id", currentWorker.id)
    .maybeSingle();

  const worker = {
    ...rawWorker,
    hours_this_week: Number(hoursRow?.hours_this_week ?? 0),
  } as WorkerWithHours;

  return <SettingsContent worker={worker} />;
}
