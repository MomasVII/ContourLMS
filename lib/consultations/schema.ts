import { z } from "zod";

import { HttpError } from "@/lib/api/http";

import { CONSULTATION_STATUSES } from "./types";

const reasonControlChars = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const reasonSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(1000, "Must be 1000 characters or fewer")
  .refine(
    (value) => !reasonControlChars.test(value),
    "Contains invalid characters",
  );

const scheduledAtSchema = z
  .string()
  .trim()
  .datetime({
    offset: true,
    message: "Must be an ISO 8601 datetime with a timezone",
  });

function assertFuture(
  scheduledAt: string,
  ctx: z.RefinementCtx,
  path: (string | number)[],
) {
  const time = new Date(scheduledAt).getTime();

  if (Number.isNaN(time) || time <= Date.now()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: "Consultations must be scheduled in the future",
    });
  }
}

export const bookConsultationSchema = z
  .object({
    reason: reasonSchema,
    scheduledAt: scheduledAtSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    assertFuture(value.scheduledAt, ctx, ["scheduledAt"]);
  });

const bookFieldLabels: Record<string, string> = {
  reason: "Reason",
  scheduledAt: "Date and time",
};

export function bookConsultationError(error: z.ZodError): {
  message: string;
  fields: Record<string, string[]>;
} {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    fields[key] ??= [];
    fields[key].push(issue.message);
  }

  const message = Object.entries(fields)
    .map(([key, messages]) => {
      const label = bookFieldLabels[key] ?? "Booking";
      return `${label}: ${messages.join(", ")}`;
    })
    .join(". ");

  return {
    message: message || "The booking details are not valid",
    fields,
  };
}

export const updateConsultationSchema = z
  .object({
    reason: reasonSchema.optional(),
    scheduledAt: scheduledAtSchema.optional(),
    status: z
      .literal("cancelled", {
        errorMap: () => ({
          message: 'Status can only be set to "cancelled"',
        }),
      })
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.reason && !value.scheduledAt && !value.status) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["form"],
        message:
          'Provide a new time, an updated reason, or status "cancelled"',
      });
    }

    if (value.status && value.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledAt"],
        message: "Change the time separately from the status",
      });
    }

    if (value.scheduledAt) {
      assertFuture(value.scheduledAt, ctx, ["scheduledAt"]);
    }
  });

export const listConsultationsQuerySchema = z.object({
  status: z
    .enum(CONSULTATION_STATUSES, {
      errorMap: () => ({
        message: "Status must be scheduled, completed, or cancelled",
      }),
    })
    .optional(),
  limit: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(1, "Must be at least 1")
    .max(100, "Must be 100 or fewer")
    .default(50),
  offset: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Must be 0 or greater")
    .max(10_000, "Must be 10000 or fewer")
    .default(0),
});

export const completeConsultationSchema = z
  .object({
    status: z.literal("completed"),
  })
  .strict();

export type BookConsultationInput = z.infer<typeof bookConsultationSchema>;
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;
export type ListConsultationsQuery = z.infer<typeof listConsultationsQuerySchema>;

const uuidSchema = z.string().uuid();

export function parseConsultationId(id: string): string {
  if (!uuidSchema.safeParse(id).success) {
    throw new HttpError(400, "Consultation id must be a UUID");
  }

  return id;
}

export function parseListQuery(url: URL): ListConsultationsQuery {
  const status = url.searchParams.get("status");
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");

  return listConsultationsQuerySchema.parse({
    ...(status !== null ? { status } : {}),
    ...(limit !== null ? { limit } : {}),
    ...(offset !== null ? { offset } : {}),
  });
}
