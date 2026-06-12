"use client";

import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { key: "summary", label: "Summary" },
  { key: "google", label: "Google Ads" },
  { key: "meta", label: "Meta Ads" },
];

export default function AdsTabBar({ active }: { active: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function switchTab(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.push(`/ads?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 bg-slate-800/60 border border-slate-700 rounded-lg p-1 w-fit">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => switchTab(tab.key)}
          className={clsx(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            active === tab.key
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-700"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
