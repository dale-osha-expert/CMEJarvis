/**
 * Spoken Briefing — generates a plain-text butler-style briefing script via Claude,
 * then synthesizes it to audio via the configured TTS provider.
 * Result is stored in storage/briefings/ and cached in the SpokenBriefing table.
 */
import path from "path";
import fs from "fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { getDailyBriefing } from "@/lib/briefing";
import { getTTSProvider } from "@/lib/tts";
import type { BriefingData } from "@/lib/briefing";

// ─── Persona ──────────────────────────────────────────────────────────────────
// Adjust this const to change Jarvis's spoken voice and register.

const JARVIS_SPOKEN_PERSONA = `You are Jarvis, a composed and precise AI operations assistant for CertifyMe.net.
When delivering a morning briefing, adopt a calm, butler-like spoken voice — like a trusted aide briefing a business owner directly.
Open with a time-appropriate greeting ("Good morning, sir." or "Good evening.") then move straight into the data.

Rules for spoken output:
- Plain prose only — no markdown, no bullet points, no tables, no asterisks
- Write for the ear: spell out numbers where it sounds natural ("fourteen orders" rather than leading with digits)
- Smooth transitions between sections: revenue → ads → any action items → recommendation → close
- Close with a brief availability note, e.g. "I'm ready whenever you need me."
- Target 150–200 words — roughly 60 to 90 seconds at a natural speaking pace
- Never mention "stub data" or internal implementation details`;

// ─── Script generation ────────────────────────────────────────────────────────

async function generateScript(briefing: BriefingData): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const dataBlock = `
Today's date: ${briefing.date}
Revenue last 7 days: $${briefing.revenue7d.toLocaleString()}
Orders last 7 days: ${briefing.orders7d}
Yesterday revenue: $${briefing.yesterdayRevenue.toLocaleString()}
Yesterday orders: ${briefing.yesterdayOrders}
Ad spend yesterday: $${briefing.adSpendYesterday.toLocaleString()}
ROAS yesterday: ${briefing.roasYesterday.toFixed(1)}x
Best creative: ${briefing.bestCreative.name} at ${briefing.bestCreative.roas.toFixed(1)}x ROAS
Worst creative: ${briefing.worstCreative.name} at ${briefing.worstCreative.roas.toFixed(1)}x ROAS
Top recommendation: ${briefing.topRecommendation}
`.trim();

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 512,
    system: JARVIS_SPOKEN_PERSONA,
    messages: [
      {
        role: "user",
        content: `Deliver today's morning briefing using this data:\n\n${dataBlock}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text in Claude response");
  return textBlock.text.trim();
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function briefingsDir(): string {
  return path.join(process.cwd(), "storage", "briefings");
}

async function ensureBriefingsDir(): Promise<void> {
  await fs.mkdir(briefingsDir(), { recursive: true });
}

// ─── Main generation function ────────────────────────────────────────────────

export async function generateSpokenBriefing(date: string): Promise<void> {
  await ensureBriefingsDir();

  try {
    const briefingData = await getDailyBriefing();
    const scriptText = await generateScript(briefingData);

    const tts = getTTSProvider();
    const { buffer, mimeType, ext } = await tts.synthesize(scriptText);

    const audioPath = path.join(briefingsDir(), `${date}.${ext}`);
    await fs.writeFile(audioPath, buffer);

    // Clean up stale audio file when format changes (e.g. stub .wav → openai .mp3)
    const existing = await prisma.spokenBriefing.findUnique({
      where: { date },
      select: { audioPath: true },
    });
    if (existing?.audioPath && existing.audioPath !== audioPath) {
      await fs.unlink(existing.audioPath).catch(() => {});
    }

    await prisma.spokenBriefing.update({
      where: { date },
      data: {
        status: "ready",
        scriptText,
        audioPath,
        mimeType,
        provider: tts.name,
        voice: tts.voice,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    console.error(`[spoken-briefing] generation failed for ${date}:`, err);
    await prisma.spokenBriefing.update({
      where: { date },
      data: {
        status: "failed",
        error: String(err),
        updatedAt: new Date(),
      },
    });
  }
}

/** Initiate briefing generation for a date (idempotent, async fire-and-forget). */
export async function triggerBriefingGeneration(date: string, force = false): Promise<{
  date: string;
  status: string;
  alreadyExists: boolean;
}> {
  const existing = await prisma.spokenBriefing.findUnique({ where: { date } });

  if (existing?.status === "ready" && !force) {
    return { date, status: "ready", alreadyExists: true };
  }

  // Upsert to "generating" — mark it as in-progress before firing async
  await prisma.spokenBriefing.upsert({
    where: { date },
    create: { date, status: "generating" },
    update: { status: "generating", error: null, updatedAt: new Date() },
  });

  // Fire and forget — Next.js route handlers will return 202 while this runs
  void generateSpokenBriefing(date);

  return { date, status: "generating", alreadyExists: !!existing };
}

/** Get a SpokenBriefing record for a given date. */
export async function getSpokenBriefing(date: string) {
  return prisma.spokenBriefing.findUnique({ where: { date } });
}
