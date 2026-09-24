import * as THREE from 'three';
import { getTerrainHeight, isHighPointOrPeak } from './terrain';
import { isNearPeraltaCamp, createFlutedCylinderGeometry } from './foliage';
import { getCelestialDirections } from './atmosphere';
import { WeatherType, SeasonType } from '../types';
import { seasonService } from '../services/seasonService';

/**
 * Deterministic spatial hash function.
 */
function spatialHash(x: number, z: number, seed = 1337): number {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed * 43.123) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Safely merge multiple BufferGeometries into a single BufferGeometry,
 * preserving position, normal, and vertex color attributes.
 */
function mergeGeometriesWithColors(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const validGeos = geometries.filter((g) => g && g.attributes.position);
  if (validGeos.length === 0) return new THREE.BufferGeometry();
  if (validGeos.length === 1) return validGeos[0].clone();

  let totalVertices = 0;
  let totalIndices = 0;

  for (const geo of validGeos) {
    totalVertices += geo.attributes.position.count;
    if (geo.index) {
      totalIndices += geo.index.count;
    } else {
      totalIndices += geo.attributes.position.count;
    }
  }

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const colors = new Float32Array(totalVertices * 3);
  const indices = new (totalVertices > 65535 ? Uint32Array : Uint16Array)(totalIndices);

  let vertexOffset = 0;
  let indexOffset = 0;

  for (const geo of validGeos) {
    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    const colorAttr = geo.attributes.color;
    const count = posAttr.count;

    positions.set(posAttr.array as Float32Array, vertexOffset * 3);

    if (normAttr) {
      normals.set(normAttr.array as Float32Array, vertexOffset * 3);
    } else {
      for (let i = 0; i < count * 3; i += 3) {
        normals[vertexOffset * 3 + i + 1] = 1.0;
      }
    }

    if (colorAttr) {
      colors.set(colorAttr.array as Float32Array, vertexOffset * 3);
    } else {
      for (let i = 0; i < count * 3; i += 3) {
        colors[vertexOffset * 3 + i] = 0.5;
        colors[vertexOffset * 3 + i + 1] = 0.5;
        colors[vertexOffset * 3 + i + 2] = 0.5;
      }
    }

    if (geo.index) {
      const idxArray = geo.index.array;
      for (let i = 0; i < idxArray.length; i++) {
        indices[indexOffset + i] = idxArray[i] + vertexOffset;
      }
      indexOffset += idxArray.length;
    } else {
      for (let i = 0; i < count; i++) {
        indices[indexOffset + i] = i + vertexOffset;
      }
      indexOffset += count;
    }

    vertexOffset += count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  merged.computeVertexNormals();
  return merged;
}

/**
 * Assigns uniform vertex color to a geometry.
 */
function applyColorToGeometry(geo: THREE.BufferGeometry, r: number, g: number, b: number): THREE.BufferGeometry {
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/**
 * 1. Saguaro Cacti (Carnegiea gigantea) 3D Model Geometries
 * Features fluted accordion pleats, spines, crown apex, and 4 architectural branching archetypes.
 */
export function createSaguaroArchetypes(): {
  monarch: THREE.BufferGeometry;
  doubleArm: THREE.BufferGeometry;
  singleArm: THREE.BufferGeometry;
  columnar: THREE.BufferGeometry;
} {
  // Base fluted trunk (6.0m high, 16 pleats)
  const trunkBase = createFlutedCylinderGeometry(0.38, 0.46, 6.2, 24, 16, 0.08, true);
  // Apply rich desert green with slight yellow-green ribbing
  const posTrunk = trunkBase.attributes.position;
  const colorsTrunk = new Float32Array(posTrunk.count * 3);
  for (let i = 0; i < posTrunk.count; i++) {
    const y = posTrunk.getY(i);
    const rad = Math.hypot(posTrunk.getX(i), posTrunk.getZ(i));
    const isRibCrest = rad > 0.40;
    const isBase = y < -2.4;
    const isCrown = y > 2.8;

    if (isCrown) {
      // Golden spine apex & white blossom center
      colorsTrunk[i * 3] = 0.82;
      colorsTrunk[i * 3 + 1] = 0.78;
      colorsTrunk[i * 3 + 2] = 0.62;
    } else if (isBase) {
      // Weathered woody base
      colorsTrunk[i * 3] = 0.38;
      colorsTrunk[i * 3 + 1] = 0.34;
      colorsTrunk[i * 3 + 2] = 0.24;
    } else if (isRibCrest) {
      // Rib crest spines catching sunlight
      colorsTrunk[i * 3] = 0.28;
      colorsTrunk[i * 3 + 1] = 0.44;
      colorsTrunk[i * 3 + 2] = 0.22;
    } else {
      // Shaded valley grooves
      colorsTrunk[i * 3] = 0.16;
      colorsTrunk[i * 3 + 1] = 0.32;
      colorsTrunk[i * 3 + 2] = 0.14;
    }
  }
  trunkBase.setAttribute('color', new THREE.BufferAttribute(colorsTrunk, 3));

  // Saguaro Arm Geometries
  const buildArm = (offsetX: number, startY: number, armLength: number, curveDir: 1 | -1) => {
    const hArm = createFlutedCylinderGeometry(0.24, 0.24, Math.abs(offsetX), 18, 12, 0.06, false);
    hArm.rotateZ(Math.PI / 2);
    hArm.translate(offsetX / 2, startY, 0);
    applyColorToGeometry(hArm, 0.20, 0.36, 0.16);

    const vArm = createFlutedCylinderGeometry(0.22, 0.27, armLength, 18, 12, 0.07, true);
    vArm.translate(offsetX + curveDir * 0.05, startY + armLength / 2, 0);

    const vPos = vArm.attributes.position;
    const vCols = new Float32Array(vPos.count * 3);
    for (let i = 0; i < vPos.count; i++) {
      const y = vPos.getY(i);
      if (y > startY + armLength - 0.3) {
        vCols[i * 3] = 0.78;
        vCols[i * 3 + 1] = 0.75;
        vCols[i * 3 + 2] = 0.58;
      } else {
        vCols[i * 3] = 0.22;
        vCols[i * 3 + 1] = 0.38;
        vCols[i * 3 + 2] = 0.18;
      }
    }
    vArm.setAttribute('color', new THREE.BufferAttribute(vCols, 3));

    return [hArm, vArm];
  };

  // 1. Columnar: Solitary young or mature saguaro without arms
  const columnar = trunkBase.clone();

  // 2. Single-Arm Saguaro
  const armLeft = buildArm(-1.1, 0.7, 2.6, -1);
  const singleArm = mergeGeometriesWithColors([trunkBase.clone(), ...armLeft]);

  // 3. Double-Arm Saguaro
  const armRight = buildArm(1.15, 1.2, 2.8, 1);
  const doubleArm = mergeGeometriesWithColors([trunkBase.clone(), ...armLeft, ...armRight]);

  // 4. Monarch Saguaro: 4 stately candelabra arms
  const armHighLeft = buildArm(-1.45, 1.8, 2.2, -1);
  const armHighRight = buildArm(1.4, 2.2, 2.0, 1);
  const monarch = mergeGeometriesWithColors([
    trunkBase.clone(),
    ...armLeft,
    ...armRight,
    ...armHighLeft,
    ...armHighRight,
  ]);

  return { monarch, doubleArm, singleArm, columnar };
}

/**
 * 2. Authentic Sonoran Desert Ocotillo (Fouquieria splendens) 3D Model
 * 14 to 18 tall thorny whiplike canes radiating outward in an inverted vase shape,
 * tipped with bright scarlet-vermilion floral terminal clusters.
 */
export function createRealisticOcotillo3DGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const caneCount = 16;

  for (let i = 0; i < caneCount; i++) {
    const angle = (i / caneCount) * Math.PI * 2 + ((i * 1.41) % 0.32);
    const caneHeight = 3.4 + (i % 5) * 0.32;
    const flare = 0.24 + (i % 4) * 0.055;

    // Lower cane segment: sturdy thorny wood
    const seg1 = new THREE.CylinderGeometry(0.034, 0.058, caneHeight * 0.52, 6);
    seg1.translate(0, (caneHeight * 0.52) / 2, 0);
    seg1.rotateZ(flare * 0.72);
    seg1.rotateY(angle);
    applyColorToGeometry(seg1, 0.38, 0.32, 0.24); // Weathered woody brown
    parts.push(seg1);

    // Upper cane segment: slender grey-green whip
    const seg2 = new THREE.CylinderGeometry(0.018, 0.034, caneHeight * 0.48, 6);
    seg2.translate(0, (caneHeight * 0.48) / 2, 0);
    seg2.rotateZ(flare * 1.25);
    seg2.rotateY(angle);

    const midX = Math.sin(flare * 0.72) * Math.cos(angle) * (caneHeight * 0.52);
    const midY = Math.cos(flare * 0.72) * (caneHeight * 0.52);
    const midZ = Math.sin(flare * 0.72) * Math.sin(angle) * (caneHeight * 0.52);
    seg2.translate(midX, midY, midZ);
    applyColorToGeometry(seg2, 0.34, 0.42, 0.28); // Thorny chlorophyl stem
    parts.push(seg2);

    // Brilliant Scarlet-Vermilion Flower Cluster at Cane Tip
    const flower = new THREE.ConeGeometry(0.065, 0.38, 6);
    flower.rotateZ(flare * 1.28);
    flower.rotateY(angle);
    const tipX = midX + Math.sin(flare * 1.25) * Math.cos(angle) * (caneHeight * 0.48);
    const tipY = midY + Math.cos(flare * 1.25) * (caneHeight * 0.48);
    const tipZ = midZ + Math.sin(flare * 1.25) * Math.sin(angle) * (caneHeight * 0.48);
    flower.translate(tipX, tipY, tipZ);
    applyColorToGeometry(flower, 0.92, 0.22, 0.12); // Vivid fiery scarlet
    parts.push(flower);

    // Sub-canes / spines at middle
    if (i % 3 === 0) {
      const spine = new THREE.CylinderGeometry(0.008, 0.018, 0.28, 4);
      spine.rotateZ(flare * 1.6);
      spine.rotateY(angle + 0.3);
      spine.translate(midX * 0.85, midY * 0.85, midZ * 0.85);
      applyColorToGeometry(spine, 0.44, 0.38, 0.28);
      parts.push(spine);
    }
  }

  // Woody root crown mound
  const rootMound = new THREE.CylinderGeometry(0.32, 0.45, 0.18, 8);
  rootMound.translate(0, 0.08, 0);
  applyColorToGeometry(rootMound, 0.32, 0.28, 0.22);
  parts.push(rootMound);

  return mergeGeometriesWithColors(parts);
}

/**
 * 3. Authentic Engelmann's Prickly Pear Cactus (Opuntia engelmannii) 3D Model
 * Sprawling multi-tiered cluster of flattened oval cladode pads crowned with
 * vivid magenta/crimson tuna fruits and golden spine glochids.
 */
export function createRealisticPricklyPear3DGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const createColoredPad = (
    scaleX: number,
    scaleY: number,
    scaleZ: number,
    posX: number,
    posY: number,
    posZ: number,
    rotX: number,
    rotY: number,
    rotZ: number,
    rimHighlight = false
  ) => {
    const pad = new THREE.CylinderGeometry(0.38, 0.38, 0.055, 14);
    pad.scale(scaleX, scaleY, scaleZ);
    pad.rotateX(rotX);
    pad.rotateY(rotY);
    pad.rotateZ(rotZ);
    pad.translate(posX, posY, posZ);

    const pos = pad.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const py = pos.getY(i);
      const isBase = py < posY - 0.2;
      if (isBase) {
        // Woody root pad joint
        cols[i * 3] = 0.30;
        cols[i * 3 + 1] = 0.36;
        cols[i * 3 + 2] = 0.22;
      } else if (rimHighlight) {
        // Sunlit pad rim with golden glochids
        cols[i * 3] = 0.35;
        cols[i * 3 + 1] = 0.48;
        cols[i * 3 + 2] = 0.25;
      } else {
        // Classic Sonoran desert sage green pad
        cols[i * 3] = 0.26;
        cols[i * 3 + 1] = 0.40;
        cols[i * 3 + 2] = 0.22;
      }
    }
    pad.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return pad;
  };

  // Base Pad rooted in soil
  parts.push(createColoredPad(1.0, 1.0, 1.25, 0, 0.34, 0, 0.08, 0, -0.05));

  // Tier 1 Daughter Pads
  parts.push(createColoredPad(0.92, 0.95, 1.15, -0.34, 0.76, 0.02, 0.12, 0.25, -0.36));
  parts.push(createColoredPad(0.88, 0.90, 1.12, 0.36, 0.80, -0.02, -0.08, -0.2, 0.34));
  parts.push(createColoredPad(0.84, 0.88, 1.08, 0.02, 0.78, 0.32, 0.32, 0.12, 0.05));

  // Tier 2 Daughter Pads
  parts.push(createColoredPad(0.78, 0.85, 1.02, -0.56, 1.18, 0.08, 0.18, 0.45, -0.42, true));
  parts.push(createColoredPad(0.82, 0.86, 1.06, 0.14, 1.26, 0.03, -0.05, 0.10, 0.08, true));
  parts.push(createColoredPad(0.74, 0.82, 0.98, 0.65, 1.15, -0.06, -0.15, -0.35, 0.46, true));
  parts.push(createColoredPad(0.72, 0.80, 0.95, -0.12, 1.18, -0.32, -0.30, 0.15, -0.10, true));

  // Ripe Crimson / Magenta Tuna Fruits along Pad Upper Perimeters
  const fruitPositions = [
    { x: -0.66, y: 1.44, z: 0.12 },
    { x: -0.46, y: 1.52, z: 0.05 },
    { x: 0.06, y: 1.56, z: 0.04 },
    { x: 0.25, y: 1.54, z: 0.02 },
    { x: 0.74, y: 1.40, z: -0.08 },
    { x: -0.14, y: 1.46, z: -0.36 },
    { x: 0.38, y: 1.16, z: 0.24 },
  ];
  for (const fp of fruitPositions) {
    const fruit = new THREE.CylinderGeometry(0.042, 0.034, 0.13, 6);
    fruit.translate(fp.x, fp.y, fp.z);
    applyColorToGeometry(fruit, 0.68, 0.12, 0.28); // Saturated magenta tuna fruit
    parts.push(fruit);

    // Fruit flower scar tip
    const scar = new THREE.CylinderGeometry(0.024, 0.034, 0.03, 6);
    scar.translate(fp.x, fp.y + 0.075, fp.z);
    applyColorToGeometry(scar, 0.48, 0.32, 0.18);
    parts.push(scar);
  }

  return mergeGeometriesWithColors(parts);
}

