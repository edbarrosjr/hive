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

Five architectures were designed and scored against each other, then checked
against CopilotKit, which ships three of them. Most of the decision was made by
facts already in the repository, not by preference.

**The model cannot draw a screen, and that is a feature.** `AgentRuntimeEvent`
(`packages/adapter-kit/src/types.ts:417`) is the model→app boundary and carries
no block. Every rich block is built by a handler in
`packages/adapters/src/executor.ts` from the *real* result of a named tool.
`render_plot` is the sharpest example: the model authors a Plot spec, the server
renders it to SVG and PNG, and only a spec that actually rendered becomes a
`chart` block (`executor.ts:2311`). Structure from the model is validated by
execution, never by trust. Any design that lets a model emit UI throws this away.

**The version risk is on the server, not the client.** Neither client validates
responses at runtime: `apps/web/src/lib/rpc.ts:79` is `createORPCClient(link)`
with `ContractRouterClient` as a *type* annotation, and no schema from
`packages/contracts` is referenced anywhere in `apps/web/src` or `apps/mobile`.
Validation runs server-side in `implement(appContract)`
(`apps/api/src/router.ts:477`). So a client that does not know `panel` simply
draws nothing for that bubble — bad, but local. The failure that takes a thread
down for everyone is the opposite direction: an api running an older
`packages/contracts` reading a `panel` that a newer worker wrote fails
`.output(ThreadSnapshotSchema)` and `threads.get` returns 500. That is a real
risk because the api reads blocks the worker writes, so an api rollback or an
api↔worker skew is enough. It is a deploy-ordering problem, and the mitigation
is to parse blocks element by element on read rather than
`MessageBlockSchema.array().safeParse` — an unrecognised block should cost a
block, not the message.

**A new event *type* is more dangerous than a new block kind.** `ProductEventType`
is a closed `z.enum` of 42 values validated by the SSE `eventIterator`; an unknown
type tears down the stream. A new block travelling inside the existing
`thread.message.created` / `thread.message.updated` costs nothing.

**Remote HTML in a frame is rejected, and not because of the navigation guard.**
HIVE already renders a remote frame: `apps/web/src/pages/Shell.tsx:3474` and
`:4313` embed a screen with `sandbox={screenIframeSandbox(embeddedScreenUrl)}`.
So the route is not foreign to the product, and the weak argument — that
Electron's `will-navigate` (`apps/desktop/src/main.ts:282`) is main-frame only
and `will-frame-navigate` appears nowhere — is not the reason to reject it.
The reason is inherited origin. CopilotKit's MCP Apps host serves widget HTML
into a frame that keeps the host's origin; no navigation guard buys anything
against that, because nothing navigates. HIVE's existing sandbox notably does
*not* grant `allow-same-origin`, which is exactly the line that must not move.
A second reason, specific to chat: reopening an old thread of remote widgets
re-runs an agent round per widget just to repaint history, and only works while
the third-party server is still up. A message that cannot be read without
calling its author is not a durable message.

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
does — and this path needs them badly, because there is no payload ceiling at
all today between a third-party MCP server and the executor.

**The envelope carries a version from the first commit.** `v: 1`, in the block
and in the `structuredContent` the domain server returns, with a canary fixture
in the MCP emulator. Everything else here can be changed later; this cannot,
because retrofitting a version onto panels already sitting in Postgres is a data
migration.

**One Zod definition feeds both ends.** The same schema the renderer consumes
generates the JSON Schema the MCP tool is told to return, so there is never a
second list of fields living in a prompt or a doc.

**The text projection is derived, not authored.** Every non-visual consumer —
the agent transcript, voice (`packages/core/src/speech-text.ts:198`), search and
list previews — needs a flat string. Asking the producer to write one alongside
the sections would create a second copy that drifts from the first. One pure
function in `packages/core` walks the section tree and prints its text leaves.

CopilotKit is the cautionary case here, in the opposite direction from what it
first looks like. Its portable channel vocabulary has an optional
`<Message fallbackText>` prop, and exactly one of its five surface renderers
reads it. Four of the five lowerings end in a silent `default: return`, so a
node they do not understand vanishes with its children; only the WhatsApp
lowering recurses into children, and it is the exception, not the rule. An
optional degradation field is decoration. The projection has to be mandatory and
computed, which is what deriving it buys.

**A panel has a lifecycle, including failure.** A tool that takes eight seconds
should not leave the thread blank for eight seconds, and a tool that fails
should not leave a spinner. The states are pending → filled → failed. This is
one block with a stable id, keyed by *subject* rather than by tool call, so
"publish pending, then fill" and "rewrite in place when a second question asks
about the same subject" are the same mechanism and ship together. The key is
scoped to the thread, and the rewrite re-checks `threadId + key` at the moment
it applies rather than at the moment it was planned.

**Actions stay in `ask`.** A panel that needs an action publishes `panel` + `ask`
in the same message. One caveat that has to be written down rather than assumed:
`answerRunInput` (`packages/db/src/events.ts:576`) only requires the answer to be
among the *stored* actions for **approval** asks — the ones carrying an
`approvalEffectId` and an `ExternalEffect` row. A plain question ask accepts any
string and turns it into the run prompt. So an action that must identify which
row of a `track` it refers to cannot rely on that invariant for integrity; it
needs its own validation.

**Trust is a column, not a heuristic.** `McpServer.uiEnabled`, default false, and
it has to filter both directions — what the server is told it may return, and
what the client is willing to paint. The bot↔server assignment is already
revalidated on every call (`packages/adapters/src/mcp-connector.ts:186`), so the
flag travels an authorised path. A server never grants itself the right to draw.

