import type { MessageBlock } from "@rakazo/contracts";
import { MessageBlock as MessageBlockSchema } from "@rakazo/contracts";

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

/**
 * Blocks from a row, parsed one at a time.
 *
 * Blocks are stored as Json and were read back with a cast, which is fine until
 * a row holds a kind the reader does not know — and that is not hypothetical
 * with more than one deployable in play. The api reads rows the worker wrote,
 * so an api rolled back behind the worker, or simply deployed second, meets a
 * block its contract has never seen. Validating the array as a whole makes that
 * one unknown block fail the message, and the message fail the page, and the
 * page fail the thread for everyone in it.
 *
 * Parsing element by element costs the block instead. What survives is
 * everything the reader does understand, which is the difference between a
 * bubble missing a card and a thread that will not open.
 */
export function parseBlocks(value: unknown): MessageBlock[] {
  if (!Array.isArray(value)) return [];
  const blocks: MessageBlock[] = [];
  for (const candidate of value) {
    const parsed = MessageBlockSchema.safeParse(candidate);
    if (parsed.success) blocks.push(parsed.data);
  }
  return blocks;
}
