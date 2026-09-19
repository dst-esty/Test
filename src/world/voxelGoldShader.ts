import * as THREE from 'three';
import { VoxelType } from '../types';

/**
 * High-performance pseudo-random 2D hash for procedural noise.
 */
function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * Periodic smooth Perlin gradient noise (100% seamless tileable across [0, 1]).
 */
function periodicNoise(u: number, v: number, freq: number): number {
  const x = u * freq;
  const y = v * freq;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  // Quintic smoothstep S-curve for C2 continuity
  const wx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const wy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);

  const g = (ix: number, iy: number) => hash2(ix % freq, iy % freq);
  const n00 = g(x0, y0);
  const n10 = g(x0 + 1, y0);
  const n01 = g(x0, y0 + 1);
  const n11 = g(x0 + 1, y0 + 1);

  const nx0 = n00 * (1 - wx) + n10 * wx;
  const nx1 = n01 * (1 - wx) + n11 * wx;
  return nx0 * (1 - wy) + nx1 * wy;
}

/**
 * Periodic Worley/Cellular distance noise for natural rock fractures and crack networks.
 */
function periodicWorley(u: number, v: number, cells: number): number {
  let minDist = 999;
  const x = u * cells;
  const y = v * cells;
  const cx = Math.floor(x);
  const cy = Math.floor(y);

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const gx = (cx + dx + cells * 2) % cells;
      const gy = (cy + dy + cells * 2) % cells;
      const px = gx + hash2(gx * 17.3, gy * 31.7);
      const py = gy + hash2(gx * 53.1, gy * 19.9);

      let diffX = Math.abs((x - px) / cells);
      let diffY = Math.abs((y - py) / cells);
      if (diffX > 0.5) diffX = 1.0 - diffX;
      if (diffY > 0.5) diffY = 1.0 - diffY;

      const dist = Math.hypot(diffX * cells, diffY * cells);
      if (dist < minDist) minDist = dist;
    }
  }
  return minDist;
}

/**
 * Generates a seamless 256x256 RGBA procedural noise texture packed with multi-scale mineral noise:
 * - Channel R: Macro Perlin noise (broad geological fold & sinuous domain warping)
 * - Channel G: Worley cellular fracture noise (jagged rock crevices & mineral fissure paths)
 * - Channel B: High-frequency micro-crystalline noise (gold flecks, facets & metallic grain)
 * - Channel A: Multi-octave turbulence noise (vein thickness modulation & nugget clustering)
 */
export function generateNoiseTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;

      // Channel R: Macro geological noise (octaves 6 & 12)
      const r = (periodicNoise(u, v, 6) * 0.65 + periodicNoise(u, v, 12) * 0.35) * 255;

      // Channel G: Worley fracture cracks (normalized 0 to 1)
      const worley = Math.min(1, periodicWorley(u, v, 9) * 1.2);
      const g = worley * 255;

      // Channel B: Micro-fleck sparkling crystalline noise
      const b = (periodicNoise(u, v, 28) * 0.7 + periodicNoise(u, v, 48) * 0.3) * 255;

      // Channel A: Vein clustering turbulence
      const a = (periodicNoise(u, v, 14) * 0.6 + periodicNoise(u, v, 24) * 0.4) * 255;

      const idx = (y * size + x) * 4;
      data[idx] = Math.floor(r);
      data[idx + 1] = Math.floor(g);
      data[idx + 2] = Math.floor(b);
      data[idx + 3] = Math.floor(a);
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * GLSL Vertex Shader Chunk for custom voxel world coordinate passing.
 * Calculates true continuous world coordinates across instanced or single voxel meshes.
 */
export const GOLD_VEIN_VERTEX_SHADER_CHUNK = /* glsl */ `
#include <worldpos_vertex>

// Calculate true continuous 3D world position for seamless gold vein flow across voxels
vec4 customVoxelWorldPos = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  customVoxelWorldPos = batchingMatrix * customVoxelWorldPos;
#endif
#ifdef USE_INSTANCING
  customVoxelWorldPos = instanceMatrix * customVoxelWorldPos;
#endif
customVoxelWorldPos = modelMatrix * customVoxelWorldPos;

vVoxelWorldPos = customVoxelWorldPos.xyz;
vVoxelNormal = normalize((modelMatrix * vec4(transformedNormal, 0.0)).xyz);
`;

