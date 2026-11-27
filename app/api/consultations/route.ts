import { HttpError, json, readJsonBody, withErrorHandling } from "@/lib/api/http";
import { requireUser } from "@/lib/api/auth";
import {
  bookConsultationError,
  bookConsultationSchema,
} from "@/lib/consultations/schema";
import { createConsultation } from "@/lib/consultations/queries";

export function POST(request: Request) {
  return withErrorHandling(async () => {
    const { supabase, user } = await requireUser();
    const parsed = bookConsultationSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) {
      const details = bookConsultationError(parsed.error);
      throw new HttpError(400, details.message, details.fields);
    }

    const consultation = await createConsultation(supabase, user.id, parsed.data);

    return json({ consultation }, 201);
  });
}
