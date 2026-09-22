import * as THREE from 'three';
import { getTerrainHeight } from './terrain';
import { WeatherType } from '../types';

/**
 * Desert Hydrological Network for the Superstition Mountains
 * Accurately models Sonoran Desert ephemeral arroyos, mountain washes,
 * and bedrock plunge pools (tinajas) that awaken when desert rain arrives.
 */

export interface WaterChannelPoint {
  x: number;
  z: number;
  width: number;
  baseDepth: number; // bedrock depression depth
  maxFloodRise: number; // surge height during storms
}

export interface TinajaPool {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  maxDepth: number;
  waterLevel: number; // 0.0 to 1.0
  isPerennial: boolean; // spring-fed vs purely rain-fed
  waterQuality: 'pure_rain' | 'fresh_spring' | 'stagnant_alkali' | 'flood_silt';
}

export interface HydrologicalState {
  currentWeather: WeatherType;
  rainIntensity: number; // 0.0 (bone dry) to 1.0 (monsoon)
  stormAccumulation: number; // 0.0 to 100.0 (soil saturation & runoff buffer)
  flashFloodActive: boolean;
  flashFloodLevel: number; // 0.0 to 1.0 surge factor
  soilMoisture: number; // 0.0 to 1.0
  streamFlowVelocity: number; // m/s
  streamWaterRise: number; // meters water has risen in washes
}

// 1. Box Canyon Primary Wash (Main gorge fluvial riverbed)
const createBoxCanyonPoints = (): WaterChannelPoint[] => {
  const pts: WaterChannelPoint[] = [];
  for (let x = -175; x <= 175; x += 3.0) {
    const z = Math.sin(x * 0.013 + 0.9) * 38 + Math.cos(x * 0.006) * 20;
    const width = 8.5 + Math.sin(x * 0.04) * 2.5;
    pts.push({ x, z, width, baseDepth: 1.4, maxFloodRise: 2.2 });
  }
  return pts;
};

// 2. Needle Canyon Mountain Creek (Drains Weaver's Needle amphitheater at x: 0, z: 15)
const NEEDLE_CREEK_POINTS: WaterChannelPoint[] = [
  { x: 2,  z: 42, width: 4.5, baseDepth: 0.8, maxFloodRise: 1.5 },
  { x: 2,  z: 32, width: 5.4, baseDepth: 1.0, maxFloodRise: 1.8 },
  { x: 3,  z: 24, width: 6.0, baseDepth: 1.1, maxFloodRise: 1.9 },
  { x: 4,  z: 18, width: 6.8, baseDepth: 1.2, maxFloodRise: 2.0 },
  { x: 5,  z: 14, width: 7.5, baseDepth: 1.3, maxFloodRise: 2.2 },
  { x: 6,  z: 11, width: 8.2, baseDepth: 1.4, maxFloodRise: 2.4 },
];

// 3. Hieroglyphic Springs Arroyo (Mountain spring runoff tributary)
const HIEROGLYPHIC_CREEK_POINTS: WaterChannelPoint[] = [
  { x: -70, z: -20, width: 5.5, baseDepth: 1.1, maxFloodRise: 1.8 },
  { x: -58, z: -19, width: 6.0, baseDepth: 1.2, maxFloodRise: 1.9 },
  { x: -46, z: -18, width: 6.8, baseDepth: 1.3, maxFloodRise: 2.0 },
  { x: -35, z: -17, width: 7.6, baseDepth: 1.4, maxFloodRise: 2.2 },
];

// 4. Tortilla Flat Creek Wash (Flows through the eastern canyon wash far east of the settlement into the Salt River)
const createTortillaCreekWashPoints = (): WaterChannelPoint[] => [
  { x: 48,  z: -168, width: 6.5,  baseDepth: 1.0, maxFloodRise: 1.8 },
  { x: 44,  z: -198, width: 7.2,  baseDepth: 1.2, maxFloodRise: 2.0 },
  { x: 40,  z: -232, width: 8.0,  baseDepth: 1.3, maxFloodRise: 2.2 },
  { x: 38,  z: -268, width: 8.8,  baseDepth: 1.5, maxFloodRise: 2.4 },
  { x: 34,  z: -292, width: 10.5, baseDepth: 1.7, maxFloodRise: 2.8 },
  { x: 28,  z: -305, width: 14.0, baseDepth: 2.2, maxFloodRise: 3.2 }, // Confluence into the Salt River north of town
];

