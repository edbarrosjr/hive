import type { MessageBlock, PanelSection } from "@rakazo/contracts";
import { MessageBlock as MessageBlockSchema } from "@rakazo/contracts";

type PanelBlock = Extract<MessageBlock, { kind: "panel" }>;

/** The envelope a tool returns under this key in its structured content. */
export const PANEL_ENVELOPE_KEY = "rakazo/panel";

/**
 * A panel from a tool's structured result, or undefined at the slightest
 * deviation — in which case the answer stays the text it would have been.
 *
 * `readAt` is what the producer claims. It is a suggestion: a server that ran
 * its query an hour ago, or one whose clock is wrong, must not be able to put a
 * freshness stamp on this panel that the reader would believe. The stamp is
 * clamped to the window this call actually occupied.
 */
export function panelFromStructuredContent(
  structuredContent: unknown,
  context: { key: string; source?: string; calledAt: Date; now: Date },
): PanelBlock | undefined {
  if (!structuredContent || typeof structuredContent !== "object") return undefined;
  const envelope = (structuredContent as Record<string, unknown>)[PANEL_ENVELOPE_KEY];
  if (!envelope || typeof envelope !== "object") return undefined;

  const claimed = (envelope as { readAt?: unknown }).readAt;
  const candidate = {
    ...(envelope as Record<string, unknown>),
    kind: "panel",
    v: 1,
    key: context.key,
    source: context.source,
    status: "ready",
    asOf: clampToCall(typeof claimed === "string" ? claimed : undefined, context).toISOString(),
    readAt: undefined,
  };

  const parsed = MessageBlockSchema.safeParse(candidate);
  return parsed.success && parsed.data.kind === "panel" ? parsed.data : undefined;
}

function clampToCall(claimed: string | undefined, window: { calledAt: Date; now: Date }): Date {
  const floor = window.calledAt.getTime();
  const ceiling = window.now.getTime();
  if (!claimed) return window.now;
  const at = Date.parse(claimed);
  if (Number.isNaN(at)) return window.now;
  return new Date(Math.min(Math.max(at, floor), ceiling));
}

/**
 * The panel as one flat string.
 *
 * Voice, search, list previews and any client that cannot draw the block all
 * need text. Asking the producer to write it alongside the sections would put a
 * second copy of the content in the block, free to drift from the first, so it
 * is computed from the sections instead — one source, and it cannot go stale
 * against the data it summarises.
 */
export function panelToText(block: PanelBlock): string {
  if (block.status === "pending") return block.title;
  if (block.status === "failed") {
    return block.error ? `${block.title} — ${block.error}` : block.title;
  }

  const body = (block.sections ?? []).map(sectionToText).filter(Boolean);
  return [block.title, ...body].join("\n");
}

function sectionToText(section: PanelSection): string {
  if (section.section === "facts") {
    return section.rows.map((row) => `${row.k}: ${row.v}`).join("\n");
  }
  if (section.section === "track") {
    const current = section.steps.find((step) => step.state === "current");
    const done = section.steps.filter((step) => step.state === "done").length;
    const position = `${done + (current ? 1 : 0)}/${section.steps.length}`;
    return current ? `${current.label} (${position})` : position;
  }
  return section.text;
}

/**
 * How old the panel is, or undefined while that is not worth saying.
 *
 * Below the threshold the reader learns nothing from "just now", and a line
 * that says it is status chrome for its own sake. Past it, the age is the
 * difference between a number and a number you can trust.
 */
export const PANEL_AGE_THRESHOLD_MS = 15 * 60 * 1000;

export function panelAgeLabel(asOf: string | undefined, now: Date): string | undefined {
  if (!asOf) return undefined;
  const at = Date.parse(asOf);
  if (Number.isNaN(at)) return undefined;
  const elapsed = now.getTime() - at;
  if (elapsed < PANEL_AGE_THRESHOLD_MS) return undefined;
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} h` : `${Math.floor(hours / 24)} d`;
}
