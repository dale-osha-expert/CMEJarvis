/**
 * Auth — simple env-based credential check for single-operator local use.
 *
 * TODO BEFORE REMOTE HOSTING:
 * ─────────────────────────────────────────────────────────────────────────────
 * This is a minimal auth gate suitable for local/trusted-network use only.
 * Before exposing Jarvis on a public or semi-public server:
 *
 * 1. Replace with a proper auth library (NextAuth.js with a provider, or Clerk)
 * 2. Use HTTPS (never serve over plain HTTP remotely)
 * 3. Add rate limiting on the login endpoint (e.g. Upstash ratelimit)
 * 4. Rotate JARVIS_PASSWORD to a strong random secret
 * 5. Consider IP allowlisting if this is truly internal-only
 * 6. Add CSRF protection (NextAuth handles this; roll-your-own does not)
 * 7. Set SESSION_SECRET to a 256-bit random value
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { cookies } from "next/headers";

const COOKIE_NAME = "jarvis_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

function getCredentials() {
  return {
    username: process.env.JARVIS_USERNAME ?? "admin",
    password: process.env.JARVIS_PASSWORD ?? "changeme",
  };
}

/** Verify username/password. Returns true if correct. */
export function verifyCredentials(username: string, password: string): boolean {
  const creds = getCredentials();
  // Timing-safe-ish comparison (good enough for local use; use crypto.timingSafeEqual for prod)
  return username === creds.username && password === creds.password;
}

/** Set a session cookie after successful login. */
export async function setSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "authenticated", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
    // TODO: set secure: true when serving over HTTPS remotely
  });
}

/** Clear the session cookie on logout. */
export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Check if the current request has a valid session cookie. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === "authenticated";
}
