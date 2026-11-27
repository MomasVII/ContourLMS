import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "@/lib/api/http";

import type {
  BookConsultationInput,
  ListConsultationsQuery,
  UpdateConsultationInput,
} from "./schema";
import {
  assertConsultationRow,
  toConsultation,
  type Consultation,
} from "./types";

const CONSULTATION_COLUMNS =
  "id, student_id, reason, scheduled_at, status, created_at, updated_at";

type DbError = {
  code?: string;
  message?: string;
};

function mapWriteError(error: DbError): HttpError {
  if (error.code === "23505") {
    if (error.message?.includes("consultations_student_slot_unique")) {
      return new HttpError(
        409,
        "You already have a consultation scheduled at that time",
      );
    }

    return new HttpError(409, "That time is no longer available");
  }

  if (error.code === "23514") {
    if (error.message?.includes("future")) {
      return new HttpError(400, "Consultations must be scheduled in the future");
    }

    return new HttpError(400, "Consultation details are not valid");
  }

  if (error.code === "23503") {
    return new HttpError(400, "Account profile is missing");
  }

  if (error.code === "42501") {
    return new HttpError(403, "You cannot change this consultation");
  }

  console.error("consultation write failed", error.code, error.message);
  return new HttpError(500, "Could not save the consultation");
}

function oneConsultation(data: unknown): Consultation {
  return toConsultation(assertConsultationRow(data));
}

export async function listConsultations(
  supabase: SupabaseClient,
  query: ListConsultationsQuery,
  scope: { studentId: string } | { all: true },
): Promise<{ consultations: Consultation[]; count: number }> {
  let request = supabase
    .from("consultations")
    .select(CONSULTATION_COLUMNS, { count: "exact" })
    // scheduled, then completed, then cancelled, then earliest time.
    .order("status", { ascending: false })
    .order("scheduled_at", { ascending: true })
    .order("id", { ascending: true })
    .range(query.offset, query.offset + query.limit - 1);

  if ("studentId" in scope) {
    request = request.eq("student_id", scope.studentId);
  }

  if (query.status) {
    request = request.eq("status", query.status);
  }

  const { data, error, count } = await request;

  if (error) {
    console.error("consultation list failed", error.code, error.message);
    throw new HttpError(500, "Could not load consultations");
  }

  if (!Array.isArray(data)) {
    throw new HttpError(500, "Could not load consultations");
  }

  return {
    consultations: data.map((row) => oneConsultation(row)),
    count: count ?? 0,
  };
}

export async function countConsultations(
  supabase: SupabaseClient,
  scope: { studentId: string } | { all: true },
): Promise<{ scheduled: number; completed: number; cancelled: number }> {
  const counts = { scheduled: 0, completed: 0, cancelled: 0 };

  await Promise.all(
    (["scheduled", "completed", "cancelled"] as const).map(async (status) => {
      let request = supabase
        .from("consultations")
        .select("id", { count: "exact", head: true })
        .eq("status", status);

      if ("studentId" in scope) {
        request = request.eq("student_id", scope.studentId);
      }

      const { count, error } = await request;

      if (error) {
        console.error("consultation count failed", error.code, error.message);
        throw new HttpError(500, "Could not load consultations");
      }

      counts[status] = count ?? 0;
    }),
  );

  return counts;
}

export async function getOwnConsultation(
  supabase: SupabaseClient,
  studentId: string,
  id: string,
): Promise<Consultation> {
  const { data, error } = await supabase
    .from("consultations")
    .select(CONSULTATION_COLUMNS)
    .eq("id", id)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    console.error("consultation lookup failed", error.code, error.message);
    throw new HttpError(500, "Could not load the consultation");
  }

  if (!data) {
    throw new HttpError(404, "Consultation not found");
  }

  return oneConsultation(data);
}

export async function createConsultation(
  supabase: SupabaseClient,
  studentId: string,
  input: BookConsultationInput,
): Promise<Consultation> {
  const { data, error } = await supabase
    .from("consultations")
    .insert({
      student_id: studentId,
      reason: input.reason,
      scheduled_at: input.scheduledAt,
    })
    .select(CONSULTATION_COLUMNS)
    .single();

  if (error) {
    throw mapWriteError(error);
  }

  return oneConsultation(data);
}

export async function updateOwnConsultation(
  supabase: SupabaseClient,
  studentId: string,
  id: string,
  input: UpdateConsultationInput,
): Promise<Consultation> {
  const existing = await getOwnConsultation(supabase, studentId, id);

  if (existing.status !== "scheduled") {
    throw new HttpError(409, "Only scheduled consultations can be changed");
  }

  const patch: {
    reason?: string;
    scheduled_at?: string;
    status?: "cancelled";
  } = {};

  if (input.reason !== undefined) {
    patch.reason = input.reason;
  }

  if (input.scheduledAt !== undefined) {
    patch.scheduled_at = input.scheduledAt;
  }

  if (input.status !== undefined) {
    patch.status = input.status;
  }

  const { data, error } = await supabase
    .from("consultations")
    .update(patch)
    .eq("id", id)
    .eq("student_id", studentId)
    .eq("status", "scheduled")
    .select(CONSULTATION_COLUMNS)
    .maybeSingle();

  if (error) {
    throw mapWriteError(error);
  }

  if (!data) {
    throw new HttpError(
      409,
      "This consultation was updated. Refresh and try again.",
    );
  }

  return oneConsultation(data);
}

export async function completeConsultation(
  supabase: SupabaseClient,
  id: string,
): Promise<Consultation> {
  const { data, error } = await supabase
    .from("consultations")
    .update({ status: "completed" })
    .eq("id", id)
    .eq("status", "scheduled")
    .select(CONSULTATION_COLUMNS)
    .maybeSingle();

  if (error) {
    throw mapWriteError(error);
  }

  if (!data) {
    throw new HttpError(409, "Only scheduled consultations can be changed");
  }

  return oneConsultation(data);
}