// 5. The Grand Salt River (Perennial mountain river winding east-to-west across the northern canyon, north of town)
const createSaltRiverPoints = (): WaterChannelPoint[] => {
  const pts: WaterChannelPoint[] = [];
  for (let x = -310; x <= 310; x += 8.0) {
    const z = -305 + Math.sin(x * 0.016) * 9.0 + Math.cos(x * 0.008) * 5.0;
    const width = 22.0 + Math.sin(x * 0.032) * 4.0;
    pts.push({ x, z, width, baseDepth: 2.8, maxFloodRise: 3.2 });
  }
  return pts;
};

export interface StreamNetworkDef {
  name: string;
  points: WaterChannelPoint[];
  isPerennial?: boolean;
}

export const STREAM_NETWORKS: StreamNetworkDef[] = [
  { name: 'The Salt River', points: createSaltRiverPoints(), isPerennial: true },
  { name: 'Box Canyon Arroyo', points: createBoxCanyonPoints() },
  { name: 'Needle Creek Wash', points: NEEDLE_CREEK_POINTS },
  { name: 'Hieroglyphic Spring Tributary', points: HIEROGLYPHIC_CREEK_POINTS },
  { name: 'Tortilla Creek Wash & Confluence', points: createTortillaCreekWashPoints() },
];

// Backward-compatibility export
export const ARROYO_CHANNELS: WaterChannelPoint[] = [
  ...createSaltRiverPoints(),
  ...createBoxCanyonPoints(),
  ...NEEDLE_CREEK_POINTS,
  ...createTortillaCreekWashPoints(),
];

// Natural Sonoran Bedrock Tinajas
export const TINAJAS: TinajaPool[] = [
  {
    id: 'salt_river_basin',
    name: 'Salt River Canyon Riverbank',
    x: 0,
    z: -305,
    radius: 12.0,
    maxDepth: 3.4,
    waterLevel: 1.0,
    isPerennial: true,
    waterQuality: 'fresh_spring',
  },
  {
    id: 'hieroglyphic_spring',
    name: 'Hieroglyphic Springs Tinaja',
    x: -70,
    z: -20,
    radius: 7.5,
    maxDepth: 2.2,
    waterLevel: 0.95,
    isPerennial: true,
    waterQuality: 'fresh_spring',
  },
  {
    id: 'needle_gorge_pothole',
    name: "Weaver's Needle Plunge Basin",
    x: 68,
    z: 32,
    radius: 5.5,
    maxDepth: 1.8,
    waterLevel: 0.40,
    isPerennial: false,
    waterQuality: 'pure_rain',
  },
  {
    id: 'peralta_canyon_tinaja',
    name: 'Peralta Canyon Shadow Tinaja',
    x: -35,
    z: 75,
    radius: 4.8,
    maxDepth: 1.5,
    waterLevel: 0.35,
    isPerennial: false,
    waterQuality: 'pure_rain',
  },
  {
    id: 'pistol_canyon_tinaja',
    name: 'Pistol Canyon Bedrock Tinaja',
    x: 180,
    z: -163,
    radius: 3.2,
    maxDepth: 1.6,
    waterLevel: 0.50,
    isPerennial: true,
    waterQuality: 'fresh_spring',
  },
  {
    id: 'peters_pinch_tinaja',
    name: "The Pinch of Peter's Canyon Emerald Tinaja",
    x: 238,
    z: -288,
    radius: 2.8,
    maxDepth: 1.8,
    waterLevel: 0.75,
    isPerennial: true,
    waterQuality: 'fresh_spring',
  },
];

