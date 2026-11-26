import { json, readJsonBody, withErrorHandling } from "@/lib/api/http";
import { requireUser } from "@/lib/api/auth";
import {
  parseConsultationId,
  updateConsultationSchema,
} from "@/lib/consultations/schema";
import {
  getOwnConsultation,
  updateOwnConsultation,
} from "@/lib/consultations/queries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export function GET(_request: Request, context: RouteContext) {
  return withErrorHandling(async () => {
    const { supabase, user } = await requireUser();
    const id = parseConsultationId((await context.params).id);
    const consultation = await getOwnConsultation(supabase, user.id, id);

    return json({ consultation });
  });
}

export function PATCH(request: Request, context: RouteContext) {
  return withErrorHandling(async () => {
    const { supabase, user } = await requireUser();
    const id = parseConsultationId((await context.params).id);
    const input = updateConsultationSchema.parse(await readJsonBody(request));
    const consultation = await updateOwnConsultation(
      supabase,
      user.id,
      id,
      input,
    );

    return json({ consultation });
  });
}
