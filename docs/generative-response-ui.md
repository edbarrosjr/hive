# Generative response UI

## Why this document exists

HIVE now talks to an external domain server over MCP. The server derives rich
state — a six-step pipeline, what is blocking, whose turn it is, a deadline —
and HIVE renders the answer as a paragraph of markdown. The structure is thrown
away at the boundary, and a paragraph in a thread is frozen: it states a number
that was true when the model wrote it and stays on screen after it stops being
true.

This is the plan for closing that gap. It is deliberately not a plan for a
generative UI engine.

## What the codebase already decides for us

Five architectures were designed and scored against each other. Most of the
decision was made by facts already in the repository, not by preference.

**The model cannot draw a screen, and that is a feature.** `AgentRuntimeEvent`
(`packages/adapter-kit/src/types.ts:417`) is the model→app boundary and carries
no block. Every rich block is built by a handler in
`packages/adapters/src/executor.ts` from the *real* result of a named tool.
`render_plot` is the sharpest example: the model authors a Plot spec, the server
renders it to SVG and PNG, and only a spec that actually rendered becomes a
`chart` block (`executor.ts:2311`). Structure from the model is validated by
execution, never by trust. Any design that lets a model emit UI throws this away.

**An unknown block kind does not degrade — it breaks the thread.** `threads.get`
and `threads.messages` declare `.output(ThreadSnapshotSchema)` and oRPC validates
outputs, so a kind an older client does not know fails the whole page load, not
one bubble. On the web the renderer chain ends in `return null`
(`apps/web/src/pages/Shell.tsx:6178`); on mobile `blockText`
(`apps/mobile/lib/api.ts:887`) reads only `text` and `state` and returns `""`
otherwise. A new block kind must therefore carry a top-level `text` field and
ship with a generic fallback on both surfaces, or shipping it strands every
client that has not updated — including an installed mobile build.

**A new event *type* is more dangerous than a new block kind.** `ProductEventType`
is a closed `z.enum` of 42 values validated by the SSE `eventIterator`; an unknown
type tears down the whole stream. A new block travelling inside the existing
`thread.message.created` / `thread.message.updated` costs nothing.

**Remote HTML in a sandboxed frame is dead on arrival here.** Electron's
`will-navigate` guard (`apps/desktop/src/main.ts:281`) is main-frame only, and
`will-frame-navigate` appears nowhere in the repository. `webviewTag` is unset
(default false). The isolation the design would depend on is not there.

**The structured data already reaches HIVE and is discarded.**
`packages/adapters/src/remote-mcp.ts:82` forwards `result.structuredContent`, and
`packages/adapters/src/serenity-client.ts:156` already *prefers* it over text.
Nothing else reads it. The pipe exists; it has one consumer.

## The design: `panel` — one block, three sections, no pixel from the model

A single new block kind. Its content is built by the HIVE backend from the
`structuredContent` an MCP tool already knows how to return. The model chooses
which tool to call; the server decides whether that becomes a screen.

Three section shapes, closed:

- `facts` — labelled rows with a semantic tone.
- `track` — an ordered sequence of steps with a state (`done`, `current`,
  `pending`, `blocked`, `skipped`).
- `note` — one short caveat line.

No URL field, no image, no icon, no colour, no markdown. Tone is semantic and
maps to `@rakazo/ui-tokens` (`muted` / `success` / `warning` / `destructive`).
Content from an external server enters as a string in a React text node and
nothing else. Byte and row caps live in the contract, as `ChartBlock` already
does.

A top-level `text` field is **required**. It is what the agent transcript, voice
(`packages/core/src/speech-text.ts:198`), search, list previews and any client
that does not know `panel` will read. It is the reason the block can never
render as nothing.

**Actions stay in `ask`.** `answerRunInput` (`packages/db/src/events.ts:576`)
re-reads the message from the database and requires the answer to be among the
*stored* actions, plus an `ExternalEffect` row for approvals. That is the most
valuable invariant in the messaging layer and a block with its own buttons would
route around it. A panel that needs an action is published as `panel` + `ask` in
the same message.

**Trust is a column, not a heuristic.** `McpServer.uiEnabled`, default false.
`panelFromToolResult` ignores the envelope without it. The bot↔server assignment
is already revalidated on every call (`packages/adapters/src/mcp-connector.ts:186`),
so the flag travels an authorised path. A server never grants itself the right
to draw.