/**
 * Full GLSL Fragment Shader Chunk for procedural gold veins across mine voxels.
 */
export const GOLD_VEIN_FRAGMENT_SHADER_DECLARATIONS = /* glsl */ `
#include <common>

// ============================================================================
// Procedural Gold Vein GLSL Uniforms & Custom Functions
// ============================================================================
uniform sampler2D uNoiseTexture;
uniform float uTime;
uniform float uNoiseScale;
uniform float uVeinScale;
uniform float uVeinIntensity;
uniform float uVeinCenterY;
uniform vec3 uGoldColor;
uniform vec3 uGoldAmber;
uniform vec3 uQuartzColor;
uniform vec3 uCrackColor;

varying highp vec3 vVoxelWorldPos;
varying highp vec3 vVoxelNormal;

/**
 * Triplanar projection sampling of the procedural noise texture.
 * Ensures seamless texture blending across all cubic voxel faces in world space.
 */
vec4 sampleTriplanarNoise(sampler2D tex, vec3 pos, float scale, vec3 norm) {
  vec3 blend = abs(norm);
  blend = normalize(max(blend, 0.0001));
  blend /= (blend.x + blend.y + blend.z);

  vec4 cx = texture2D(tex, pos.yz * scale);
  vec4 cy = texture2D(tex, pos.xz * scale);
  vec4 cz = texture2D(tex, pos.xy * scale);
  return cx * blend.x + cy * blend.y + cz * blend.z;
}
`;

export const GOLD_VEIN_FRAGMENT_SHADER_COLOR_CHUNK = /* glsl */ `
#include <color_fragment>

// ============================================================================
// Procedural Gold Vein Evaluation across Mine Voxels
// ============================================================================
vec3 safeNorm = normalize(vVoxelNormal);

// 1. Multi-scale Triplanar Noise Sampling
vec4 nMacro = sampleTriplanarNoise(uNoiseTexture, vVoxelWorldPos, uNoiseScale * 0.35, safeNorm);
vec4 nMicro = sampleTriplanarNoise(uNoiseTexture, vVoxelWorldPos, uNoiseScale * 1.15, safeNorm);
vec4 nFleck = sampleTriplanarNoise(uNoiseTexture, vVoxelWorldPos, uNoiseScale * 3.8, safeNorm);

// 2. 3D Domain Warping: veins snake naturally through geological rock strata
vec3 warpedPos = vVoxelWorldPos + (nMacro.rgb - 0.5) * 1.6;

// 3. Primary Hydrothermal Fault Plane (Major gold seam)
float veinDist1 = abs(
  sin(warpedPos.x * 0.42 * uVeinScale + warpedPos.z * 0.36 * uVeinScale) * 2.4 +
  (warpedPos.y - uVeinCenterY) * 0.85 +
  (nMicro.r - 0.5) * 1.3
);

// 4. Secondary Tension Fracture Branches (Shooting off the main lode)
float veinDist2 = abs(
  cos(warpedPos.z * 0.58 * uVeinScale - warpedPos.x * 0.38 * uVeinScale) * 2.0 +
  (warpedPos.y - (uVeinCenterY - 1.8)) * 1.1 +
  (nMicro.a - 0.5) * 1.15
);

float seamDist = min(veinDist1, veinDist2);

// 5. High-frequency Mineral Crevice/Fracture Mask (from cellular Worley channel G)
float crackMask = smoothstep(0.14, 0.015, abs(nMicro.g - 0.49));

// 6. Crystalline Quartz Alteration Halo (bleached milky quartz envelope)
float quartzHalo = smoothstep(1.5, 0.22, seamDist) * 0.82;

// 7. Pure Rich Metallic Gold Vein Core
float goldCore = smoothstep(0.28, 0.03, seamDist);
goldCore = max(goldCore, crackMask * 0.88);

// 8. Raw Gold Nugget Clusters (concentrated ore pockets)
float nuggetMask = step(0.68, nMacro.r) * step(0.63, nMicro.a) * smoothstep(0.75, 0.08, seamDist);

// 9. Disseminated Micro-crystalline Gold Dust & Flecks
float fleckMask = step(0.72, nFleck.b) * quartzHalo * 0.85;

// 10. Combined Gold Mask (scaled by per-voxel-type vein intensity)
float goldMask = clamp(goldCore + nuggetMask * 1.3 + fleckMask, 0.0, 1.0) * uVeinIntensity;

// 11. Color Blending: Host Rock -> Quartz Alteration -> Rich 24K Gold & Electrum
vec3 goldHue = mix(uGoldAmber, uGoldColor, nMicro.r);
goldHue = mix(goldHue, vec3(1.0, 0.96, 0.65), nuggetMask * 0.8);

diffuseColor.rgb = mix(diffuseColor.rgb, uQuartzColor, quartzHalo * (1.0 - goldMask));
diffuseColor.rgb = mix(diffuseColor.rgb, goldHue, goldMask);
`;