export class DesertHydrologyEngine {
  private scene: THREE.Scene;
  private state: HydrologicalState = {
    currentWeather: 'clear',
    rainIntensity: 0.0,
    stormAccumulation: 0.0,
    flashFloodActive: false,
    flashFloodLevel: 0.0,
    soilMoisture: 0.05,
    streamFlowVelocity: 0.0,
    streamWaterRise: 0.0,
  };

  private waterMeshGroup: THREE.Group = new THREE.Group();
  private streamMeshes: THREE.Mesh[] = [];
  private gravelMeshes: THREE.Mesh[] = [];
  private tinajaMeshes: THREE.Mesh[] = [];
  private poolWaterMeshes: THREE.Mesh[] = [];

  private waterShaderMat: THREE.ShaderMaterial;
  private poolWaterShaderMat: THREE.ShaderMaterial;
  private gravelMat: THREE.MeshStandardMaterial;

  private elapsedTime: number = 0;
  private flashFloodWarningTriggered: boolean = false;

  public onFlashFloodWarning?: (message: string) => void;
  public onFlashFloodReceded?: () => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Dedicated Water Surface Shader with animated flow, caustics, ripples, foam, and rain rings
    this.waterShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFlowSpeed: { value: 1.2 },
        uRainIntensity: { value: 0.0 },
        uStormFactor: { value: 0.0 },
        uWaterRise: { value: 0.0 },
        uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
        uCameraPos: { value: new THREE.Vector3() },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uFlowSpeed;
        uniform float uRainIntensity;
        uniform float uWaterRise;

        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Physical flowing wave displacement
          float wave1 = sin(pos.x * 0.85 + uTime * uFlowSpeed * 2.8) * cos(pos.z * 0.85 + uTime * uFlowSpeed * 2.1);
          float wave2 = sin(pos.x * 1.9 - uTime * uFlowSpeed * 1.5) * cos(pos.z * 1.9 - uTime * 1.8);
          float totalWave = (wave1 * 0.032 + wave2 * 0.016) * (0.35 + uRainIntensity * 0.65);
          
