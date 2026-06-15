import type { SearchConsoleAdapter, TopPage } from "./types";

const STUB_PAGES: TopPage[] = [
  { page: "https://www.certifyme.net/forklift-certification/", clicks: 312, impressions: 4100, ctr: 0.076, position: 2.1 },
  { page: "https://www.certifyme.net/osha-forklift-certification/", clicks: 187, impressions: 2850, ctr: 0.066, position: 3.4 },
  { page: "https://www.certifyme.net/", clicks: 156, impressions: 1920, ctr: 0.081, position: 1.8 },
  { page: "https://www.certifyme.net/scissor-lift-certification/", clicks: 98, impressions: 1540, ctr: 0.064, position: 4.2 },
  { page: "https://www.certifyme.net/aerial-work-platform-certification/", clicks: 74, impressions: 1230, ctr: 0.060, position: 5.1 },
  { page: "https://www.certifyme.net/pallet-jack-certification/", clicks: 61, impressions: 980, ctr: 0.062, position: 4.8 },
  { page: "https://www.certifyme.net/forklift-certification-cost/", clicks: 49, impressions: 890, ctr: 0.055, position: 6.3 },
  { page: "https://www.certifyme.net/osha-requirements/", clicks: 42, impressions: 720, ctr: 0.058, position: 5.9 },
  { page: "https://www.certifyme.net/blog/forklift-safety-tips/", clicks: 31, impressions: 610, ctr: 0.051, position: 7.2 },
  { page: "https://www.certifyme.net/boom-lift-certification/", clicks: 28, impressions: 540, ctr: 0.052, position: 6.8 },
];

export const searchConsoleStub: SearchConsoleAdapter = {
  async getTopPages(_startDate, _endDate, limit = 10): Promise<TopPage[]> {
    return STUB_PAGES.slice(0, limit);
  },
};