export const GOLD_VEIN_FRAGMENT_SHADER_ROUGHNESS_CHUNK = /* glsl */ `
#include <roughnessmap_fragment>
// Quartz host is semi-glossy; gold vein core is mirror-smooth metallic
roughnessFactor = mix(roughnessFactor, 0.35, quartzHalo * (1.0 - goldMask));
roughnessFactor = mix(roughnessFactor, 0.16, goldMask);
`;

export const GOLD_VEIN_FRAGMENT_SHADER_METALNESS_CHUNK = /* glsl */ `
#include <metalnessmap_fragment>
// High metallic reflectance on gold vein formations
metalnessFactor = mix(metalnessFactor, 0.98, goldMask);
`;

export const GOLD_VEIN_FRAGMENT_SHADER_NORMAL_CHUNK = /* glsl */ `
#include <normal_fragment_begin>
// Procedural normal bump perturbation for 3D gold nugget relief and quartz fracture seams
vec3 veinBump = vec3(dFdx(goldMask * 0.85 + quartzHalo * 0.25), dFdy(goldMask * 0.85 + quartzHalo * 0.25), 0.0);
normal = normalize(normal - veinBump * 3.2);
`;

export const GOLD_VEIN_FRAGMENT_SHADER_EMISSIVE_CHUNK = /* glsl */ `
#include <emissivemap_fragment>
// Micro-facet specular glint and animated torchlight shimmer across gold vein surfaces
vec3 viewDir = normalize(cameraPosition - vVoxelWorldPos);
vec3 lightDir = normalize(vec3(0.45, 0.85, 0.35));
vec3 halfVec = normalize(viewDir + lightDir);
float specGlint = pow(max(dot(safeNorm, halfVec), 0.0), 36.0) * nFleck.b;
float shimmer = sin(uTime * 3.2 + vVoxelWorldPos.x * 7.5 + vVoxelWorldPos.y * 5.8 + vVoxelWorldPos.z * 6.8) * 0.15 + 0.15;
vec3 goldRadiance = uGoldColor * (0.35 + 0.45 * specGlint + shimmer);
totalEmissiveRadiance += goldRadiance * goldMask;
`;

export interface VoxelShaderUniforms {
  uNoiseTexture: { value: THREE.Texture };
  uTime: { value: number };
  uNoiseScale: { value: number };
  uVeinScale: { value: number };
  uVeinIntensity: { value: number };
  uVeinCenterY: { value: number };
  uGoldColor: { value: THREE.Color };
  uGoldAmber: { value: THREE.Color };
  uQuartzColor: { value: THREE.Color };
  uCrackColor: { value: THREE.Color };
}

/**
 * Creates a MeshStandardMaterial enhanced with the custom GLSL procedural gold vein fragment shader.
 */
