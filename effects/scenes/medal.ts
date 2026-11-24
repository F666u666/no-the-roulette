import {
  AmbientLight, CylinderGeometry, DirectionalLight, Group, Mesh, MeshStandardMaterial,
  PerspectiveCamera, Scene, TorusGeometry, WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { SceneOptions } from './types';

const models = import.meta.glob<string>('./medal.glb', { eager: true, query: '?url', import: 'default' });

export async function play(surface: HTMLElement, { immediate, signal }: SceneOptions) {
  const modelUrl = models['./medal.glb'];
  const exported = modelUrl ? (await new GLTFLoader().loadAsync(modelUrl)).scene : null;
  if (signal.aborted) {
    if (exported) disposeMeshes(exported);
    return;
  }

  const renderer = new WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(560, 420);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  const camera = new PerspectiveCamera(37, 560 / 420, 0.1, 50);
  camera.position.set(0, 0, 6);
  const scene = new Scene();
  const medal = new Group();
  const face = new CylinderGeometry(1.21, 1.21, 0.23, 64);
  const rim = new TorusGeometry(1.04, 0.045, 12, 64);
  const steel = new MeshStandardMaterial({ color: 0x264f72, roughness: 0.34, metalness: 0.35 });
  const silver = new MeshStandardMaterial({ color: 0xc0d6e5, roughness: 0.24, metalness: 0.25 });
  const disk = new Mesh(face, steel);
  disk.rotation.x = Math.PI / 2;
  medal.add(disk);
  for (const side of [-1, 1]) {
    const edge = new Mesh(rim, silver);
    edge.position.z = side * 0.12;
    medal.add(edge);
  }
  if (exported) {
    medal.clear();
    medal.add(exported);
  }
  scene.add(medal, new AmbientLight(0xcde5ff, 1.8));
  const key = new DirectionalLight(0xffffff, 2.6);
  key.position.set(3, 4, 5);
  scene.add(key);
  surface.append(renderer.domElement);
  medal.rotation.set(0.15, -0.4, 0);
  renderer.render(scene, camera);
  if (!immediate) {
    const start = performance.now();
    renderer.setAnimationLoop((time) => {
      const progress = Math.min((time - start) / 1800, 1);
      medal.rotation.y = (1 - (1 - progress) ** 3) * Math.PI * 2 - 0.4;
      renderer.render(scene, camera);
      if (progress === 1) renderer.setAnimationLoop(null);
    });
  }
  return () => {
    renderer.setAnimationLoop(null);
    face.dispose();
    rim.dispose();
    steel.dispose();
    silver.dispose();
    if (exported) disposeMeshes(exported);
    renderer.dispose();
    renderer.forceContextLoss();
  };
}


function disposeMeshes(model: Group) {
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    for (const material of [object.material].flat()) material.dispose();
  });
}
