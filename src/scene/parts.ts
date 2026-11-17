import {
  BoxGeometry,
  BufferAttribute,
  type BufferGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Object3D,
  type Plane,
  PlaneGeometry,
  PointLight,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DIM, SPICES, type SpiceKind } from './choreography';
import { createGlassEdgeMaterial, createGlassReflectionMaterial } from './materials';
import type { SceneTextures } from './textures';

const HALF = Math.PI / 2;

function lathe(points: [number, number][], segments = 48): LatheGeometry {
  return new LatheGeometry(
    points.map(([r, y]) => new Vector2(r, y)),
    segments,
  );
}

function mesh(geometry: BufferGeometry, material: Material | Material[], cast = true, receive = true): Mesh {
  const m = new Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function paint(geometry: BufferGeometry, color: string): BufferGeometry {
  const c = new Color(color);
  const n = geometry.attributes.position.count;
  const data = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    data[i * 3] = c.r;
    data[i * 3 + 1] = c.g;
    data[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new BufferAttribute(data, 3));
  return geometry;
}

const steel = (): MeshStandardMaterial => new MeshStandardMaterial({ color: '#cfc7bc', metalness: 1, roughness: 0.26 });

/* ------------------------------------------------------------------ */
/* Gift box                                                            */
/* ------------------------------------------------------------------ */

export function buildBox(tex: SceneTextures): { group: Group; lid: Group } {
  const { w, h, d, t, dividerX, shelf1, shelf2 } = DIM.box;
  const outer = new MeshStandardMaterial({ color: tex.cardboard, roughness: 0.78 });
  const inner = new MeshStandardMaterial({ color: tex.cardboard.clone().multiplyScalar(0.8), roughness: 0.92 });
  const art = (map: SceneTextures['packFront']): MeshStandardMaterial => new MeshStandardMaterial({ map, roughness: 0.72 });
  const group = new Group();
  const put = (geometry: BufferGeometry, material: Material | Material[], x: number, y: number, z: number, parent: Group = group): void => {
    const m = mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
  };
  // BoxGeometry material order: +x, -x, +y, -y, +z, -z
  put(new BoxGeometry(w - 2 * t, h - 2 * t, t), [inner, inner, inner, inner, inner, art(tex.packBack)], 0, h / 2, -d / 2 + t / 2);
  put(new BoxGeometry(t, h, d), [inner, art(tex.packLeft), outer, outer, outer, outer], -w / 2 + t / 2, h / 2, 0);
  put(new BoxGeometry(t, h, d), [art(tex.packRight), inner, outer, outer, outer, outer], w / 2 - t / 2, h / 2, 0);
  put(new BoxGeometry(w - 2 * t, t, d), [outer, outer, outer, inner, outer, outer], 0, h - t / 2, 0);
  put(new BoxGeometry(w - 2 * t, t, d), [outer, outer, inner, outer, outer, outer], 0, t / 2, 0);
  // compartments, as in the open-box reference: bottle left, three stacked right
  const innerDepth = d - t - 0.03;
  const innerZ = (t - 0.03) / 2;
  put(new BoxGeometry(t, h - 2 * t, innerDepth), inner, dividerX, h / 2, innerZ);
  const rightStart = dividerX + t / 2;
  const rightEnd = w / 2 - t;
  for (const y of [shelf1, shelf2]) put(new BoxGeometry(rightEnd - rightStart, t, innerDepth), inner, (rightStart + rightEnd) / 2, y, innerZ);
  // lid hinged on the left edge
  const lid = new Group();
  lid.position.set(-w / 2, 0, d / 2);
  group.add(lid);
  put(new BoxGeometry(w, h, t), [outer, outer, outer, outer, art(tex.packFront), art(tex.lidInside)], w / 2, h / 2, t / 2, lid);
  return { group, lid };
}

export function buildBooklet(tex: SceneTextures): Group {
  const { w, h } = DIM.booklet;
  const paper = new MeshStandardMaterial({ color: '#f4ecdf', roughness: 0.85 });
  const cover = new MeshStandardMaterial({ map: tex.bookletCover, roughness: 0.7 });
  const geometry = new BoxGeometry(w, h, 0.028);
  geometry.translate(0, h / 2, 0);
  const group = new Group();
  group.add(mesh(geometry, [paper, paper, paper, paper, cover, paper]));
  return group;
}

/* ------------------------------------------------------------------ */
/* Bottles                                                             */
/* ------------------------------------------------------------------ */

const BOTTLE_PROFILE: [number, number][] = [
  [0, 0], [0.3, 0], [0.335, 0.02], [0.34, 0.07], [0.34, 1.9], [0.328, 2.04], [0.285, 2.18], [0.2, 2.31],
  [0.135, 2.41], [0.116, 2.54], [0.114, 2.93], [0.134, 2.95], [0.134, 3.01], [0.12, 3.05], [0.092, 3.05],
];
export const BOTTLE_WINE_PROFILE: [number, number][] = [
  [0, 0.03], [0.3, 0.03], [0.325, 0.08], [0.325, 1.9], [0.313, 2.03], [0.272, 2.165], [0.19, 2.295], [0.124, 2.4], [0.102, 2.54], [0.1, 3.0],
];

export function buildBottle(tex: SceneTextures, clip: Plane): { group: Group; cork: Mesh } {
  const group = new Group();
  const wine = mesh(
    lathe(BOTTLE_WINE_PROFILE, 40),
    new MeshStandardMaterial({ color: '#2a050c', roughness: 0.3, side: DoubleSide, clippingPlanes: [clip] }),
    false,
    false,
  );
  group.add(wine);
  const glass = mesh(
    lathe(BOTTLE_PROFILE, 48),
    new MeshPhysicalMaterial({ color: '#161d10', roughness: 0.07, metalness: 0, transparent: true, opacity: 0.86, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: 0.05 }),
    true,
    false,
  );
  glass.renderOrder = 2;
  group.add(glass);
  const capsuleMat = new MeshStandardMaterial({ color: '#6d1b2a', roughness: 0.4, metalness: 0.35 });
  const capsule = mesh(new CylinderGeometry(0.139, 0.12, 0.62, 32, 1, true), capsuleMat);
  capsule.position.y = 2.745;
  capsule.scale.set(1, 1, 1);
  group.add(capsule);
  const capsuleLip = mesh(new RingGeometry(0.086, 0.14, 32), capsuleMat, false);
  capsuleLip.rotation.x = -HALF;
  capsuleLip.position.y = 3.056;
  group.add(capsuleLip);
  const label = mesh(
    new CylinderGeometry(0.3445, 0.3445, 0.86, 48, 1, true, -1.25, 2.5),
    new MeshStandardMaterial({ map: tex.bottleLabel, roughness: 0.55, alphaTest: 0.5, alphaToCoverage: true }),
    false,
  );
  label.position.y = 1.08;
  group.add(label);
  const cork = mesh(new CylinderGeometry(0.088, 0.088, 0.45, 20), new MeshStandardMaterial({ color: '#c9a877', roughness: 0.9 }), false);
  cork.position.y = DIM.bottle.len - 0.225 + 0.006;
  group.add(cork);
  return { group, cork };
}

const MINI_PROFILE: [number, number][] = [
  [0, 0], [0.15, 0], [0.17, 0.02], [0.17, 0.6], [0.16, 0.68], [0.1, 0.8], [0.075, 0.86], [0.07, 0.96], [0.078, 0.97], [0.078, 1.05], [0.056, 1.05],
];
export const MINI_LIQUID_PROFILE: [number, number][] = [
  [0, 0.02], [0.145, 0.02], [0.158, 0.05], [0.158, 0.6], [0.148, 0.675], [0.09, 0.79], [0.064, 0.86], [0.058, 1.02],
];

export function buildMiniBottle(clip: Plane): { group: Group; cap: Mesh } {
  const group = new Group();
  const liquid = mesh(
    lathe(MINI_LIQUID_PROFILE, 28),
    new MeshStandardMaterial({ color: '#a8560f', roughness: 0.18, emissive: '#5c2604', emissiveIntensity: 0.45, side: DoubleSide, clippingPlanes: [clip] }),
    false,
    false,
  );
  group.add(liquid);
  const geometry = lathe(MINI_PROFILE, 32);
  const edge = mesh(geometry, createGlassEdgeMaterial('#4a2a12', 0.6, 0.05), true, false);
  edge.renderOrder = 2;
  const reflection = mesh(geometry, createGlassReflectionMaterial(1.8), false, false);
  reflection.renderOrder = 3;
  group.add(edge, reflection);
  const cap = mesh(new CylinderGeometry(0.087, 0.087, 0.1, 24), new MeshStandardMaterial({ color: '#c9a35a', metalness: 1, roughness: 0.32 }));
  return { group, cap };
}

/* ------------------------------------------------------------------ */
/* Corkscrew                                                           */
/* ------------------------------------------------------------------ */

export function buildCorkscrew(): { group: Group; worm: Group; cork: Mesh } {
  const group = new Group();
  const dark = new MeshStandardMaterial({ color: '#1b1615', roughness: 0.42, metalness: 0.1 });
  const metal = steel();
  const handle = mesh(new CapsuleGeometry(0.07, 0.8, 6, 14), dark);
  handle.rotation.z = HALF;
  handle.scale.z = 0.62;
  group.add(handle);
  const head = mesh(new SphereGeometry(0.085, 14, 10), metal);
  head.position.x = -0.47;
  head.scale.set(1.2, 0.9, 0.55);
  group.add(head);
  const lever = mesh(new BoxGeometry(0.34, 0.03, 0.07), metal);
  lever.position.set(0.3, -0.075, 0);
  group.add(lever);
  // the worm folds flat along the handle and swings out to 90 degrees
  const worm = new Group();
  worm.position.set(-0.02, -0.05, 0);
  const points: Vector3[] = [];
  const turns = 5;
  for (let i = 0; i <= turns * 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    points.push(new Vector3(Math.cos(a) * 0.036, -0.1 - (i / (turns * 12)) * 0.32, Math.sin(a) * 0.036));
  }
  worm.add(mesh(new TubeGeometry(new CatmullRomCurve3(points), 90, 0.011, 6), metal));
  const shank = mesh(new CylinderGeometry(0.014, 0.014, 0.12, 8), metal);
  shank.position.y = -0.05;
  worm.add(shank);
  group.add(worm);
  const cork = mesh(new CylinderGeometry(0.088, 0.088, 0.45, 20), new MeshStandardMaterial({ color: '#c9a877', roughness: 0.9 }));
  cork.position.y = -0.365;
  group.add(cork);
  return { group, worm, cork };
}

/* ------------------------------------------------------------------ */
/* Spices                                                              */
/* ------------------------------------------------------------------ */

export type SpiceFactory = (kind: SpiceKind) => Object3D;

export function createSpiceFactory(tex: SceneTextures): SpiceFactory {
  // geometry and materials are created once and shared by every instance
  const orangeGeometry = new CylinderGeometry(0.26, 0.26, 0.03, 40);
  const orangeMaterials = [
    new MeshStandardMaterial({ color: '#b5651d', roughness: 0.7 }),
    new MeshStandardMaterial({ map: tex.orange, roughness: 0.55 }),
    new MeshStandardMaterial({ map: tex.orange, roughness: 0.55 }),
  ];

  const quill = new CylinderGeometry(0.058, 0.058, 0.8, 16, 1, true).rotateZ(HALF);
  const curlA = new CylinderGeometry(0.027, 0.027, 0.8, 10).rotateZ(HALF).translate(0, 0, 0.028);
  const curlB = new CylinderGeometry(0.027, 0.027, 0.8, 10).rotateZ(HALF).translate(0, 0, -0.028);
  const cinnamonGeometry = mergeGeometries([quill, curlA, curlB]);
  const cinnamonMaterial = new MeshStandardMaterial({ map: tex.cinnamon, roughness: 0.85, side: DoubleSide });

  const starParts: BufferGeometry[] = [paint(new SphereGeometry(0.04, 10, 8).scale(1, 0.7, 1), '#4a2617')];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    starParts.push(paint(new SphereGeometry(1, 10, 6).scale(0.1, 0.036, 0.046).translate(0.118, 0, 0).rotateY(a), '#5c2f1b'));
    starParts.push(paint(new SphereGeometry(0.017, 8, 6).translate(0.115, 0.03, 0).rotateY(a), '#96552a'));
  }
  const starGeometry = mergeGeometries(starParts);
  const paintedMatte = new MeshStandardMaterial({ vertexColors: true, roughness: 0.72 });

  const cardamomGeometry = lathe(
    [
      [0, -0.1], [0.03, -0.086], [0.05, -0.045], [0.056, 0], [0.05, 0.045], [0.028, 0.086], [0, 0.1],
    ],
    9,
  ).rotateZ(HALF);
  const cardamomMaterial = new MeshStandardMaterial({ color: '#a7a36c', roughness: 0.8, flatShading: true });

  const cloveParts: BufferGeometry[] = [
    paint(new CylinderGeometry(0.02, 0.013, 0.15, 6).rotateZ(-HALF), '#4b2a1c'),
    paint(new SphereGeometry(0.033, 8, 6).translate(0.092, 0, 0), '#6a3b24'),
  ];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    cloveParts.push(paint(new ConeGeometry(0.014, 0.045, 5).rotateZ(-HALF).translate(0.085, Math.cos(a) * 0.03, Math.sin(a) * 0.03), '#3f2317'));
  }
  const cloveGeometry = mergeGeometries(cloveParts);

  return (kind) => {
    switch (kind) {
      case 'orange':
        return mesh(orangeGeometry, orangeMaterials);
      case 'cinnamon':
        return mesh(cinnamonGeometry, cinnamonMaterial);
      case 'star':
        return mesh(starGeometry, paintedMatte);
      case 'cardamom':
        return mesh(cardamomGeometry, cardamomMaterial);
      case 'clove':
        return mesh(cloveGeometry, paintedMatte);
    }
  };
}

