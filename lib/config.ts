/**
 * Central config — single source of truth for runtime settings.
 * To change the model: set ANTHROPIC_MODEL in .env.local.
 */
export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
