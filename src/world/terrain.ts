import * as THREE from 'three';

// Simplex-like 2D noise implementation for self-contained, high-performance procedural terrain
function fract(x: number) {
  return x - Math.floor(x);
}

function hash(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return fract(h);
}

function smoothNoise(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fX = fract(x);
  const fY = fract(y);

  // Smooth interpolation curve
  const u = fX * fX * (3.0 - 2.0 * fX);
  const v = fY * fY * (3.0 - 2.0 * fY);

  const a = hash(i, j);
  const b = hash(i + 1, j);
  const c = hash(i, j + 1);
  const d = hash(i + 1, j + 1);

  return a * (1 - u) * (1 - v) +
         b * u * (1 - v) +
         c * (1 - u) * v +
         d * u * v;
}

function fbm(x: number, y: number, octaves = 5): number {
  let v = 0.0;
  let a = 0.5;
  let shift = 100.0;
  for (let i = 0; i < octaves; ++i) {
    v += a * smoothNoise(x, y);
    x = x * 2.0 + shift;
    y = y * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

/**
 * Calculates the exact elevation of the Superstition Mountains terrain at (x, z).
 */
export function getTerrainHeight(x: number, z: number): number {
  // Boundary falloff so the world feels like a mountain basin surrounded by imposing outer ridges
  const distFromCenter = Math.hypot(x, z);
  const boundaryFalloff = Math.max(0, (distFromCenter - 140) * 0.4);

  // Canyon valley & ridge systems
  const scale1 = 0.008;
  const broadRidges = fbm(x * scale1, z * scale1, 4) * 38;

  // Rugged red rock strata & mesas
  const scale2 = 0.025;
  const rockyCrags = Math.pow(fbm(x * scale2 + 50, z * scale2 + 50, 3), 1.8) * 22;

  // Wash / arroyo carving: dry riverbeds and canyon passes
  const wash = Math.sin(x * 0.015 + z * 0.01) * Math.cos(z * 0.012 - x * 0.008);
  const arroyo = Math.abs(wash) * -8;

  // Special landmark features:
  // 1. Weaver's Needle base hill
  const distToNeedle = Math.hypot(x - 80, z - 15);
  let needleBase = 0;
  if (distToNeedle < 45) {
    needleBase = Math.max(0, (45 - distToNeedle) * 1.1);
  }

  // 2. Hieroglyphic canyon wash (oasis depression with pool)
  const distToSpring = Math.hypot(x - (-70), z - (-20));
  let springDepression = 0;
  if (distToSpring < 25) {
    springDepression = -Math.max(0, (25 - distToSpring) * 0.35);
  }

  // 3. Trailhead gentle clearing
  const distToTrailhead = Math.hypot(x - (-120), z - (-120));
  let trailheadFlatten = 1.0;
  if (distToTrailhead < 28) {
    trailheadFlatten = Math.min(1.0, distToTrailhead / 28);
  }

  // 4. Lost Dutchman Mine box canyon cliff face
  const distToMine = Math.hypot(x - 160, z - 110);
  let mineRidge = 0;
  if (distToMine < 50) {
    // Ridge surrounding the hidden cove
    mineRidge = Math.sin(Math.atan2(z - 110, x - 160) * 2) * 5 + 6;
  }

  const rawHeight = (broadRidges + rockyCrags + arroyo + needleBase + springDepression + mineRidge) * trailheadFlatten + boundaryFalloff;

  return Math.max(0, rawHeight);
}

/**
 * Creates the terrain mesh with vertex colors representing Arizona red-rock geology,
 * sandstone strata, desert washes, and mountain crests.
 */
export function createTerrainMesh(): THREE.Mesh {
  const worldSize = 420;
  const segments = 150;
  const geometry = new THREE.PlaneGeometry(worldSize, worldSize, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  // Arizona desert palette:
  // Wash sand: #d4a373 (0.83, 0.64, 0.45)
  // Terracotta sandstone: #c85a32 (0.78, 0.35, 0.20)
  // Deep red canyon rock: #8f3422 (0.56, 0.20, 0.13)
  // Dark basalt cap: #4a3b32 (0.29, 0.23, 0.20)
  // Desert oasis green tint: #606c38 (0.37, 0.42, 0.22)

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    const vy = getTerrainHeight(vx, vz);
    pos.setY(i, vy);

    // Color computation
    const distToSpring = Math.hypot(vx - (-70), vz - (-20));
    let r = 0.82;
    let g = 0.63;
    let b = 0.44;

    if (distToSpring < 22) {
      // Lush vegetation near spring
      const factor = 1 - distToSpring / 22;
      r = 0.45 * factor + r * (1 - factor);
      g = 0.52 * factor + g * (1 - factor);
      b = 0.28 * factor + b * (1 - factor);
    } else if (vy > 35) {
      // High volcanic basalt ridge
      r = 0.42;
      g = 0.33;
      b = 0.28;
    } else if (vy > 18) {
      // Red rock cliffs & spires
      const strata = Math.sin(vy * 0.8) * 0.08;
      r = 0.72 + strata;
      g = 0.32 + strata * 0.5;
      b = 0.18 + strata * 0.3;
    } else if (vy > 6) {
      // Terracotta desert slope
      r = 0.78;
      g = 0.48;
      b = 0.30;
    } else {
      // Sandy wash / arroyo floor
      r = 0.84 + Math.sin(vx * 0.1) * 0.03;
      g = 0.68 + Math.cos(vz * 0.1) * 0.03;
      b = 0.48;
    }

    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.05,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}
