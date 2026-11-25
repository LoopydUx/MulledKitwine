import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
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
  ShaderMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  UniformsLib,
  UniformsUtils,
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

/**
 * Clear miniature, traced from the reference bottle.
 * Lip (the pour opening) sits at y = DIM.mini.len. Outer shell only: an inner wall
 * sits too close to the amber and breaks up into a jagged band.
 * The meniscus of a full bottle sits in the neck at y = 0.8.
 */
const MINI_GLASS_PROFILE: [number, number][] = [
  [0, 0], [0.036, 0], [0.058, 0.003], [0.082, 0.007], [0.102, 0.013], [0.116, 0.022], [0.123, 0.034], [0.1245, 0.05],
  [0.1245, 0.59], [0.1233, 0.602], [0.1209, 0.614], [0.1174, 0.625], [0.1115, 0.637], [0.1032, 0.649], [0.0926, 0.661],
  [0.0808, 0.673], [0.0743, 0.684], [0.072, 0.696], [0.0714, 0.72], [0.072, 0.767], [0.071, 0.814], [0.069, 0.861],
  [0.0655, 0.908], [0.0643, 0.932], [0.0643, 0.948], [0.068, 0.956], [0.0708, 0.962], [0.0708, 0.97], [0.0655, 0.98],
  [0.0645, 1.02], [0.0672, 1.038], [0.0685, 1.05], [0.046, 1.05],
];
export const MINI_LIQUID_PROFILE: [number, number][] = [
  [0, 0.08], [0.1, 0.08], [0.112, 0.098], [0.116, 0.14], [0.116, 0.575], [0.112, 0.6], [0.1, 0.63],
  [0.084, 0.655], [0.07, 0.678], [0.062, 0.7], [0.06, 0.76], [0.058, 0.8], [0, 0.8],
];

/**
 * Screw cap in the coordinates used by the choreography: the mesh origin is the
 * pour mouth lowered by 0.045, and the cap hangs over the neck finish.
 * [radius, local y]
 */
const MINI_CAP_PROFILE: [number, number][] = [
  [0, 0.064], [0.048, 0.063], [0.068, 0.06], [0.076, 0.055], [0.08, 0.048], [0.0785, 0.03], [0.0765, 0.01],
  [0.076, -0.004], [0.079, -0.012], [0.0815, -0.02], [0.08, -0.028], [0.072, -0.034], [0.05, -0.037], [0, -0.037],
];

/** Vertical grip ridges on a revolved cap. Fades out at the crown and the skirt lip. */
function knurl(geometry: BufferGeometry, y0: number, y1: number, ridges: number, amplitude: number): void {
  const pos = geometry.attributes.position;
  if (!pos) return;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const t = (y - y0) / (y1 - y0);
    if (t <= 0 || t >= 1) continue;
    const fade = Math.min(1, t / 0.12, (1 - t) / 0.08);
    const nr = r + amplitude * fade * Math.cos(Math.atan2(z, x) * ridges);
    pos.setXYZ(i, (x / r) * nr, y, (z / r) * nr);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

export function buildMiniBottle(clip: Plane): { group: Group; cap: Mesh } {
  const group = new Group();
  const liquid = mesh(
    lathe(MINI_LIQUID_PROFILE, 48),
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      fog: true,
      clippingPlanes: [clip],
      uniforms: UniformsUtils.merge([
        UniformsLib.fog,
        {
          uPale: { value: new Color('#f09a3a') },
          uDeep: { value: new Color('#d06a18') },
        },
      ]),
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vView;
        #include <fog_pars_vertex>
        #include <clipping_planes_pars_vertex>
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
          #include <clipping_planes_vertex>
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uPale;
        uniform vec3 uDeep;
        varying vec3 vNormal;
        varying vec3 vView;
        #include <clipping_planes_pars_fragment>
        #include <fog_pars_fragment>
        void main() {
          #include <clipping_planes_fragment>
          float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 0.9);
          vec3 color = mix(uPale, uDeep, rim);
          gl_FragColor = vec4(color, mix(0.5, 0.72, rim));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    }),
    false,
    false,
  );
  liquid.renderOrder = 1;
  group.add(liquid);
  // Thick clear foot, the pale band under the amber in the reference.
  const heel = mesh(
    lathe(
      [
        [0, 0.01], [0.09, 0.012], [0.11, 0.03], [0.114, 0.05], [0.1, 0.07], [0, 0.072],
      ],
      48,
    ),
    new MeshPhysicalMaterial({ color: '#f3eadc', roughness: 0.18, transparent: true, opacity: 0.34, depthWrite: false }),
    false,
    false,
  );
  heel.renderOrder = 1;
  group.add(heel);
  const geometry = lathe(MINI_GLASS_PROFILE, 72);
  const edge = mesh(geometry, createGlassEdgeMaterial('#2c2826', 0.7, 0.018, 2.9), true, false);
  edge.renderOrder = 2;
  const reflection = mesh(geometry, createGlassReflectionMaterial(2.15, 0.045, 0.85), false, false);
  reflection.renderOrder = 3;
  group.add(edge, reflection);
  const capGeometry = lathe(MINI_CAP_PROFILE, 120);
  knurl(capGeometry, -0.03, 0.056, 36, 0.0036);
  const cap = mesh(
    capGeometry,
    new MeshStandardMaterial({ color: '#c9a15a', metalness: 1, roughness: 0.28, envMapIntensity: 1.45 }),
  );
  return { group, cap };
}

