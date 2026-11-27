import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Suspense } from "react";

import { LearningDashboard } from "@/components/learning-dashboard";
import { listConsultations } from "@/lib/consultations/queries";
import type { Consultation } from "@/lib/consultations/types";
import { formatWhen } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default function Home() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  if (!hasEnvVars) {
    return <main className="flex-1" />;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return <main className="flex-1" />;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || (profile?.role !== "student" && profile?.role !== "admin")) {
    return (
      <Box component="main" sx={{ flex: 1, p: 3 }}>
        <Typography color="error">Could not load your account.</Typography>
      </Box>
    );
  }

  let consultations: Consultation[] = [];
  let loadError = false;

  try {
    const result = await listConsultations(
      supabase,
      { limit: 100, offset: 0 },
      profile.role === "admin" ? { all: true } : { studentId: data.user.id },
    );
    consultations = result.consultations;
  } catch {
    consultations = [];
    loadError = true;
  }

  return (
    <Box
      component="main"
      sx={{ flex: 1, display: "flex", justifyContent: "center", p: { xs: 2, sm: 3 } }}
    >
      {loadError ? (
        <Typography color="error">Could not load consultations.</Typography>
      ) : (
        <LearningDashboard
          role={profile.role}
          firstName={profile.first_name?.trim() ?? ""}
          consultations={consultations.map((item) => ({
            id: item.id,
            reason: item.reason,
            scheduledAt: item.scheduledAt,
            whenLabel: formatWhen(item.scheduledAt),
            status: item.status,
          }))}
        />
      )}
    </Box>
  );
}
