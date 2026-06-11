import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthWorker } from "@/lib/types";

// Returns the workers-table record for the signed-in user, or null if
// they're not authenticated. Auto-provisions a basic worker profile on
// first login if one doesn't exist yet.
//
// Wrapped in React's cache() so that the multiple calls per request (layout
// + page) share one lookup/insert instead of racing each other and creating
// duplicate rows.
export const getCurrentWorker = cache(async (): Promise<AuthWorker | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const email = user.email.toLowerCase();
  const admin = createAdminClient();

  const { data: worker } = await admin
    .from("workers")
    .select("id, name, email, app_role, preferred_language")
    .eq("email", email)
    .maybeSingle();

  if (worker) return worker as AuthWorker;

  const { data: created, error: insertError } = await admin
    .from("workers")
    .insert({
      email,
      name: email.split("@")[0],
      app_role: "worker",
      is_active: true,
      preferred_language: "en",
    })
    .select("id, name, email, app_role, preferred_language")
    .single();

  if (insertError) {
    // Unique-constraint violation: another concurrent request already
    // created this worker's row. Fetch and use that one instead.
    const { data: existing } = await admin
      .from("workers")
      .select("id, name, email, app_role, preferred_language")
      .eq("email", email)
      .maybeSingle();
    return (existing as AuthWorker) ?? null;
  }

  return created as AuthWorker | null;
});
