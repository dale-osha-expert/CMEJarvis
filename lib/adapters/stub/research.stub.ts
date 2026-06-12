/**
 * Stub ResearchAdapter — returns canned results for any search query.
 * REAL INTEGRATION: Replace with Brave Search API or Perplexity API.
 *   - Brave: api.search.brave.com/res/v1/web/search
 *   - Perplexity: api.perplexity.ai/chat/completions (sonar model)
 */
import type { ResearchAdapter, ResearchResult } from "../types";

const CANNED_RESULTS: Record<string, ResearchResult[]> = {
  default: [
    {
      title: "OSHA Forklift Safety Standard 29 CFR 1910.178",
      url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.178",
      snippet:
        "OSHA's powered industrial truck standard requires operators to be trained and evaluated before operating forklifts. Certification must be renewed every 3 years.",
      publishedAt: "2024-01-15",
    },
    {
      title: "Online Forklift Certification Market Size 2024",
      url: "https://example-industry-report.com/forklift-cert-market",
      snippet:
        "The online safety certification market is projected to reach $2.4B by 2026, driven by remote workforce training demand. E-learning adoption in industrial safety grew 34% YoY.",
      publishedAt: "2024-03-20",
    },
    {
      title: "Forklift Accidents Statistics - OSHA 2023 Report",
      url: "https://www.osha.gov/data/commonstats",
      snippet:
        "Approximately 85 workers are killed and 34,900 are seriously injured in forklift incidents annually. Proper training reduces incidents by up to 70%.",
      publishedAt: "2023-11-08",
    },
  ],
  competitor: [
    {
      title: "Top Forklift Certification Providers Comparison 2024",
      url: "https://example-review-site.com/forklift-certs",
      snippet:
        "Leading providers: CertifyMe (A+), ForkliftCertification.com (B+), OSHA.com (B). CertifyMe rated highest for mobile compatibility and certificate turnaround.",
      publishedAt: "2024-02-28",
    },
  ],
};

export const stubResearchAdapter: ResearchAdapter = {
  async search(query: string): Promise<ResearchResult[]> {
    const lower = query.toLowerCase();
    if (lower.includes("competitor") || lower.includes("competition")) {
      return CANNED_RESULTS.competitor;
    }
    return CANNED_RESULTS.default;
  },
};
