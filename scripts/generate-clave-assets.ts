/** Run from the repository root: node --import tsx scripts/generate-clave-assets.ts */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { CLAVE_AVATAR_BODY_PATH, CLAVE_EYE } from "../packages/core/src/clave-avatar.js";
import { darkTokens } from "../packages/ui-tokens/src/index.js";

// Reuse the image exporter dependency already installed by the adapters workspace.
const require = createRequire(new URL("../packages/adapters/package.json", import.meta.url));
const sharp = require("sharp");
const root = new URL("../", import.meta.url);
const save = (path: string, bytes: string | Uint8Array) =>
  writeFileSync(new URL(path, root), bytes);
const eyeRects = [CLAVE_EYE.leftX, CLAVE_EYE.rightX]
  .map(
    (x) =>
      `<rect x="${x}" y="${CLAVE_EYE.y}" width="${CLAVE_EYE.width}" height="${CLAVE_EYE.height}" rx="${CLAVE_EYE.radius}"/>`,
  )
  .join("");
const eyeHoles = [CLAVE_EYE.leftX, CLAVE_EYE.rightX]
  .map(
    (x) =>
      `M${x + 16} 113 A16 16 0 0 1 ${x + 32} 129 V166 A16 16 0 0 1 ${x + 16} 182 A16 16 0 0 1 ${x} 166 V129 A16 16 0 0 1 ${x + 16} 113 Z`,
  )
  .join(" ");
function svg({
  background = false,
  monochrome = false,
  inset = 0,
}: {
  background?: boolean;
  monochrome?: boolean;
  inset?: number;
} = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><title>Clave</title>${background ? `<rect width="256" height="256" fill="${darkTokens.background}"/>` : ""}<g transform="translate(${inset} ${inset}) scale(${1 - inset / 128})">${monochrome ? `<path fill="white" fill-rule="evenodd" d="${CLAVE_AVATAR_BODY_PATH} ${eyeHoles}"/>` : `<path fill="${darkTokens.mascotBody}" d="${CLAVE_AVATAR_BODY_PATH}"/><g fill="${darkTokens.mascotEyes}">${eyeRects}</g>`}</g></svg>\n`;
}
async function png(path: string, size: number, options = {}) {
  save(
    path,
    await sharp(Buffer.from(svg(options)))
      .resize(size, size)
      .png()
      .toBuffer(),
  );
}
async function ico(path: string) {
  const sizes = [16, 32, 256];
  const images = await Promise.all(
    sizes.map((size) => sharp(Buffer.from(svg())).resize(size, size).png().toBuffer()),
  );
  const head = Buffer.alloc(6 + sizes.length * 16);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  images.forEach((image: Buffer, i: number) => {
    const n = 6 + i * 16;
    head[n] = sizes[i]! % 256;
    head[n + 1] = sizes[i]! % 256;
    head.writeUInt16LE(1, n + 4);
    head.writeUInt16LE(32, n + 6);
    head.writeUInt32LE(image.length, n + 8);
    head.writeUInt32LE(offset, n + 12);
    offset += image.length;
  });
  save(path, Buffer.concat([head, ...images]));
}

save("apps/web/public/favicon.svg", svg());
for (const [name, size] of [
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
] as const)
  await png(`apps/web/public/${name}`, size);
await ico("apps/web/public/favicon.ico");
await png("apps/desktop/assets/icon.png", 1024, { background: true });
await png("apps/desktop/assets/icon-macos.png", 1024, { inset: 20 });
await ico("apps/desktop/assets/icon.ico");
await png("packages/ui-tokens/assets/HIVE.icon/Assets/orange-bot.png", 1024);
await png("apps/mobile/assets/icon.png", 1024, { background: true });
await png("apps/mobile/assets/adaptive-icon.png", 1024, { inset: 32 });
await png("apps/mobile/assets/monochrome-icon.png", 1024, { monochrome: true, inset: 32 });
await png("apps/mobile/assets/notification-icon.png", 96, { monochrome: true });
await png("apps/mobile/assets/splash-icon.png", 512);
await png("apps/mobile/assets/favicon.png", 48);
save(
  "apps/mobile/modules/rakazo-notifications/android/src/main/res/drawable/ic_rakazo_notification.xml",
  `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="256" android:viewportHeight="256"><path android:fillColor="#FFFFFFFF" android:fillType="evenOdd" android:pathData="${CLAVE_AVATAR_BODY_PATH} ${eyeHoles}" /></vector>\n`,
);
console.log("Updated Clave platform assets from the shared geometry and palette.");
