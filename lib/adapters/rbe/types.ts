/**
 * RBE (Real Backend / Storefront) adapter interface.
 * Values are range-aware: both methods accept the same YYYY-MM-DD window
 * used by the Ads Summary tab so they stay in sync.
 */
export interface RbeAdapter {
  /** Actual revenue recorded in the RBE storefront for [startDate, endDate] inclusive.
   *  Returns null until the integration is wired. */
  getActualRevenue(startDate: string, endDate: string): Promise<number | null>;

  /** Order / sale count in the RBE storefront for [startDate, endDate] inclusive.
   *  Returns null until the integration is wired. */
  getTotalSales(startDate: string, endDate: string): Promise<number | null>;
}