/* ------------------------------------------------------------------ */
/* Corkscrew                                                           */
/* ------------------------------------------------------------------ */

/**
 * Waiter's friend, matching the kit's black-handled corkscrew.
 * The hinge is the group origin. Local +X runs along the handle, local -Y is
 * the open worm (the axis the uncorking spin turns around). Folding is a +90°
 * rotation of the worm about Z, which lays the spiral onto +X beside the grip.
 * The pulled cork stays on that same -Y axis.
 */
const WORM_REACH = 0.5;

function stamped(draw: (shape: Shape) => void, depth: number): ExtrudeGeometry {
  const shape = new Shape();
  draw(shape);
  const geo = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0024,
    bevelSize: 0.0022,
    bevelSegments: 1,
    curveSegments: 6,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Glossy black grip. A channel along +X leaves room for the folded spiral. */
function gripGeometry(): BufferGeometry {
  const along = 34;
  const around = 24;
  const positions: number[] = [];
  const indices: number[] = [];
  const sample = (t: number): { x: number; y: number; z: number; hy: number; hz: number } => {
    const x = 0.05 + t * 0.62;
    const belly = Math.sin(t * Math.PI) ** 0.8;
    // sits below the folded spiral; the bow stays shallow so the grip clears the box wall
    const y = -0.05 - 0.016 * Math.sin(t * Math.PI) + t ** 3 * 0.028;
    const z = 0.074;
    const neck = t < 0.14 ? 0.72 + 0.28 * (t / 0.14) : 1;
    let cap = 1;
    if (t < 0.08) cap = Math.sin((t / 0.08) * HALF);
    else if (t > 0.9) cap = Math.sin(((1 - t) / 0.1) * HALF);
    return {
      x,
      y,
      z,
      hy: (0.036 + 0.014 * belly) * neck * cap,
      hz: (0.032 + 0.01 * belly) * neck * cap,
    };
  };
  for (let i = 0; i <= along; i++) {
    const t = i / along;
    const prev = sample(Math.max(0, t - 0.01));
    const curr = sample(t);
    const next = sample(Math.min(1, t + 0.01));
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    for (let k = 0; k < around; k++) {
      const a = (k / around) * Math.PI * 2;
      const pwr = 0.52;
      const cy = Math.cos(a);
      const cz = Math.sin(a);
      const sy = Math.sign(cy) * Math.abs(cy) ** pwr;
      const sz = Math.sign(cz) * Math.abs(cz) ** pwr;
      let x = curr.x + nx * sy * curr.hy;
      let y = curr.y + ny * sy * curr.hy;
      let z = curr.z + sz * curr.hz;
      // tuck a round channel where the folded worm lies, on the face toward the hinge axis
      const clearance = 0.042;
      if (z < curr.z) {
        const dist = Math.hypot(y, z);
        if (dist < clearance && dist > 1e-4) {
          const s = clearance / dist;
          y *= s;
          z *= s;
        }
      }
      positions.push(x, y, z);
    }
  }
  const at = (row: number, col: number): number => row * around + (col % around);
  for (let row = 0; row < along; row++) {
    for (let col = 0; col < around; col++) {
      const a = at(row, col);
      const b = at(row, col + 1);
      const c = at(row + 1, col + 1);
      const d = at(row + 1, col);
      indices.push(a, b, c, a, c, d);
    }
  }
  const cap = (row: number, outward: number): void => {
    const center = positions.length / 3;
    let x = 0;
    let y = 0;
    let z = 0;
    for (let col = 0; col < around; col++) {
      const i = at(row, col) * 3;
      x += positions[i];
      y += positions[i + 1];
      z += positions[i + 2];
    }
    positions.push(x / around, y / around, z / around);
    for (let col = 0; col < around; col++) {
      const a = at(row, col);
      const b = at(row, col + 1);
      if (outward > 0) indices.push(center, a, b);
      else indices.push(center, b, a);
    }
  };
  cap(0, -1);
  cap(along, 1);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  let best = 0;
  let bestZ = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getZ(i) > bestZ) {
      bestZ = pos.getZ(i);
      best = i;
    }
  }
  if (nor.getZ(best) < 0) {
    const idx = geo.getIndex();
    if (idx) {
      for (let i = 0; i < idx.count; i += 3) {
        const swap = idx.getX(i);
        idx.setX(i, idx.getX(i + 1));
        idx.setX(i + 1, swap);
      }
      idx.needsUpdate = true;
      geo.computeVertexNormals();
    }
  }
  return geo;
}

