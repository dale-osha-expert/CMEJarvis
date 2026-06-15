import { hasServiceAccountCreds } from "../google-service-account";
import { ga4Stub } from "./ga4.stub";
import { Ga4RealAdapter } from "./ga4.real";

export type { Ga4Adapter, OrganicTrafficSummary, OrganicTrafficPoint } from "./types";

const ga4UseStub = !hasServiceAccountCreds() || !process.env.GA4_PROPERTY_ID;

console.log(`[TRAFFIC] ga4=${ga4UseStub ? "stub" : "real"}`);

export const ga4Adapter = ga4UseStub ? ga4Stub : new Ga4RealAdapter();
