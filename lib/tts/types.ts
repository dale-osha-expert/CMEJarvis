export interface TTSResult {
  buffer: Buffer;
  mimeType: string;   // "audio/wav" | "audio/mpeg"
  ext: string;        // "wav" | "mp3"
}

export interface TTSProvider {
  readonly name: string;
  readonly voice: string;
  synthesize(text: string): Promise<TTSResult>;
}