          pos.y += totalWave + uWaterRise;
          
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          
          // Dynamic normal approximation
          float dX = cos(pos.x * 0.85 + uTime * uFlowSpeed * 2.8) * 0.032;
          float dZ = -sin(pos.z * 0.85 + uTime * uFlowSpeed * 2.1) * 0.032;
          vNormal = normalize(normalMatrix * normalize(vec3(-dX, 1.0, -dZ)));
          
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uFlowSpeed;
        uniform float uRainIntensity;
        uniform float uStormFactor;
        uniform vec3 uSunDir;
        uniform vec3 uCameraPos;

        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        void main() {
          // Flowing stream UVs
          vec2 flowUv = vUv;
          flowUv.y += uTime * uFlowSpeed * 0.22;
          
          // Caustics & Ripple interference
          float r1 = sin(flowUv.x * 18.0 + uTime * 2.5) * cos(flowUv.y * 14.0 - uTime * 3.2);
          float r2 = sin(flowUv.x * 28.0 - uTime * 1.8) * cos(flowUv.y * 24.0 + uTime * 2.1);
          float ripples = (r1 + r2) * 0.5;
          
          // Concentric Raindrop Rings on surface
          float rainRings = 0.0;
          if (uRainIntensity > 0.02) {
            vec2 dropGrid = vWorldPos.xz * 1.4;
            vec2 dropCell = floor(dropGrid);
            vec2 dropFract = fract(dropGrid) - 0.5;
            float seed = sin(dot(dropCell, vec2(12.9898, 78.233))) * 43758.5453;
            float dropPhase = fract(uTime * 1.8 + seed);
            float ringDist = length(dropFract);
            float ringWave = sin(ringDist * 28.0 - dropPhase * 12.0) * smoothstep(0.48, 0.0, ringDist);
            rainRings = max(0.0, ringWave) * uRainIntensity * 0.42;
          }
          
          // Bank foam & turbulent rapid crests
          float edgeDist = min(vUv.x, 1.0 - vUv.x);
          float edgeFoam = smoothstep(0.18, 0.02, edgeDist) * (0.35 + ripples * 0.35 + uRainIntensity * 0.3);
          float crestFoam = smoothstep(0.65, 0.95, ripples) * (0.1 + uStormFactor * 0.45);
          float totalFoam = clamp(edgeFoam + crestFoam, 0.0, 1.0);
          
          // Palette: Natural western stream with clear emerald-turquoise mountain spring vs silty arroyo runoff
          vec3 calmColor = vec3(0.11, 0.44, 0.48);
          vec3 deepPoolColor = vec3(0.06, 0.28, 0.35);
          vec3 stormColor = vec3(0.44, 0.31, 0.19);
          vec3 foamColor = vec3(0.94, 0.92, 0.88);
          
          vec3 waterBody = mix(calmColor, deepPoolColor, clamp(vWorldPos.y * -0.05, 0.0, 0.6));
          vec3 baseWater = mix(waterBody, stormColor, uStormFactor);
          
          // Sun specular glint with realistic micro-facet spread
          vec3 viewDir = normalize(uCameraPos - vWorldPos);
          vec3 lightDir = normalize(uSunDir);
          vec3 halfVec = normalize(lightDir + viewDir);
          
          vec3 perturbedNormal = normalize(vNormal + vec3(ripples * 0.16, 0.0, ripples * 0.16));
          float spec = pow(max(0.0, dot(perturbedNormal, halfVec)), 64.0) * 1.8;
          float broadSpec = pow(max(0.0, dot(perturbedNormal, halfVec)), 14.0) * 0.25;
          
          // Fresnel reflection with sky color bounce
          float fresnel = pow(1.0 - max(0.0, dot(viewDir, perturbedNormal)), 4.0);
          
          vec3 finalColor = mix(baseWater, foamColor, totalFoam);
          finalColor += (spec + broadSpec) * vec3(1.0, 0.94, 0.80) * (0.85 + uRainIntensity * 0.3);
          finalColor += rainRings * vec3(0.85, 0.92, 0.98);
          finalColor = mix(finalColor, vec3(0.76, 0.84, 0.92), fresnel * 0.55);
          
          float baseOpacity = 0.82 + uRainIntensity * 0.14;
          float alpha = clamp(baseOpacity * (0.38 + fresnel * 0.62 + totalFoam * 0.55), 0.0, 0.96);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // 2. Pool Water Material (placid tinaja water with gentle ripples & rain rings)
    this.poolWaterShaderMat = this.waterShaderMat.clone();
    this.poolWaterShaderMat.uniforms = THREE.UniformsUtils.clone(this.waterShaderMat.uniforms);
    this.poolWaterShaderMat.uniforms.uFlowSpeed.value = 0.25;

    // 3. Dry Wash Gravel Bed Material (natural river cobbles & wet desert sand)
    this.gravelMat = new THREE.MeshStandardMaterial({
      color: 0x9b7852,
      roughness: 0.92,
      metalness: 0.04,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    this.buildHydrologicalMeshes();
  }

  /**
   * Generates stream ribbons, gravel wash beds, and natural rock-rimmed tinaja pools.
   */
  private buildHydrologicalMeshes() {
    this.waterMeshGroup.name = 'DesertHydrologyNetwork';

    // 1. Build Stream Channels
    STREAM_NETWORKS.forEach((net) => {
      const { waterMesh, gravelMesh } = this.createStreamChannelMeshes(net.points, Boolean(net.isPerennial));
      this.streamMeshes.push(waterMesh);
      this.gravelMeshes.push(gravelMesh);
      this.waterMeshGroup.add(gravelMesh);
      this.waterMeshGroup.add(waterMesh);
    });

    // 2. Build Bedrock Tinajas & Natural Pool Rock Basins
    TINAJAS.forEach((tinaja) => {
      this.createTinajaPool(tinaja);
    });

    this.scene.add(this.waterMeshGroup);
  }

  /**
   * Constructs a contoured stream ribbon conforming accurately to the local terrain profile.
   */
  private createStreamChannelMeshes(points: WaterChannelPoint[], isPerennial = false): {
    waterMesh: THREE.Mesh;
    gravelMesh: THREE.Mesh;
  } {
    const waterPositions: number[] = [];
    const waterUvs: number[] = [];
    const waterIndices: number[] = [];

    const gravelPositions: number[] = [];
    const gravelUvs: number[] = [];
    const gravelIndices: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      // Tangent direction
      let dx = 0;
      let dz = 1;
      if (i < points.length - 1) {
        dx = points[i + 1].x - p.x;
        dz = points[i + 1].z - p.z;
      } else if (i > 0) {
        dx = p.x - points[i - 1].x;
        dz = p.z - points[i - 1].z;
      }
      const len = Math.hypot(dx, dz) || 1.0;
      const nx = -dz / len;
      const nz = dx / len;

      const halfW = p.width * 0.5;

      // Sample terrain heights across cross-section
      const pLeft = { x: p.x - nx * halfW, z: p.z - nz * halfW };
      const pCenter = { x: p.x, z: p.z };
      const pRight = { x: p.x + nx * halfW, z: p.z + nz * halfW };

      const yLeft = getTerrainHeight(pLeft.x, pLeft.z);
      const yCenter = getTerrainHeight(pCenter.x, pCenter.z);
      const yRight = getTerrainHeight(pRight.x, pRight.z);

      // Low point of wash
      const bedY = Math.min(yLeft, yCenter, yRight);
      const waterY = bedY + 0.12;
      const gravelY = bedY + 0.03;

      const vProgress = i / (points.length - 1);

      // Water vertices (Left, Right)
      const wIdx = waterPositions.length / 3;
      waterPositions.push(pLeft.x, waterY, pLeft.z);
      waterUvs.push(0.0, vProgress * 12.0);

      waterPositions.push(pRight.x, waterY, pRight.z);
      waterUvs.push(1.0, vProgress * 12.0);

      // Gravel bed vertices (Left bank, Center bed, Right bank)
      const gIdx = gravelPositions.length / 3;
      gravelPositions.push(pLeft.x, yLeft + 0.02, pLeft.z);
      gravelUvs.push(0.0, vProgress * 12.0);

      gravelPositions.push(pCenter.x, gravelY, pCenter.z);
      gravelUvs.push(0.5, vProgress * 12.0);

      gravelPositions.push(pRight.x, yRight + 0.02, pRight.z);
      gravelUvs.push(1.0, vProgress * 12.0);

      if (i < points.length - 1) {
        // Water quads
        waterIndices.push(wIdx, wIdx + 1, wIdx + 2);
        waterIndices.push(wIdx + 1, wIdx + 3, wIdx + 2);

        // Gravel quads (2 strips)
        gravelIndices.push(gIdx, gIdx + 1, gIdx + 3);
        gravelIndices.push(gIdx + 1, gIdx + 4, gIdx + 3);

        gravelIndices.push(gIdx + 1, gIdx + 2, gIdx + 4);
        gravelIndices.push(gIdx + 2, gIdx + 5, gIdx + 4);
      }
    }

    // Build Water Mesh
    const waterGeo = new THREE.BufferGeometry();
    waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
    waterGeo.setAttribute('uv', new THREE.Float32BufferAttribute(waterUvs, 2));
    waterGeo.setIndex(waterIndices);
    waterGeo.computeVertexNormals();

    const waterMesh = new THREE.Mesh(waterGeo, this.waterShaderMat);
    waterMesh.frustumCulled = false;
    waterMesh.visible = isPerennial; // Perennial river is always flowing; arroyos flow during rain
    waterMesh.userData = { isPerennial };

    // Build Gravel Mesh
    const gravelGeo = new THREE.BufferGeometry();
    gravelGeo.setAttribute('position', new THREE.Float32BufferAttribute(gravelPositions, 3));
    gravelGeo.setAttribute('uv', new THREE.Float32BufferAttribute(gravelUvs, 2));
    gravelGeo.setIndex(gravelIndices);
    gravelGeo.computeVertexNormals();

    const gravelMesh = new THREE.Mesh(gravelGeo, this.gravelMat);
    gravelMesh.frustumCulled = false;

    return { waterMesh, gravelMesh };
  }

  /**
   * Creates a natural rock-framed desert tinaja basin and water pool disk.
   */
  private createTinajaPool(tinaja: TinajaPool) {
    const groundY = getTerrainHeight(tinaja.x, tinaja.z);

    // 1. Natural Boulder Rim framing the pool
    const numRocks = 18;
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x7a5038,
      roughness: 0.94,
      metalness: 0.05,
      flatShading: true,
    });