/** A cellophane packet holding its share of the spices until they are released. */
export function buildBag(kind: 'orange' | 'cinnamon', make: SpiceFactory): { group: Group; items: (Object3D | null)[]; twine: Mesh | null } {
  const size = kind === 'orange' ? DIM.orangeBag : DIM.cinnamonBag;
  const depth = kind === 'orange' ? 0.14 : 0.16;
  const group = new Group();
  const film = new BoxGeometry(size.w, size.h, depth);
  const tint = mesh(film, new MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.07, roughness: 0.2, depthWrite: false }), true, false);
  tint.renderOrder = 4;
  const shine = mesh(film, createGlassReflectionMaterial(1.3), false, false);
  shine.renderOrder = 5;
  group.add(tint, shine);
  const seal = new MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, roughness: 0.3, depthWrite: false });
  for (const sy of [1, -1]) {
    const strip = mesh(new BoxGeometry(size.w, 0.05, 0.012), seal, false, false);
    strip.position.y = sy * (size.h / 2 + 0.02);
    strip.renderOrder = 4;
    group.add(strip);
  }
  const items: (Object3D | null)[] = SPICES.map((def) => {
    if (def.bag !== kind) return null;
    const item = make(def.kind);
    item.position.set(...def.bagPos);
    item.rotation.set(...def.bagRot);
    group.add(item);
    return item;
  });
  let twine: Mesh | null = null;
  if (kind === 'cinnamon') {
    twine = mesh(new TorusGeometry(0.105, 0.011, 6, 28), new MeshStandardMaterial({ color: '#c8a877', roughness: 0.95 }), false, false);
    twine.rotation.x = HALF;
    twine.scale.set(1.22, 0.68, 1);
    twine.position.y = -0.04;
    group.add(twine);
  }
  return { group, items, twine };
}

