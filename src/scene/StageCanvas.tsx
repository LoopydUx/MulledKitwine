import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Fog, type PerspectiveCamera, Vector3 } from 'three';
import { AMBIENT_STILL_TIME, FREEZE_AMBIENT } from '../config/debug';
import { storyStore } from '../state/storyStore';
import { closingState, computeState, kitState, KIT_MARKERS, type StoryState } from './choreography';
import { STILL_VIEW, stageView } from './layout';
import { createStudioEnvironment } from './studioEnv';
import { disposeSceneTextures, loadSceneTextures, type SceneTextures } from './textures';
import { CAMERA_FOV, StoryWorld } from './world';

export interface StageCanvasProps {
  /** render only while the stage is on screen */
  active: boolean;
  lowPower: boolean;
  onReady: () => void;
  /** WebGL failed to start, or the context was lost */
  onUnavailable: () => void;
  /** dev tool: render still artwork instead of the live story */
  capture?: boolean;
}

/** Still frames rendered for static fallbacks. Progress values pick a readable moment of each chapter. */
const SHOTS: { name: string; state: () => StoryState }[] = [
  { name: 'hero', state: () => computeState(0, 0) },
  { name: 'chapter-1', state: () => computeState(1, 0.0775) },
  { name: 'chapter-2', state: () => computeState(1, 0.262) },
  { name: 'chapter-3', state: () => computeState(1, 0.4365) },
  { name: 'chapter-4', state: () => computeState(1, 0.607) },
  { name: 'chapter-5', state: () => computeState(1, 0.7475) },
  { name: 'chapter-6', state: () => computeState(1, 0.9285) },
  { name: 'finale', state: () => computeState(1, 1) },
  { name: 'kit', state: kitState },
  { name: 'closing', state: closingState },
];

function Scene({ onReady, onUnavailable, capture, lowPower }: Omit<StageCanvasProps, 'active'>) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const world = useRef<StoryWorld | null>(null);
  const frames = useRef(0);
  const [built, setBuilt] = useState(false);
  const callbacks = useRef({ onReady, onUnavailable });
  callbacks.current = { onReady, onUnavailable };

  useEffect(() => {
    let cancelled = false;
    let textures: SceneTextures | null = null;
    gl.localClippingEnabled = true;
    const fog = new Fog('#48151d', 20, 60);
    scene.fog = fog;
    const environment = createStudioEnvironment(gl);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.9;

    loadSceneTextures(Math.min(8, gl.capabilities.getMaxAnisotropy()))
      .then((loaded) => {
        if (cancelled) {
          disposeSceneTextures(loaded);
          return;
        }
        textures = loaded;
        const w = new StoryWorld(loaded, lowPower ? 1024 : 2048);
        scene.add(w.root);
        world.current = w;
        frames.current = 0;
        setBuilt(true);
      })
      .catch((err: unknown) => {
        console.error('[stage] could not build the scene', err);
        if (!cancelled) callbacks.current.onUnavailable();
      });

    const canvas = gl.domElement;
    const lost = (e: Event): void => {
      e.preventDefault();
      callbacks.current.onUnavailable();
    };
    const restored = (): void => {
      frames.current = 0;
    };
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);

    return () => {
      cancelled = true;
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      world.current?.dispose();
      world.current = null;
      if (textures) disposeSceneTextures(textures);
      environment.dispose();
      scene.environment = null;
      scene.fog = null;
      setBuilt(false);
    };
  }, [gl, scene, lowPower]);

  useFrame(({ clock }) => {
    const w = world.current;
    if (!w || capture) return;
    const s = computeState(storyStore.intro, storyStore.p);
    w.update(s, FREEZE_AMBIENT ? AMBIENT_STILL_TIME : clock.elapsedTime);
    w.frame(camera, s.camera, s.bg, stageView(size.width, size.height, storyStore.intro, storyStore.p, storyStore.rtl), scene.fog as Fog);
    // report readiness once real frames have reached the screen
    if (frames.current < 3 && ++frames.current === 3) callbacks.current.onReady();
  });

  useEffect(() => {
    if (!capture || !built) return;
    let cancelled = false;
    const w = world.current;
    if (!w) return;
    const post = (query: string, body: Blob | string): Promise<Response> => fetch(`/__capture?${query}`, { method: 'POST', body });
    void (async () => {
      const only = new URLSearchParams(window.location.search).get('shot');
      const shots = only ? SHOTS.filter((shot) => shot.name === only) : SHOTS;
      const log: string[] = [];
      for (const shot of shots) {
        if (cancelled) return;
        const s = shot.state();
        w.update(s, AMBIENT_STILL_TIME);
        w.frame(camera, s.camera, s.bg, STILL_VIEW, scene.fog as Fog);
        gl.render(scene, camera);
        gl.render(scene, camera);
        const blob = await new Promise<Blob | null>((resolve) => gl.domElement.toBlob(resolve, 'image/webp', 0.9));
        if (!blob) continue;
        await post(`name=${shot.name}.webp`, blob);
        log.push(`${shot.name} ${Math.round(blob.size / 1024)} KB`);
        if (shot.name === 'kit') {
          camera.updateMatrixWorld();
          const v = new Vector3();
          const markers = KIT_MARKERS.map((m) => {
            v.set(m.at[0], m.at[1], m.at[2]).project(camera);
            return { id: m.id, x: +((v.x + 1) / 2).toFixed(4), y: +((1 - v.y) / 2).toFixed(4) };
          });
          await post('name=kit-markers.json&kind=data', JSON.stringify(markers, null, 2) + '\n');
        }
      }
      document.title = 'capture done';
      const out = document.getElementById('capture-log');
      if (out) out.textContent = `capture done: ${log.join(', ')}`;
    })();
    return () => {
      cancelled = true;
    };
  }, [capture, built, gl, scene, camera]);

  return null;
}

class StageBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(error: unknown): void {
    console.error('[stage] WebGL stage failed', error);
    this.props.onError();
  }
  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

export default function StageCanvas({ active, lowPower, onReady, onUnavailable, capture = false }: StageCanvasProps) {
  return (
    <StageBoundary onError={onUnavailable}>
      <Canvas
        className="stage__canvas"
        aria-hidden="true"
        shadows="soft"
        dpr={capture ? 1.25 : [1, lowPower ? 1.5 : 1.75]}
        frameloop={capture ? 'never' : active ? 'always' : 'never'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: capture }}
        camera={{ fov: CAMERA_FOV, near: 0.5, far: 120, position: [4, 3, 14] }}
      >
        <Scene onReady={onReady} onUnavailable={onUnavailable} capture={capture} lowPower={lowPower} />
      </Canvas>
    </StageBoundary>
  );
}
