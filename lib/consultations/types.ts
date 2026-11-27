export const CONSULTATION_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
] as const;

export const Roles = [
  "student",
  "admin",
] as const;

export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];

export type Consultation = {
  id: string;
  studentId: string;
  reason: string;
  scheduledAt: string;
  status: ConsultationStatus;
  createdAt: string;
  updatedAt: string;
};

export type ConsultationRow = {
  id: string;
  student_id: string;
  reason: string;
  scheduled_at: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function isStatus(value: string): value is ConsultationStatus {
  return (CONSULTATION_STATUSES as readonly string[]).includes(value);
}

export function toConsultation(row: ConsultationRow): Consultation {
  if (!isStatus(row.status)) {
    throw new Error(`Unexpected consultation status: ${row.status}`);
  }

  return {
    id: row.id,
    studentId: row.student_id,
    reason: row.reason,
    scheduledAt: row.scheduled_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function assertConsultationRow(value: unknown): ConsultationRow {
  if (!value || typeof value !== "object") {
    throw new Error("Consultation row was not an object");
  }

  const row = value as Record<string, unknown>;
  const required = [
    "id",
    "student_id",
    "reason",
    "scheduled_at",
    "status",
    "created_at",
    "updated_at",
  ] as const;

  for (const key of required) {
    if (typeof row[key] !== "string") {
      throw new Error(`Consultation row is missing ${key}`);
    }
  }

  return {
    id: row.id as string,
    student_id: row.student_id as string,
    reason: row.reason as string,
    scheduled_at: row.scheduled_at as string,
    status: row.status as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