/* ------------------------------------------------------------------ */
/* Cooking props (not part of the kit)                                 */
/* ------------------------------------------------------------------ */

export interface Hob {
  group: Group;
  glow: Mesh;
  indicator: Mesh;
  knob: Group;
  light: PointLight;
}

export function buildHob(tex: SceneTextures): Hob {
  const { w, h, d } = DIM.hob;
  const group = new Group();
  const body = mesh(new BoxGeometry(w, h - 0.04, d), new MeshStandardMaterial({ color: '#2b2523', roughness: 0.5, metalness: 0.5, envMapIntensity: 0.6 }));
  body.position.y = (h - 0.04) / 2;
  group.add(body);
  const top = mesh(new BoxGeometry(w - 0.04, 0.04, d - 0.04), new MeshStandardMaterial({ color: '#100c0c', roughness: 0.42, metalness: 0, envMapIntensity: 0.18 }));
  top.position.y = h - 0.02;
  group.add(top);
  const marking = mesh(new RingGeometry(0.93, 0.945, 72), new MeshBasicMaterial({ color: '#4a4240' }), false, false);
  marking.rotation.x = -HALF;
  marking.position.y = h + 0.001;
  group.add(marking);
  const glow = mesh(
    new PlaneGeometry(2.5, 2.5),
    new MeshBasicMaterial({ map: tex.glow, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false }),
    false,
    false,
  );
  glow.rotation.x = -HALF;
  glow.position.y = h + 0.002;
  group.add(glow);
  const indicator = mesh(new CircleGeometry(0.028, 16), new MeshBasicMaterial({ color: '#2a1a16', toneMapped: false }), false, false);
  indicator.rotation.x = -HALF;
  indicator.position.set(-1.22, h + 0.002, d / 2 - 0.16);
  group.add(indicator);
  const knob = new Group();
  knob.position.set(1.18, h, d / 2 - 0.2);
  const warm = new MeshStandardMaterial({ color: '#b9a48a', metalness: 1, roughness: 0.3 });
  const dial = mesh(new CylinderGeometry(0.105, 0.115, 0.07, 28), warm);
  dial.position.y = 0.035;
  const tick = mesh(new BoxGeometry(0.014, 0.01, 0.07), new MeshBasicMaterial({ color: '#2a1a16' }), false, false);
  tick.position.set(0, 0.073, -0.06);
  knob.add(dial, tick);
  group.add(knob);
  // faint warm fill on the pan; the ring itself is the glow sprite
  const light = new PointLight('#ff7a2a', 0, 4, 1.6);
  light.position.set(0, 0.5, 1.9);
  group.add(light);
  return { group, glow, indicator, knob, light };
}

