import type { Ga4Adapter, OrganicTrafficSummary, OrganicTrafficPoint } from "./types";
import { dateRange, hashSeed } from "../timeseries-utils";

export const ga4Stub: Ga4Adapter = {
  async getOrganicTraffic(startDate, endDate): Promise<OrganicTrafficSummary> {
    const days = dateRange(startDate, endDate);
    const sessions = days.reduce((s, d) => s + Math.round(90 + hashSeed(d + ":s") * 110), 0);
    const users = days.reduce((s, d) => s + Math.round(70 + hashSeed(d + ":u") * 90), 0);
    return { sessions, users, startDate, endDate };
  },

  async getOrganicTrafficTimeseries(startDate, endDate): Promise<OrganicTrafficPoint[]> {
    return dateRange(startDate, endDate).map((date) => ({
      date,
      sessions: Math.round(90 + hashSeed(date + ":s") * 110),
      users: Math.round(70 + hashSeed(date + ":u") * 90),
    }));
  },
};
