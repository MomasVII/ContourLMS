import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.fields = fields;
  }
}

export function json(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...Object.fromEntries(new Headers(headers).entries()),
    },
  });
}

function fieldErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    fields[key] ??= [];
    fields[key].push(issue.message);
  }

  return fields;
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return json(
      error.fields
        ? { error: error.message, fields: error.fields }
        : { error: error.message },
      error.status,
    );
  }

  if (error instanceof ZodError) {
    return json({ error: "Invalid request", fields: fieldErrors(error) }, 400);
  }

  console.error(error);
  return json({ error: "Something went wrong" }, 500);
}

export function withErrorHandling(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  return handler().catch(toErrorResponse);
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json");
  }

  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
}
