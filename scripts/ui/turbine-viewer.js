import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const host = document.getElementById('engine-view');
const error = document.getElementById('viewer-error');
try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x061017, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '燃气轮机 3D 预览，拖拽或方向键旋转，滚轮缩放');
  renderer.domElement.tabIndex = 0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 28;
  controls.minPolarAngle = 0.08;
  controls.maxPolarAngle = Math.PI - 0.08;
  controls.rotateSpeed = 0.8;
  controls.target.set(0, 1.1, 0);
  scene.add(new THREE.HemisphereLight(0xc6efff, 0x153147, 3));
  const key = new THREE.DirectionalLight(0xe0f5ff, 4); key.position.set(-4, 8, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0x54c8e0, 3); rim.position.set(3, 4, -6); scene.add(rim);
  const metal = new THREE.MeshStandardMaterial({ color: 0x5789a4, metalness: 0.65, roughness: 0.32 });
  const blade = new THREE.MeshStandardMaterial({ color: 0x7ca9be, metalness: 0.6, roughness: 0.3 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc99851, metalness: 0.58, roughness: 0.38 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x213f4d, metalness: 0.45, roughness: 0.5 });
  const engine = new THREE.Group(); engine.position.y = 1.35; scene.add(engine);
  const cylinder = (radius, length, x, material, group = engine) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 48), material);
    mesh.rotation.z = Math.PI / 2; mesh.position.x = x; group.add(mesh); return mesh;
  };
  cylinder(0.17, 10.5, 0, metal);
  const bladeGeometry = new THREE.BoxGeometry(0.085, 0.67, 0.17);
  for (let stage = 0; stage < 24; stage++) {
    const x = -4.4 + stage * 0.38;
    const combustion = stage >= 14 && stage < 19;
    const radius = stage >= 19 ? 1.16 : 1.03;
    const material = combustion ? gold : metal;
    cylinder(0.44, 0.13, x, material);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 6, 48), material);
    ring.rotation.y = Math.PI / 2; ring.position.x = x; engine.add(ring);
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8 + stage * 0.06;
      const vane = new THREE.Mesh(bladeGeometry, combustion ? gold : blade);
      vane.position.set(x, Math.cos(angle) * 0.72, Math.sin(angle) * 0.72);
      vane.rotation.set(angle, 0, -0.28);
      if (stage >= 19) vane.scale.y = 1.2;
      engine.add(vane);
    }
  }
  const platform = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.18, 3), dark);
  platform.position.y = -0.1; scene.add(platform);
  for (const x of [-3.4, 3.4]) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.62, 1), metal);
    support.position.set(x, 0.27, 0); scene.add(support);
  }
  const floor = new THREE.GridHelper(32, 32, 0x274c5c, 0x102e3d); floor.position.y = -0.22; scene.add(floor);
  const views = {
    overview: { target: [0, 1.1, 0], distance: 19, title: 'Brayton cycle', description: 'Compression, combustion and expansion transform airflow into useful shaft power.' },
    compressor: { target: [-2.2, 1.35, 0], distance: 10, title: 'Compressor', description: 'Rotating blades add energy to the air. Stationary vanes guide the flow into the next stage.' },
    combustor: { target: [1.7, 1.35, 0], distance: 7, title: 'Combustor', description: 'Fuel mixes with compressed air. Heat addition creates a high-energy gas flow for the turbine.' }
  };
  let mode = 'overview';
  const viewDistance = () => views[mode].distance / Math.max(1, camera.aspect);
  const angle = document.getElementById('angle');
  const angleValue = document.getElementById('angleValue');
  const render = () => {
    renderer.render(scene, camera);
    const degrees = (Math.round(THREE.MathUtils.radToDeg(controls.getAzimuthalAngle())) % 360 + 360) % 360;
    angle.value = degrees; angleValue.textContent = degrees + '°';
    host.dataset.angle = degrees;
  };
  const orbit = (theta, phi = controls.getPolarAngle(), distance = camera.position.distanceTo(controls.target)) => {
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(distance, Math.max(0.08, Math.min(Math.PI - 0.08, phi)), theta)));
    controls.update(); render();
  };
  const select = next => {
    mode = next; const view = views[mode];
    controls.target.fromArray(view.target);
    orbit(0.35, 1.18, viewDistance());
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    document.getElementById('heading').textContent = view.title;
    document.getElementById('description').textContent = view.description;
    document.getElementById('zoom').value = '100';
  };
  controls.addEventListener('change', render);
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => select(button.dataset.mode)));
  angle.addEventListener('input', () => orbit(THREE.MathUtils.degToRad(Number(angle.value))));
  document.getElementById('zoom').addEventListener('input', event => orbit(controls.getAzimuthalAngle(), controls.getPolarAngle(), viewDistance() * 100 / Number(event.target.value)));
  document.getElementById('reset').addEventListener('click', () => select('overview'));
  renderer.domElement.addEventListener('keydown', event => {
    const deltas = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] };
    if (!deltas[event.key]) return;
    event.preventDefault(); event.stopPropagation();
    orbit(controls.getAzimuthalAngle() + deltas[event.key][0], controls.getPolarAngle() + deltas[event.key][1]);
  });
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    const previousDistance = viewDistance();
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height);
    orbit(controls.getAzimuthalAngle(), controls.getPolarAngle(), camera.position.distanceTo(controls.target) * viewDistance() / previousDistance);
  });
  resize.observe(host);
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); error.hidden = false; });
  renderer.domElement.addEventListener('webglcontextrestored', () => { error.hidden = true; render(); });
  addEventListener('pagehide', () => {
    resize.disconnect(); controls.dispose();
    const geometries = new Set(), materials = new Set();
    scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material)); });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); renderer.dispose();
  }, { once: true });
  select('overview');
} catch {
  error.hidden = false;
}
document.getElementById('load').addEventListener('input', event => {
  const value = Number(event.target.value);
  document.getElementById('loadValue').textContent = value + '%';
  document.getElementById('rpm').textContent = Math.round(1800 + value * 19.16).toLocaleString();
  document.getElementById('power').textContent = Math.round(value * 2.3) + ' MW';
});
