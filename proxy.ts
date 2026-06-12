/**
 * ⚠️  AUTHENTICATION INTENTIONALLY REMOVED
 *
 * This app is UNAUTHENTICATED at the application layer.
 * It MUST be protected at the network layer before any remote or shared hosting:
 *   - SSO / identity-aware proxy (e.g. Cloudflare Access, Google IAP, Authelia)
 *   - Reverse proxy with HTTP Basic Auth (nginx, Caddy)
 *   - VPN / firewall allowlist restricting access to trusted IPs only
 *
 * WARNING: This app holds live Google Ads + Meta Ads API tokens and can
 * trigger paid TTS generation. Do NOT expose it to the public internet
 * without a network-layer auth gate in front of it.
 *
 * The only application-level gate that remains is POST /api/cron/daily-briefing,
 * which requires a valid X-Cron-Secret header to prevent unauthenticated
 * triggering of paid TTS generation from external callers.
 */
import { NextRequest, NextResponse } from "next/server";

export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