    const rockGroup = new THREE.Group();
    for (let i = 0; i < numRocks; i++) {
      const angle = (i / numRocks) * Math.PI * 2;
      const r = tinaja.radius * (0.95 + Math.sin(i * 3.7) * 0.15);
      const rx = tinaja.x + Math.cos(angle) * r;
      const rz = tinaja.z + Math.sin(angle) * r;
      const ry = getTerrainHeight(rx, rz);

      const bSize = 0.65 + (Math.sin(i * 4.2) * 0.5 + 0.5) * 0.55;
      const rockGeo = new THREE.DodecahedronGeometry(bSize, 0);
      rockGeo.scale(1.2, 0.75, 1.1);

      const rockMesh = new THREE.Mesh(rockGeo, rockMat);
      rockMesh.position.set(rx, ry + bSize * 0.35, rz);
      rockMesh.rotation.set(angle * 0.5, i * 1.3, angle * 0.3);
      rockMesh.castShadow = true;
      rockMesh.frustumCulled = false;
      rockGroup.add(rockMesh);
    }
    this.waterMeshGroup.add(rockGroup);
    this.tinajaMeshes.push(rockGroup as any);

    // 2. Circular Animated Water Disk
    const poolWaterGeo = new THREE.CircleGeometry(tinaja.radius * 0.92, 32);
    poolWaterGeo.rotateX(-Math.PI / 2);

