# Clave mascot

Clave C is HIVE's single agent silhouette: a rounded upright droplet with two
vertical capsule eyes and no mouth. The body uses the fixed `mascotBody` orange
token in both themes. Only the eyes are customizable.

## Visual rules

- Keep the body silhouette identical for every agent.
- Use the shared orange token. Do not add gradients, shadows, outlines, relief,
  or 3D perspective.
- Do not add a mouth or deform the body.
- During processing, translate and rotate the entire character, coordinated
  with eye movement. Never scale, stretch, or morph the body path.
- Keep list and picker avatars static (`animate={false}`).
- Respect reduced-motion preferences.
- Keep status badges separate from the mascot. They communicate application
  state and are not part of the character artwork.

## Shared geometry

The canonical geometry and eye frames live in
`packages/core/src/clave-avatar.ts`:

- `CLAVE_AVATAR_BODY_PATH` defines the silhouette.
- `CLAVE_AVATAR_VIEWBOX` defines its coordinate system.
- `CLAVE_EYE` defines the neutral eye geometry.
- `CLAVE_EXPRESSION_FRAMES` defines the supported expressions.
- `claveMotion` supplies body/eye keyframes shared by web and native. Processing
  loops take 5.4 seconds; success is a single 900ms gesture, not a continuous loop.

Web and React Native consume these constants directly. Android notification
icons use equivalent platform-native paths because notification drawables
cannot import TypeScript values. Update both Android implementations whenever
the canonical silhouette changes:

- `apps/mobile/modules/rakazo-notifications/android/src/main/java/com/rakazo/notifications/HIVENotificationService.kt`
- `apps/mobile/modules/rakazo-notifications/android/src/main/res/drawable/ic_rakazo_notification.xml`

## Expressions

| Expression | Intended use |
| --- | --- |
| `neutral` | Idle and default state |
| `listening` | Waiting for or receiving input |
| `thinking` | Reasoning or evaluating |
| `working` | Active run; body tilt/bob coordinated with the eyes |
| `success` | Completed action |
| `attention` | Warning or item requiring review |

Pass an explicit `expression` to `BotAvatar` when the surrounding feature has
a semantic state. Without one, active run statuses resolve to `working` and all
other statuses resolve to `neutral`.

## Avatar values

New selections persist `clave::eyes_#RRGGBB` in the existing `bots.color` field.
The shared contract validates and normalizes this value; no database migration
is needed. Legacy colors, shapes, and data images remain stored but render as
orange C with the default dark eyes. They are never interpreted as eye colors.
Profile updates through agent tools accept a hex eye color or the encoded value
and reject image/shape replacements. Remote avatar images are not loaded.

## Product placements

- Lists and pickers: static C, with user-selected eyes.
- Chat header and live processing indicator: driven by actual run state.
- Empty chat: larger static C without extra copy.
- Session loading: C beside the existing loading label.
- Completion: one brief gesture, never for failed/cancelled runs.
- Platform icons: static default C. Android notification/themed icons are
  monochrome with transparent eyes as required by the OS.

## Asset exports

Run `node --import tsx scripts/generate-clave-assets.ts` from the repository root
after geometry/token edits. It regenerates web, desktop, mobile, Icon Composer,
and the Android vector. The Kotlin live-status path must be kept in sync too.
Raster exports are deterministic renders of the canonical vector, not new
AI-generated variants. Native packaging/visual verification still requires the
appropriate platform build environment.

## Verification

When changing Clave:

1. Update the shared geometry and expression tests in `packages/core`.
2. Update the web render tests in `packages/ui-web`.
3. Update the mobile and Android platform-contract tests.
4. Run the Avatar Studio browser test and review its CI screenshot at small
   list-avatar size as well as the larger editor preview.
