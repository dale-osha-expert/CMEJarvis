export interface OrganicTrafficSummary {
  sessions: number;
  users: number;
  startDate: string;
  endDate: string;
}

export interface OrganicTrafficPoint {
  date: string;     // YYYY-MM-DD
  sessions: number;
  users: number;
}

export interface Ga4Adapter {
  /** Total organic sessions + users for the window. */
  getOrganicTraffic(startDate: string, endDate: string): Promise<OrganicTrafficSummary>;
  /** Per-day organic traffic breakdown for charting. */
  getOrganicTrafficTimeseries(startDate: string, endDate: string): Promise<OrganicTrafficPoint[]>;
}
