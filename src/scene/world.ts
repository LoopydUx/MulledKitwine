import {
  CircleGeometry,
  Color,
  DirectionalLight,
  type Fog,
  Group,
  HemisphereLight,
  type Material,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  type Object3D,
  type PerspectiveCamera,
  Plane,
  PlaneGeometry,
  type ShaderMaterial,
  ShadowMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { clamp01, DIM, lerp, SPICES, type CameraState, type StoryState } from './choreography';
import { LiquidStream, Steam } from './effects';
import { createLiquidMaterial } from './materials';
import {
  BOTTLE_WINE_PROFILE,
  MINI_LIQUID_PROFILE,
  buildBag,
  buildBooklet,
  buildBottle,
  buildBox,
  buildCorkscrew,
  buildGlass,
  buildHob,
  buildMiniBottle,
  buildPan,
  buildSieve,
  buildSpoon,
  createSpiceFactory,
  glassInnerRadius,
  type Hob,
} from './parts';
import type { SceneTextures } from './textures';

const HALF = Math.PI / 2;
const UP = new Vector3(0, 1, 0);

/** Stage backdrop colours. Keep in sync with --stage-* in src/styles/tokens.css. */
export const STAGE_COLORS = {
  ivory: [245, 236, 221],
  warm: [232, 213, 184],
  burgundy: [72, 21, 29],
} as const;

/** Where the subject should sit inside the viewport (fractions of width / height). */
export interface StageRegion {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface StageView {
  width: number;
  height: number;
  portrait: boolean;
  region: StageRegion;
}

export const CAMERA_FOV = 30;
const TAN_HALF_FOV = Math.tan((CAMERA_FOV * Math.PI) / 360);

export class StoryWorld {
  readonly root = new Group();
  private readonly box: Group;
  private readonly lid: Group;
  private readonly booklet: Group;
  private readonly bottle: Group;
  private readonly bottleWine: Mesh;
  private readonly bottleCork: Mesh;
  private readonly corkscrew: Group;
  private readonly worm: Group;
  private readonly screwCork: Mesh;
  private readonly orangeBag: ReturnType<typeof buildBag>;
  private readonly cinnamonBag: ReturnType<typeof buildBag>;
  private readonly spices: Object3D[];
  private readonly mini: Group;
  private readonly miniLiquid: Mesh;
  private readonly cap: Mesh;
  private readonly hob: Hob;
  private readonly pan: Group;
  private readonly panSurface: Mesh;
  private readonly panLiquid: ShaderMaterial;
  private readonly spoon: Group;
  private readonly sieve: Group;
  private readonly glass: Group;
  private readonly glassWine: Mesh;
  private readonly glassSurface: Mesh;
  private readonly glassLiquid: ShaderMaterial;
  private readonly streams: { wine: LiquidStream; amber: LiquidStream; strain: LiquidStream; filter: LiquidStream };
  private readonly panSteam: Steam;
  private readonly glassSteam: Steam;
  private readonly key: DirectionalLight;
  private readonly bottlePlane = new Plane(new Vector3(0, -1, 0), 100);
  private readonly miniPlane = new Plane(new Vector3(0, -1, 0), 100);
  private readonly glassPlane = new Plane(new Vector3(0, -1, 0), 100);
  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();
  private readonly inverse = new Matrix4();
  private readonly fogColor = new Color();

  constructor(tex: SceneTextures, shadowSize: number) {
    const add = <T extends Object3D>(o: T): T => {
      this.root.add(o);
      return o;
    };

    /* gift box and contents */
    const box = buildBox(tex);
    this.box = add(box.group);
    this.lid = box.lid;
    this.booklet = add(buildBooklet(tex));
    const bottle = buildBottle(tex, this.bottlePlane);
    this.bottle = add(bottle.group);
    this.bottleWine = bottle.group.children[0] as Mesh;
    this.bottleCork = bottle.cork;
    const corkscrew = buildCorkscrew();
    this.corkscrew = add(corkscrew.group);
    this.worm = corkscrew.worm;
    this.screwCork = corkscrew.cork;
    const make = createSpiceFactory(tex);
    this.orangeBag = buildBag('orange', make);
    this.cinnamonBag = buildBag('cinnamon', make);
    add(this.orangeBag.group);
    add(this.cinnamonBag.group);
    this.spices = SPICES.map((def) => {
      const o = add(make(def.kind));
      o.visible = false;
      return o;
    });
    const mini = buildMiniBottle(this.miniPlane);
    this.mini = add(mini.group);
    this.miniLiquid = mini.group.children[0] as Mesh;
    this.cap = add(mini.cap);

    /* cooking props */
    this.hob = buildHob(tex);
    add(this.hob.group);
    this.pan = add(buildPan());
    this.panLiquid = createLiquidMaterial({ deep: '#4d0a16', sheen: '#ffd9c8', clip: true });
    this.panLiquid.uniforms.uRadius.value = DIM.pan.ri - 0.004;
    this.panSurface = add(new Mesh(new PlaneGeometry(2.8, 2.8).rotateX(-HALF), this.panLiquid));
    this.panSurface.receiveShadow = false;
    this.spoon = add(buildSpoon());
    this.sieve = add(buildSieve(tex));
    const glass = buildGlass(this.glassPlane);
    this.glass = add(glass.group);
    this.glassWine = glass.wine;
    this.glassLiquid = createLiquidMaterial({ deep: '#5a0c1a', sheen: '#ffd9c8', clip: false });
    this.glassSurface = new Mesh(new CircleGeometry(1, 40).rotateX(-HALF), this.glassLiquid);
    this.glass.add(this.glassSurface);

    /* liquids in motion */
    const wineMat = new MeshPhysicalMaterial({ color: '#600d1b', roughness: 0.14, emissive: '#2a0409', emissiveIntensity: 0.5, envMapIntensity: 1.3 });
    const amberMat = new MeshPhysicalMaterial({ color: '#d98a2b', roughness: 0.12, emissive: '#7a3c06', emissiveIntensity: 0.5, envMapIntensity: 1.3 });
    this.streams = {
      wine: new LiquidStream(wineMat),
      amber: new LiquidStream(amberMat),
      strain: new LiquidStream(wineMat),
      filter: new LiquidStream(wineMat),
    };
    Object.values(this.streams).forEach((s) => add(s.mesh));
    this.panSteam = new Steam(tex.steam, 7, 11);
    this.glassSteam = new Steam(tex.steam, 4, 53);
    add(this.panSteam.group);
    add(this.glassSteam.group);

    /* studio light and a shadow-only ground so the page backdrop shows through */
    this.key = new DirectionalLight('#fff0dc', 2.5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(shadowSize, shadowSize);
    this.key.shadow.camera.left = -7.5;
    this.key.shadow.camera.right = 7.5;
    this.key.shadow.camera.top = 7.5;
    this.key.shadow.camera.bottom = -7.5;
    this.key.shadow.camera.near = 1;
    this.key.shadow.camera.far = 34;
    this.key.shadow.bias = -0.0005;
    this.key.shadow.normalBias = 0.03;
    this.key.shadow.radius = 6;
    add(this.key);
    add(this.key.target);
    const rim = new DirectionalLight('#ffe2c4', 0.9);
    rim.position.set(7, 5, -6);
    add(rim);
    add(new HemisphereLight('#fff6ea', '#5a3a30', 0.55));
    const shadow = new ShadowMaterial({ opacity: 0.3, color: '#1c0808' });
    // shadows of objects lost in the haze must fade out with them (the canvas is transparent)
    shadow.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <fog_fragment>',
        '#ifdef USE_FOG\n  gl_FragColor.a *= 1.0 - smoothstep( fogNear, fogFar, vFogDepth );\n#endif',
      );
    };
    const ground = new Mesh(new PlaneGeometry(90, 90).rotateX(-HALF), shadow);
    ground.receiveShadow = true;
    add(ground);
  }

  /** Clipping height for a partly filled, arbitrarily tilted bottle. */
  private liquidLevel(object: Object3D, profile: [number, number][], fill: number): number {
    object.updateMatrixWorld();
    const axis = this.tmp.set(0, 1, 0).transformDirection(object.matrixWorld);
    const spread = Math.sqrt(Math.max(0, 1 - axis.y * axis.y));
    let min = Infinity;
    let max = -Infinity;
    for (const [r, y] of profile) {
      const cy = this.tmp2.set(0, y, 0).applyMatrix4(object.matrixWorld).y;
      min = Math.min(min, cy - r * spread);
      max = Math.max(max, cy + r * spread);
    }
    return min + (max - min) * fill;
  }

  update(s: StoryState, time: number): void {
    const place = (o: Object3D, pose: { pos: [number, number, number]; rot: [number, number, number] }): void => {
      o.position.set(pose.pos[0], pose.pos[1], pose.pos[2]);
      o.rotation.set(pose.rot[0], pose.rot[1], pose.rot[2]);
    };

    /* gift box */
    this.box.visible = s.boxVisible;
    place(this.box, s.box);
    this.lid.rotation.y = -s.lid;
    this.booklet.visible = s.boxVisible;
    place(this.booklet, s.booklet);

    /* wine bottle */
    const props = s.propsVisible;
    this.bottle.visible = props && s.bottleVisible;
    this.corkscrew.visible = props;
    this.mini.visible = props;
    this.cap.visible = props;
    place(this.bottle, s.bottle);
    this.bottleCork.visible = s.corkInBottle;
    this.bottleWine.visible = s.bottleFill > 0.004;
    this.bottlePlane.constant = this.liquidLevel(this.bottle, BOTTLE_WINE_PROFILE, s.bottleFill);

    /* corkscrew */
    place(this.corkscrew, s.corkscrew);
    this.worm.rotation.z = (1 - s.worm) * HALF;
    this.screwCork.visible = s.corkOnScrew;

    /* packets */
    for (const [bag, pose, size] of [
      [this.orangeBag, s.orangeBag, DIM.orangeBag],
      [this.cinnamonBag, s.cinnamonBag, DIM.cinnamonBag],
    ] as const) {
      bag.group.visible = s.bagsVisible && props;
      place(bag.group, pose);
      bag.items.forEach((item, i) => {
        if (!item) return;
        const st = s.bagItems[i];
        item.visible = st.visible;
        const home = SPICES[i].bagPos;
        item.position.set(lerp(home[0], 0, st.slide), lerp(home[1], size.h / 2 - 0.03, st.slide), lerp(home[2], 0, st.slide));
      });
    }
    if (this.cinnamonBag.twine) this.cinnamonBag.twine.visible = s.bagItems[3].visible && s.bagItems[3].slide < 0.05;

    /* loose spices */
    this.spices.forEach((o, i) => {
      const st = s.spices[i];
      o.visible = st.visible && props;
      if (o.visible) place(o, st);
    });

    /* mini bottle */
    place(this.mini, s.mini);
    place(this.cap, s.cap);
    this.miniLiquid.visible = s.miniFill > 0.004;
    this.miniPlane.constant = this.liquidLevel(this.mini, MINI_LIQUID_PROFILE, s.miniFill);

    /* hob and pan */
    const st = s.stationVisible && props;
    this.hob.group.visible = st;
    this.hob.group.position.set(2.6 + s.station[0], 0, 2.2 + s.station[2]);
    (this.hob.glow.material as Material).opacity = s.heat * 0.95;
    this.hob.glow.visible = s.heat > 0.004;
    (this.hob.indicator.material as unknown as { color: Color }).color.setRGB(lerp(0.16, 1, clamp01(s.heat * 3)), lerp(0.1, 0.36, clamp01(s.heat * 3)), lerp(0.09, 0.1, clamp01(s.heat * 3)));
    this.hob.knob.rotation.y = -s.heat * 1.25;
    this.hob.light.intensity = s.heat * 0.12;
    this.pan.visible = st;
    place(this.pan, s.pan);
    this.pan.updateMatrixWorld();
    this.panSurface.visible = st && s.panHasWine;
    const tilt = s.pan.rot[2];
    const axisHeight = (s.panSurfaceY - s.pan.pos[1]) / Math.cos(tilt);
    this.panSurface.position.set(s.pan.pos[0] - axisHeight * Math.sin(tilt), s.panSurfaceY, s.pan.pos[2]);
    this.inverse.copy(this.pan.matrixWorld).invert();
    const pu = this.panLiquid.uniforms;
    (pu.uPanInv.value as Matrix4).copy(this.inverse);
    pu.uTime.value = time;
    pu.uSimmer.value = s.simmer;
    pu.uRipple.value = s.ripple;
    pu.uAmber.value = s.amber;

    /* spoon: positioned at the bowl tip, aimed along tip -> top */
    this.spoon.visible = st;
    this.spoon.position.set(s.spoon.tip[0], s.spoon.tip[1], s.spoon.tip[2]);
    this.tmp.set(s.spoon.top[0] - s.spoon.tip[0], s.spoon.top[1] - s.spoon.tip[1], s.spoon.top[2] - s.spoon.tip[2]).normalize();
    this.spoon.quaternion.setFromUnitVectors(UP, this.tmp);

    /* sieve and glass */
    this.sieve.visible = st;
    place(this.sieve, s.sieve);
    this.glass.visible = s.glassVisible;
    place(this.glass, s.glass);
    const level = lerp(DIM.glass.bowlBottom, DIM.glass.fillTop, s.glassFill);
    const hasWine = s.glassFill > 0.01;
    this.glassWine.visible = hasWine;
    this.glassSurface.visible = hasWine;
    this.glassPlane.constant = s.glass.pos[1] + level;
    this.glassSurface.position.y = level;
    this.glassSurface.scale.setScalar(Math.max(glassInnerRadius(level) - 0.008, 0.01));
    this.glassLiquid.uniforms.uTime.value = time;
    this.glassLiquid.uniforms.uRipple.value = s.streams.filter.on ? 0.5 : 0;
    (this.glassLiquid.uniforms.uRippleAt.value as { set: (x: number, y: number) => void }).set(s.glass.pos[0], s.glass.pos[2]);

    /* streams, ripples, steam */
    const wineLanding = this.streams.wine.update(s.streams.wine, time);
    const amberLanding = this.streams.amber.update(s.streams.amber, time);
    this.streams.strain.update(s.streams.strain, time);
    this.streams.filter.update(s.streams.filter, time);
    const landing = wineLanding ?? amberLanding;
    if (landing) (pu.uRippleAt.value as { set: (x: number, y: number) => void }).set(landing.x, landing.z);
    this.panSteam.update(time, st ? s.panSteam : 0, s.pan.pos[0], s.panSurfaceY, s.pan.pos[2], 0.5, 1.75, 1);
    this.glassSteam.update(time, s.glassVisible ? s.glassSteam : 0, s.glass.pos[0], s.glass.pos[1] + level, s.glass.pos[2], 0.14, 1.25, 0.62);
  }

  /**
   * Frames the camera so `frame` (world units around the target) fits inside the
   * free region of the viewport, then shifts the projection so the subject sits
   * in that region without changing perspective. Fog fades anything behind the
   * focus into the page backdrop colour.
   */
  frame(camera: PerspectiveCamera, cam: CameraState, bg: StoryState['bg'], view: StageView, fog: Fog): void {
    const target = view.portrait ? cam.mTarget : cam.target;
    const frame = view.portrait ? cam.mFrame : cam.frame;
    const aspect = view.width / view.height;
    const distance = Math.max(frame[1] / (2 * view.region.h * TAN_HALF_FOV), frame[0] / (2 * view.region.w * aspect * TAN_HALF_FOV));
    const az = (cam.az * Math.PI) / 180;
    const el = (cam.el * Math.PI) / 180;
    camera.position.set(
      target[0] + distance * Math.sin(az) * Math.cos(el),
      target[1] + distance * Math.sin(el),
      target[2] + distance * Math.cos(az) * Math.cos(el),
    );
    camera.lookAt(target[0], target[1], target[2]);
    camera.aspect = aspect;
    camera.setViewOffset(view.width, view.height, (0.5 - view.region.cx) * view.width, (0.5 - view.region.cy) * view.height, view.width, view.height);
    camera.updateProjectionMatrix();

    fog.near = distance + cam.fog[0];
    fog.far = distance + cam.fog[1];
    const mix = (i: 0 | 1 | 2): number => lerp(lerp(STAGE_COLORS.ivory[i], STAGE_COLORS.warm[i], bg.warm), STAGE_COLORS.burgundy[i], bg.burgundy) / 255;
    fog.color.copy(this.fogColor.setRGB(mix(0), mix(1), mix(2), SRGBColorSpace));

    this.key.target.position.set(target[0], 0, target[2]);
    this.key.position.set(target[0] - 5, 9.5, target[2] + 6.5);
  }

  dispose(): void {
    const geometries = new Set<{ dispose: () => void }>();
    const materials = new Set<Material>();
    this.root.traverse((o) => {
      const m = o as Mesh;
      if (m.geometry) geometries.add(m.geometry);
      const mat = (o as Mesh).material as Material | Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => materials.add(x));
      else if (mat) materials.add(mat);
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.key.shadow.map?.dispose();
    this.root.removeFromParent();
  }
}
