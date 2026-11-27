// Matches the local Auth rule in supabase/config.jsonc.
export function passwordIssue(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "Password must include an uppercase and a lowercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must include a number";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include a symbol";
  }

  return null;
}
