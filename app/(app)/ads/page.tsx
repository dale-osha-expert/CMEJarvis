import { Suspense } from "react";
import { adsService, adsProviderModes } from "@/lib/adapters/ads";
import type { AdCampaign, AdCreative, AdsProviderSummary } from "@/lib/adapters/ads";
import { rbeAdapter } from "@/lib/adapters/rbe";
import AdsTabBar from "@/components/AdsTabBar";
import AdsProviderChart from "@/components/AdsProviderChart";

const DAYS = 7;

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function RoasBadge({ roas }: { roas: number }) {
  const color =
    roas >= 6 ? "text-emerald-400" : roas >= 4 ? "text-green-400" : roas >= 2.5 ? "text-yellow-400" : "text-red-400";
  return <span className={`font-bold tabular-nums ${color}`}>{roas.toFixed(1)}x</span>;
}

function KpiCard({ label, value, sub, pending }: { label: string; value: string; sub?: string; pending?: boolean }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${pending ? "text-slate-500" : "text-white"}`}>{value}</p>
      {pending ? (
        <p className="text-amber-600/80 text-xs mt-1">Pending RBE</p>
      ) : sub ? (
        <p className="text-slate-400 text-xs mt-1">{sub}</p>
      ) : null}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: string }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-medium uppercase tracking-wide ${
        provider === "google"
          ? "bg-blue-500/20 text-blue-300"
          : "bg-indigo-500/20 text-indigo-300"
      }`}
    >
      {provider}
    </span>
  );
}

