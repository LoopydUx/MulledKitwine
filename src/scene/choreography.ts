/**
 * Pure, dependency-free choreography for the Mulled Wine Kit story.
 *
 * Every object state is derived from three numbers only:
 *   gift   0..1  gifting copy hold -> closed kit in the preparation hero pose
 *   intro  0..1  hero framing -> chapter one framing (while the hero copy scrolls away)
 *   p      0..1  normalized story progress across the six preparation chapters
 *
 * Nothing here depends on wall-clock time, click handlers, or previous frames, so
 * scrubbing backward, jumping between chapters, resizing, and re-entering the stage
 * always restore the exact same scene. Units: 1 = 10 cm, y up, camera on +z.
 */

export type V3 = [number, number, number];
export interface Pose {
  pos: V3;
  rot: V3;
}

/* ------------------------------------------------------------------ */
/* Chapters and shared timings                                         */
/* ------------------------------------------------------------------ */

export const CHAPTER_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0.0, 0.18],
  [0.18, 0.35],
  [0.35, 0.5],
  [0.5, 0.67],
  [0.67, 0.82],
  [0.82, 1.0],
];

/** Relative scroll length of each chapter (the unboxing and straining get more room). */
export const CHAPTER_SCROLL_WEIGHT: ReadonlyArray<number> = [1.45, 1.05, 1.1, 1.0, 1.05, 1.35];

/** Timings shared by the 3D stage and the DOM overlay so they can never drift apart. */
export const T = {
  lid: [0.012, 0.06],
  reveal: [0.05, 0.078],
  uncork: [0.128, 0.156],
  setChange: [0.138, 0.19],
  winePour: [0.207, 0.312],
  ingredients: {
    orange: [0.378, 0.405],
    cinnamon: [0.405, 0.422],
    star: [0.422, 0.436],
    cardamom: [0.436, 0.45],
    clove: [0.45, 0.468],
  },
  stirs: [
    [0.468, 0.5],
    [0.582, 0.628],
    [0.766, 0.802],
  ],
  heatOn: [0.505, 0.53],
  simmer: [0.535, 0.655],
  heatOff: [0.672, 0.7],
  spiritPour: [0.734, 0.76],
  rest: [0.788, 0.82],
  strain: [0.902, 0.946],
  finale: [0.962, 0.986],
  /** [fade in start, fade out end] of each chapter's copy block */
  copy: [
    [0.0, 0.152],
    [0.186, 0.338],
    [0.352, 0.49],
    [0.504, 0.66],
    [0.674, 0.812],
    [0.826, 0.952],
  ],
  finaleCopy: 0.974,
  /** burgundy -> ivory, ivory -> warm, warm -> ivory, ivory -> burgundy */
  bgToIvory: [0.156, 0.186],
  bgToWarm: [0.5, 0.54],
  bgFromWarm: [0.8, 0.84],
  bgToBurgundy: [0.953, 0.982],
} as const;

/* ------------------------------------------------------------------ */
/* Dimensions (shared with the mesh builders)                          */
/* ------------------------------------------------------------------ */

export const DIM = {
  box: { w: 1.9, h: 3.45, d: 0.82, t: 0.03, dividerX: 0.02, shelf1: 1.46, shelf2: 2.3 },
  bottle: { len: 3.05, r: 0.34 },
  mini: { len: 1.05, r: 0.125 },
  pan: { r: 0.8, ri: 0.77, h: 0.85, floor: 0.04 },
  hob: { w: 3.0, h: 0.14, d: 2.6 },
  glass: { h: 2.1, bowlBottom: 0.4, fillTop: 1.5 },
  sieve: { r: 0.5, depth: 0.36 },
  spoon: { len: 2.0 },
  booklet: { w: 0.72, h: 0.96 },
  orangeBag: { w: 0.74, h: 0.7 },
  cinnamonBag: { w: 0.3, h: 1.05 },
} as const;

const LID_OPEN = (128 * Math.PI) / 180;

/* World anchors */
const S: V3 = [2.6, 0, 2.2]; // cooking station (hob centre)
const P0: V3 = [S[0], DIM.hob.h, S[2]]; // pan resting on the hob
const G: V3 = [0.2, 0, 3.1]; // glass while straining
const GF: V3 = [-0.4, 0, 5.6]; // glass in the finale
const U: V3 = [0.3, 0, 2.9]; // where the bottle is uncorked
const POUR_MOUTH: V3 = [S[0] - 0.42, 1.74, S[2]];
const BOTTLE_REST: V3 = [-2.4, 0, -5.6]; // the empty bottle retires into the background haze
const MINI_REST: V3 = [0.45, 0, 1.15];
const MINI_POUR_MOUTH: V3 = [S[0] - 0.28, 1.56, S[2] + 0.25];
const BAG_HOVER: V3 = [S[0] - 0.85, 2.35, S[2] + 0.15];
const CIN_HOVER: V3 = [S[0] - 0.55, 2.75, S[2] - 0.3];
const BAG_TILT = (-115 * Math.PI) / 180;
const CIN_TILT = (-120 * Math.PI) / 180;
const PAN_POUR: V3 = [G[0] + 1.632, 3.013, G[2]];
const SIEVE_REST: V3 = [S[0] + 2.25, DIM.sieve.depth + 0.02, S[2] - 0.2];
const SIEVE_OVER_GLASS: V3 = [G[0], DIM.glass.h + 0.58, G[2]];

const WINE_FULL = 0.47; // liquid height in the pan after the bottle is emptied
const WINE_SPIRIT = 0.02; // added by the 40 ml mini bottle
const WINE_AFTER_SERVE = 0.38; // one glass poured

/* ------------------------------------------------------------------ */
/* Math helpers                                                        */
/* ------------------------------------------------------------------ */

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const seg = (p: number, a: number, b: number): number => clamp01((p - a) / (b - a));
export const smooth = (t: number): number => t * t * (3 - 2 * t);
export const sseg = (p: number, a: number, b: number): number => smooth(seg(p, a, b));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

interface Key<V> {
  at: number;
  v: V;
  /** extra height at the middle of the segment that ends on this key */
  arc?: number;
  /** quadratic control point for the segment that ends on this key */
  via?: V3;
  ease?: (t: number) => number;
}

