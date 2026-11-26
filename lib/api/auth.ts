import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

import { HttpError } from "./http";

type AuthedClient = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
};

export async function requireUser(): Promise<AuthedClient> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new HttpError(401, "Authentication required");
  }

  return { supabase, user: data.user };
}

export async function requireAdmin(): Promise<AuthedClient> {
  const auth = await requireUser();
  const { data, error } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) {
    console.error("profile lookup failed", error.code);
    throw new HttpError(500, "Could not verify permissions");
  }

  if (data?.role !== "admin") {
    throw new HttpError(403, "Admin access required");
  }

  return auth;
}