export function buildPan(): Group {
  const group = new Group();
  const { r, ri, h, floor } = DIM.pan;
  const body = mesh(
    lathe(
      [
        [0, 0], [r - 0.08, 0], [r - 0.012, 0.034], [r, 0.09], [r, h - 0.02], [r + 0.026, h], [r + 0.026, h + 0.015],
        [ri + 0.006, h + 0.015], [ri, h - 0.02], [ri, 0.1], [ri - 0.03, 0.05], [ri - 0.09, floor], [0, floor],
      ],
      64,
    ),
    new MeshStandardMaterial({ color: '#d2c9bd', metalness: 1, roughness: 0.23, envMapIntensity: 1.15 }),
  );
  group.add(body);
  const bracket = mesh(new BoxGeometry(0.14, 0.09, 0.2), steel());
  bracket.position.set(r + 0.05, h - 0.16, 0);
  group.add(bracket);
  const grip = mesh(new CapsuleGeometry(0.055, 1.0, 6, 14), new MeshStandardMaterial({ color: '#221815', roughness: 0.5, metalness: 0.1 }));
  grip.rotation.z = HALF - 0.12;
  grip.scale.z = 1.25;
  grip.position.set(r + 0.66, h - 0.09, 0);
  group.add(grip);
  return group;
}

