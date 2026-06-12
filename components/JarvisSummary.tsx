"use client";

import { useState, useRef, useEffect } from "react";

type BriefingStatus = "idle" | "checking" | "generating" | "ready" | "failed";

interface SpokenBriefing {
  id: string;
  date: string;
  scriptText: string | null;
  mimeType: string | null;
  provider: string | null;
  voice: string | null;
  status: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 60; // 2.5s × 60 = 2.5 minutes

export default function JarvisSummary() {
  const [phase, setPhase] = useState<BriefingStatus>("idle");
  const [briefing, setBriefing] = useState<SpokenBriefing | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  function today() {
    return new Date().toISOString().split("T")[0];
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => () => stopPolling(), []);

  function onReady(data: SpokenBriefing) {
    stopPolling();
    setBriefing(data);
    const url = `/api/briefings/${data.date}/audio`;
    setAudioUrl(url);
    setPhase("ready");
  }

  function startPolling(date: string) {
    pollCount.current = 0;
    stopPolling();
    pollRef.current = setInterval(async () => {
      pollCount.current++;
      if (pollCount.current > MAX_POLLS) {
        stopPolling();
        setPhase("failed");
        setError("Generation timed out after 2.5 minutes.");
        return;
      }
      const res = await fetch(`/api/briefings/${date}`).catch(() => null);
      if (!res?.ok) return;
      const data: SpokenBriefing = await res.json();
      if (data.status === "ready") onReady(data);
      else if (data.status === "failed") {
        stopPolling();
        setPhase("failed");
        setError(data.error ?? "Generation failed.");
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleClick() {
    setError(null);
    const date = today();
    setPhase("checking");

    // Check if briefing already exists
    const checkRes = await fetch(`/api/briefings/${date}`).catch(() => null);
    if (checkRes?.ok) {
      const data: SpokenBriefing = await checkRes.json();
      if (data.status === "ready") { onReady(data); return; }
      if (data.status === "generating") { setPhase("generating"); startPolling(date); return; }
    }

    // Trigger generation
    setPhase("generating");
    const trigRes = await fetch(`/api/cron/daily-briefing?force=false`, { method: "POST" }).catch(() => null);
    if (!trigRes?.ok && trigRes?.status !== 202) {
      setPhase("failed");
      setError("Failed to start briefing generation.");
      return;
    }
    startPolling(date);
  }

  async function handleRetry() {
    setError(null);
    const date = today();
    setBriefing(null);
    setAudioUrl(null);
    setPhase("generating");
    await fetch(`/api/cron/daily-briefing?force=true`, { method: "POST" }).catch(() => null);
    startPolling(date);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false)); }
  }

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
      >
        <span className="text-blue-400">▶</span>
        Jarvis Summary
      </button>
    );
  }

  // ── Checking / Generating ─────────────────────────────────────────────────
  if (phase === "checking" || phase === "generating") {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-slate-300 text-sm">
            {phase === "checking" ? "Checking briefing…" : "Generating Jarvis Summary — this takes about 15 seconds…"}
          </p>
        </div>
      </div>
    );
  }

  // ── Failed ────────────────────────────────────────────────────────────────
  if (phase === "failed") {
    return (
      <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 space-y-3">
        <p className="text-red-300 text-sm font-medium">Briefing generation failed</p>
        <p className="text-red-400 text-xs">{error}</p>
        <button
          onClick={handleRetry}
          className="text-xs bg-red-700/40 hover:bg-red-700/60 text-red-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Ready ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Player bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
        <button
          onClick={togglePlay}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">Jarvis Summary</p>
          <p className="text-slate-400 text-xs">
            {briefing?.provider ?? "stub"} · {briefing?.voice ?? "none"}
            {briefing?.updatedAt && ` · generated ${new Date(briefing.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>
        <button
          onClick={handleRetry}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded"
          title="Re-generate"
        >
          ↺
        </button>
      </div>

      {/* Hidden audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onError={() => { setIsPlaying(false); setError("Audio playback error."); }}
          preload="metadata"
        />
      )}

      {/* Transcript */}
      {briefing?.scriptText && (
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Transcript</p>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{briefing.scriptText}</p>
        </div>
      )}
    </div>
  );
}
