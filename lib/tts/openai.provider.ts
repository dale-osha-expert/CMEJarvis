/**
 * OpenAITTSProvider — real TTS via OpenAI speech API.
 * Requires: OPENAI_API_KEY, TTS_VOICE (default "onyx").
 *
 * ELEVENLABS SLOT:
 * ─────────────────────────────────────────────────────────────
 * To add ElevenLabs: create lib/tts/elevenlabs.provider.ts implementing TTSProvider.
 *   Endpoint: https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
 *   Env vars: ELEVENLABS_API_KEY, TTS_VOICE (use voice ID from ElevenLabs dashboard)
 *   Then register it in lib/tts/index.ts under TTS_PROVIDER=elevenlabs.
 * ─────────────────────────────────────────────────────────────
 */
import type { TTSProvider, TTSResult } from "./types";

type OpenAIVoice = "alloy" | "ash" | "coral" | "echo" | "fable" | "onyx" | "nova" | "sage" | "shimmer";
type OpenAITTSModel = "tts-1" | "tts-1-hd" | "gpt-4o-mini-tts";

// Tune delivery independently of script content (JARVIS_SPOKEN_PERSONA in lib/spoken-briefing.ts).
const JARVIS_TTS_INSTRUCTIONS =
  "Speak as a composed, refined British butler — calm and measured in pace, warm but understated in tone. " +
  "Pause naturally between data points. Never rush. Convey quiet confidence and authority.";

export class OpenAITTSProvider implements TTSProvider {
  readonly name = "openai";
  readonly voice: string;
  private readonly model: OpenAITTSModel;

  constructor() {
    this.voice = process.env.TTS_VOICE ?? "onyx";
    this.model = (process.env.OPENAI_TTS_MODEL as OpenAITTSModel) ?? "gpt-4o-mini-tts";
    const hasKey = !!process.env.OPENAI_API_KEY;
    console.log(`[TTS] provider=openai  model=${this.model}  voice=${this.voice}  apiKey=${hasKey ? "present" : "MISSING"}`);
  }

  async synthesize(text: string): Promise<TTSResult> {
    // Dynamic import so missing 'openai' package doesn't crash the app when TTS_PROVIDER=stub
    const { default: OpenAI } = await import("openai").catch(() => {
      throw new Error("openai package not found. Run: npm install openai");
    });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.audio.speech.create({
      model: this.model,
      voice: this.voice as OpenAIVoice,
      input: text,
      response_format: "mp3",
      instructions: JARVIS_TTS_INSTRUCTIONS,
    });

    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: "audio/mpeg",
      ext: "mp3",
    };
  }
}
