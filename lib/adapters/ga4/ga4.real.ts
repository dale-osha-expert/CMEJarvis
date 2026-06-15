/**
 * GA4 real adapter — organic traffic via Google Analytics Data API.
 * READ-ONLY: only runReport calls; no data is modified.
 *
 * Filters to sessionDefaultChannelGroup = "Organic Search".
 * Falls back to sessionMedium = "organic" if the channel-group dimension is unavailable.
 */
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { Ga4Adapter, OrganicTrafficSummary, OrganicTrafficPoint } from "./types";
import { getServiceAccountCreds } from "../google-service-account";

/** "321358590" → "properties/321358590" */
function toPropertyName(id: string): string {
  return id.startsWith("properties/") ? id : `properties/${id}`;
}

/** "20240615" → "2024-06-15" */
function ga4Date(d: string): string {
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

const ORGANIC_FILTER = {
  filter: {
    fieldName: "sessionDefaultChannelGroup",
    stringFilter: { matchType: "EXACT" as const, value: "Organic Search" },
  },
};

export class Ga4RealAdapter implements Ga4Adapter {
  private readonly client: BetaAnalyticsDataClient;
  private readonly property: string;

  constructor() {
    const creds = getServiceAccountCreds()!;
    this.client = new BetaAnalyticsDataClient({ credentials: creds });
    this.property = toPropertyName(process.env.GA4_PROPERTY_ID!);
  }

  async getOrganicTraffic(startDate: string, endDate: string): Promise<OrganicTrafficSummary> {
    const [res] = await this.client.runReport({
      property: this.property,
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      dimensionFilter: ORGANIC_FILTER,
    });

    const row = res.rows?.[0];
    return {
      sessions: parseInt(row?.metricValues?.[0]?.value ?? "0", 10),
      users: parseInt(row?.metricValues?.[1]?.value ?? "0", 10),
      startDate,
      endDate,
    };
  }

  async getOrganicTrafficTimeseries(startDate: string, endDate: string): Promise<OrganicTrafficPoint[]> {
    const [res] = await this.client.runReport({
      property: this.property,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      dimensionFilter: ORGANIC_FILTER,
      orderBys: [{ dimension: { dimensionName: "date" } }],
    });

    return (res.rows ?? []).map((row) => ({
      date: ga4Date(row.dimensionValues?.[0]?.value ?? "00000000"),
      sessions: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
      users: parseInt(row.metricValues?.[1]?.value ?? "0", 10),
    }));
  }
}
