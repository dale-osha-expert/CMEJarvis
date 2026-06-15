export interface TopPage {
  page: string;         // full URL or path
  clicks: number;
  impressions: number;
  ctr: number;          // 0–1
  position: number;     // average ranking position
}

export interface SearchConsoleAdapter {
  /** Top pages by clicks for the window. Default limit = 10. */
  getTopPages(startDate: string, endDate: string, limit?: number): Promise<TopPage[]>;
}
