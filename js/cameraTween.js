import * as THREE from 'three';

// Smooth camera fly-to. Cancels any in-flight tween.
let activeTween = null;

export function flyTo(camera, controls, targetLookAt, cameraPos, duration = 1.2) {
  if (activeTween) activeTween.cancel = true;
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = performance.now();
  const tween = { cancel: false };
  activeTween = tween;

  function step() {
    if (tween.cancel) return;
    const t = Math.min((performance.now() - startTime) / (duration * 1000), 1);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    camera.position.lerpVectors(startPos, cameraPos, e);
    controls.target.lerpVectors(startTarget, targetLookAt, e);
    controls.update();
    if (t < 1) requestAnimationFrame(step);
    else if (activeTween === tween) activeTween = null;
  }
  step();
}

// Compute a good camera position for viewing an object of given radius
export function viewpointFor(objectPos, objectRadius, fromDirection = new THREE.Vector3(0.5, 0.4, 1)) {
  const dist = Math.max(objectRadius * 4, 4);
  const dir = fromDirection.clone().normalize();
  return objectPos.clone().add(dir.multiplyScalar(dist));
}