**Freshness is honest, not simulated.** `asOf` is stamped by the HIVE backend and
clamped to `[call start, now]`, so a server cannot lie about it in either
direction. Age is shown only past a threshold. A self-refreshing panel is **not**
promised: the domain server we connect to today announces
`capabilities {tools:{}}` and answers 405 on GET. There is no push, and drawing a
panel as if it were live would be a promise the system cannot pay.

## What has to be fixed first

These are not part of the feature. They are defects the feature would inherit.

1. **Reads from a connector named in another language count as consequential.**
   *Done.* `READ_ONLY_CONNECTOR_PATTERN`
   (`packages/core/src/action-approval.ts:55`) only matches English verbs, and
   `connectorToolRequiresApproval` closes on anything it cannot read, so a tool
   named `minhas_vendas` was classified like a write. That is not an approval
   card on every question — with no stored rule and auto review off,
   `planActionGate` still allows it — but it did mean the tool went to the review
   judge whenever auto review was on, stopped for the owner on every webhook run,
   and took the approval effect key. `remote-mcp.ts:60` already read
   `tool.annotations?.readOnlyHint`; `mcp-connector.ts` now propagates it and the
   executor honours it, below the mutating-name patterns and never on an
   unattended run.
2. **A bubble whose blocks all render empty disappears.** `blockText`
   (`apps/mobile/lib/api.ts:863`) has eight per-kind cases and a generic fallback
   that returns `""` for anything else; `apps/mobile/app/thread.tsx:2871` turns an
   empty string into `return null`. The kinds that have real producers and vanish
   on mobile today are `choice` (`apps/api/src/onboarding.ts:158` — new-user
   onboarding), `skill_draft` (`packages/adapters/src/teaching-session.ts:332`)
   and `mcp_approval` (`packages/adapters/src/executor.ts:2816`). On the web the
   renderer chain ends in `return null` (`apps/web/src/pages/Shell.tsx:6179`).
   Both surfaces need a generic renderer, and the fix belongs to the bubble —
   "I cannot draw this, so draw the minimum line" — not to the text projection.
3. **Secret redaction does not cover tool-published blocks.** `redactBlocks`
   (`executor.ts:4651`) is only called on `messageSegments`
   (`executor.ts:3881`, `:4086`). Blocks published by tool handlers — `chart`
   included — never pass through it. A block carrying free text from an external
   server must.

## Phases

**Phase 0 — measure before building.** *Verified: tables render on both
surfaces, and there are now tests that say so.* The web renderer has `remarkGfm`
on and produces `<table>`, `<th>` and `<td>`. The native one gets tables from
markdown-it's default preset — nothing in this package configures either — and
its parser yields every node type the library draws: `table`, `thead`, `tbody`,
`tr`, `th`, `td`. The earlier doubt came from `markdown.native.tsx` styling only
`table` and `tr`, but that is a border-colour override on top of the library's
own styles, not the rendering itself.

What remains for this phase is the cheap half: teach the model to answer tabular
questions with a table. No renderer changes, no contract changes. Two caveats to
carry: on mobile only bot-role messages go through markdown at all
(`apps/mobile/app/thread.tsx:2917`), so this never applies to what the user
typed; and a table is a shape, not a source of truth — the rule that no rendered
figure may originate in prose still binds, so the model formats what a tool
returned rather than composing numbers into a grid.

Measure here before building the rest. If a table carries most of the value for
the anchor question, that reframes everything below.

**Phase 1 — contract, lifecycle and degradation.** Add `PanelBlock` (with `v: 1`)
to the union and `packages/core/src/panel/` (pure, no React, no DOM — sibling of
`plot/`). Web renderer in `apps/web/src/pages/shell/message-cards.tsx` on vendored
`Card`/`Badge`/`Separator`. A real native renderer on mobile, viable precisely
because three list-shaped sections need no canvas. The full lifecycle ships here,
because pending-then-filled and rewrite-by-key are one mechanism. Do the
degradation fixes above in the same change, and switch the read path to
element-wise parsing. Produce the block from the MCP emulator
(`third-party-connector-emulator.ts`) so conformance is deterministic and offline.

A conformance matrix — one fixture per block kind against the text projection,
voice, list preview and search — is cheap and worth having. Note what it cannot
cover: the mobile renderer itself. There is a Maestro harness, but its workflow
is `on: workflow_dispatch` only, so it never runs on push or on a PR. Say that in
the PR rather than implying coverage.

**Phase 2 — the domain server returns structure.** On the server side: an output
schema per tool generated from the shared definition, `executar` returning
`{text, panel}`, and `structuredContent` alongside the textual `content` (which
stays as the spec-required fallback). On the HIVE side: `uiEnabled` on both the
produce and the paint path. The anchor question returns a panel instead of a
paragraph.

**Phase 3 — not committed.** A background refresh job mirroring
`cloud-agent-poll.ts`. Only if measurement asks for it, and only after the domain
server can push.

## What this deliberately does not do

- It does not let a model choose components, colours, layout or copy.
- It does not render remote HTML in a frame.
- It does not add an interactive control outside `ask`.
- It does not pay off the existing parity debt (`chart` degrades to a label on
  mobile; several kinds still render nothing there). It adds none.
- It does not claim panels are live.

## Admission rule

A fourth section shape enters only when an existing one has lost its meaning, or
when a *second* independent producer asks for it — as a change to the contract in
`packages/core`, with a test. Never as a free-form field, and never as a prompt
change.

A note on how that rule survives contact with reality. CopilotKit's portable
vocabulary carries components that only one of five surfaces renders, and the
gaps are documented in the prop types, in plain English, by the people who wrote
them. Writing the hole down is what made it cheap to leave open. A comment in a
type is not a test.
