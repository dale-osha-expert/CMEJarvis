/**
 * Shared service-account credentials helper for GA4 and Search Console.
 * Both APIs use the same service account: GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY.
 *
 * IMPORTANT: GA4_PRIVATE_KEY often has \\n literals from .env parsers.
 * This helper converts them to real newlines before the key is used.
 * Without this step the JWT library throws a "PEM decode error".
 */

export interface ServiceAccountCreds {
  client_email: string;
  private_key: string;
}

/** Returns service-account credentials or null if env vars are missing. */
export function getServiceAccountCreds(): ServiceAccountCreds | null {
  const client_email = process.env.GA4_CLIENT_EMAIL;
  const rawKey = process.env.GA4_PRIVATE_KEY;
  if (!client_email || !rawKey) return null;
  // Convert escaped \\n literals to real newlines (common in .env files)
  const private_key = rawKey.replace(/\\n/g, "\n");
  return { client_email, private_key };
}

/** True when credentials are present (does not validate them against the API). */
export function hasServiceAccountCreds(): boolean {
  return !!(process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY);
}
