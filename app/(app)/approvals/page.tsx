"use client";

import { useState, useEffect, useCallback } from "react";

interface ProposedAction {
  id: string;
  agent: string;
  type: string;
  summary: string;
  payload: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

const STATUS_FILTERS = ["all", "pending", "approved", "rejected", "executed"];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    approved: "bg-green-500/20 text-green-300 border-green-500/30",
    rejected: "bg-red-500/20 text-red-300 border-red-500/30",
    executed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${colors[status] ?? "bg-slate-600 text-slate-300 border-slate-500"}`}>
      {status}
    </span>
  );
}

export default function ApprovalsPage() {
  const [actions, setActions] = useState<ProposedAction[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    const url = filter === "all" ? "/api/approvals" : `/api/approvals?status=${filter}`;
    const res = await fetch(url);
    const data = await res.json();
    setActions(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  async function handleAction(id: string, action: "approve" | "reject" | "execute") {
    setActing(true);
    await fetch(`/api/approvals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes: notes || undefined }),
    });
    setSelectedId(null);
    setNotes("");
    setActing(false);
    fetchActions();
  }

  const selected = actions.find((a) => a.id === selectedId);

  return (
    <div className="flex h-screen max-h-screen">
      {/* List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-slate-700 px-6 py-4 flex-shrink-0">
          <h1 className="text-lg font-semibold text-white">Approvals</h1>
          <div className="flex gap-2 mt-3">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${
                  filter === s
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading…</p>
          ) : actions.length === 0 ? (
            <p className="text-slate-400 text-sm">No actions found.</p>
          ) : (
            actions.map((action) => (
              <button
                key={action.id}
                onClick={() => { setSelectedId(action.id); setNotes(""); }}
                className={`w-full text-left bg-slate-800 border rounded-xl p-4 transition-colors ${
                  selectedId === action.id ? "border-blue-500" : "border-slate-700 hover:border-slate-500"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-500">{action.agent}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs font-mono text-slate-500">{action.type}</span>
                    </div>
                    <p className="text-white text-sm font-medium">{action.summary}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {new Date(action.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={action.status} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-96 border-l border-slate-700 flex flex-col">
          <div className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Action Detail</h2>
            <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-white text-lg leading-none">×</button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Summary</p>
              <p className="text-white text-sm">{selected.summary}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Status</p>
              <StatusBadge status={selected.status} />
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Agent / Type</p>
              <p className="text-slate-300 text-sm font-mono">{selected.agent} / {selected.type}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-2">Payload</p>
              <pre className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(JSON.parse(selected.payload), null, 2)}
              </pre>
            </div>

            {selected.notes && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Notes</p>
                <p className="text-slate-300 text-sm">{selected.notes}</p>
              </div>
            )}

            {selected.status === "pending" && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for approval/rejection…"
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
            )}
          </div>

          {selected.status === "pending" && (
            <div className="border-t border-slate-700 px-6 py-4 space-y-2">
              <button
                onClick={() => handleAction(selected.id, "approve")}
                disabled={acting}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => handleAction(selected.id, "reject")}
                disabled={acting}
                className="w-full bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Reject
              </button>
            </div>
          )}

          {selected.status === "approved" && (
            <div className="border-t border-slate-700 px-6 py-4">
              <button
                onClick={() => handleAction(selected.id, "execute")}
                disabled={acting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Execute
              </button>
              <p className="text-slate-500 text-xs text-center mt-2">
                (Stub: marks as executed — no real side effects yet)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