/** Wooden spoon: origin at the bowl tip, +y runs up the handle. */
export function buildSpoon(): Group {
  const group = new Group();
  const wood = new MeshStandardMaterial({ color: '#b98b5b', roughness: 0.78 });
  const bowl = mesh(new SphereGeometry(1, 18, 12), wood);
  bowl.scale.set(0.17, 0.24, 0.05);
  bowl.position.y = 0.24;
  group.add(bowl);
  const handle = mesh(new CylinderGeometry(0.032, 0.042, DIM.spoon.len - 0.4, 12), wood);
  handle.position.y = 0.4 + (DIM.spoon.len - 0.4) / 2;
  group.add(handle);
  return group;
}

/** Fine-mesh sieve: origin at the centre of the rim. */
export function buildSieve(tex: SceneTextures): Group {
  const { r, depth } = DIM.sieve;
  const group = new Group();
  const metal = steel();
  const bowl = mesh(
    new SphereGeometry(r, 48, 20, 0, Math.PI * 2, HALF, HALF),
    new MeshStandardMaterial({ color: '#e2ddd6', metalness: 1, roughness: 0.34, alphaMap: tex.sieve, transparent: true, side: DoubleSide, depthWrite: false }),
    true,
    false,
  );
  bowl.scale.y = depth / r;
  bowl.renderOrder = 3;
  group.add(bowl);
  const rim = mesh(new TorusGeometry(r, 0.021, 8, 72), metal);
  rim.rotation.x = HALF;
  group.add(rim);
  const arm = new Group();
  arm.rotation.y = (255 * Math.PI) / 180;
  const rod = mesh(new CylinderGeometry(0.019, 0.019, 0.78, 8), metal);
  rod.rotation.z = HALF;
  rod.position.x = r + 0.39;
  const grip = mesh(new CapsuleGeometry(0.042, 0.5, 4, 10), new MeshStandardMaterial({ color: '#221815', roughness: 0.5 }));
  grip.rotation.z = HALF;
  grip.position.x = r + 1.02;
  const hook = mesh(new BoxGeometry(0.16, 0.02, 0.07), metal);
  hook.position.x = -r - 0.07;
  arm.add(rod, grip, hook);
  group.add(arm);
  return group;
}

