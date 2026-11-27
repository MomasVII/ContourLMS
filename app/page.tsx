import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Suspense } from "react";

import { LearningDashboard } from "@/components/learning-dashboard";
import { countConsultations, listConsultations } from "@/lib/consultations/queries";
import type { Consultation } from "@/lib/consultations/types";
import { formatWhen } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

const pageSize = 10;

function pageNumber(value: string | undefined) {
  const parsed = Number(value);

  if (!value || !Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
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
  let page = 1;
  let pageCount = 0;
  let counts = { scheduled: 0, completed: 0, cancelled: 0 };
  const students = new Map<string, { name: string; email: string }>();

  try {
    const params = await searchParams;
    const scope = profile.role === "admin" ? { all: true as const } : { studentId: data.user.id };
    page = pageNumber(params.page);

    const [firstPage, statusCounts] = await Promise.all([
      listConsultations(supabase, { limit: pageSize, offset: (page - 1) * pageSize }, scope),
      countConsultations(supabase, scope),
    ]);
    counts = statusCounts;

    let result = firstPage;
    pageCount = result.count === 0 ? 0 : Math.ceil(result.count / pageSize);

    if (pageCount > 0 && page > pageCount) {
      page = pageCount;
      result = await listConsultations(
        supabase,
        { limit: pageSize, offset: (page - 1) * pageSize },
        scope,
      );
    }

    consultations = result.consultations;

    if (profile.role === "admin" && consultations.length > 0) {
      const { data: rows, error: studentsError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in(
          "id",
          [...new Set(consultations.map((item) => item.studentId))],
        );

      if (studentsError) {
        throw studentsError;
      }

      for (const row of rows ?? []) {
        const name = [row.first_name, row.last_name]
          .map((part) => part?.trim() ?? "")
          .filter(Boolean)
          .join(" ");

        students.set(row.id, { name, email: row.email?.trim() ?? "" });
      }
    }
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
            studentName: students.get(item.studentId)?.name,
            studentEmail: students.get(item.studentId)?.email,
          }))}
          counts={{
            upcoming: counts.scheduled,
            completed: counts.completed,
            cancelled: counts.cancelled,
          }}
          page={page}
          pageCount={pageCount}
        />
      )}
    </Box>
  );
}
