# App icon source

`HIVE.icon` is the shared editable source for macOS and iOS. Open it in Apple's
Icon Composer with Xcode 26 or newer. The flat Clave C foreground is centered
without lighting effects and uses the system dark background.

macOS packaging compiles the source into a Tahoe asset catalog and generates the
legacy ICNS fallback. Expo copies the same source into the iOS project.

The platform exports are:

- `apps/desktop/assets/icon-macos.png`: Icon Composer's default appearance,
  1024-pixel macOS pre-Tahoe export, including Dock margins for development launches.
- `apps/mobile/assets/icon.png`: opaque 1024-pixel square for the generic/legacy icon,
  with no rounded mask or Dock margins.
- `apps/mobile/assets/adaptive-icon.png`: transparent 1024-pixel Android foreground;
  the complete mascot is centered within the launcher's safe area.
- `apps/mobile/assets/icon-background.png`: opaque Android background using the
  shared dark background token.
- `apps/mobile/assets/monochrome-icon.png`: matching Android alpha silhouette with
  transparent eyes for themed launchers.

Refresh platform exports after changing the source. Android supplies its own mask;
never bake Mac corners, a rim, or an outer shadow into adaptive layers.

The canonical source is `packages/core/src/clave-avatar.ts`; the palette is in
`packages/ui-tokens/src/index.ts`. Regenerate the exports with
`node --import tsx scripts/generate-clave-assets.ts` from the repository root.