    const poolWaterMesh = new THREE.Mesh(poolWaterGeo, this.poolWaterShaderMat);
    poolWaterMesh.position.set(tinaja.x, groundY + 0.12, tinaja.z);
    poolWaterMesh.userData = {
      tinajaId: tinaja.id,
      baseY: groundY + 0.12,
      maxRise: tinaja.maxDepth * 0.6,
    };
    poolWaterMesh.frustumCulled = false;

    // Perennial pools are always visible; rain-fed pools show when rain starts or have residual water
    poolWaterMesh.visible = tinaja.isPerennial || tinaja.waterLevel > 0.05;

    this.waterMeshGroup.add(poolWaterMesh);
    this.poolWaterWaterMeshesPush(poolWaterMesh);
  }

  private poolWaterWaterMeshesPush(mesh: THREE.Mesh) {
    this.poolWaterMeshes.push(mesh);
  }

  /**
   * Evaluates if a given coordinate (x, z) is currently inside an active water channel or tinaja.
   */
  public queryWaterAtPosition(x: number, z: number): {
    hasWater: boolean;
    waterHeight: number;
    depth: number;
    isFlashFlood: boolean;
    flowVelocity: number;
    sourceName: string;
    canDrink: boolean;
    waterQuality: 'pure_rain' | 'fresh_spring' | 'stagnant_alkali' | 'flood_silt';
  } {
    // 1. Check Tinajas
    for (const tinaja of TINAJAS) {
      const dist = Math.hypot(x - tinaja.x, z - tinaja.z);
      if (dist <= tinaja.radius) {
        const groundY = getTerrainHeight(tinaja.x, tinaja.z);
        const curDepth = tinaja.maxDepth * tinaja.waterLevel;
        const hasWater = curDepth > 0.05;
        return {
          hasWater,
          waterHeight: groundY + 0.15 + (tinaja.waterLevel * 0.25),
          depth: curDepth,
          isFlashFlood: false,
          flowVelocity: 0.1,
          sourceName: tinaja.name,
          canDrink: hasWater,
          waterQuality: tinaja.waterQuality,
        };
      }
    }

    // 2. Check Stream Channels
    const streamHasWater = this.state.streamWaterRise > 0.03 || this.state.rainIntensity > 0.12 || this.state.flashFloodLevel > 0.05;
    for (const net of STREAM_NETWORKS) {
      if (!net.isPerennial && !streamHasWater) continue;
      for (let i = 0; i < net.points.length - 1; i++) {
        const p1 = net.points[i];
        const p2 = net.points[i + 1];

        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const segLenSq = dx * dx + dz * dz;
        const u = Math.max(0, Math.min(1, ((x - p1.x) * dx + (z - p1.z) * dz) / segLenSq));

        const projX = p1.x + u * dx;
        const projZ = p1.z + u * dz;
        const distToCenter = Math.hypot(x - projX, z - projZ);

        const currentWidth = p1.width * (1 - u) + p2.width * u;
        if (distToCenter <= currentWidth * 0.55) {
          const groundY = getTerrainHeight(x, z);
          const baseDepth = net.isPerennial ? 2.2 : 0.12;
          const depth = Math.max(baseDepth, this.state.streamWaterRise);
          return {
            hasWater: true,
            waterHeight: groundY + depth,
            depth,
            isFlashFlood: this.state.flashFloodActive,
            flowVelocity: net.isPerennial ? Math.max(1.4, this.state.streamFlowVelocity) : this.state.streamFlowVelocity,
            sourceName: net.name,
            canDrink: true,
            waterQuality: this.state.flashFloodActive ? 'flood_silt' : (net.isPerennial ? 'fresh_spring' : 'pure_rain'),
          };
        }
      }
    }

    return {
      hasWater: false,
      waterHeight: 0,
      depth: 0,
      isFlashFlood: false,
      flowVelocity: 0,
      sourceName: 'Dry Desert Rock',
      canDrink: false,
      waterQuality: 'stagnant_alkali',
    };
  }

  /**
   * Main per-frame update loop for desert hydrology, stream flow, and weather response.
   */
  public update(delta: number, weather: WeatherType) {
    this.elapsedTime += delta;
    this.state.currentWeather = weather;

    // 1. Target Rain Intensity based on Weather
    let targetRain = 0.0;
    if (weather === 'storm') {
      targetRain = 1.0; // Torrential monsoon cloudburst
    } else if (weather === 'light_rain') {
      targetRain = 0.55; // Desert shower
    } else if (weather === 'clouds') {
      targetRain = 0.05; // Humid mist
    }

    // Smooth transition
    this.state.rainIntensity += (targetRain - this.state.rainIntensity) * Math.min(1.0, delta * 0.6);

    // 2. Hydrological Soil Moisture & Storm Runoff Accumulation
    if (this.state.rainIntensity > 0.15) {
      // Rainwater accumulates faster than caliche hardpan can absorb
      this.state.stormAccumulation = Math.min(100.0, this.state.stormAccumulation + delta * this.state.rainIntensity * 7.5);
      this.state.soilMoisture = Math.min(1.0, this.state.soilMoisture + delta * 0.2);

      // Rain fills tinajas
      TINAJAS.forEach((tinaja) => {
        tinaja.waterLevel = Math.min(1.0, tinaja.waterLevel + delta * 0.06 * this.state.rainIntensity);
      });
    } else {
      // Sun evaporative loss
      this.state.stormAccumulation = Math.max(0.0, this.state.stormAccumulation - delta * 1.5);
      this.state.soilMoisture = Math.max(0.04, this.state.soilMoisture - delta * 0.04);

      // Slow tinaja evaporation
      TINAJAS.forEach((tinaja) => {
        if (!tinaja.isPerennial) {
          tinaja.waterLevel = Math.max(0.0, tinaja.waterLevel - delta * 0.003);
        }
      });
    }

    // 3. Flash Flood Trigger (Heavy storm accumulation)
    if (this.state.stormAccumulation > 32.0 && !this.state.flashFloodActive) {
      this.state.flashFloodActive = true;
      if (!this.flashFloodWarningTriggered) {
        this.flashFloodWarningTriggered = true;
        this.onFlashFloodWarning?.('⚡ FLASH FLOOD ALERT: Mountain rainwater is surging through the canyon washes! Climb to high ground!');
      }
    } else if (this.state.stormAccumulation < 14.0 && this.state.flashFloodActive) {
      this.state.flashFloodActive = false;
      this.flashFloodWarningTriggered = false;
      this.onFlashFloodReceded?.();
    }

    // 4. Stream Water Rise & Flow Velocity
    // Even in light rain, a gentle 0.12m stream trickles; in storms it swells up to 0.55m
    const rainRise = this.state.rainIntensity * 0.22;
    const floodRise = (this.state.stormAccumulation / 100.0) * 0.45;
    const targetWaterRise = Math.max(0.0, rainRise + floodRise);

    this.state.streamWaterRise += (targetWaterRise - this.state.streamWaterRise) * Math.min(1.0, delta * 0.8);
    this.state.flashFloodLevel = Math.min(1.0, this.state.stormAccumulation / 70.0);
    this.state.streamFlowVelocity = 0.8 + this.state.streamWaterRise * 3.6;

    // 5. Update Shader Uniforms
    const stormFactor = this.state.flashFloodActive ? Math.min(1.0, this.state.flashFloodLevel * 1.2) : (this.state.rainIntensity * 0.25);

    this.waterShaderMat.uniforms.uTime.value = this.elapsedTime;
    this.waterShaderMat.uniforms.uFlowSpeed.value = this.state.streamFlowVelocity;
    this.waterShaderMat.uniforms.uRainIntensity.value = this.state.rainIntensity;
    this.waterShaderMat.uniforms.uStormFactor.value = stormFactor;
    this.waterShaderMat.uniforms.uWaterRise.value = this.state.streamWaterRise;

    this.poolWaterShaderMat.uniforms.uTime.value = this.elapsedTime;
    this.poolWaterShaderMat.uniforms.uRainIntensity.value = this.state.rainIntensity;
    this.poolWaterShaderMat.uniforms.uStormFactor.value = stormFactor * 0.6;

    // 6. Stream Meshes Visibility & Rise
    const streamVisible = this.state.streamWaterRise > 0.015 || this.state.rainIntensity > 0.08;
    this.streamMeshes.forEach((mesh) => {
      mesh.visible = Boolean(mesh.userData?.isPerennial) || streamVisible;
    });

    // Damp gravel color when wet
    if (this.state.soilMoisture > 0.2) {
      this.gravelMat.color.setHex(0x6e5237); // Dark damp river mud
      this.gravelMat.roughness = 0.72;
    } else {
      this.gravelMat.color.setHex(0x9b7852); // Dry wash sand
      this.gravelMat.roughness = 0.92;
    }

    // 7. Update Tinaja Pool Water Levels
    this.poolWaterMeshes.forEach((mesh) => {
      const tinajaId = mesh.userData.tinajaId;
      const tinaja = TINAJAS.find((t) => t.id === tinajaId);
      if (tinaja) {
        mesh.visible = tinaja.isPerennial || tinaja.waterLevel > 0.04 || this.state.rainIntensity > 0.05;
        const baseY = mesh.userData.baseY;
        const maxRise = mesh.userData.maxRise || 0.4;
        mesh.position.y = baseY + tinaja.waterLevel * maxRise + (this.state.rainIntensity * 0.08);
      }
    });
  }

  public getState(): HydrologicalState {
    return { ...this.state };
  }

  public dispose() {
    this.streamMeshes.forEach((m) => {
      m.geometry.dispose();
    });
    this.gravelMeshes.forEach((m) => {
      m.geometry.dispose();
    });
    this.poolWaterMeshes.forEach((m) => {
      m.geometry.dispose();
    });
    this.tinajaMeshes.forEach((g: any) => {
      g.traverse?.((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
      });
    });
    this.waterShaderMat.dispose();
    this.poolWaterShaderMat.dispose();
    this.gravelMat.dispose();
    this.scene.remove(this.waterMeshGroup);
  }
}