function trackN(p: number, keys: Key<number>[]): number {
  if (p <= keys[0].at) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (p <= k.at) {
      const prev = keys[i - 1];
      const t = (k.ease ?? smooth)(seg(p, prev.at, k.at));
      return lerp(prev.v, k.v, t);
    }
  }
  return keys[keys.length - 1].v;
}

function trackV(p: number, keys: Key<V3>[]): V3 {
  if (p <= keys[0].at) return [...keys[0].v];
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (p <= k.at) {
      const prev = keys[i - 1];
      const t = (k.ease ?? smooth)(seg(p, prev.at, k.at));
      let out: V3;
      if (k.via) {
        const u = 1 - t;
        out = [
          u * u * prev.v[0] + 2 * u * t * k.via[0] + t * t * k.v[0],
          u * u * prev.v[1] + 2 * u * t * k.via[1] + t * t * k.v[1],
          u * u * prev.v[2] + 2 * u * t * k.via[2] + t * t * k.v[2],
        ];
      } else {
        out = lerp3(prev.v, k.v, t);
      }
      if (k.arc) out[1] += Math.sin(Math.PI * t) * k.arc;
      return out;
    }
  }
  return [...keys[keys.length - 1].v];
}

/** Deterministic pseudo-random in 0..1 for decorative variation (no Math.random). */
export function seeded(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* ------------------------------------------------------------------ */
/* Spices                                                              */
/* ------------------------------------------------------------------ */

export type SpiceKind = 'orange' | 'cinnamon' | 'star' | 'cardamom' | 'clove';

export interface SpiceDef {
  kind: SpiceKind;
  bag: 'orange' | 'cinnamon';
  /** resting place inside its packet (packet-local) */
  bagPos: V3;
  bagRot: V3;
  release: number;
  /** floating position in the pan: polar radius / angle, height above the surface */
  r: number;
  a: number;
  lift: number;
  floatRot: V3;
  stirK: number;
  /** pieces that slip out with the pour and are caught by the sieve */
  sieve?: { at: number; pos: V3; rot: V3 };
  /** tabletop arrangement used for the "Inside the box" still */
  kit: Pose;
}

const deg = (d: number): number => (d * Math.PI) / 180;
const HALF = Math.PI / 2;

export const SPICES: SpiceDef[] = [
  // dried orange slices
  { kind: 'orange', bag: 'orange', bagPos: [-0.12, 0.03, 0.0], bagRot: [HALF, 0, 0.2], release: 0.382, r: 0.42, a: deg(95), lift: 0.012, floatRot: [0.03, 0.4, 0.02], stirK: 1.0, kit: { pos: [1.55, 0.03, 2.0], rot: [0, 0.3, 0] } },
  { kind: 'orange', bag: 'orange', bagPos: [0.1, -0.02, 0.035], bagRot: [HALF, 0, -0.3], release: 0.389, r: 0.44, a: deg(215), lift: 0.016, floatRot: [-0.04, 1.3, 0.03], stirK: 0.94, sieve: { at: 0.912, pos: [0.04, -0.2, 0.02], rot: [0.5, 0.6, 0.25] }, kit: { pos: [1.98, 0.065, 2.12], rot: [0.12, 1.2, 0.1] } },
  { kind: 'orange', bag: 'orange', bagPos: [0.0, 0.1, -0.035], bagRot: [HALF, 0, 0.9], release: 0.396, r: 0.43, a: deg(335), lift: 0.02, floatRot: [0.02, 2.4, -0.04], stirK: 1.06, kit: { pos: [2.36, 0.1, 2.3], rot: [0.14, 2.2, 0.08] } },
  // Ceylon cinnamon sticks
  { kind: 'cinnamon', bag: 'cinnamon', bagPos: [-0.056, -0.02, 0.008], bagRot: [0.35, 0, HALF], release: 0.408, r: 0.1, a: deg(250), lift: 0.05, floatRot: [0, 0.5, 0], stirK: 0.9, kit: { pos: [-0.3, 0.06, 2.94], rot: [0.25, 0.48, 0] } },
  { kind: 'cinnamon', bag: 'cinnamon', bagPos: [0.056, -0.02, -0.008], bagRot: [1.15, 0, HALF], release: 0.414, r: 0.3, a: deg(60), lift: 0.14, floatRot: [0, -0.7, 0.42], stirK: 0.9, kit: { pos: [-0.25, 0.06, 3.036], rot: [1.05, 0.48, 0] } },
  // star anise
  { kind: 'star', bag: 'orange', bagPos: [0.14, -0.06, 0.07], bagRot: [HALF, 0, 0.3], release: 0.424, r: 0.2, a: deg(150), lift: 0.035, floatRot: [0.05, 0.2, 0.04], stirK: 1.1, kit: { pos: [1.3, 0.035, 2.85], rot: [0, 0.3, 0] } },
  { kind: 'star', bag: 'orange', bagPos: [-0.2, -0.18, 0.06], bagRot: [HALF, 0, 1.1], release: 0.43, r: 0.6, a: deg(20), lift: 0.03, floatRot: [-0.05, 1.7, 0.03], stirK: 0.97, sieve: { at: 0.918, pos: [-0.2, -0.235, 0.1], rot: [0.3, 1.0, -0.4] }, kit: { pos: [1.72, 0.035, 2.98], rot: [0, 1.1, 0] } },
  // cardamom pods — exactly two, from the packet through the kit still
  { kind: 'cardamom', bag: 'orange', bagPos: [-0.22, -0.24, 0.0], bagRot: [0, 0, 1.15], release: 0.438, r: 0.63, a: deg(275), lift: 0.03, floatRot: [0, 0.6, 0], stirK: 1.12, kit: { pos: [0.72, 0.045, 2.95], rot: [0, 0.4, 0] } },
  { kind: 'cardamom', bag: 'orange', bagPos: [0.16, -0.22, 0.02], bagRot: [0, 0, 1.7], release: 0.446, r: 0.18, a: deg(305), lift: 0.04, floatRot: [0, 2.1, 0], stirK: 1.0, sieve: { at: 0.922, pos: [0.18, -0.265, -0.14], rot: [0.2, 0.4, 0.5] }, kit: { pos: [0.88, 0.045, 3.08], rot: [0, 1.6, 0] } },
  // cloves
  { kind: 'clove', bag: 'orange', bagPos: [-0.3, -0.2, 0.03], bagRot: [0, 0, 0.5], release: 0.452, r: 0.66, a: deg(65), lift: 0.03, floatRot: [0, 0.3, 0], stirK: 1.08, kit: { pos: [0.22, 0.025, 2.82], rot: [0, 0.3, 0] } },
  { kind: 'clove', bag: 'orange', bagPos: [0.28, -0.18, 0.0], bagRot: [0, 0, -0.6], release: 0.4545, r: 0.52, a: deg(250), lift: 0.03, floatRot: [0, 1.9, 0], stirK: 0.95, sieve: { at: 0.926, pos: [-0.05, -0.3, -0.18], rot: [1.2, 0.5, 0.3] }, kit: { pos: [0.36, 0.025, 2.98], rot: [0, 1.4, 0] } },
  { kind: 'clove', bag: 'orange', bagPos: [0.0, -0.3, 0.04], bagRot: [0, 0, 1.5], release: 0.457, r: 0.1, a: deg(185), lift: 0.045, floatRot: [0, 2.6, 0], stirK: 1.0, kit: { pos: [0.18, 0.025, 3.08], rot: [0, 2.4, 0] } },
  { kind: 'clove', bag: 'orange', bagPos: [0.3, -0.3, 0.0], bagRot: [0, 0, 2.2], release: 0.4595, r: 0.68, a: deg(198), lift: 0.03, floatRot: [0, 4.0, 0], stirK: 1.1, sieve: { at: 0.93, pos: [0.22, -0.22, 0.17], rot: [1.0, 2.0, -0.2] }, kit: { pos: [0.44, 0.025, 3.16], rot: [0, 3.6, 0] } },
  { kind: 'clove', bag: 'orange', bagPos: [-0.18, -0.3, -0.03], bagRot: [0, 0, 0.9], release: 0.462, r: 0.46, a: deg(122), lift: 0.04, floatRot: [0, 5.1, 0], stirK: 0.9, kit: { pos: [0.3, 0.025, 3.26], rot: [0, 5.0, 0] } },
];

const FALL = 0.018;
const SIEVE_SLIDE = 0.02;

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

export interface CameraKey {
  at: number;
  target: V3;
  /** azimuth: positive puts the camera on the +x side; elevation above the horizon (degrees) */
  az: number;
  el: number;
  /** world-space width/height that must stay in frame (landscape / portrait layouts) */
  frame: [number, number];
  mFrame: [number, number];
  mTarget?: V3;
  /** fog start / end, measured behind the focus point */
  fog: [number, number];
}

const HERO_CAM: CameraKey = { at: -1, target: [0, 1.74, 0], az: 30, el: 9, frame: [3.3, 4.5], mFrame: [3.3, 4.5], fog: [9, 22] };

const CAMERA_KEYS: CameraKey[] = [
  { at: 0.0, target: [-0.45, 1.78, 0.5], az: 17, el: 11, frame: [4.9, 4.6], mFrame: [4.6, 4.5], mTarget: [-0.58, 1.78, 0.5], fog: [9, 22] },
  { at: 0.078, target: [-0.45, 1.78, 0.5], az: 17, el: 11, frame: [4.9, 4.6], mFrame: [4.6, 4.5], mTarget: [-0.58, 1.78, 0.5], fog: [9, 22] },
  { at: 0.126, target: [0.2, 2.35, 2.2], az: 10, el: 10, frame: [4.6, 3.5], mFrame: [3.4, 4.5], mTarget: [0.25, 2.1, 2.6], fog: [9, 22] },
  { at: 0.154, target: [0.2, 2.35, 2.2], az: 10, el: 10, frame: [4.6, 3.5], mFrame: [3.4, 4.5], mTarget: [0.25, 2.1, 2.6], fog: [8, 20] },
  { at: 0.204, target: [S[0] - 0.95, 1.75, S[2]], az: 5, el: 21, frame: [6.2, 4.3], mFrame: [4.7, 4.4], mTarget: [S[0] - 0.9, 1.7, S[2]], fog: [2.6, 6.2] },
  { at: 0.325, target: [S[0] - 0.95, 1.75, S[2]], az: 5, el: 21, frame: [6.2, 4.3], mFrame: [4.7, 4.4], mTarget: [S[0] - 0.9, 1.7, S[2]], fog: [2.6, 6.2] },
  { at: 0.372, target: [S[0] - 0.3, 1.35, S[2]], az: -3, el: 33, frame: [4.5, 3.7], mFrame: [3.0, 3.7], mTarget: [S[0] - 0.15, 1.35, S[2]], fog: [2.6, 6.2] },
  { at: 0.488, target: [S[0] - 0.3, 1.35, S[2]], az: -3, el: 33, frame: [4.5, 3.7], mFrame: [3.0, 3.7], mTarget: [S[0] - 0.15, 1.35, S[2]], fog: [2.6, 6.2] },
  { at: 0.535, target: [S[0] + 0.1, 1.15, S[2]], az: -9, el: 15, frame: [4.6, 3.6], mFrame: [3.1, 3.6], mTarget: [S[0], 1.15, S[2]], fog: [2.6, 6.2] },
  { at: 0.662, target: [S[0] + 0.1, 1.15, S[2]], az: -9, el: 15, frame: [4.6, 3.6], mFrame: [3.1, 3.6], mTarget: [S[0], 1.15, S[2]], fog: [2.6, 6.2] },
  { at: 0.705, target: [S[0] - 0.35, 1.3, S[2]], az: 4, el: 25, frame: [4.4, 3.6], mFrame: [3.0, 3.6], mTarget: [S[0] - 0.2, 1.3, S[2]], fog: [2.6, 6.2] },
  { at: 0.812, target: [S[0] - 0.35, 1.3, S[2]], az: 4, el: 25, frame: [4.4, 3.6], mFrame: [3.0, 3.6], mTarget: [S[0] - 0.2, 1.3, S[2]], fog: [2.6, 6.2] },
  { at: 0.862, target: [1.3, 1.9, 2.7], az: 1, el: 13, frame: [5.4, 4.3], mFrame: [3.6, 4.4], mTarget: [1.0, 2.0, 2.9], fog: [2.8, 6.4] },
  { at: 0.95, target: [1.3, 1.9, 2.7], az: 1, el: 13, frame: [5.4, 4.3], mFrame: [3.6, 4.4], mTarget: [1.0, 2.0, 2.9], fog: [2.8, 6.4] },
  { at: 0.986, target: [GF[0], 1.25, GF[2]], az: -10, el: 6, frame: [2.4, 3.0], mFrame: [2.0, 3.0], fog: [0.7, 1.9] },
  { at: 1.0, target: [GF[0], 1.25, GF[2]], az: -10, el: 6, frame: [2.4, 3.0], mFrame: [2.0, 3.0], fog: [0.7, 1.9] },
];

export interface CameraState {
  target: V3;
  mTarget: V3;
  az: number;
  el: number;
  frame: [number, number];
  mFrame: [number, number];
  fog: [number, number];
}

function mixCamera(a: CameraKey, b: CameraKey, t: number): CameraState {
  const at = a.mTarget ?? a.target;
  const bt = b.mTarget ?? b.target;
  return {
    target: lerp3(a.target, b.target, t),
    mTarget: lerp3(at, bt, t),
    az: lerp(a.az, b.az, t),
    el: lerp(a.el, b.el, t),
    frame: [lerp(a.frame[0], b.frame[0], t), lerp(a.frame[1], b.frame[1], t)],
    mFrame: [lerp(a.mFrame[0], b.mFrame[0], t), lerp(a.mFrame[1], b.mFrame[1], t)],
    fog: [lerp(a.fog[0], b.fog[0], t), lerp(a.fog[1], b.fog[1], t)],
  };
}

function cameraAt(intro: number, p: number): CameraState {
  if (intro < 1 && p <= 0) return mixCamera(HERO_CAM, CAMERA_KEYS[0], smooth(clamp01(intro)));
  for (let i = 1; i < CAMERA_KEYS.length; i++) {
    const k = CAMERA_KEYS[i];
    if (p <= k.at) {
      const prev = CAMERA_KEYS[i - 1];
      return mixCamera(prev, k, sseg(p, prev.at, k.at));
    }
  }
  const last = CAMERA_KEYS[CAMERA_KEYS.length - 1];
  return mixCamera(last, last, 0);
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface StreamState {
  on: boolean;
  /** visible part of the path, 0 = source, 1 = landing point */
  tail: number;
  head: number;
  start: V3;
  dir: V3;
  speed: number;
  endY: number;
  radius: number;
}

export interface StoryState {
  box: Pose;
  boxVisible: boolean;
  lid: number;
  booklet: Pose;
  bottle: Pose;
  bottleMouth: V3;
  bottleFill: number;
  bottleVisible: boolean;
  corkInBottle: boolean;
  corkOnScrew: boolean;
  corkscrew: Pose;
  worm: number;
  orangeBag: Pose;
  cinnamonBag: Pose;
  bagsVisible: boolean;
  bagItems: { visible: boolean; slide: number }[];
  spices: { visible: boolean; pos: V3; rot: V3 }[];
  mini: Pose;
  miniMouth: V3;
  miniFill: number;
  cap: Pose;
  station: V3;
  stationVisible: boolean;
  /** false once the finale has isolated the glass (everything else is already lost in the haze) */
  propsVisible: boolean;
  pan: Pose;
  panSurfaceY: number;
  panHasWine: boolean;
  spoon: { tip: V3; top: V3 };
  sieve: Pose;
  glass: Pose;
  glassVisible: boolean;
  glassFill: number;
  /** 1 in the story. The closing still scales the mug down beside the 750 ml bottle. */
  glassScale: number;
  heat: number;
  simmer: number;
  panSteam: number;
  glassSteam: number;
  stir: number;
  ripple: number;
  amber: number;
  streams: { wine: StreamState; amber: StreamState; strain: StreamState; filter: StreamState };
  camera: CameraState;
  bg: { burgundy: number; warm: number };
}

function bottlePose(mouth: V3, tilt: number, len: number): Pose {
  // rotation about z: local +y (the bottle axis) becomes (-sin, cos, 0)
  const ax = -Math.sin(tilt);
  const ay = Math.cos(tilt);
  return { pos: [mouth[0] - len * ax, mouth[1] - len * ay, mouth[2]], rot: [0, 0, tilt] };
}

function stream(p: number, on: readonly [number, number], grow: number, drain: number, start: V3, dir: V3, speed: number, endY: number, radius: number): StreamState {
  const head = seg(p, on[0], on[0] + grow);
  const tail = seg(p, on[1], on[1] + drain);
  return { on: p > on[0] && p < on[1] + drain && head > tail, tail, head, start, dir, speed, endY, radius };
}

/** Pan wine height (local, from the pan base) as a function of progress. */
function panWine(p: number): number {
  return (
    WINE_FULL * seg(p, 0.214, 0.32) +
    WINE_SPIRIT * seg(p, 0.737, 0.766) -
    (WINE_FULL + WINE_SPIRIT - WINE_AFTER_SERVE) * seg(p, T.strain[0], T.strain[1])
  );
}

const lipTilt = (h: number): number => Math.atan((DIM.pan.h - h) / DIM.pan.r);

function panTilt(p: number, h: number): number {
  const full = WINE_FULL + WINE_SPIRIT;
  if (p < T.strain[0]) return lipTilt(full) * sseg(p, 0.884, T.strain[0]);
  if (p < T.strain[1]) return lipTilt(h);
  return lipTilt(WINE_AFTER_SERVE) * (1 - sseg(p, T.strain[1], 0.96));
}

/** pan-local point -> world, for a pan tilted about z through its base centre */
function panToWorld(pan: V3, tilt: number, lx: number, ly: number, lz: number): V3 {
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  return [pan[0] + lx * c - ly * s, pan[1] + lx * s + ly * c, pan[2] + lz];
}

function spoonState(p: number, station: V3, panPos: V3, surfaceY: number): { tip: V3; top: V3 } {
  // resting on the counter in front of the hob
  const restTip: V3 = [S[0] - 0.45 + station[0], 0.05, S[2] + 1.6];
  const restTop: V3 = [S[0] + 1.5 + station[0], 0.05, S[2] + 1.5];
  let tip = restTip;
  let top = restTop;
  T.stirs.forEach(([a, b], i) => {
    if (p <= a || p >= b) return;
    const u = (p - a) / (b - a);
    const blend = smooth(clamp01(u / 0.24)) * smooth(clamp01((1 - u) / 0.24));
    const turn = clamp01((u - 0.18) / 0.64);
    const phi = 2.2 + i * 1.3 + turn * Math.PI * 2 * 1.5;
    const stirTip: V3 = [panPos[0] + Math.cos(phi) * 0.4, surfaceY - 0.16, panPos[2] + Math.sin(phi) * 0.4];
    const stirTop: V3 = [panPos[0] + 0.72 + Math.cos(phi) * 0.1, panPos[1] + 2.5, panPos[2] + 1.0 + Math.sin(phi) * 0.1];
    tip = lerp3(restTip, stirTip, blend);
    top = lerp3(restTop, stirTop, blend);
    const hop = Math.sin(Math.PI * blend) * 1.25;
    tip[1] += hop;
    top[1] += hop * 0.4;
  });
  return { tip, top };
}

function stirAngle(p: number): number {
  const amounts = [1.75, 1.2, 1.4];
  let a = 0;
  T.stirs.forEach(([s, e], i) => {
    const d = e - s;
    a += amounts[i] * sseg(p, s + d * 0.2, e - d * 0.12);
  });
  return a;
}

/** @param giftIn reserved for the gifting copy hold; scene framing matches the hero pose throughout. */
export function computeState(introIn: number, pIn: number, _giftIn = 1): StoryState {
  const p = clamp01(pIn);
  const intro = clamp01(introIn);

  /* --- gift box ---------------------------------------------------- */
  const lid = LID_OPEN * sseg(p, T.lid[0], T.lid[1]);
  const reveal = sseg(p, T.reveal[0], T.reveal[1]) * 0.07;
  const boxAway = sseg(p, 0.142, 0.2);
  const boxPos: V3 = [-1.5 * boxAway, 0, -7.5 * boxAway];
  const booklet: Pose = { pos: add(boxPos, [0.4775, DIM.box.shelf2 + 0.03, -0.05 + reveal]), rot: [-0.1, 0, 0] };

  /* --- wine bottle -------------------------------------------------- */
  const L = DIM.bottle.len;
  const bottleMouth = trackV(p, [
    { at: 0.078, v: [-0.455, L + 0.03, 0] },
    { at: 0.098, v: [-0.455, L + 0.16, 1.35] },
    { at: 0.12, v: [U[0], L, U[2]], arc: 0.22 },
    { at: 0.158, v: [U[0], L, U[2]] },
    { at: 0.2, v: POUR_MOUTH, arc: 0.95 },
    { at: 0.318, v: POUR_MOUTH },
    { at: 0.376, v: [BOTTLE_REST[0], L, BOTTLE_REST[2]], arc: 0.5 },
  ]);
  const bottleTilt = trackN(p, [
    { at: 0.168, v: 0 },
    { at: 0.206, v: deg(-100) },
    { at: 0.312, v: deg(-128) },
    { at: 0.318, v: deg(-128) },
    { at: 0.344, v: 0 },
  ]);
  const bottle = bottlePose(bottleMouth, bottleTilt, L);
  const bottleFill = 1 - seg(p, 0.209, T.winePour[1]);

  /* --- corkscrew and cork ------------------------------------------- */
  const mouthU: V3 = [U[0], L, U[2]];
  const corkscrewPos = trackV(p, [
    { at: 0.106, v: [0.8, 0.62, 0.1 + reveal] },
    { at: 0.128, v: add(mouthU, [0, 0.62, 0]), via: [0.8, 1.6, 1.7] },
    { at: 0.142, v: add(mouthU, [0, 0.14, 0]), ease: (t) => t },
    { at: 0.156, v: add(mouthU, [0, 0.8, 0]) },
    { at: 0.178, v: [-1.35, 0.1, 2.35], arc: 0.25 },
  ]);
  const corkscrewRot: V3 = [
    trackN(p, [
      { at: 0.156, v: 0 },
      { at: 0.178, v: -HALF },
    ]),
    trackN(p, [
      { at: 0.128, v: 0 },
      { at: 0.142, v: Math.PI * 6, ease: (t) => t },
      { at: 0.156, v: Math.PI * 6 },
      { at: 0.178, v: Math.PI * 6 + 0.45 },
    ]),
    trackN(p, [
      { at: 0.106, v: HALF },
      { at: 0.124, v: 0 },
    ]),
  ];
  const worm = sseg(p, 0.108, 0.126);
  const corkOnScrew = p >= 0.142;

  /* --- mise en place: packets and the mini bottle leave the box ------ */
  const orangeBagHome: V3 = [0.4775, 1.9, 0.02 + reveal];
  const orangeBagRest: V3 = [-0.95, 0.075, 1.35];
  const orangeBagPos = trackV(p, [
    { at: 0.088, v: orangeBagHome },
    { at: 0.118, v: orangeBagRest, via: [0.45, 1.95, 1.7] },
    { at: 0.352, v: orangeBagRest },
    { at: 0.378, v: BAG_HOVER, arc: 0.5 },
    { at: 0.466, v: BAG_HOVER },
    { at: 0.49, v: orangeBagRest, arc: 0.4 },
  ]);
  const orangeBagRot: V3 = [
    trackN(p, [
      { at: 0.096, v: 0 },
      { at: 0.118, v: -HALF },
      { at: 0.352, v: -HALF },
      { at: 0.372, v: 0 },
      { at: 0.47, v: 0 },
      { at: 0.49, v: -HALF },
    ]),
    0,
    trackN(p, [
      { at: 0.096, v: 0 },
      { at: 0.118, v: 0.35 },
      { at: 0.352, v: 0.35 },
      { at: 0.378, v: BAG_TILT },
      { at: 0.466, v: BAG_TILT },
      { at: 0.49, v: 0.35 },
    ]),
  ];
  const cinBagHome: V3 = [0.5, 0.58, 0.08 + reveal];
  const cinBagRest: V3 = [-0.2, 0.085, 1.6];
  const cinnamonBagPos = trackV(p, [
    { at: 0.096, v: cinBagHome },
    { at: 0.126, v: cinBagRest, via: [0.5, 0.7, 1.7] },
    { at: 0.384, v: cinBagRest },
    { at: 0.406, v: CIN_HOVER, arc: 0.5 },
    { at: 0.42, v: CIN_HOVER },
    { at: 0.444, v: cinBagRest, arc: 0.4 },
  ]);
  const cinnamonBagRot: V3 = [
    trackN(p, [
      { at: 0.104, v: 0 },
      { at: 0.126, v: -HALF },
      { at: 0.384, v: -HALF },
      { at: 0.4, v: 0 },
      { at: 0.424, v: 0 },
      { at: 0.444, v: -HALF },
    ]),
    0,
    trackN(p, [
      { at: 0.104, v: 0 },
      { at: 0.126, v: -0.5 },
      { at: 0.384, v: -0.5 },
      { at: 0.406, v: CIN_TILT },
      { at: 0.42, v: CIN_TILT },
      { at: 0.444, v: -0.5 },
    ]),
  ];

  const ML = DIM.mini.len;
  const miniPre: V3 = [S[0] - 0.55, 2.25, S[2] + 0.25];
  const miniMouth = trackV(p, [
    { at: 0.104, v: [0.2, 0.03 + ML, 0.06 + reveal] },
    { at: 0.134, v: [MINI_REST[0], ML, MINI_REST[2]], via: [0.2, 0.25 + ML, 1.5] },
    { at: 0.688, v: [MINI_REST[0], ML, MINI_REST[2]] },
    { at: 0.714, v: miniPre, arc: 0.3 },
    { at: 0.722, v: miniPre },
    { at: 0.734, v: MINI_POUR_MOUTH },
    { at: 0.764, v: MINI_POUR_MOUTH },
    { at: 0.786, v: [MINI_REST[0], ML, MINI_REST[2]], arc: 0.5 },
  ]);
  const miniTilt = trackN(p, [
    { at: 0.722, v: 0 },
    { at: 0.734, v: deg(-104) },
    { at: 0.76, v: deg(-136) },
    { at: 0.764, v: deg(-136) },
    { at: 0.782, v: 0 },
  ]);
  const mini = bottlePose(miniMouth, miniTilt, ML);
  const miniFill = 1 - seg(p, 0.735, T.spiritPour[1]);
  const capOff = seg(p, 0.706, 0.72);
  const capRest: V3 = [MINI_REST[0] + 0.34, 0.038, MINI_REST[2] + 0.32];
  const capPos =
    p < 0.72
      ? add(miniMouth, [0, -0.045 + capOff * 0.2, 0])
      : trackV(p, [
          { at: 0.72, v: add(miniPre, [0, 0.155, 0]) },
          { at: 0.745, v: capRest, arc: 0.3 },
        ]);
  const cap: Pose = { pos: capPos, rot: [0, capOff * Math.PI * 4, 0] };

  /* --- cooking station ---------------------------------------------- */
  const stationIn = easeOut(seg(p, T.setChange[0], T.setChange[1]));
  const station: V3 = [(1 - stationIn) * 15, 0, 0];
  const stationVisible = p > T.setChange[0];

  const h = panWine(p);
  const tilt = panTilt(p, h);
  const panBase = trackV(p, [
    { at: 0.862, v: P0 },
    { at: 0.89, v: PAN_POUR, arc: 0.15 },
    { at: 0.954, v: PAN_POUR },
    { at: 0.98, v: P0, arc: 0.15 },
  ]);
  const panPos = add(panBase, station);
  const lip = panToWorld(panPos, tilt, -DIM.pan.r, DIM.pan.h, 0);
  const surfaceY = Math.min(panPos[1] + Math.max(h, DIM.pan.floor) * Math.cos(tilt), lip[1] - 0.004);
  const tiltNorm = clamp01(tilt / lipTilt(WINE_AFTER_SERVE));

  /* --- heat, steam, stirring ---------------------------------------- */
  const heat = sseg(p, T.heatOn[0], T.heatOn[1]) * (1 - sseg(p, T.heatOff[0], T.heatOff[1]));
  const simmer = sseg(p, 0.55, 0.6) * (1 - sseg(p, 0.69, 0.75));
  const panSteam = sseg(p, 0.54, 0.6) * lerp(1, 0.5, sseg(p, 0.7, 0.82)) * lerp(1, 0.25, sseg(p, 0.9, 0.96));
  const glassSteam = sseg(p, 0.948, 0.986) * 0.9;
  const stir = stirAngle(p);
  const spoon = spoonState(p, station, panPos, surfaceY);

  /* --- sieve and glass ---------------------------------------------- */
  const sievePos = add(
    trackV(p, [
      { at: 0.838, v: SIEVE_REST },
      { at: 0.868, v: SIEVE_OVER_GLASS, arc: 1.7 },
      { at: 0.956, v: SIEVE_OVER_GLASS },
      { at: 0.98, v: SIEVE_REST, arc: 2.1 },
    ]),
    station,
  );
  const sieve: Pose = { pos: sievePos, rot: [0, 0, 0] };
  const glassPos = trackV(p, [
    { at: 0.822, v: [-4.6, 0, 6.2] },
    { at: 0.852, v: G, ease: easeOut },
    { at: T.finale[0], v: G },
    { at: T.finale[1], v: GF },
  ]);
  const glassFill = seg(p, 0.911, 0.955);
  const glassLevel = lerp(DIM.glass.bowlBottom, DIM.glass.fillTop, glassFill);

  /* --- spices -------------------------------------------------------- */
  const bagMouth = (bag: 'orange' | 'cinnamon'): V3 => {
    const hover = bag === 'orange' ? BAG_HOVER : CIN_HOVER;
    const t = bag === 'orange' ? BAG_TILT : CIN_TILT;
    const half = (bag === 'orange' ? DIM.orangeBag.h : DIM.cinnamonBag.h) / 2 + 0.03;
    return [hover[0] - half * Math.sin(t), hover[1] + half * Math.cos(t), hover[2]];
  };
  const floatPose = (d: SpiceDef): Pose => {
    const ang = d.a + stir * d.stirK;
    let lx = d.r * Math.cos(ang);
    const lz = d.r * Math.sin(ang);
    lx = lerp(lx, lx * 0.6 - 0.28, tiltNorm);
    const ly = Math.max((surfaceY + d.lift - panPos[1] - lx * Math.sin(tilt)) / Math.cos(tilt), DIM.pan.floor + 0.02 + d.lift);
    return {
      pos: panToWorld(panPos, tilt, lx, ly, lz),
      rot: [d.floatRot[0], d.floatRot[1] - stir * d.stirK, d.floatRot[2] + tilt * 0.5],
    };
  };
  const bagItems = SPICES.map((d) => ({ visible: p < d.release, slide: sseg(p, d.release - 0.012, d.release) }));
  const spices = SPICES.map((d, i) => {
    if (p < d.release) return { visible: false, pos: bagMouth(d.bag), rot: d.floatRot };
    const fl = floatPose(d);
    const f = seg(p, d.release, d.release + FALL);
    if (f < 1) {
      const m = bagMouth(d.bag);
      const spin = (1 - f) * (1.6 + seeded(i) * 2.4);
      return {
        visible: true,
        pos: [lerp(m[0], fl.pos[0], f), m[1] + (fl.pos[1] - m[1]) * f * f + Math.sin(Math.PI * f) * 0.1 * (1 - f), lerp(m[2], fl.pos[2], f)] as V3,
        rot: [fl.rot[0] + spin, fl.rot[1] + spin * 0.7, fl.rot[2] + spin * 0.5] as V3,
      };
    }
    if (d.sieve && p > d.sieve.at) {
      const q = seg(p, d.sieve.at, d.sieve.at + SIEVE_SLIDE);
      const rest = add(sievePos, d.sieve.pos);
      if (q >= 1) return { visible: true, pos: rest, rot: d.sieve.rot };
      const overLip: V3 = [lip[0] + 0.03, lip[1] + 0.03 + d.lift, lip[2] + d.sieve.pos[2] * 0.6];
      if (q < 0.42) {
        const u = smooth(q / 0.42);
        return { visible: true, pos: lerp3(fl.pos, overLip, u), rot: fl.rot };
      }
      const u = (q - 0.42) / 0.58;
      return {
        visible: true,
        pos: [lerp(overLip[0], rest[0], u), overLip[1] + (rest[1] - overLip[1]) * u * u, lerp(overLip[2], rest[2], u)] as V3,
        rot: lerp3(fl.rot, d.sieve.rot, u),
      };
    }
    return { visible: true, pos: fl.pos, rot: fl.rot };
  });

  /* --- liquid streams ------------------------------------------------ */
  const wineStream = stream(p, T.winePour, 0.011, 0.01, bottleMouth, [-Math.sin(bottleTilt), Math.cos(bottleTilt), 0], 0.95, h > 0.001 ? surfaceY : panPos[1] + DIM.pan.floor, 0.05);
  const amberStream = stream(p, [0.733, T.spiritPour[1]], 0.006, 0.006, miniMouth, [-Math.sin(miniTilt), Math.cos(miniTilt), 0], 0.7, surfaceY, 0.022);
  const strainStream = stream(p, T.strain, 0.006, 0.006, [lip[0] - 0.01, lip[1] - 0.01, lip[2]], [-0.93, -0.36, 0], 0.62, sievePos[1] - DIM.sieve.depth * 0.82, 0.06);
  const filterStream = stream(p, [0.906, 0.95], 0.006, 0.007, [sievePos[0], sievePos[1] - DIM.sieve.depth - 0.01, sievePos[2]], [0, -1, 0], 0.4, glassPos[1] + glassLevel, 0.03);

  const ripple = Math.max(
    sseg(p, 0.214, 0.226) * (1 - sseg(p, 0.318, 0.336)),
    sseg(p, 0.737, 0.744) * (1 - sseg(p, 0.764, 0.78)) * 0.6,
  );

  /* --- backdrop ------------------------------------------------------ */
  const burgundy = Math.max(1 - sseg(p, T.bgToIvory[0], T.bgToIvory[1]), sseg(p, T.bgToBurgundy[0], T.bgToBurgundy[1]));
  const warm = sseg(p, T.bgToWarm[0], T.bgToWarm[1]) * (1 - sseg(p, T.bgFromWarm[0], T.bgFromWarm[1]));

  return {
    box: { pos: boxPos, rot: [0, 0, 0] },
    boxVisible: p < 0.2,
    lid,
    booklet,
    bottle,
    bottleMouth,
    bottleFill,
    bottleVisible: p < 0.38,
    corkInBottle: !corkOnScrew,
    corkOnScrew,
    corkscrew: { pos: corkscrewPos, rot: corkscrewRot },
    worm,
    orangeBag: { pos: orangeBagPos, rot: orangeBagRot },
    cinnamonBag: { pos: cinnamonBagPos, rot: cinnamonBagRot },
    bagsVisible: true,
    bagItems,
    spices,
    mini,
    miniMouth,
    miniFill,
    cap,
    station,
    stationVisible,
    propsVisible: p < 0.9875,
    pan: { pos: panPos, rot: [0, 0, tilt] },
    panSurfaceY: surfaceY,
    panHasWine: h > 0.004,
    spoon,
    sieve,
    glass: { pos: glassPos, rot: [0, 0, 0] },
    glassVisible: p > 0.822,
    glassFill,
    glassScale: 1,
    heat,
    simmer,
    panSteam,
    glassSteam,
    stir,
    ripple,
    amber: sseg(p, 0.737, 0.746) * (1 - sseg(p, 0.762, 0.792)),
    streams: { wine: wineStream, amber: amberStream, strain: strainStream, filter: filterStream },
    camera: cameraAt(intro, p),
    bg: { burgundy, warm },
  };
}

/* ------------------------------------------------------------------ */
/* Still-life poses used for static artwork (captured, never animated) */
/* ------------------------------------------------------------------ */

/** World positions of each kit item in the "Inside the box" arrangement, for numbered markers. */
export const KIT_MARKERS: { id: string; at: V3 }[] = [
  { id: 'wine', at: [-0.3, 2.35, 1.75] },
  { id: 'cinnamon', at: [-0.275, 0.2, 2.99] },
  { id: 'orange', at: [1.96, 0.25, 2.14] },
  { id: 'star-anise', at: [1.5, 0.2, 2.92] },
  { id: 'cardamom', at: [0.85, 0.2, 3.04] },
  { id: 'cloves', at: [0.3, 0.2, 3.04] },
  { id: 'aperitif', at: [0.78, 0.8, 1.9] },
  { id: 'corkscrew', at: [2.9, 0.25, 1.45] },
  { id: 'booklet', at: [1.42, 0.6, 0.85] },
];

/** Opened box with every included item set out in front of it. */
export function kitState(): StoryState {
  const s = computeState(1, 0.079);
  const L = DIM.bottle.len;
  s.lid = deg(122);
  s.bottleMouth = [-0.3, L, 1.75];
  s.bottle = bottlePose(s.bottleMouth, 0, L);
  s.miniMouth = [0.78, DIM.mini.len, 1.9];
  s.mini = bottlePose(s.miniMouth, 0, DIM.mini.len);
  s.cap = { pos: add(s.miniMouth, [0, -0.045, 0]), rot: [0, 0, 0] };
  s.booklet = { pos: [1.42, 0, 0.72], rot: [-0.3, -0.42, 0] };
  s.corkscrew = { pos: [2.9, 0.09, 1.45], rot: [-HALF, 0.6, 0] };
  s.worm = 0;
  s.bagsVisible = false;
  s.bagItems = SPICES.map(() => ({ visible: false, slide: 0 }));
  s.spices = SPICES.map((d) => ({ visible: true, pos: d.kit.pos, rot: d.kit.rot }));
  s.camera = {
    target: [0.35, 1.35, 1.3],
    mTarget: [0.35, 1.35, 1.3],
    az: 21,
    el: 23,
    frame: [6.4, 4.7],
    mFrame: [6.4, 4.7],
    fog: [12, 30],
  };
  s.bg = { burgundy: 0, warm: 0 };
  return s;
}

/**
 * Closed box, 750 ml bottle, 40 ml orange aperitif, booklet, and a finished glass.
 * The mug is scaled to a serving glass: about two-fifths the height of the wine bottle.
 */
export function closingState(): StoryState {
  const s = computeState(1, 0);
  const L = DIM.bottle.len;
  s.box = { pos: [-1.15, 0, 0], rot: [0, 0.3, 0] };
  s.lid = 0;
  s.bottleMouth = [0.42, L, 0.75];
  s.bottle = bottlePose(s.bottleMouth, 0, L);
  s.booklet = { pos: [1.12, 0, 0.08], rot: [-0.2, -0.22, 0] };
  s.bagsVisible = false;
  s.bagItems = SPICES.map(() => ({ visible: false, slide: 0 }));
  s.corkscrew = { pos: [0, -5, 0], rot: [0, 0, 0] };
  const miniMouth: V3 = [1.52, DIM.mini.len, 1.82];
  s.miniMouth = miniMouth;
  s.mini = bottlePose(miniMouth, 0, DIM.mini.len);
  s.miniFill = 1;
  s.cap = { pos: add(miniMouth, [0, -0.045, 0]), rot: [0, 0.35, 0] };
  s.glassScale = 0.58;
  s.glass = { pos: [2.18, 0, 1.55], rot: [0, 0, 0] };
  s.glassVisible = true;
  s.glassFill = 1;
  s.glassSteam = 0.9;
  // Garnish in front of the bottle: the spices already there, plus both cardamom pods and every clove.
  const garnish: Partial<Record<SpiceKind, Pose[]>> = {
    orange: [
      { pos: [0.95, 0.03, 1.95], rot: [0, 0.4, 0] },
      { pos: [1.22, 0.07, 2.12], rot: [0.16, 1.5, 0.08] },
    ],
    cinnamon: [
      { pos: [0.3, 0.065, 2.2], rot: [0, 0.35, 0] },
      { pos: [0.36, 0.065, 2.36], rot: [0, 0.2, 0] },
    ],
    star: [{ pos: [0.85, 0.035, 2.45], rot: [0, 0.6, 0] }],
    cardamom: [
      { pos: [0.58, 0.05, 2.7], rot: [0.1, 0.45, 0.06] },
      { pos: [0.76, 0.05, 2.58], rot: [0, 1.65, 0.12] },
    ],
    clove: [
      { pos: [0.08, 0.03, 2.58], rot: [0, 0.35, 0] },
      { pos: [0.22, 0.03, 2.72], rot: [0, 1.45, 0] },
      { pos: [0.38, 0.03, 2.62], rot: [0, 2.55, 0] },
      { pos: [0.14, 0.03, 2.84], rot: [0, 0.9, 0] },
      { pos: [0.42, 0.03, 2.8], rot: [0, 3.4, 0] },
    ],
  };
  const placed: Partial<Record<SpiceKind, number>> = {};
  s.spices = SPICES.map((d) => {
    const list = garnish[d.kind] ?? [];
    const n = placed[d.kind] ?? 0;
    placed[d.kind] = n + 1;
    const pose = list[n];
    return pose ? { visible: true, pos: pose.pos, rot: pose.rot } : { visible: false, pos: d.kit.pos, rot: d.kit.rot };
  });
  s.camera = {
    target: [0.25, 1.55, 0.7],
    mTarget: [0.25, 1.55, 0.7],
    az: 6,
    el: 9,
    frame: [5.7, 4.3],
    mFrame: [5.7, 4.3],
    fog: [12, 30],
  };
  s.bg = { burgundy: 1, warm: 0 };
  return s;
}

/** Backdrop weights only (cheap enough to call from scroll handlers). */
export function backdropAt(p: number): { burgundy: number; warm: number } {
  return {
    burgundy: Math.max(1 - sseg(p, T.bgToIvory[0], T.bgToIvory[1]), sseg(p, T.bgToBurgundy[0], T.bgToBurgundy[1])),
    warm: sseg(p, T.bgToWarm[0], T.bgToWarm[1]) * (1 - sseg(p, T.bgFromWarm[0], T.bgFromWarm[1])),
  };
}

/** Index (0..5) of the chapter that owns a progress value. */
export function chapterAt(p: number): number {
  for (let i = CHAPTER_RANGES.length - 1; i >= 0; i--) if (p >= CHAPTER_RANGES[i][0]) return i;
  return 0;
}
