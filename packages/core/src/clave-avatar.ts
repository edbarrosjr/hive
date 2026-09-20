export const CLAVE_AVATAR_VIEWBOX = "0 0 256 256";

/**
 * Flat HIVE mascot silhouette: a rounded key head with two side cuts that
 * create three teeth. Keep this geometry shared so web and native stay exact.
 */
export const CLAVE_AVATAR_BODY_PATH = [
  "M64 32",
  "H180",
  "C202 32 216 46 216 68",
  "V80",
  "C196 80 184 91 184 106",
  "C184 121 196 132 216 132",
  "V148",
  "C196 148 184 159 184 174",
  "C184 189 196 200 216 200",
  "V202",
  "C216 216 208 224 194 224",
  "H64",
  "C44 224 32 212 32 192",
  "V64",
  "C32 44 44 32 64 32",
  "Z",
].join(" ");

export const CLAVE_EYE = {
  leftX: 87,
  rightX: 133,
  y: 104,
  width: 22,
  height: 50,
  radius: 11,
  rotation: -42,
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

export const CLAVE_EXPRESSION_FRAMES: Readonly<Record<ClaveExpression, ClaveEyesFrame>> = {
  neutral: {
    leftX: 0,
    leftY: 0,
    rightX: 0,
    rightY: 0,
    leftRotation: CLAVE_EYE.rotation,
    rightRotation: CLAVE_EYE.rotation,
    scaleX: 1,
    scaleY: 1,
  },
  listening: {
    leftX: 6,
    leftY: 0,
    rightX: 6,
    rightY: 0,
    leftRotation: CLAVE_EYE.rotation,
    rightRotation: CLAVE_EYE.rotation,
    scaleX: 1,
    scaleY: 1,
  },
  thinking: {
    leftX: -2,
    leftY: -5,
    rightX: 2,
    rightY: 2,
    leftRotation: -49,
    rightRotation: -35,
    scaleX: 1,
    scaleY: 0.9,
  },
  working: {
    leftX: 0,
    leftY: 0,
    rightX: 0,
    rightY: 0,
    leftRotation: CLAVE_EYE.rotation,
    rightRotation: CLAVE_EYE.rotation,
    scaleX: 1,
    scaleY: 1,
  },
  success: {
    leftX: -1,
    leftY: 3,
    rightX: 1,
    rightY: 3,
    leftRotation: -49,
    rightRotation: -35,
    scaleX: 1.04,
    scaleY: 0.8,
  },
  attention: {
    leftX: -4,
    leftY: -1,
    rightX: 4,
    rightY: -1,
    leftRotation: -32,
    rightRotation: -52,
    scaleX: 0.94,
    scaleY: 1.08,
  },
};

export function claveEyesFrame(expression: ClaveExpression): ClaveEyesFrame {
  return CLAVE_EXPRESSION_FRAMES[expression];
}