/* ------------------------------------------------------------------ */
/* Glass                                                               */
/* ------------------------------------------------------------------ */

const GLASS_PROFILE: [number, number][] = [
  [0, 0], [0.36, 0], [0.37, 0.012], [0.3, 0.03], [0.09, 0.06], [0.04, 0.1], [0.032, 0.2], [0.032, 0.9], [0.05, 0.98],
  [0.14, 1.03], [0.27, 1.12], [0.37, 1.28], [0.425, 1.48], [0.435, 1.62], [0.42, 1.8], [0.39, 1.96], [0.365, 2.1],
  [0.352, 2.1], [0.377, 1.96], [0.407, 1.8], [0.422, 1.62], [0.412, 1.48], [0.357, 1.29], [0.26, 1.14], [0.13, 1.055], [0, 1.04],
];
/** inner bowl radius by height, used to size the wine surface */
const GLASS_INNER: [number, number][] = [
  [1.04, 0.0], [1.055, 0.13], [1.14, 0.26], [1.29, 0.357], [1.48, 0.412], [1.62, 0.422], [1.8, 0.407],
];
const GLASS_WINE_PROFILE: [number, number][] = [
  [0, 1.046], [0.124, 1.061], [0.252, 1.146], [0.348, 1.296], [0.403, 1.486], [0.413, 1.62],
];

export function glassInnerRadius(y: number): number {
  for (let i = 1; i < GLASS_INNER.length; i++) {
    const [y1, r1] = GLASS_INNER[i];
    if (y <= y1) {
      const [y0, r0] = GLASS_INNER[i - 1];
      return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
    }
  }
  return GLASS_INNER[GLASS_INNER.length - 1][1];
}

export function buildGlass(clip: Plane): { group: Group; wine: Mesh } {
  const group = new Group();
  const wine = mesh(
    lathe(GLASS_WINE_PROFILE, 40),
    new MeshStandardMaterial({ color: '#5a0c1a', roughness: 0.22, emissive: '#2c040a', emissiveIntensity: 0.7, clippingPlanes: [clip] }),
    true,
    false,
  );
  group.add(wine);
  const geometry = lathe(GLASS_PROFILE, 56);
  const edge = mesh(geometry, createGlassEdgeMaterial('#4a3530', 0.55, 0.035), true, false);
  edge.renderOrder = 6;
  const reflection = mesh(geometry, createGlassReflectionMaterial(1.7, 0.12), false, false);
  reflection.renderOrder = 7;
  group.add(edge, reflection);
  return { group, wine };
}
