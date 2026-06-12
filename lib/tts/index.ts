/**
 * TTS provider registry.
 * Selected by env TTS_PROVIDER (stub | openai | elevenlabs). Default: stub.
 */
import type { TTSProvider } from "./types";

export type { TTSProvider, TTSResult } from "./types";

export function getTTSProvider(): TTSProvider {
  const providerName = process.env.TTS_PROVIDER ?? "stub";

  switch (providerName) {
    case "openai": {
      const { OpenAITTSProvider } = require("./openai.provider") as { OpenAITTSProvider: new () => TTSProvider };
      return new OpenAITTSProvider();
    }
    // ELEVENLABS SLOT: add `case "elevenlabs":` here
    case "stub":
    default: {
      const { StubTTSProvider } = require("./stub.provider") as { StubTTSProvider: new () => TTSProvider };
      return new StubTTSProvider();
    }
  }
}
