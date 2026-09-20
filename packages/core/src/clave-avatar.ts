export { encodeClaveAvatar, parseBotAvatarValue } from "@rakazo/contracts";

export const CLAVE_AVATAR_VIEWBOX = "0 0 256 256";

/** C: rounded droplet, upright capsule eyes. One geometry on every surface. */
export const CLAVE_AVATAR_BODY_PATH = [
  "M119 28",
  "Q129 20 139 28",
  "C185 63 222 111 222 151",
  "C222 204 183 234 129 234",
  "C75 234 38 204 38 151",
  "C38 110 76 63 119 28",
  "Z",
].join(" ");

export const CLAVE_EYE = {
  leftX: 85,
  rightX: 141,
  y: 113,
  width: 32,
  height: 69,
  radius: 16,
  rotation: 0,
} as const;

export type ClaveExpression =
  | "neutral"
  | "listening"
  | "thinking"
  | "working"
  | "success"
  | "attention";

export interface ClaveEyesFrame {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  leftRotation: number;
  rightRotation: number;
  scaleX: number;
  scaleY: number;
}

const neutral: ClaveEyesFrame = {
  leftX: 0,
  leftY: 0,
  rightX: 0,
  rightY: 0,
  leftRotation: 0,
  rightRotation: 0,
  scaleX: 1,
  scaleY: 1,
};

export const CLAVE_EXPRESSION_FRAMES: Readonly<Record<ClaveExpression, ClaveEyesFrame>> = {
  neutral,
  listening: neutral,
  thinking: neutral,
  working: neutral,
  success: neutral,
  attention: { ...neutral, leftX: -3, rightX: 3, scaleY: 1.04 },
};

export function claveEyesFrame(expression: ClaveExpression): ClaveEyesFrame {
  return CLAVE_EXPRESSION_FRAMES[expression];
}

export interface ClaveMotionFrame {
  offset: number;
  bodyX: number;
  bodyY: number;
  bodyRotation: number;
  leftX: number;
  leftY: number;
  leftRotation: number;
  leftScaleY: number;
  rightX: number;
  rightY: number;
  rightRotation: number;
  rightScaleY: number;
}

const rest = {
  bodyX: 0,
  bodyY: 0,
  bodyRotation: 0,
  leftX: 0,
  leftY: 0,
  leftRotation: 0,
  leftScaleY: 1,
  rightX: 0,
  rightY: 0,
  rightRotation: 0,
  rightScaleY: 1,
};

/** Approved loop: rigid body motion only; no silhouette morphing or body scaling. */
export const CLAVE_THINKING_MOTION: readonly ClaveMotionFrame[] = [
  { offset: 0, ...rest },
  { offset: 0.05, ...rest },
  {
    offset: 0.2,
    ...rest,
    bodyX: -4,
    bodyY: -8,
    bodyRotation: -6.5,
    leftX: -5,
    leftY: -7,
    leftRotation: 12,
    rightX: -5,
    rightY: -7,
    rightRotation: 12,
  },
  {
    offset: 0.32,
    ...rest,
    bodyX: -3,
    bodyY: -6,
    bodyRotation: -5.5,
    leftX: -5,
    leftY: -7,
    leftRotation: 12,
    rightX: -5,
    rightY: -7,
    rightRotation: 12,
  },
  {
    offset: 0.46,
    ...rest,
    bodyX: 4,
    bodyY: -3,
    bodyRotation: 5.5,
    leftX: -2,
    leftY: -1,
    rightX: -3,
    rightY: 4,
    rightRotation: -76,
    rightScaleY: 0.65,
  },
  {
    offset: 0.56,
    ...rest,
    bodyX: 3,
    bodyY: -5,
    bodyRotation: 4,
    leftX: -2,
    leftY: -1,
    rightX: -3,
    rightY: 4,
    rightRotation: -76,
    rightScaleY: 0.65,
  },
  {
    offset: 0.66,
    ...rest,
    bodyX: -2,
    bodyY: -7,
    bodyRotation: -3,
    leftX: 3,
    leftY: -1,
    rightX: -3,
    rightY: -1,
  },
  { offset: 0.74, ...rest, bodyX: 1, bodyY: 1, bodyRotation: 1.5 },
  { offset: 0.78, ...rest, bodyY: 2, leftScaleY: 0.12, rightScaleY: 0.12 },
  { offset: 0.86, ...rest },
  { offset: 1, ...rest },
];

export const CLAVE_SUCCESS_MOTION: readonly ClaveMotionFrame[] = [
  { offset: 0, ...rest },
  { offset: 0.35, ...rest, bodyY: -8, bodyRotation: -4, leftScaleY: 0.7, rightScaleY: 0.7 },
  { offset: 0.7, ...rest, bodyY: 1, bodyRotation: 2 },
  { offset: 1, ...rest },
];

export function claveMotion(expression: ClaveExpression) {
  if (expression === "thinking" || expression === "working") {
    return { frames: CLAVE_THINKING_MOTION, duration: 5400, iterations: Infinity };
  }
  if (expression === "success") {
    return { frames: CLAVE_SUCCESS_MOTION, duration: 900, iterations: 1 };
  }
  return null;
}

export function claveMotionTransform(
  frame: ClaveMotionFrame,
  part: "body" | "left" | "right",
): string {
  if (part === "body")
    return `translate(${frame.bodyX}px, ${frame.bodyY}px) rotate(${frame.bodyRotation}deg)`;
  const left = part === "left";
  const rotation = left ? frame.leftRotation : frame.rightRotation;
  const scaleX = 1 - (0.14 * Math.max(0, -rotation)) / 76;
  return `translate(${left ? frame.leftX : frame.rightX}px, ${left ? frame.leftY : frame.rightY}px) rotate(${rotation}deg) scale(${scaleX}, ${left ? frame.leftScaleY : frame.rightScaleY})`;
}
