import { CircleGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from 'three';
import type { SpecimenId } from './model';
import { createThreeStage } from '../threeStage';
import type { ThreeStage } from '../threeStage';
import { buildSpecimenGeometry } from './specimenGeometry';
import {rockMaterial} from './rockMaterial';

export interface RockCamera { x: number; y: number; z: number }
export interface SpecimenViewer {
  select: (specimen: SpecimenId) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  dispose: () => void;
}

export function mountSpecimenViewer(host: HTMLElement, options: {
  specimen: SpecimenId;
  label: string;
  camera?: RockCamera;
  onCamera: (camera: RockCamera) => void;
  onUnavailable: () => void;
}): SpecimenViewer {
  let stage: ThreeStage;
  try {
    stage = createThreeStage(host, { label: options.label, cameraPosition: options.camera ? [options.camera.x, options.camera.y, options.camera.z] : [2.8, 1.9, 3.5], minDistance: 2, maxDistance: 7, background: '#e8e5da', onUnavailable: options.onUnavailable });
  } catch (error) { options.onUnavailable(); throw error; }
  stage.renderer.toneMappingExposure = .9;
  let disposed = false;
  const detailed = !matchMedia('(pointer: coarse)').matches && innerWidth >= 700;
  const material = rockMaterial(options.specimen);
  const specimen = new Mesh(buildSpecimenGeometry(options.specimen, detailed), material);
  specimen.rotation.set(.13, -.35, .02); stage.group.add(specimen);
  // A subdued contact ellipse anchors the specimen without a floating display effect.
  const shadow = new Mesh(new CircleGeometry(1, 64), new MeshBasicMaterial({ color: '#69644f', transparent: true, opacity: .08, depthWrite: false }));
  shadow.scale.set(1.2, .82, 1); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.74; stage.scene.add(shadow);
  const cameraSaved = () => options.onCamera({ x: stage.camera.position.x, y: stage.camera.position.y, z: stage.camera.position.z });
  stage.controls.addEventListener('end', cameraSaved);
  const keySaved = () => cameraSaved();
  stage.canvas.addEventListener('keyup', keySaved);
  stage.requestRender();
  return {
    select(id) {
      if (disposed) return;
      specimen.geometry.dispose(); (specimen.material as MeshStandardMaterial).dispose();
      specimen.geometry = buildSpecimenGeometry(id, detailed); specimen.material = rockMaterial(id);
      shadow.position.y = id === 'slate' ? -.36 : id === 'sandstone' ? -.59 : id === 'gneiss' ? -.64 : -.74;
      stage.requestRender();
    },
    pause() { stage.setPaused(true); },
    resume() { stage.setPaused(false); stage.requestRender(); },
    reset() { stage.camera.position.copy(new Vector3(2.8, 1.9, 3.5)); stage.controls.target.set(0, 0, 0); stage.controls.update(); stage.requestRender(); cameraSaved(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      stage.controls.removeEventListener('end', cameraSaved); stage.canvas.removeEventListener('keyup', keySaved); stage.dispose();
    },
  };
}