function CreativesTable({ creatives, showProvider = false }: { creatives: AdCreative[]; showProvider?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b border-slate-700">
            <th className="pb-2 pr-4 font-medium">Creative</th>
            {showProvider && <th className="pb-2 pr-4 font-medium">Platform</th>}
            <th className="pb-2 pr-4 font-medium">Format</th>
            <th className="pb-2 pr-4 font-medium text-right">Spend</th>
            <th className="pb-2 pr-4 font-medium text-right">Revenue</th>
            <th className="pb-2 pr-4 font-medium text-right">ROAS</th>
            <th className="pb-2 pr-4 font-medium text-right">CTR</th>
            <th className="pb-2 font-medium text-right">Conv.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {creatives.map((c) => (
            <tr key={c.id} className="text-slate-300">
              <td className="py-2.5 pr-4">
                <p className="text-white font-medium">{c.name}</p>
                <p className="text-slate-500 text-xs">{c.campaignName}</p>
              </td>
              {showProvider && (
                <td className="py-2.5 pr-4">
                  <ProviderBadge provider={c.provider} />
                </td>
              )}
              <td className="py-2.5 pr-4 capitalize text-slate-400 text-xs">{c.format}</td>
              <td className="py-2.5 pr-4 text-right">{fmt(c.spend)}</td>
              <td className="py-2.5 pr-4 text-right">{fmt(c.revenue)}</td>
              <td className="py-2.5 pr-4 text-right">
                <RoasBadge roas={c.roas} />
              </td>
              <td className="py-2.5 pr-4 text-right">{(c.ctr * 100).toFixed(1)}%</td>
              <td className="py-2.5 text-right">{c.conversions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CampaignsTable({ campaigns, showProvider = false }: { campaigns: AdCampaign[]; showProvider?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b border-slate-700">
            <th className="pb-2 pr-4 font-medium">Campaign</th>
            {showProvider && <th className="pb-2 pr-4 font-medium">Platform</th>}
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium text-right">Budget/day</th>
            <th className="pb-2 pr-4 font-medium text-right">Spend</th>
            <th className="pb-2 pr-4 font-medium text-right">ROAS</th>
            <th className="pb-2 pr-4 font-medium text-right">CTR</th>
            <th className="pb-2 font-medium text-right">Conv.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {campaigns.map((c) => (
            <tr key={c.id} className="text-slate-300">
              <td className="py-2.5 pr-4 text-white font-medium">{c.name}</td>
              {showProvider && (
                <td className="py-2.5 pr-4">
                  <ProviderBadge provider={c.provider} />
                </td>
              )}
              <td className="py-2.5 pr-4 text-slate-400 text-xs">{c.type}</td>
              <td className="py-2.5 pr-4 text-right">{fmt(c.dailyBudget)}</td>
              <td className="py-2.5 pr-4 text-right">{fmt(c.spend)}</td>
              <td className="py-2.5 pr-4 text-right">
                <RoasBadge roas={c.roas} />
              </td>
              <td className="py-2.5 pr-4 text-right">{(c.ctr * 100).toFixed(1)}%</td>
              <td className="py-2.5 text-right">{c.conversions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProviderUnavailableCard({ provider, label }: { provider: string; label: string }) {
  const isReal = provider === "google" ? adsProviderModes.google === "real" : adsProviderModes.meta === "real";
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <ProviderBadge provider={provider} />
        <span className="text-slate-400 font-medium text-sm">{label}</span>
      </div>
      <p className="text-slate-500 text-xs">
        {isReal ? "API error — check server logs for details." : "No credentials configured — showing stub data unavailable."}
      </p>
    </div>
  );
}

function ProviderSummaryCard({ summary, label }: { summary: AdsProviderSummary; label: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ProviderBadge provider={summary.provider} />
        <span className="text-white font-medium text-sm">{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-slate-400 text-xs">Spend</p>
          <p className="text-white font-bold">{fmt(summary.spend)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Revenue</p>
          <p className="text-white font-bold">{fmt(summary.revenue)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">ROAS</p>
          <RoasBadge roas={summary.roas} />
        </div>
        <div>
          <p className="text-slate-400 text-xs">Impressions</p>
          <p className="text-white font-semibold">{summary.impressions.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Clicks</p>
          <p className="text-white font-semibold">{summary.clicks.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Conversions</p>
          <p className="text-white font-semibold">{summary.conversions}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Tab content ──────────────────────────────────────────────────────────────

async function SummaryTab() {
  const combined = await adsService.getCombinedSummary(DAYS);
  const googleSummary = combined.byProvider.google;
  const metaSummary = combined.byProvider.meta;

  // Date window matching the DAYS constant — used for RBE range queries
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - (DAYS - 1) * 86400_000).toISOString().split("T")[0];

  // RBE values: always null until a dev wires the real storefront integration
  const [rbeRevenue, rbeSales] = await Promise.all([
    rbeAdapter.getActualRevenue(startDate, endDate),
    rbeAdapter.getTotalSales(startDate, endDate),
  ]);

  // Actual MER = RBE real revenue ÷ total ad spend — null when RBE not wired
  const mer =
    rbeRevenue !== null && combined.totalSpend > 0
      ? rbeRevenue / combined.totalSpend
      : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="Total Ad Spend" value={fmt(combined.totalSpend)} sub={`${DAYS} days`} />
        <KpiCard label="Platform Revenue" value={fmt(combined.totalRevenue)} sub="Google + Meta reported" />
        <KpiCard
          label="RBE Actual Rev"
          value={rbeRevenue !== null ? fmt(rbeRevenue) : "—"}
          pending={rbeRevenue === null}
        />
        <KpiCard
          label="Actual MER"
          value={mer !== null ? `${mer.toFixed(1)}x` : "—"}
          sub="Real revenue (RBE) ÷ total ad spend"
          pending={mer === null}
        />
        <KpiCard
          label="RBE Total Sales"
          value={rbeSales !== null ? rbeSales.toLocaleString() : "—"}
          pending={rbeSales === null}
        />
      </div>

      {/* Provider error banners */}
      {combined.providerErrors.google && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-xs text-red-300">
          <strong>Google Ads error:</strong> {combined.providerErrors.google}
        </div>
      )}
      {combined.providerErrors.meta && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-xs text-red-300">
          <strong>Meta Ads error:</strong> {combined.providerErrors.meta}
        </div>
      )}

      <section>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">By Provider</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {googleSummary ? (
            <ProviderSummaryCard summary={googleSummary} label="Google Ads" />
          ) : (
            <ProviderUnavailableCard provider="google" label="Google Ads" />
          )}
          {metaSummary ? (
            <ProviderSummaryCard summary={metaSummary} label="Meta Ads" />
          ) : (
            <ProviderUnavailableCard provider="meta" label="Meta Ads" />
          )}
        </div>
      </section>

      {combined.allCampaigns.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">All Campaigns</h3>
          <CampaignsTable campaigns={combined.allCampaigns} showProvider />
        </section>
      )}

      {combined.allCreatives.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            All Creatives — ranked by ROAS
          </h3>
          <CreativesTable creatives={combined.allCreatives} showProvider />
        </section>
      )}
    </div>
  );
}

async function GoogleTab() {
  const [summary, campaigns, creatives] = await Promise.all([
    adsService.getProviderSummary("google", DAYS),
    adsService.getProviderCampaigns("google", DAYS),
    adsService.getProviderCreatives("google", DAYS),
  ]);
  const sortedCreatives = [...creatives].sort((a, b) => b.roas - a.roas);

  if (!summary && campaigns.length === 0) {
    return <ProviderUnavailableCard provider="google" label="Google Ads" />;
  }

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Spend" value={fmt(summary.spend)} sub={`${DAYS} days`} />
          <KpiCard label="Revenue" value={fmt(summary.revenue)} />
          <KpiCard label="ROAS" value={`${summary.roas.toFixed(1)}x`} />
          <KpiCard label="Conversions" value={summary.conversions.toString()} />
        </div>
      )}
      {/* Daily spend + ROAS chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Daily Spend · ROAS — Last {DAYS} Days
        </p>
        <AdsProviderChart provider="google" days={DAYS} isStub={adsProviderModes.google === "stub"} />
      </div>
      {adsProviderModes.google === "stub" && (
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 text-xs text-blue-300">
          <strong>Stub data.</strong> Set <code>GOOGLE_ADS_REFRESH_TOKEN</code> (and other{" "}
          <code>GOOGLE_ADS_*</code> vars) to load live data. See <code>.env.example</code>.
        </div>
      )}
      {campaigns.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Campaigns</h3>
          <CampaignsTable campaigns={campaigns} />
        </section>
      )}
      {sortedCreatives.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Creatives — ranked by ROAS
          </h3>
          <CreativesTable creatives={sortedCreatives} />
        </section>
      )}
    </div>
  );
}

async function MetaTab() {
  const [summary, campaigns, creatives] = await Promise.all([
    adsService.getProviderSummary("meta", DAYS),
    adsService.getProviderCampaigns("meta", DAYS),
    adsService.getProviderCreatives("meta", DAYS),
  ]);
  const sortedCreatives = [...creatives].sort((a, b) => b.roas - a.roas);

  if (!summary && campaigns.length === 0) {
    return <ProviderUnavailableCard provider="meta" label="Meta Ads" />;
  }

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Spend" value={fmt(summary.spend)} sub={`${DAYS} days`} />
          <KpiCard label="Revenue" value={fmt(summary.revenue)} />
          <KpiCard label="ROAS" value={`${summary.roas.toFixed(1)}x`} />
          <KpiCard label="Conversions" value={summary.conversions.toString()} />
        </div>
      )}
      {/* Daily spend + ROAS chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Daily Spend · ROAS — Last {DAYS} Days
        </p>
        <AdsProviderChart provider="meta" days={DAYS} isStub={adsProviderModes.meta === "stub"} />
      </div>
      {adsProviderModes.meta === "stub" && (
        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4 text-xs text-indigo-300">
          <strong>Stub data.</strong> Set <code>META_ACCESS_TOKEN</code> and <code>META_AD_ACCOUNT_ID</code> to load live data. See <code>.env.example</code>.
        </div>
      )}
      {campaigns.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Campaigns</h3>
          <CampaignsTable campaigns={campaigns} />
        </section>
      )}
      {sortedCreatives.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Creatives — ranked by ROAS
          </h3>
          <CreativesTable creatives={sortedCreatives} />
        </section>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "summary" } = await searchParams;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Ads Performance</h1>
          <p className="text-slate-400 text-sm mt-1">
            Last {DAYS} days · Google: {adsProviderModes.google} · Meta: {adsProviderModes.meta}
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <AdsTabBar active={tab} />
      </Suspense>

      <Suspense fallback={<p className="text-slate-400 text-sm animate-pulse">Loading…</p>}>
        {tab === "google" ? (
          <GoogleTab />
        ) : tab === "meta" ? (
          <MetaTab />
        ) : (
          <SummaryTab />
        )}
      </Suspense>
    </div>
  );
}
