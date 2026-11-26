import { json, withErrorHandling } from "@/lib/api/http";
import { requireAdmin } from "@/lib/api/auth";
import { parseListQuery } from "@/lib/consultations/schema";
import { listConsultations } from "@/lib/consultations/queries";

export function GET(request: Request) {
  return withErrorHandling(async () => {
    const { supabase } = await requireAdmin();
    const query = parseListQuery(new URL(request.url));
    const result = await listConsultations(supabase, query, { all: true });

    return json({
      consultations: result.consultations,
      count: result.count,
      limit: query.limit,
      offset: query.offset,
    });
  });
}
