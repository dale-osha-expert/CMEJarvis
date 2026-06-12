"use client";

import { useState, useEffect } from "react";

interface SupportMessage {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  body: string;
  receivedAt: string;
  status: string;
  tags: string[];
}

const STATUS_FILTERS = ["all", "open", "pending_reply", "resolved"];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-red-500/20 text-red-300",
    pending_reply: "bg-yellow-500/20 text-yellow-300",
    resolved: "bg-green-500/20 text-green-300",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] ?? "bg-slate-600 text-slate-300"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function SupportPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<SupportMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = filter === "all" ? "/api/support" : `/api/support?status=${filter}`;
    setLoading(true);
    fetch(url).then((r) => r.json()).then((data) => { setMessages(data); setLoading(false); });
  }, [filter]);

  return (
    <div className="flex h-screen max-h-screen">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-slate-700 px-6 py-4 flex-shrink-0">
          <h1 className="text-lg font-semibold text-white">Support Inbox</h1>
          <p className="text-slate-400 text-xs mt-0.5">Read-only view — use Chat to draft replies for approval</p>
          <div className="flex gap-2 mt-3">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${
                  filter === s ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {loading ? <p className="text-slate-400 text-sm">Loading…</p> : messages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => setSelected(msg)}
              className={`w-full text-left bg-slate-800 border rounded-xl p-4 transition-colors ${
                selected?.id === msg.id ? "border-blue-500" : "border-slate-700 hover:border-slate-500"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{msg.subject}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{msg.fromName} · {msg.from}</p>
                  <p className="text-slate-300 text-xs mt-1 line-clamp-1">{msg.body}</p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <StatusBadge status={msg.status} />
                  <span className="text-slate-500 text-xs">
                    {new Date(msg.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              {msg.tags.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {msg.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="w-[28rem] border-l border-slate-700 flex flex-col">
          <div className="border-b border-slate-700 px-6 py-4 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">{selected.subject}</h2>
              <p className="text-slate-400 text-xs mt-0.5">{selected.fromName} &lt;{selected.from}&gt;</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-lg leading-none ml-4">×</button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="flex gap-2">
              <StatusBadge status={selected.status} />
              {selected.tags.map((tag) => (
                <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{tag}</span>
              ))}
            </div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{selected.body}</p>
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-300 text-xs">
                To reply, go to <strong>Chat</strong> and ask Jarvis to draft a reply to this message (ID: {selected.id}).
                The reply will be queued for your approval before sending.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
