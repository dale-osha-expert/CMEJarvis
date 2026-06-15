/**
 * Search Console real adapter — top pages via Google Search Console API v1.
 * READ-ONLY: searchanalytics.query only; no data is written.
 *
 * Reuses the GA4 service account (GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY).
 * Site: SEARCH_CONSOLE_PROPERTY_URL — handles both URL-prefix and sc-domain: formats.
 *
 * sc-domain: normalization:
 *   "sc-domain:https://www.certifyme.net/" → "sc-domain:certifyme.net"
 *   The GSC API requires sc-domain properties to use just the bare domain.
 */
import { google } from "googleapis";
import type { SearchConsoleAdapter, TopPage } from "./types";
import { getServiceAccountCreds } from "../google-service-account";

/**
 * Normalize sc-domain: property URLs that may have been entered with the protocol included.
 * URL-prefix properties (https://...) are returned unchanged.
 */
function normalizeSiteUrl(raw: string): string {
  if (!raw.startsWith("sc-domain:")) return raw;
  const domain = raw
    .slice("sc-domain:".length)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
  return `sc-domain:${domain}`;
}

type Row = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export class SearchConsoleRealAdapter implements SearchConsoleAdapter {
  async getTopPages(startDate: string, endDate: string, limit = 10): Promise<TopPage[]> {
    const creds = getServiceAccountCreds()!;
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });

    const rawUrl = process.env.SEARCH_CONSOLE_PROPERTY_URL!;
    const siteUrl = normalizeSiteUrl(rawUrl);

    const sc = google.searchconsole({ version: "v1", auth });

    // Cast through unknown: googleapis overloads (Promise & void intersection) confuse
    // TypeScript when used with await-destructure. orderBy is also not in the typed schema;
    // we sort client-side instead.
    const res = (await sc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: limit,
      },
    })) as unknown as { data: { rows?: Row[] } };

    const rows = (res.data.rows ?? []).sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0));
    return rows.map((row) => ({
      page: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));
  }
}