export function createGoldVeinStandardMaterial(options: {
  baseColor: number;
  roughness: number;
  metalness: number;
  veinIntensity: number;
  noiseTexture: THREE.Texture;
  sharedTimeUniform?: { value: number };
  veinCenterY?: number;
}): { material: THREE.MeshStandardMaterial; uniforms: VoxelShaderUniforms } {
  const {
    baseColor,
    roughness,
    metalness,
    veinIntensity,
    noiseTexture,
    sharedTimeUniform = { value: 0 },
    veinCenterY = 48.0,
  } = options;

  const uniforms: VoxelShaderUniforms = {
    uNoiseTexture: { value: noiseTexture },
    uTime: sharedTimeUniform,
    uNoiseScale: { value: 0.18 },
    uVeinScale: { value: 1.0 },
    uVeinIntensity: { value: veinIntensity },
    uVeinCenterY: { value: veinCenterY },
    uGoldColor: { value: new THREE.Color(0xffd700) },
    uGoldAmber: { value: new THREE.Color(0xd4af37) },
    uQuartzColor: { value: new THREE.Color(0xf0ece1) },
    uCrackColor: { value: new THREE.Color(0x2d1f14) },
  };

  const material = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness,
    metalness,
  });

  material.onBeforeCompile = (shader) => {
    // Inject custom uniforms
    Object.assign(shader.uniforms, uniforms);

    // Vertex Shader injections
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>\nvarying highp vec3 vVoxelWorldPos;\nvarying highp vec3 vVoxelNormal;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      GOLD_VEIN_VERTEX_SHADER_CHUNK
    );

    // Fragment Shader injections
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      GOLD_VEIN_FRAGMENT_SHADER_DECLARATIONS
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      GOLD_VEIN_FRAGMENT_SHADER_COLOR_CHUNK
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      GOLD_VEIN_FRAGMENT_SHADER_ROUGHNESS_CHUNK
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <metalnessmap_fragment>',
      GOLD_VEIN_FRAGMENT_SHADER_METALNESS_CHUNK
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      GOLD_VEIN_FRAGMENT_SHADER_NORMAL_CHUNK
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      GOLD_VEIN_FRAGMENT_SHADER_EMISSIVE_CHUNK
    );
  };

  return { material, uniforms };
}

/**
 * Creates full voxel material dictionary with the custom GLSL fragment shader for procedural gold veins.
 */
export function createGoldVeinVoxelMaterials(
  noiseTexture: THREE.Texture,
  sharedTimeUniform?: { value: number },
  veinCenterY = 48.0
): {
  materials: Record<VoxelType, THREE.MeshStandardMaterial>;
  uniformsList: VoxelShaderUniforms[];
} {
  const time = sharedTimeUniform || { value: 0 };
  const uniformsList: VoxelShaderUniforms[] = [];

  const config: Record<
    VoxelType,
    { baseColor: number; roughness: number; metalness: number; veinIntensity: number }
  > = {
    sandstone: { baseColor: 0xc87d46, roughness: 0.88, metalness: 0.05, veinIntensity: 0.85 },
    granite: { baseColor: 0x5a504a, roughness: 0.75, metalness: 0.1, veinIntensity: 0.9 },
    quartz_gold: { baseColor: 0xffe680, roughness: 0.28, metalness: 0.85, veinIntensity: 1.85 },
    silver_ore: { baseColor: 0x7c858b, roughness: 0.42, metalness: 0.7, veinIntensity: 0.95 },
    calcite: { baseColor: 0xede4d4, roughness: 0.28, metalness: 0.05, veinIntensity: 1.05 },
    dirt: { baseColor: 0x825432, roughness: 0.95, metalness: 0.02, veinIntensity: 0.45 },
  };

  const materials = {} as Record<VoxelType, THREE.MeshStandardMaterial>;

  (Object.keys(config) as VoxelType[]).forEach((type) => {
    const { baseColor, roughness, metalness, veinIntensity } = config[type];
    const { material, uniforms } = createGoldVeinStandardMaterial({
      baseColor,
      roughness,
      metalness,
      veinIntensity,
      noiseTexture,
      sharedTimeUniform: time,
      veinCenterY,
    });
    materials[type] = material;
    uniformsList.push(uniforms);
  });

  return { materials, uniformsList };
}