**Freshness is honest, not simulated.** `asOf` is stamped by the HIVE backend and
clamped to `[call start, now]`, so a server cannot lie about it in either
direction. Age is shown only past a threshold. A panel carries a business `key`
so a second answer about the same subject rewrites the first in place — via
`message.update` + `thread.message.updated`, the path `apps/api/src/onboarding.ts:106`
already uses and both clients already upsert. A self-refreshing panel is **not**
promised: the domain server we connect to today announces `capabilities {tools:{}}`
and answers 405 on GET. There is no push, and drawing a panel as if it were live
would be a promise the system cannot pay.

## What has to be fixed first

These are not part of the feature. They are defects the feature would inherit.

1. **Read tools trigger an approval card.** `connectorToolRequiresApproval`
   (`packages/core/src/action-approval.ts:79`) fails closed, and
   `READ_ONLY_CONNECTOR_PATTERN` only matches English verbs — no non-English tool
   name is ever recognised as read-only. `remote-mcp.ts:60` already reads
   `tool.annotations?.readOnlyHint`; `mcp-connector.ts` does not propagate it.
   Propagate it and honour it. Without this, every question costs an approval tap.
2. **Unknown blocks must degrade.** Replace the `return null` at
   `Shell.tsx:6178` with a render of the block's `text`, and give
   `apps/mobile/lib/api.ts:887` the same default. This pays a debt that already
   exists: `choice`, `card`, `mcp_approval`, `skill_draft` and `connect` render
   nothing on mobile today.
3. **Secret redaction does not cover tool-published blocks.** `redactBlocks`
   (`executor.ts:4651`) is only called on `messageSegments`
   (`executor.ts:3881`, `:4086`). Blocks published by tool handlers — `chart`
   included — never pass through it. A block carrying free text from an external
   server must.

## Phases

**Phase 0 — measure before building.** Teach the model to answer tabular
questions with a GFM table. `remarkGfm` is on (`packages/chat-ui/src/markdown.web.tsx:100`)
and the web stylesheet covers `table/th/td`. *Verify the native side first*:
`markdown.native.tsx:83` styles only `table` and `tr`, there is no table test in
`chat-ui`, and on mobile only bot-role messages go through markdown at all
(`apps/mobile/app/thread.tsx:2917`). If tables render on both surfaces, a
prompt-only change may capture much of the value and reframe everything below.

**Phase 1 — contract and degradation.** Add `PanelBlock` to the union and
`packages/core/src/panel/` (pure, no React, no DOM — sibling of `plot/`). Web
renderer in `apps/web/src/pages/shell/message-cards.tsx` on vendored
`Card`/`Badge`/`Separator`. A real native renderer on mobile, viable precisely
because three list-shaped sections need no canvas. Teach the five kind-lists that
read blocks to use `text`. Do the degradation fixes above in the same change.
Produce the block from the MCP emulator (`third-party-connector-emulator.ts`) so
conformance is deterministic and offline. **CI cannot verify the mobile renderer:
`apps/mobile/e2e/` contains only a README.** Say so in the PR rather than implying
coverage.

**Phase 2 — the domain server returns structure.** On the server side: an output
schema per tool, `executar` returning `{text, panel}`, `structuredContent`
alongside the textual `content` (which stays as the spec-required fallback), and
a panel builder over the existing derivation functions. On the HIVE side:
`uiEnabled` and the `readOnlyHint` propagation. The anchor question returns a
panel instead of a paragraph.

**Phase 3 — one panel per subject.** Promote `updateBlocks` to a shared helper
and rewrite in place by `key`, with `SELECT … FOR UPDATE` on the thread as
`onboarding.ts:157` does. Zero client code. Five questions about one subject
leave one panel, not five contradictory ones.

**Phase 4 — not committed.** A background refresh job mirroring
`cloud-agent-poll.ts`. Only if measurement asks for it, and only after the
domain server can push.

## What this deliberately does not do

- It does not let a model choose components, colours, layout or copy.
- It does not render remote HTML anywhere.
- It does not add an interactive control outside `ask`.
- It does not pay off the existing parity debt (`chart` degrades to a label on
  mobile; several kinds still render nothing there). It adds none.
- It does not claim panels are live.

## Admission rule

A fourth section shape enters only when an existing one has lost its meaning, or
when a *second* independent producer asks for it — as a change to the contract in
`packages/core`, with a test and a CI screenshot. Never as a free-form field, and
never as a prompt change.
