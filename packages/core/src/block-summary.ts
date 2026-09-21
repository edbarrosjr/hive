/**
 * The last line of defence before a block renders as nothing.
 *
 * Blocks are read back from a Json column and cast, never parsed, so what
 * arrives here may be a kind this build has never heard of — a panel written by
 * a newer worker, or a kind an older client was never taught. The surfaces
 * differ in what they draw, but they agree on this: a message must never
 * collapse to an empty bubble because one block was unrecognised.
 *
 * These are the field names a block may carry for a person to read. A kind that
 * follows the convention degrades on the day it ships, before anyone writes a
 * renderer for it.
 */
const DISPLAY_FIELDS = ["text", "state", "question", "title", "name", "label", "goal"] as const;

const MAX_SUMMARY = 140;

/**
 * A short human line for a block nothing else knows how to draw, or undefined
 * when the block carries nothing worth showing. Never returns an id or a dump:
 * a bubble saying a bare UUID is worse than one saying the kind.
 */
export function unknownBlockSummary(block: unknown): string | undefined {
  if (!block || typeof block !== "object") return undefined;
  const fields = block as Record<string, unknown>;

  for (const field of DISPLAY_FIELDS) {
    const value = fields[field];
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (!text || looksLikeId(text)) continue;
    return text.length > MAX_SUMMARY ? `${text.slice(0, MAX_SUMMARY - 1)}…` : text;
  }

  const kind = typeof fields.kind === "string" ? fields.kind.trim() : "";
  return kind && !looksLikeId(kind) ? kind.replaceAll("_", " ") : undefined;
}

/** A uuid or an opaque token tells the reader nothing, so it is not a summary. */
function looksLikeId(value: string): boolean {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
    /^[0-9a-f]{24,}$/i.test(value)
  );
}