function drawLever(shape: Shape): void {
  const length = 0.42;
  const y0 = 0.05;
  shape.moveTo(0.02, y0 + 0.01);
  for (let i = 1; i <= 26; i++) {
    const t = i / 26;
    shape.lineTo(0.02 + t * length, y0 + 0.012 + Math.sin(t * Math.PI) * 0.046);
  }
  // lip notch: the step that seats on the bottle mouth
  shape.lineTo(0.02 + length - 0.02, y0 + 0.006);
  shape.lineTo(0.02 + length - 0.08, y0 + 0.002);
  shape.lineTo(0.02 + length - 0.09, y0 + 0.022);
  for (let i = 20; i >= 0; i--) {
    const t = i / 26;
    shape.lineTo(0.02 + t * (length - 0.1), y0 + Math.sin(t * Math.PI) * 0.016);
  }
  shape.closePath();
}

function drawOpener(shape: Shape): void {
  const cx = -0.12;
  const cy = 0.028;
  const a0 = 0.2;
  const a1 = 2.55;
  const at = (radius: number, angle: number): [number, number] => [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  const start = at(0.086, a0);
  shape.moveTo(start[0], start[1]);
  for (let i = 1; i <= 22; i++) {
    const p = at(0.086, a0 + ((a1 - a0) * i) / 22);
    shape.lineTo(p[0], p[1]);
  }
  const tip = at(0.086, a1);
  shape.lineTo(tip[0] + 0.008, tip[1] - 0.022);
  for (let i = 22; i >= 0; i--) {
    const p = at(0.056, a0 + ((a1 - a0) * i) / 22);
    shape.lineTo(p[0], p[1]);
  }
  shape.closePath();
}

export function buildCorkscrew(): { group: Group; worm: Group; cork: Mesh } {
  const group = new Group();
  const grip = new MeshPhysicalMaterial({
    color: '#14110f',
    roughness: 0.3,
    metalness: 0.06,
    clearcoat: 0.8,
    clearcoatRoughness: 0.24,
    envMapIntensity: 0.95,
  });
  const metal = new MeshStandardMaterial({ color: '#f2efe8', metalness: 1, roughness: 0.12, envMapIntensity: 1.55 });

  group.add(mesh(gripGeometry(), grip));
  group.add(mesh(stamped(drawLever, 0.022), metal));
  group.add(mesh(stamped(drawOpener, 0.018), metal));

  const tang = mesh(new BoxGeometry(0.07, 0.028, 0.016), metal);
  tang.position.set(-0.048, 0.034, 0);
  group.add(tang);

  const pin = mesh(new CylinderGeometry(0.018, 0.018, 0.07, 18), metal);
  pin.rotation.x = HALF;
  group.add(pin);
  for (const side of [1, -1]) {
    const rivet = mesh(new CylinderGeometry(0.028, 0.028, 0.008, 18), metal);
    rivet.rotation.x = HALF;
    rivet.position.z = side * 0.036;
    group.add(rivet);
  }

  // folds flat along the handle; the scene swings it out to 90° for the cork
  const worm = new Group();
  const shank = mesh(new CylinderGeometry(0.011, 0.011, 0.08, 10), metal);
  shank.position.y = -0.04;
  worm.add(shank);
  const collar = mesh(new CylinderGeometry(0.016, 0.016, 0.02, 12), metal);
  collar.position.y = -0.012;
  worm.add(collar);
  const points: Vector3[] = [new Vector3(0, -0.055, 0), new Vector3(0, -0.082, 0)];
  const turns = 5.25;
  const steps = Math.round(turns * 16);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2;
    const radius = 0.031 * Math.min(1, t / 0.1);
    points.push(new Vector3(Math.cos(angle) * radius, -0.082 - t * (WORM_REACH - 0.082), Math.sin(angle) * radius));
  }
  worm.add(mesh(new TubeGeometry(new CatmullRomCurve3(points, false, 'centripetal'), 120, 0.0082, 8), metal));
  const tip = mesh(new ConeGeometry(0.0082, 0.046, 10), metal);
  tip.rotation.x = Math.PI;
  tip.position.y = -WORM_REACH - 0.023;
  worm.add(tip);
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

interface QuillPoint {
  y: number;
  z: number;
}

/**
 * A rolled sheet of bark, axis along X. The cut ends show the spiral;
 * the outside carries the bark texture (v > 0.5) and the inside the paler sheet.
 */
function rolledQuill(phase: number): BufferGeometry {
  const length = 0.8;
  const alongN = 22;
  const around = 48;
  const turns = 1.65;
  const thick = 0.015;
  const rows = alongN + 1;
  const cols = around + 1;
  const center: QuillPoint[] = [];
  for (let i = 0; i < cols; i++) {
    const t = i / around;
    const ang = phase + t * turns * Math.PI * 2;
    const rad = 0.014 + 0.038 * Math.pow(t, 0.78) + Math.pow(t, 5) * 0.014;
    center.push({ y: Math.cos(ang) * rad, z: Math.sin(ang) * rad * 0.9 });
  }
  const outer: QuillPoint[] = [];
  const inner: QuillPoint[] = [];
  for (let i = 0; i < cols; i++) {
    const prev = center[Math.max(0, i - 1)];
    const next = center[Math.min(cols - 1, i + 1)];
    let ty = next.y - prev.y;
    let tz = next.z - prev.z;
    const len = Math.hypot(ty, tz) || 1;
    ty /= len;
    tz /= len;
    let ny = -tz;
    let nz = ty;
    if (ny * center[i].y + nz * center[i].z < 0) {
      ny = -ny;
      nz = -nz;
    }
    outer.push({ y: center[i].y + ny * thick * 0.5, z: center[i].z + nz * thick * 0.5 });
    inner.push({ y: center[i].y - ny * thick * 0.5, z: center[i].z - nz * thick * 0.5 });
  }

  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const push = (x: number, y: number, z: number, u: number, v: number, shade: number): number => {
    const i = positions.length / 3;
    positions.push(x, y, z);
    colors.push(shade, shade * 0.97, shade * 0.93);
    uvs.push(u, v);
    return i;
  };
  const place = (ring: QuillPoint[], v0: number, v1: number, shade: number): number => {
    const start = positions.length / 3;
    for (let row = 0; row < rows; row++) {
      const u = row / alongN;
      const x = -length / 2 + u * length;
      for (let col = 0; col < cols; col++) {
        const p = ring[col];
        push(x, p.y, p.z, u, v0 + (col / around) * (v1 - v0), shade);
      }
    }
    return start;
  };
  // v 0 is the dark outer bark; the paler inner sheet sits above v 0.5
  const outerStart = place(outer, 0.02, 0.46, 1);
  const innerStart = place(inner, 0.58, 0.96, 0.84);
  const at = (start: number, row: number, col: number): number => start + row * cols + col;
  const quad = (a: number, b: number, c: number, d: number): void => {
    indices.push(a, b, c, a, c, d);
  };
  for (let row = 0; row < alongN; row++) {
    for (let col = 0; col < around; col++) {
      const a = at(outerStart, row, col);
      const b = at(outerStart, row, col + 1);
      const c = at(outerStart, row + 1, col + 1);
      const d = at(outerStart, row + 1, col);
      quad(a, d, c, b);
      const ia = at(innerStart, row, col);
      const ib = at(innerStart, row, col + 1);
      const ic = at(innerStart, row + 1, col + 1);
      const id = at(innerStart, row + 1, col);
      quad(ia, ib, ic, id);
    }
  }
  for (let row = 0; row < alongN; row++) {
    quad(at(outerStart, row, 0), at(outerStart, row + 1, 0), at(innerStart, row + 1, 0), at(innerStart, row, 0));
    quad(at(outerStart, row, around), at(innerStart, row, around), at(innerStart, row + 1, around), at(outerStart, row + 1, around));
  }

  // cut ends: a separate spiral band so the rim stays sharp
  for (const row of [0, alongN]) {
    const positive = row === alongN;
    for (let col = 0; col < around; col++) {
      const u = row / alongN;
      const swell = 0.95 + 0.05 * Math.sin(u * Math.PI);
      const bow = Math.sin(u * Math.PI) * 0.012;
      const x = -length / 2 + u * length;
      const corner = (ring: QuillPoint[], c: number, v: number): number => {
        const p = ring[c];
        return push(x, bow + p.y * swell, p.z * swell, 0.5, v, 0.62 + (c / around) * 0.28);
      };
      const oA = corner(outer, col, 0.12);
      const oB = corner(outer, col + 1, 0.28);
      const iA = corner(inner, col, 0.34);
      const iB = corner(inner, col + 1, 0.42);
      if (positive) quad(oA, iA, iB, oB);
      else quad(oA, oB, iB, iA);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geo.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  let best = 0;
  let bestR = -1;
  const outerCount = rows * cols;
  for (let i = 0; i < outerCount; i++) {
    const r = pos.getY(i) ** 2 + pos.getZ(i) ** 2;
    if (r > bestR) {
      bestR = r;
      best = i;
    }
  }
  if (nor.getY(best) * pos.getY(best) + nor.getZ(best) * pos.getZ(best) < 0) {
    const idx = geo.getIndex();
    if (idx) {
      for (let i = 0; i < idx.count; i += 3) {
        const swap = idx.getX(i);
        idx.setX(i, idx.getX(i + 1));
        idx.setX(i + 1, swap);
      }
      idx.needsUpdate = true;
      geo.computeVertexNormals();
    }
  }
  // keep the cut face flat after the smooth; cap vertices were appended last
  const endNor = geo.getAttribute('normal');
  const capOrigin = outerCount * 2;
  for (let i = capOrigin; i < pos.count; i++) {
    endNor.setXYZ(i, pos.getX(i) > 0 ? 1 : -1, 0, 0);
  }
  endNor.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}

/** Jute tied around a pair of quills. `axis` is the stick direction. */
export function buildCinnamonTie(axis: 'x' | 'y', bow: boolean): Group {
  const group = new Group();
  const fiber = new MeshStandardMaterial({ color: '#cbb892', roughness: 0.97 });
  const band = mesh(new TorusGeometry(0.086, 0.0062, 6, 28), fiber, false, false);
  if (axis === 'x') {
    band.rotation.y = HALF;
    band.scale.set(1.28, 0.7, 1);
  } else {
    band.rotation.x = HALF;
    band.scale.set(1.22, 0.66, 1);
  }
  group.add(band);
  const band2 = band.clone();
  if (axis === 'x') band2.position.x = 0.026;
  else band2.position.y = 0.026;
  group.add(band2);
  const knot = mesh(new SphereGeometry(0.013, 8, 6), fiber, false, false);
  knot.scale.set(1.15, 0.85, 1.15);
  knot.position.set(axis === 'x' ? 0.012 : 0.08, axis === 'x' ? 0.055 : 0.01, axis === 'x' ? 0 : 0.03);
  group.add(knot);
  if (!bow) return group;
  for (const side of [1, -1]) {
    const loop: Vector3[] = [];
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI;
      loop.push(new Vector3(Math.sin(a) * 0.01, 0.058 + Math.sin(a) * 0.018, side * (0.012 + Math.sin(a) * 0.042)));
    }
    group.add(mesh(new TubeGeometry(new CatmullRomCurve3(loop), 12, 0.0048, 5, false), fiber, false, false));
    const tail = [
      new Vector3(0, 0.052, 0),
      new Vector3(side * 0.045, 0.03, side * 0.008),
      new Vector3(side * 0.095, 0.008, side * 0.016),
    ];
    group.add(mesh(new TubeGeometry(new CatmullRomCurve3(tail), 8, 0.0042, 4, false), fiber, false, false));
  }
  return group;
}

export function createSpiceFactory(tex: SceneTextures): SpiceFactory {
  // geometry and materials are created once and shared by every instance
  const orangeGeometry = new CylinderGeometry(0.26, 0.26, 0.03, 40);
  const orangeMaterials = [
    new MeshStandardMaterial({ color: '#b5651d', roughness: 0.7 }),
    new MeshStandardMaterial({ map: tex.orange, roughness: 0.55 }),
    new MeshStandardMaterial({ map: tex.orange, roughness: 0.55 }),
  ];

  const cinnamonGeometries = [rolledQuill(0.4), rolledQuill(1.7)];
  let cinnamonIndex = 0;
  const cinnamonMaterial = new MeshStandardMaterial({ map: tex.cinnamon, roughness: 0.55, vertexColors: true });

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
        return mesh(cinnamonGeometries[cinnamonIndex++ % cinnamonGeometries.length], cinnamonMaterial);
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
export function buildBag(kind: 'orange' | 'cinnamon', make: SpiceFactory): { group: Group; items: (Object3D | null)[]; twine: Object3D | null } {
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
  let twine: Object3D | null = null;
  if (kind === 'cinnamon') {
    twine = buildCinnamonTie('y', false);
    twine.position.y = -0.02;
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
/* Glass — empty cut-crystal mug                                       */
/* ------------------------------------------------------------------ */

/**
 * Footed mug: round foot, short stem, smooth bowl, rolled rim, handle on local +X.
 * Height stays DIM.glass.h so the sieve, steam, and camera frames still fit.
 * The interior is GLASS_INNER; wine is clipped by the shared fill plane and the
 * surface disc is sized with glassInnerRadius.
 */
const TAU = Math.PI * 2;
const MUG_RADIAL = 96;

/** [radius, height], foot at y = 0, rim at DIM.glass.h. */
const MUG_OUTER: [number, number][] = [
  [0.0, 0.0], [0.26, 0.0], [0.41, 0.012], [0.5, 0.034], [0.522, 0.062], [0.512, 0.086],
  [0.45, 0.108], [0.36, 0.134], [0.27, 0.162], [0.205, 0.192], [0.176, 0.228], [0.188, 0.27],
  [0.25, 0.33], [0.35, 0.4], [0.44, 0.48], [0.5, 0.58], [0.53, 0.72], [0.546, 0.9],
  [0.552, 1.1], [0.556, 1.36], [0.56, 1.64], [0.564, 1.88], [0.57, 2.01], [0.558, 2.055], [0.536, 2.1],
];
/** Lip first, interior floor last. */
const MUG_INNER: [number, number][] = [
  [0.468, 2.1], [0.492, 2.06], [0.508, 2.0], [0.506, 1.76], [0.5, 1.48], [0.494, 1.2],
  [0.484, 0.96], [0.466, 0.74], [0.43, 0.56], [0.36, 0.45], [0.25, 0.395], [0.11, 0.362], [0.0, 0.348],
];

/** Inner bowl radius by height. The wine surface disc is this, minus a hair. */
const GLASS_INNER: [number, number][] = MUG_INNER.map(([r, y]): [number, number] => [y, r]).reverse();
const GLASS_WINE_PROFILE: [number, number][] = GLASS_INNER.filter(([y]) => y <= 1.62).map(([y, r]): [number, number] => [Math.max(0, r - 0.008), y]);

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function sampleR(points: readonly [number, number][], y: number): number {
  if (y <= points[0][1]) return points[0][0];
  for (let i = 1; i < points.length; i++) {
    if (y <= points[i][1]) {
      const [r0, y0] = points[i - 1];
      const [r1, y1] = points[i];
      return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
    }
  }
  return points[points.length - 1][0];
}

/** Upper flutes and the foot pattern. The bowl between them stays a smooth surface. */
function mugRelief(y: number, theta: number): { dr: number; dy: number } {
  let dr = 0;
  let dy = 0;
  const flute = smoothstep(1.02, 1.16, y) * (1 - smoothstep(1.9, 2.02, y));
  if (flute > 0) {
    const x = ((theta / TAU) * 18) % 1;
    const column = Math.pow(1 - Math.abs(x - 0.5) * 2, 0.48);
    dr += flute * 0.03 * column;
  }
  if (y > 0.09 && y < 0.205) {
    const t = (y - 0.09) / (0.205 - 0.09);
    const local = Math.abs((((theta / TAU) * 16) % 1) - 0.5) * 2;
    const env = Math.sin(Math.PI * t);
    const half = 0.74 * env;
    if (local < half && half > 0.03) {
      const ridge = Math.pow(1 - local / half, 1.05) * env;
      dr += ridge * 0.01;
      dy += ridge * 0.022;
    }
  }
  return { dr, dy };
}

function resampleProfile(points: [number, number][], step: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [r0, y0] = points[i];
    const [r1, y1] = points[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(r1 - r0, y1 - y0) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push([r0 + (r1 - r0) * t, y0 + (y1 - y0) * t]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function buildMugShell(): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const add = (x: number, y: number, z: number): number => {
    const index = positions.length / 3;
    positions.push(x, y, z);
    return index;
  };
  const tri = (a: number, b: number, c: number): void => {
    indices.push(a, b, c);
  };
  /** `outward` faces the triangle a → b → next(a) out of a surface of revolution. */
  const stitch = (a: number[], b: number[], outward: boolean): void => {
    const n = a.length;
    for (let j = 0; j < n; j++) {
      const j1 = (j + 1) % n;
      if (outward) {
        tri(a[j], b[j], a[j1]);
        tri(a[j1], b[j], b[j1]);
      } else {
        tri(a[j], a[j1], b[j]);
        tri(a[j1], b[j1], b[j]);
      }
    }
  };

  interface Ring {
    y: number;
    idx: number[];
  }
  const ring = (y: number, radiusAt: (theta: number) => number, yAt: (theta: number, r: number) => number): Ring => {
    const idx: number[] = [];
    for (let j = 0; j < MUG_RADIAL; j++) {
      const theta = (j / MUG_RADIAL) * TAU;
      const r = radiusAt(theta);
      idx.push(add(Math.cos(theta) * r, yAt(theta, r), Math.sin(theta) * r));
    }
    return { y, idx };
  };

  const outerPath = resampleProfile(MUG_OUTER, 0.034);
  const outer: Ring[] = [];
  let center: number | null = null;
  for (const [r, y] of outerPath) {
    if (r < 1e-4) {
      center = add(0, y, 0);
      continue;
    }
    const prev = outer[outer.length - 1];
    if (prev && Math.abs(prev.y - y) < 1e-5) continue;
    outer.push(ring(y, (theta) => r + mugRelief(y, theta).dr, (theta) => y + mugRelief(y, theta).dy));
  }
  if (center !== null) {
    for (let j = 0; j < MUG_RADIAL; j++) tri(outer[0].idx[j], outer[0].idx[(j + 1) % MUG_RADIAL], center);
  }
  for (let i = 0; i < outer.length - 1; i++) stitch(outer[i].idx, outer[i + 1].idx, true);

  const innerPath = resampleProfile(MUG_INNER, 0.034);
  const inner: Ring[] = [];
  let floor: number | null = null;
  for (const [r, y] of innerPath) {
    if (r < 1e-4) {
      floor = add(0, y, 0);
      continue;
    }
    const prev = inner[inner.length - 1];
    if (prev && Math.abs(prev.y - y) < 1e-5) continue;
    inner.push(ring(y, () => r, () => y));
  }
  // inward-facing wall, then the lip annulus, then the floor seen from above
  for (let i = 0; i < inner.length - 1; i++) stitch(inner[i + 1].idx, inner[i].idx, false);
  stitch(inner[0].idx, outer[outer.length - 1].idx, false);
  if (floor !== null) {
    const lip = inner[inner.length - 1].idx;
    for (let j = 0; j < MUG_RADIAL; j++) tri(lip[j], floor, lip[(j + 1) % MUG_RADIAL]);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildMugHandle(): BufferGeometry {
  const yTop = 1.78;
  const yBot = 1.14;
  const rTop = sampleR(MUG_OUTER, yTop);
  const rBot = sampleR(MUG_OUTER, yBot);
  const midY = (yTop + yBot) / 2;
  const cx = rTop + 0.02;
  const radius = 0.33;
  // A round loop on +X. Positive angles are the upper half; both ends are buried in the wall.
  const sweep = [1.15, 0.75, 0.35, 0, -0.35, -0.75, -1.15].map(
    (angle) => new Vector3(cx + Math.cos(angle) * radius, midY + Math.sin(angle) * radius, 0),
  );
  const curve = new CatmullRomCurve3([new Vector3(rTop - 0.035, yTop, 0), ...sweep, new Vector3(rBot - 0.035, yBot, 0)]);
  return new TubeGeometry(curve, 80, 0.06, 18, false);
}

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
    lathe(GLASS_WINE_PROFILE, 48),
    new MeshStandardMaterial({ color: '#5a0c1a', roughness: 0.22, emissive: '#2c040a', emissiveIntensity: 0.7, clippingPlanes: [clip] }),
    true,
    false,
  );
  group.add(wine);
  // Clear crystal on a transparent canvas: darkened rims plus environment highlights.
  // Transmission would sample the empty framebuffer and turn the empty mug black.
  const edgeMat = createGlassEdgeMaterial('#2a2624', 0.78, 0.016, 3.2);
  const reflectionMat = createGlassReflectionMaterial(2.15, 0.05, 0.9);
  const addCrystal = (geometry: BufferGeometry): void => {
    const edge = mesh(geometry, edgeMat, true, false);
    edge.renderOrder = 6;
    const reflection = mesh(geometry, reflectionMat, false, false);
    reflection.renderOrder = 7;
    group.add(edge, reflection);
  };
  addCrystal(buildMugShell());
  addCrystal(buildMugHandle());
  return { group, wine };
}