/**
  * Generates a high-fidelity procedural contact shadow texture for Saguaro cacti.
  * Features a dense trunk root contact core with soft Gaussian ambient occlusion falloff.
  */
function createSaguaroContactTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 128;
  const cy = 128;

  // Multi-stop radial contact shadow: dense trunk contact core tapering to soft ambient halo
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
  grad.addColorStop(0.0, 'rgba(10, 7, 4, 0.95)'); // dense root core
  grad.addColorStop(0.18, 'rgba(14, 10, 6, 0.90)'); // trunk boundary
  grad.addColorStop(0.42, 'rgba(22, 16, 9, 0.58)'); // ambient occlusion transition
  grad.addColorStop(0.68, 'rgba(28, 20, 12, 0.20)'); // soft penumbra
  grad.addColorStop(0.88, 'rgba(32, 23, 14, 0.05)'); // outer edge fade
  grad.addColorStop(1.0, 'rgba(35, 25, 15, 0.0)'); // full transparent

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();

  // Subtle fluting ribs shadow (very soft concentric micro-contrast)
  ctx.strokeStyle = 'rgba(8, 6, 3, 0.15)';
  ctx.lineWidth = 4;
  for (let r = 24; r <= 60; r += 12) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Generates an organic contact shadow texture for Ocotillo shrubs.
 * Features 16 radiating thorny cane spokes emerging from a dense central root hub.
 */
function createOcotilloContactTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 128;
  const cy = 128;

  // 1. Broad soft ambient envelope
  const envGrad = ctx.createRadialGradient(cx, cy, 15, cx, cy, 122);
  envGrad.addColorStop(0.0, 'rgba(16, 11, 7, 0.65)');
  envGrad.addColorStop(0.45, 'rgba(22, 16, 10, 0.28)');
  envGrad.addColorStop(0.78, 'rgba(28, 20, 12, 0.08)');
  envGrad.addColorStop(1.0, 'rgba(32, 22, 14, 0.0)');

  ctx.fillStyle = envGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 122, 0, Math.PI * 2);
  ctx.fill();

  // 2. Radiating cane contact spokes (16 canes emerging from hub)
  ctx.strokeStyle = 'rgba(12, 8, 5, 0.24)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  const caneCount = 16;
  for (let i = 0; i < caneCount; i++) {
    const angle = (i / caneCount) * Math.PI * 2 + (i % 2 === 0 ? 0.06 : -0.04);
    const rStart = 18;
    const rEnd = 70 + (i % 3) * 16;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * rStart, cy + Math.sin(angle) * rStart);
    ctx.lineTo(cx + Math.cos(angle) * rEnd, cy + Math.sin(angle) * rEnd);
    ctx.stroke();
  }

  // 3. Central root crown hub (dense grounding point)
  const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32);
  hubGrad.addColorStop(0.0, 'rgba(8, 6, 3, 0.96)');
  hubGrad.addColorStop(0.65, 'rgba(12, 9, 5, 0.88)');
  hubGrad.addColorStop(1.0, 'rgba(18, 13, 8, 0.0)');

  ctx.fillStyle = hubGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Generates an organic contact shadow texture for Prickly Pear colonies.
 * Features overlapping sprawling ground-resting pad contact patches.
 */
function createPricklyPearContactTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 128;
  const cy = 128;

  // 1. Soft overall ambient pad cluster envelope
  const clusterGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 120);
  clusterGrad.addColorStop(0.0, 'rgba(15, 11, 7, 0.70)');
  clusterGrad.addColorStop(0.50, 'rgba(22, 16, 10, 0.30)');
  clusterGrad.addColorStop(0.80, 'rgba(28, 20, 13, 0.08)');
  clusterGrad.addColorStop(1.0, 'rgba(32, 22, 14, 0.0)');

  ctx.fillStyle = clusterGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();

  // 2. Overlapping pad contact lobes (sprawling flat pads resting on soil)
  const padOffsets = [
    { x: -32, y: -20, r: 42 },
    { x: 34, y: -16, r: 44 },
    { x: -22, y: 32, r: 38 },
    { x: 26, y: 30, r: 40 },
    { x: -50, y: 8, r: 34 },
    { x: 52, y: 12, r: 36 },
    { x: 0, y: -45, r: 35 },
    { x: 2, y: 48, r: 34 },
  ];

  for (const pad of padOffsets) {
    const padGrad = ctx.createRadialGradient(cx + pad.x, cy + pad.y, 4, cx + pad.x, cy + pad.y, pad.r);
    padGrad.addColorStop(0.0, 'rgba(10, 7, 4, 0.65)');
    padGrad.addColorStop(0.55, 'rgba(16, 11, 7, 0.35)');
    padGrad.addColorStop(1.0, 'rgba(24, 17, 10, 0.0)');
    ctx.fillStyle = padGrad;
    ctx.beginPath();
    ctx.arc(cx + pad.x, cy + pad.y, pad.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Central root nexus
  const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 38);
  centerGrad.addColorStop(0.0, 'rgba(8, 6, 3, 0.94)');
  centerGrad.addColorStop(0.6, 'rgba(12, 9, 5, 0.78)');
  centerGrad.addColorStop(1.0, 'rgba(20, 14, 9, 0.0)');

  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export interface GroundScatterItem {
  type: 'saguaro' | 'ocotillo' | 'prickly_pear';
  x: number;
  y: number;
  z: number;
  scale: number;
  rotY: number;
  tiltX: number;
  tiltZ: number;
  surfY: number;
  surfNormal: THREE.Vector3;
  saguaroArchIndex?: number;
}

/**
 * High-performance procedural ground vegetation scatter manager.
 * Scatters authentic 3D models of Saguaro cacti, Ocotillo, and Prickly Pear
 * onto the terrain surface across the world to break up the flat, smooth aesthetic.
 */
export class GroundVegetationScatterManager {
  private scene: THREE.Scene;
  private group: THREE.Group = new THREE.Group();

  // Materials with vertex color support & PBR shading
  private saguaroMaterial: THREE.MeshStandardMaterial;
  private ocotilloMaterial: THREE.MeshStandardMaterial;
  private pricklyMaterial: THREE.MeshStandardMaterial;

  // Dynamic Contact Shadows (Grounding footprints beneath vegetation models)
  private contactGeo: THREE.PlaneGeometry;
  private saguaroContactTexture: THREE.CanvasTexture;
  private ocotilloContactTexture: THREE.CanvasTexture;
  private pricklyContactTexture: THREE.CanvasTexture;
  private saguaroContactMaterial: THREE.MeshBasicMaterial;
  private ocotilloContactMaterial: THREE.MeshBasicMaterial;
  private pricklyContactMaterial: THREE.MeshBasicMaterial;
  private contactShadowMeshes: THREE.InstancedMesh[] = [];

  private contactUniforms = {
    uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3) },
    uSunElevation: { value: 0.85 },
    uShadowIntensity: { value: 0.76 },
    uShadowTint: { value: new THREE.Color(0x0a0704) },
  };

  // Shared 3D Geometries
  private saguaroGeos: {
    monarch: THREE.BufferGeometry;
    doubleArm: THREE.BufferGeometry;
    singleArm: THREE.BufferGeometry;
    columnar: THREE.BufferGeometry;
  };
  private ocotilloGeo: THREE.BufferGeometry;
  private pricklyGeo: THREE.BufferGeometry;

  // Instanced Meshes
  private saguaroMonarchMesh?: THREE.InstancedMesh;
  private saguaroDoubleMesh?: THREE.InstancedMesh;
  private saguaroSingleMesh?: THREE.InstancedMesh;
  private saguaroColumnMesh?: THREE.InstancedMesh;
  private ocotilloMesh?: THREE.InstancedMesh;
  private pricklyMesh?: THREE.InstancedMesh;

  private allInstancedMeshes: THREE.InstancedMesh[] = [];
  private dummy = new THREE.Object3D();
  private normalQuat = new THREE.Quaternion();
  private yawQuat = new THREE.Quaternion();
  private upVector = new THREE.Vector3(0, 1, 0);

  // Streaming & LOD state
  private lastUpdatePos = new THREE.Vector3(999999, 999999, 999999);
  private currentRadius = 320; // 320m scatter radius blankets wide panoramic vistas
  private isVisible = true;
  private unsubscribeSeason?: () => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group.name = 'procedural_ground_vegetation_scatter';

    // 1. Realistic PBR Materials with vertex color support
    this.saguaroMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0.04,
      shadowSide: THREE.FrontSide,
    });

    this.ocotilloMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.03,
      shadowSide: THREE.FrontSide,
    });

    this.pricklyMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.04,
      shadowSide: THREE.FrontSide,
    });

    // 2. Dynamic Contact Shadows: High-performance instanced planar ground grounding
    this.contactGeo = new THREE.PlaneGeometry(1, 1);
    this.contactGeo.rotateX(-Math.PI / 2); // Lay flat on ground (normal +Y)

    this.saguaroContactTexture = createSaguaroContactTexture();
    this.ocotilloContactTexture = createOcotilloContactTexture();
    this.pricklyContactTexture = createPricklyPearContactTexture();

    this.saguaroContactMaterial = this.createContactMaterial(this.saguaroContactTexture, 0.45);
    this.ocotilloContactMaterial = this.createContactMaterial(this.ocotilloContactTexture, 0.40);
    this.pricklyContactMaterial = this.createContactMaterial(this.pricklyContactTexture, 0.35);

    // 3. Generate detailed 3D geometries
    this.saguaroGeos = createSaguaroArchetypes();
    this.ocotilloGeo = createRealisticOcotillo3DGeometry();
    this.pricklyGeo = createRealisticPricklyPear3DGeometry();

    this.scene.add(this.group);

    // Subscribe to seasonal foliage changes
    this.unsubscribeSeason = seasonService.subscribe((season) => {
      this.applySeason(season);
    });
    this.applySeason(seasonService.getSeason());
  }

  /**
   * Creates a specialized contact shadow material with dynamic sun-angle stretch and ambient occlusion.
   */
  private createContactMaterial(texture: THREE.Texture, stretchFactor = 0.45): THREE.MeshBasicMaterial {
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1.5,
      polygonOffsetUnits: -4.0,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSunDirection = this.contactUniforms.uSunDirection;
      shader.uniforms.uSunElevation = this.contactUniforms.uSunElevation;
      shader.uniforms.uShadowIntensity = this.contactUniforms.uShadowIntensity;
      shader.uniforms.uDirectionalStretch = { value: stretchFactor };

      shader.vertexShader = `
        uniform vec3 uSunDirection;
        uniform float uSunElevation;
        uniform float uDirectionalStretch;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vec2 sunDir2D = normalize(uSunDirection.xz + vec2(0.0001));
        vec2 shadowDir = -sunDir2D;
        float sunAngleFactor = clamp(1.0 - uSunElevation, 0.0, 1.0);
        float stretchDist = sunAngleFactor * uDirectionalStretch;
        // In local ground space (PlaneGeometry rotated -PI/2 around X):
        // transformed.x is in [-0.5, 0.5], transformed.z is in [-0.5, 0.5]
        float downShadow = dot(vec2(transformed.x, transformed.z), shadowDir);
        if (downShadow > 0.0) {
          transformed.x += shadowDir.x * downShadow * stretchDist;
          transformed.z += shadowDir.y * downShadow * stretchDist;
        }
        `
      );

      shader.fragmentShader = `
        uniform float uShadowIntensity;
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        diffuseColor.a *= uShadowIntensity;
        if (diffuseColor.a < 0.005) discard;
        `
      );
    };

    return mat;
  }

  /**
   * Evaluates terrain surface properties (height, normal, slope) at given coordinates.
   */
  private sampleTerrainSurface(worldX: number, worldZ: number): {
    y: number;
    slope: number;
    normal: THREE.Vector3;
    isValid: boolean;
  } {
    const y = getTerrainHeight(worldX, worldZ);

    const step = 1.2;
    const hL = getTerrainHeight(worldX - step, worldZ);
    const hR = getTerrainHeight(worldX + step, worldZ);
    const hD = getTerrainHeight(worldX, worldZ - step);
    const hU = getTerrainHeight(worldX, worldZ + step);

    const dX = (hR - hL) / (2 * step);
    const dZ = (hU - hD) / (2 * step);
    const slope = Math.hypot(dX, dZ);

    const normal = new THREE.Vector3(-dX, 1.0, -dZ).normalize();

    // Check clearances: never spawn in town buildings, Peralta base camp, or sheer summit cliffs
    if (isNearPeraltaCamp(worldX, worldZ, 22)) {
      return { y, slope, normal, isValid: false };
    }

    if (isHighPointOrPeak(worldX, worldZ, y, slope)) {
      return { y, slope, normal, isValid: false };
    }

    // Avoid water springs and low wash riverbed channels
    if (y < 2.0 && slope < 0.08) {
      return { y, slope, normal, isValid: false };
    }

    return { y, slope, normal, isValid: true };
  }

  /**
   * Deterministically collects ground scatter items in a spatial radius around center (px, pz).
   */
  public generateGroundScatter(centerX: number, centerZ: number, radius: number): {
    saguaroMonarch: GroundScatterItem[];
    saguaroDouble: GroundScatterItem[];
    saguaroSingle: GroundScatterItem[];
    saguaroColumn: GroundScatterItem[];
    ocotillos: GroundScatterItem[];
    pricklyPears: GroundScatterItem[];
  } {
    const saguaroMonarch: GroundScatterItem[] = [];
    const saguaroDouble: GroundScatterItem[] = [];
    const saguaroSingle: GroundScatterItem[] = [];
    const saguaroColumn: GroundScatterItem[] = [];
    const ocotillos: GroundScatterItem[] = [];
    const pricklyPears: GroundScatterItem[] = [];

    const cellSize = 18; // Dense 18m spatial distribution grid
    const minCellX = Math.floor((centerX - radius) / cellSize);
    const maxCellX = Math.floor((centerX + radius) / cellSize);
    const minCellZ = Math.floor((centerZ - radius) / cellSize);
    const maxCellZ = Math.floor((centerZ + radius) / cellSize);

    const radSq = radius * radius;

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const cellOriginX = cx * cellSize;
        const cellOriginZ = cz * cellSize;

        // Up to 3 plant spawn attempts per 18m cell
        for (let sub = 0; sub < 3; sub++) {
          const uX = spatialHash(cx, cz, sub * 71 + 13);
          const uZ = spatialHash(cx, cz, sub * 97 + 37);

          const worldX = cellOriginX + uX * cellSize;
          const worldZ = cellOriginZ + uZ * cellSize;

          const dx = worldX - centerX;
          const dz = worldZ - centerZ;
          if (dx * dx + dz * dz > radSq) continue;

          const surf = this.sampleTerrainSurface(worldX, worldZ);
          if (!surf.isValid) continue;

          const plantTypeDice = spatialHash(cx, cz, sub * 123 + 89);
          const rotY = spatialHash(cx, cz, sub * 43 + 29) * Math.PI * 2;

          // Align base with terrain slope normal while maintaining organic upright posture
          const tiltX = surf.normal.z * 0.35;
          const tiltZ = -surf.normal.x * 0.35;

          // 1. SAGUARO CACTI (38% of flora population)
          if (plantTypeDice < 0.38) {
            // Saguaro prefers gentle to moderate slopes (< 0.42), benches, and sunny bajadas
            if (surf.slope > 0.42) continue;

            const scale = 0.72 + spatialHash(cx, cz, sub * 51 + 7) * 0.58;
            const archDice = spatialHash(cx, cz, sub * 67 + 91);

            const item: GroundScatterItem = {
              type: 'saguaro',
              x: worldX,
              y: surf.y - 0.15, // slightly embedded in sand/scree
              surfY: surf.y,
              surfNormal: surf.normal.clone(),
              z: worldZ,
              scale,
              rotY,
              tiltX,
              tiltZ,
            };

            if (archDice < 0.22) {
              saguaroMonarch.push(item);
            } else if (archDice < 0.50) {
              saguaroDouble.push(item);
            } else if (archDice < 0.76) {
              saguaroSingle.push(item);
            } else {
              saguaroColumn.push(item);
            }
          }
          // 2. OCOTILLO (30% of flora population)
          else if (plantTypeDice < 0.68) {
            // Ocotillo thrives on stony benches, volcanic slopes, and gravelly washes (slope 0.05 - 0.48)
            if (surf.slope > 0.48) continue;

            const scale = 0.75 + spatialHash(cx, cz, sub * 33 + 17) * 0.50;
            ocotillos.push({
              type: 'ocotillo',
              x: worldX,
              y: surf.y - 0.12,
              surfY: surf.y,
              surfNormal: surf.normal.clone(),
              z: worldZ,
              scale,
              rotY,
              tiltX: surf.normal.z * 0.45,
              tiltZ: -surf.normal.x * 0.45,
            });
          }
          // 3. PRICKLY PEAR CACTUS (32% of flora population)
          else {
            // Prickly pear forms sprawling colonies in desert washes, sandy bajadas, and low flats (< 0.34)
            if (surf.slope > 0.34) continue;

            const scale = 0.80 + spatialHash(cx, cz, sub * 83 + 41) * 0.55;
            pricklyPears.push({
              type: 'prickly_pear',
              x: worldX,
              y: surf.y - 0.18, // flush into soil
              surfY: surf.y,
              surfNormal: surf.normal.clone(),
              z: worldZ,
              scale,
              rotY,
              tiltX: surf.normal.z * 0.55,
              tiltZ: -surf.normal.x * 0.55,
            });
          }
        }
      }
    }

    return {
      saguaroMonarch,
      saguaroDouble,
      saguaroSingle,
      saguaroColumn,
      ocotillos,
      pricklyPears,
    };
  }

  /**
   * Instantiates or re-populates instanced mesh batches for all scattered models.
   */
  public rebuildMeshBatches(centerX: number, centerZ: number): void {
    const data = this.generateGroundScatter(centerX, centerZ, this.currentRadius);

    // Clean existing meshes
    for (const mesh of this.allInstancedMeshes) {
      this.group.remove(mesh);
      mesh.dispose();
    }
    this.allInstancedMeshes = [];

    for (const mesh of this.contactShadowMeshes) {
      this.group.remove(mesh);
      mesh.dispose();
    }
    this.contactShadowMeshes = [];

    const applyInstances = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      items: GroundScatterItem[],
      yOffset = 0
    ): THREE.InstancedMesh => {
      const count = Math.max(1, items.length);
      const mesh = new THREE.InstancedMesh(geo, mat, count);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;

      const dummy = this.dummy;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        dummy.position.set(it.x, it.y + yOffset * it.scale, it.z);
        dummy.scale.set(it.scale, it.scale, it.scale);

        // Natural rotation & slope posture
        dummy.rotation.set(it.tiltX, it.rotY, it.tiltZ, 'YXZ');
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }

      if (items.length === 0) {
        mesh.setMatrixAt(0, new THREE.Matrix4().makeScale(0, 0, 0));
      }

      mesh.instanceMatrix.needsUpdate = true;
      this.group.add(mesh);
      this.allInstancedMeshes.push(mesh);
      return mesh;
    };

    const applyContactShadowInstances = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      items: GroundScatterItem[],
      footprintScale: number
    ): THREE.InstancedMesh => {
      const count = Math.max(1, items.length);
      const mesh = new THREE.InstancedMesh(geo, mat, count);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = true;
      mesh.renderOrder = 2; // Render after terrain to ensure clean blending

      const dummy = this.dummy;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        // Elevate 2.2 cm above terrain surface to cleanly prevent z-fighting while firmly grounding model
        dummy.position.set(it.x, it.surfY + 0.022, it.z);
        dummy.quaternion.setFromUnitVectors(this.upVector, it.surfNormal);
        const footprint = it.scale * footprintScale;
        dummy.scale.set(footprint, 1.0, footprint);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }

      if (items.length === 0) {
        mesh.setMatrixAt(0, new THREE.Matrix4().makeScale(0, 0, 0));
      }

      mesh.instanceMatrix.needsUpdate = true;
      this.group.add(mesh);
      this.contactShadowMeshes.push(mesh);
      return mesh;
    };

    // Build Saguaro batches (Monarch, Double, Single, Column)
    // Saguaro base is centered at mid-height in geometry (3.1m high), offset to plant root in earth
    this.saguaroMonarchMesh = applyInstances(this.saguaroGeos.monarch, this.saguaroMaterial, data.saguaroMonarch, 3.1);
    this.saguaroDoubleMesh = applyInstances(this.saguaroGeos.doubleArm, this.saguaroMaterial, data.saguaroDouble, 3.1);
    this.saguaroSingleMesh = applyInstances(this.saguaroGeos.singleArm, this.saguaroMaterial, data.saguaroSingle, 3.1);
    this.saguaroColumnMesh = applyInstances(this.saguaroGeos.columnar, this.saguaroMaterial, data.saguaroColumn, 3.1);

    // Build Ocotillo batch (ground-rooted at origin)
    this.ocotilloMesh = applyInstances(this.ocotilloGeo, this.ocotilloMaterial, data.ocotillos, 0.0);

    // Build Prickly Pear batch (ground-rooted at origin)
    this.pricklyMesh = applyInstances(this.pricklyGeo, this.pricklyMaterial, data.pricklyPears, 0.0);

    // Build Dynamic Contact Shadows beneath each plant archetype
    applyContactShadowInstances(this.contactGeo, this.saguaroContactMaterial, data.saguaroMonarch, 3.2);
    applyContactShadowInstances(this.contactGeo, this.saguaroContactMaterial, data.saguaroDouble, 2.4);
    applyContactShadowInstances(this.contactGeo, this.saguaroContactMaterial, data.saguaroSingle, 2.2);
    applyContactShadowInstances(this.contactGeo, this.saguaroContactMaterial, data.saguaroColumn, 1.9);
    applyContactShadowInstances(this.contactGeo, this.ocotilloContactMaterial, data.ocotillos, 2.8);
    applyContactShadowInstances(this.contactGeo, this.pricklyContactMaterial, data.pricklyPears, 3.4);
  }

  /**
   * Dynamic streaming & lighting update called in WorldCanvas animation loop.
   * Re-anchors vegetation scatter when the player moves significantly (> 40m),
   * and synchronizes dynamic contact shadow orientation and diurnal intensity.
   */
  public update(
    playerPos: THREE.Vector3,
    timeOfDay = 12.0,
    sunDir?: THREE.Vector3,
    weather?: WeatherType
  ): void {
    if (!this.isVisible) return;

    // 1. Calculate astronomical solar vector if not supplied
    let actualSunDir = sunDir;
    let actualSunY = 0.88;
    if (!actualSunDir) {
      const celestial = getCelestialDirections(timeOfDay);
      actualSunDir = celestial.sunDir;
      actualSunY = celestial.sunY;
    } else {
      actualSunY = actualSunDir.y;
    }

    // 2. Synchronize dynamic contact shadow uniforms
    this.contactUniforms.uSunDirection.value.copy(actualSunDir);
    this.contactUniforms.uSunElevation.value = Math.max(0.0, actualSunY);

    // Diurnal & meteorological shadow strength modulation
    let baseIntensity = 0.78;
    if (timeOfDay >= 6.0 && timeOfDay <= 18.0) {
      // Daylight: high-contrast grounding
      const middayWeight = Math.sin(((timeOfDay - 6.0) / 12.0) * Math.PI);
      baseIntensity = 0.72 + middayWeight * 0.14; // 0.72 at dawn/dusk to 0.86 at noon
    } else {
      // Night / Twilight: soft ambient moonlight grounding
      baseIntensity = 0.36;
    }

    // Weather attenuation (clouds / storms soften contact shadows into ambient occlusion)
    if (weather === 'storm' || weather === 'light_rain') {
      baseIntensity *= 0.52;
    } else if (weather === 'clouds') {
      baseIntensity *= 0.78;
    } else if (weather === 'sandstorm') {
      baseIntensity *= 0.65;
    }

    this.contactUniforms.uShadowIntensity.value = baseIntensity;

    // 3. Dynamic streaming update if player moved significantly (> 40m)
    const dx = playerPos.x - this.lastUpdatePos.x;
    const dz = playerPos.z - this.lastUpdatePos.z;
    if (dx * dx + dz * dz > 40 * 40 || this.allInstancedMeshes.length === 0) {
      this.lastUpdatePos.copy(playerPos);
      this.rebuildMeshBatches(playerPos.x, playerPos.z);
    }
  }

  /**
   * Sets shadow casting based on performance/quality settings.
   */
  public setShadowsEnabled(enabled: boolean): void {
    for (const m of this.allInstancedMeshes) {
      m.castShadow = enabled;
      m.receiveShadow = enabled;
    }
    // Contact shadows remain active for essential visual grounding,
    // but on performance mode with disabled 3D shadow maps, we calibrate intensity
    if (!enabled) {
      this.contactUniforms.uShadowIntensity.value = 0.52;
    }
  }

  /**
   * Subterranean culling: hides surface vegetation when player is inside mine shafts or cavern stopes.
   */
  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.group.visible = visible;
  }

  /**
   * Applies real-time Sonoran seasonal color palette shifts across all scattered vegetation.
   */
  public applySeason(season: SeasonType): void {
    if (!this.saguaroMaterial) return;
    switch (season) {
      case 'spring':
        // Spring bloom: Lush emerald tint and vivid superbloom blossom hues
        this.saguaroMaterial.color.setRGB(1.04, 1.15, 0.98);
        this.ocotilloMaterial.color.setRGB(1.10, 1.25, 0.95);
        this.pricklyMaterial.color.setRGB(1.05, 1.18, 0.96);
        break;
      case 'summer':
        // Summer heat: Sun-parched warm yellowing on cacti
        this.saguaroMaterial.color.setRGB(1.16, 1.10, 0.86);
        this.ocotilloMaterial.color.setRGB(1.06, 0.96, 0.84);
        this.pricklyMaterial.color.setRGB(1.12, 1.04, 0.84);
        break;
      case 'autumn':
        // Autumn: Weathered amber-gold and russet tones
        this.saguaroMaterial.color.setRGB(0.96, 0.96, 0.86);
        this.ocotilloMaterial.color.setRGB(1.14, 0.96, 0.80);
        this.pricklyMaterial.color.setRGB(1.06, 0.96, 0.84);
        break;
      case 'winter':
        // Winter: Cool frosted silver-sage tint
        this.saguaroMaterial.color.setRGB(0.88, 0.98, 1.10);
        this.ocotilloMaterial.color.setRGB(0.90, 0.94, 1.05);
        this.pricklyMaterial.color.setRGB(0.88, 0.96, 1.08);
        break;
    }
    this.saguaroMaterial.needsUpdate = true;
    this.ocotilloMaterial.needsUpdate = true;
    this.pricklyMaterial.needsUpdate = true;
  }

  /**
   * Clean disposal on component unmount.
   */
  public dispose(): void {
    if (this.unsubscribeSeason) {
      this.unsubscribeSeason();
      this.unsubscribeSeason = undefined;
    }
    for (const mesh of this.allInstancedMeshes) {
      this.group.remove(mesh);
      mesh.dispose();
    }
    this.allInstancedMeshes = [];

    for (const mesh of this.contactShadowMeshes) {
      this.group.remove(mesh);
      mesh.dispose();
    }
    this.contactShadowMeshes = [];

    this.scene.remove(this.group);

    this.saguaroGeos.monarch.dispose();
    this.saguaroGeos.doubleArm.dispose();
    this.saguaroGeos.singleArm.dispose();
    this.saguaroGeos.columnar.dispose();
    this.ocotilloGeo.dispose();
    this.pricklyGeo.dispose();

    this.saguaroMaterial.dispose();
    this.ocotilloMaterial.dispose();
    this.pricklyMaterial.dispose();

    this.contactGeo.dispose();
    this.saguaroContactTexture.dispose();
    this.ocotilloContactTexture.dispose();
    this.pricklyContactTexture.dispose();
    this.saguaroContactMaterial.dispose();
    this.ocotilloContactMaterial.dispose();
    this.pricklyContactMaterial.dispose();
  }
}
