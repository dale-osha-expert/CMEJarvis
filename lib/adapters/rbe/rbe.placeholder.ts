/**
 * RBE placeholder — returns null for all values until a dev wires the real storefront.
 *
 * HOW TO INTEGRATE:
 *   1. Add RBE_API_URL and RBE_API_KEY to .env.local (see .env.example).
 *   2. Create lib/adapters/rbe/rbe.real.ts implementing RbeAdapter with the real queries.
 *   3. In lib/adapters/rbe/index.ts, swap rbeAdapter to rbeRealAdapter when the env vars are present.
 *
 * SAFETY: Read-only — never modifies storefront data.
 */
import type { RbeAdapter } from "./types";

export const rbePlaceholder: RbeAdapter = {
  // RBE integration: a dev wires the real storefront revenue query here on the server.
  async getActualRevenue(_startDate: string, _endDate: string): Promise<number | null> {
    return null;
  },

  // RBE integration: a dev wires the real storefront sales-count query here on the server.
  async getTotalSales(_startDate: string, _endDate: string): Promise<number | null> {
    return null;
  },
};
