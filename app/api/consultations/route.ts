import { json, readJsonBody, withErrorHandling } from "@/lib/api/http";
import { requireUser } from "@/lib/api/auth";
import {
  bookConsultationSchema,
  parseListQuery,
} from "@/lib/consultations/schema";
import {
  createConsultation,
  listConsultations,
} from "@/lib/consultations/queries";

export function GET(request: Request) {
  return withErrorHandling(async () => {
    const { supabase, user } = await requireUser();
    const query = parseListQuery(new URL(request.url));
    const result = await listConsultations(supabase, query, {
      studentId: user.id,
    });

    return json({
      consultations: result.consultations,
      count: result.count,
      limit: query.limit,
      offset: query.offset,
    });
  });
}

export function POST(request: Request) {
  return withErrorHandling(async () => {
    const { supabase, user } = await requireUser();
    const input = bookConsultationSchema.parse(await readJsonBody(request));
    const consultation = await createConsultation(supabase, user.id, input);

    return json({ consultation }, 201, {
      Location: `/api/consultations/${consultation.id}`,
    });
  });
}
