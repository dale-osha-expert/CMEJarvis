/**
 * Ads provider registry.
 * Each provider selects real vs stub independently based on credential presence.
 * Override per provider with GOOGLE_ADS_USE_STUB=true / META_ADS_USE_STUB=true.
 */
import { GoogleAdsProvider } from "./google.provider";
import { MetaAdsProvider } from "./meta.provider";
import { GoogleAdsRealProvider } from "./google.real";
import { MetaAdsRealProvider } from "./meta.real";
import { AdsService } from "./service";

export { AdsService };
export type {
  AdsProvider,
  AdsProviderSummary,
  AdCampaign,
  AdCreative,
  CombinedAdsSummary,
  AdsProviderName,
  SpendTimeseriesPoint,
  DailyMetricsPoint,
} from "./types";

function hasGoogleCreds(): boolean {
  return !!(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN &&
    process.env.GOOGLE_ADS_CUSTOMER_ID
  );
}

function hasMetaCreds(): boolean {
  return !!(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID);
}

const googleStub = process.env.GOOGLE_ADS_USE_STUB === "true" || !hasGoogleCreds();
const metaStub = process.env.META_ADS_USE_STUB === "true" || !hasMetaCreds();

// Startup log — shows resolved mode without revealing any credential values
const missingGoogleHint =
  !googleStub ? "" :
  !process.env.GOOGLE_ADS_REFRESH_TOKEN ? "  ← missing GOOGLE_ADS_REFRESH_TOKEN" :
  !process.env.GOOGLE_ADS_CUSTOMER_ID ? "  ← missing GOOGLE_ADS_CUSTOMER_ID" : "";
console.log(`[ADS] google=${googleStub ? "stub" : "real"}  meta=${metaStub ? "stub" : "real"}${missingGoogleHint}`);

/** Resolved mode per provider — import this to render mode indicators in the UI */
export const adsProviderModes = {
  google: googleStub ? ("stub" as const) : ("real" as const),
  meta: metaStub ? ("stub" as const) : ("real" as const),
};

const googleProvider = googleStub ? new GoogleAdsProvider() : new GoogleAdsRealProvider();
const metaProvider = metaStub ? new MetaAdsProvider() : new MetaAdsRealProvider();

export const adsService = new AdsService([googleProvider, metaProvider]);
