import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

import { HttpError } from "./http";

type AuthedClient = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
};

export type AppRole = "student" | "admin";

function isAppRole(role: unknown): role is AppRole {
  return role === "admin" || role === "student";
}

export async function getCurrentRole(
  auth?: AuthedClient,
): Promise<AppRole | null> {
  const supabase = auth?.supabase ?? (await createClient());
  let userId = auth?.user.id;

  if (!userId) {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    userId = data.user.id;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("profile lookup failed", profileError.code);
    throw new HttpError(500, "Could not verify permissions");
  }

  const role = profile?.role;

  return isAppRole(role) ? role : null;
}

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
  const role = await getCurrentRole(auth);

  if (role !== "admin") {
    throw new HttpError(403, "Admin access required");
  }

  return auth;
}
