/**
 * StubTTSProvider — generates a silent WAV buffer in pure Node.js.
 * No API key required. Used when TTS_PROVIDER=stub (the default).
 * The full pipeline (script → audio → DB → player) is testable without any paid service.
 */
import type { TTSProvider, TTSResult } from "./types";

function createSilentWav(durationSecs = 3, sampleRate = 22050): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = Math.floor(sampleRate * durationSecs);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const buf = Buffer.alloc(44 + dataSize, 0);

  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);               // subchunk size
  buf.writeUInt16LE(1, 20);                // PCM = 1
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE((sampleRate * numChannels * bitsPerSample) / 8, 28);
  buf.writeUInt16LE((numChannels * bitsPerSample) / 8, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  // Samples remain 0 — silence

  return buf;
}

export class StubTTSProvider implements TTSProvider {
  readonly name = "stub";
  readonly voice = "none";

  async synthesize(_text: string): Promise<TTSResult> {
    return {
      buffer: createSilentWav(3),
      mimeType: "audio/wav",
      ext: "wav",
    };
  }
}
