import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Supabase isn't configured yet, so skip the session check.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // New client per request. A shared one loses the cookie updates below.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the session. Keep this immediately after the client is created,
  // or signed-in users get logged out at random.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const pathname = request.nextUrl.pathname;

  // Logged-out pages go to login. /api falls through so the route can return a status code.
  if (
    pathname !== "/" &&
    !user &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/api/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // This response carries the refreshed auth cookies.
  return supabaseResponse;
}
