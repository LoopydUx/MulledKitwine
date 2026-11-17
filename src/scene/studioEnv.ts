import { BackSide, BoxGeometry, Color, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Scene, type WebGLRenderer, type WebGLRenderTarget } from 'three';

/**
 * A small procedural photo studio (softbox, strips, warm fill) rendered once into
 * an environment map. It gives glass and metal something believable to reflect
 * without downloading an HDRI.
 */
export function createStudioEnvironment(gl: WebGLRenderer): WebGLRenderTarget {
  const scene = new Scene();
  const room = new Mesh(new BoxGeometry(44, 30, 44), new MeshBasicMaterial({ color: new Color('#4a3a33'), side: BackSide }));
  room.position.y = 8;
  scene.add(room);
  const panel = (color: string, intensity: number, w: number, h: number, x: number, y: number, z: number): void => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity), side: DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 1, 0);
    scene.add(m);
  };
  panel('#fff3e2', 10, 15, 10, 0, 14, 5); // overhead softbox
  panel('#ffe8d0', 6, 5, 13, -15, 5, 7); // key strip, camera left
  panel('#ffffff', 3.2, 4, 11, 16, 5, 3); // cooler strip, camera right
  panel('#ffd6ac', 2.4, 18, 6, 0, 3, 18); // warm fill behind the camera
  panel('#ffc79c', 2, 12, 4, 2, 7, -18); // rim from behind
  const pmrem = new PMREMGenerator(gl);
  const target = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material) (m.material as MeshBasicMaterial).dispose();
  });
  return target;
}
