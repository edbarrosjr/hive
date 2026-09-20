# Clave mascot

Clave is HIVE's single agent silhouette. It is a flat key-shaped container with
two eyes and no mouth. Agent identity comes from color; state and expression
come only from the eyes.

## Visual rules

- Keep the body silhouette identical for every agent.
- Use a solid identity color. Do not add gradients, shadows, outlines, relief,
  or 3D perspective.
- Do not add a mouth or animate the body.
- Animate only eye position, angle, spacing, or opening.
- Respect reduced-motion preferences.
- Keep status badges separate from the mascot. They communicate application
  state and are not part of the character artwork.

## Shared geometry

The canonical geometry and eye frames live in
`packages/core/src/clave-avatar.ts`:

- `CLAVE_AVATAR_BODY_PATH` defines the silhouette.
- `CLAVE_AVATAR_VIEWBOX` defines its coordinate system.
- `CLAVE_EYE` defines the neutral eye geometry.
- `CLAVE_EXPRESSION_FRAMES` defines the supported eye-only expressions.

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
| `working` | Active run; eyes scan while the body remains still |
| `success` | Completed action |
| `attention` | Warning or item requiring review |

Pass an explicit `expression` to `BotAvatar` when the surrounding feature has
a semantic state. Without one, active run statuses resolve to `working` and all
other statuses resolve to `neutral`.

## Avatar values

New avatar selections persist a plain color value. Previously stored
`::shape_N` values still parse, but they render with the Clave silhouette. Data
image avatars also remain readable for backward compatibility; choosing a new
color replaces them with Clave.

## Verification

When changing Clave:

1. Update the shared geometry and expression tests in `packages/core`.
2. Update the web render tests in `packages/ui-web`.
3. Update the mobile and Android platform-contract tests.
4. Run the Avatar Studio browser test and review its CI screenshot at small
   list-avatar size as well as the larger editor preview.
