import { HttpError, json, readJsonBody, withErrorHandling } from "@/lib/api/http";
import { getCurrentRole, requireUser } from "@/lib/api/auth";
import {
  completeConsultationSchema,
  parseConsultationId,
  updateConsultationSchema,
} from "@/lib/consultations/schema";
import {
  completeConsultation,
  updateOwnConsultation,
} from "@/lib/consultations/queries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export function PATCH(request: Request, context: RouteContext) {
  return withErrorHandling(async () => {
    const { supabase, user } = await requireUser();
    const id = parseConsultationId((await context.params).id);
    const body = await readJsonBody(request);

    if (completeConsultationSchema.safeParse(body).success) {
      const role = await getCurrentRole({ supabase, user });

      if (role !== "admin") {
        throw new HttpError(403, "Admin access required");
      }

      const consultation = await completeConsultation(supabase, id);
      return json({ consultation });
    }

    const input = updateConsultationSchema.parse(body);
    const consultation = await updateOwnConsultation(
      supabase,
      user.id,
      id,
      input,
    );

    return json({ consultation });
  });
}
