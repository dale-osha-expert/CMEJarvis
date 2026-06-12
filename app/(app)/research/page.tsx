"use client";

import { useState, FormEvent } from "react";

interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
}

const CURRENT_YEAR = new Date().getFullYear();

const CANNED_QUERIES = [
  `Latest OSHA forklift certification requirements ${CURRENT_YEAR}`,
  `Forklift certification competitors and pricing ${CURRENT_YEAR}`,
  `Online safety training market trends ${CURRENT_YEAR}`,
  `New OSHA regulations affecting forklift operators ${CURRENT_YEAR}`,
];

export default function ResearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(q?: string) {
    const searchQuery = (q ?? query).trim();
    if (!searchQuery) return;
    setLoading(true);
    setSearched(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(`/api/research?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await handleSearch();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Research</h1>
        <p className="text-slate-400 text-sm mt-1">Live web search — market intel, OSHA regs, competitor analysis</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for market intel, OSHA regulations, competitors…"
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {CANNED_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => { setQuery(q); handleSearch(q); }}
            className="text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {loading && <p className="text-slate-400 text-sm animate-pulse">Searching the web…</p>}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {!loading && searched && !error && results.length === 0 && (
        <p className="text-slate-400 text-sm">No results found.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((r, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-sm font-medium hover:text-blue-300 hover:underline"
              >
                {r.title}
              </a>
              <p className="text-slate-500 text-xs mt-0.5 font-mono truncate">{r.url}</p>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">{r.snippet}</p>
              {r.publishedAt && (
                <p className="text-slate-500 text-xs mt-2">{r.publishedAt}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
