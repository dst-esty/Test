import * as THREE from 'three';
import { getBaseTerrainHeight, getTerrainHeight } from './terrain';
import { WeatherType } from '../types';

/**
 * Hydrological Data Representation for the Superstition Mountains
 * Matches true Sonoran Desert canyon geomorphology:
 * - Needle Canyon Wash & Gorge
 * - Tortilla Creek & Wash Fluvial Channel
 * - Hieroglyphic Spring Tinaja (Bedrock natural rock cistern)
 * - Garden Valley Alluvial Wash Runoff
 */

export interface WaterChannelPoint {
  x: number;
  z: number;
  width: number;
  baseDepth: number; // bedrock depth below local terrain
  maxFloodRise: number; // meters water can swell during storm/flash flood
}

export interface TinajaPool {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  maxDepth: number;
  waterLevel: number; // 0 to 1
  isPerennial: boolean; // spring fed or purely rain-fed
  waterQuality: 'pure_rain' | 'fresh_spring' | 'stagnant_alkali';
}

export interface HydrologicalState {
  currentWeather: WeatherType;
  rainIntensity: number; // 0.0 (bone dry) to 1.0 (torrential monsoon)
  stormAccumulation: number; // 0.0 to 100.0 (soil saturation & runoff buffer)
  flashFloodActive: boolean;
  flashFloodLevel: number; // 0.0 to 1.0 surge factor
  soilMoisture: number; // 0.0 (parched caliche) to 1.0 (muddy slickrock)
  streamFlowVelocity: number; // m/s current in washes
}

// Key geomorphic water channel alignments following low-elevation contours
export const ARROYO_CHANNELS: WaterChannelPoint[] = [
  // Tortilla Creek fluvial channel (flows from east mountains towards Tortilla Flat lake/canyon)
  { x: 120, z: -170, width: 8.5, baseDepth: 1.2, maxFloodRise: 1.8 },
  { x: 70, z: -160, width: 9.0, baseDepth: 1.4, maxFloodRise: 2.1 },
  { x: 20, z: -155, width: 11.0, baseDepth: 1.5, maxFloodRise: 2.4 },
  { x: -15, z: -150, width: 14.0, baseDepth: 1.8, maxFloodRise: 2.8 }, // Tortilla Flat bridge wash
  { x: -60, z: -145, width: 16.0, baseDepth: 2.0, maxFloodRise: 3.2 },
  { x: -110, z: -140, width: 18.0, baseDepth: 2.2, maxFloodRise: 3.5 },

  // Needle Canyon gorge wash (drains high dacite talus of Weaver's Needle towards central box canyon)
  { x: 75, z: 45, width: 6.0, baseDepth: 0.9, maxFloodRise: 1.6 },
  { x: 45, z: 25, width: 7.2, baseDepth: 1.1, maxFloodRise: 1.9 },
  { x: 10, z: 10, width: 8.5, baseDepth: 1.3, maxFloodRise: 2.2 },
  { x: -25, z: 0, width: 9.8, baseDepth: 1.5, maxFloodRise: 2.5 },
  { x: -60, z: -10, width: 11.5, baseDepth: 1.6, maxFloodRise: 2.7 },
  
  // Box Canyon central arroyo (deep winding gorge pass)
  { x: 140, z: -40, width: 10.0, baseDepth: 1.5, maxFloodRise: 2.6 },
  { x: 90, z: -25, width: 11.5, baseDepth: 1.7, maxFloodRise: 2.8 },
  { x: 30, z: -15, width: 13.0, baseDepth: 1.9, maxFloodRise: 3.0 },
  { x: -35, z: -18, width: 14.5, baseDepth: 2.1, maxFloodRise: 3.3 },
  { x: -95, z: -22, width: 16.0, baseDepth: 2.3, maxFloodRise: 3.6 },
];

// Natural Sonoran Rock Tinajas (water-carved bedrock potholes that collect desert runoff)
export const TINAJAS: TinajaPool[] = [
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
    name: "Weaver's Needle North Basin Tinaja",
    x: 68,
    z: 32,
    radius: 4.8,
    maxDepth: 1.6,
    waterLevel: 0.40,
    isPerennial: false,
    waterQuality: 'pure_rain',
  },
  {
    id: 'tortilla_creek_pool',
    name: 'Tortilla Creek Rock Cistern',
    x: -15,
    z: -145,
    radius: 8.2,
    maxDepth: 2.5,
    waterLevel: 0.85,
    isPerennial: true,
    waterQuality: 'fresh_spring',
  },
  {
    id: 'peralta_canyon_tinaja',
    name: 'Peralta Canyon Shadow Tinaja',
    x: -35,
    z: 75,
    radius: 4.2,
    maxDepth: 1.4,
    waterLevel: 0.30,
    isPerennial: false,
    waterQuality: 'pure_rain',
  },
];

/**
 * Hydrology simulation class that manages water surface heights, rain absorption,
 * flash flood surges through natural desert morphology, and player hydration interactions.
 */
export class DesertHydrologyEngine {
  private state: HydrologicalState = {
    currentWeather: 'clear',
    rainIntensity: 0.0,
    stormAccumulation: 0.0,
    flashFloodActive: false,
    flashFloodLevel: 0.0,
    soilMoisture: 0.05,
    streamFlowVelocity: 0.0,
  };

  private waterMeshGroup: THREE.Group = new THREE.Group();
  private arroyoMesh: THREE.Mesh | null = null;
  private tinajaMeshes: THREE.Mesh[] = [];
  private waterMaterial: THREE.MeshStandardMaterial;
  private foamMaterial: THREE.MeshBasicMaterial;
  private flashFloodWarningTriggered: boolean = false;

  public onFlashFloodWarning?: (message: string) => void;
  public onFlashFloodReceded?: () => void;

  constructor(scene: THREE.Scene) {
    // Water shader material with muddy sediment tint during storms, crystal azure when clear
    this.waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x225566,
      roughness: 0.12,
      metalness: 0.85,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });

    this.foamMaterial = new THREE.MeshBasicMaterial({
      color: 0xddddcc,
      transparent: true,
      opacity: 0.45,
      wireframe: false,
    });

    this.buildHydrologicalMeshes(scene);
  }

  /**
   * Constructs water planes strictly conforming to the natural carved riverbeds and rock basins.
   */
  private buildHydrologicalMeshes(scene: THREE.Scene) {
    this.waterMeshGroup.name = 'HydrologyWaterSurfaces';

    // 1. Build Arroyo Ribbons along natural wash splines
    const ribbonSegments = 160;
    const ribbonGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Construct quad strip along ARROYO_CHANNELS
    for (let i = 0; i < ARROYO_CHANNELS.length - 1; i++) {
      const p1 = ARROYO_CHANNELS[i];
      const p2 = ARROYO_CHANNELS[i + 1];

      // Direction vector
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const len = Math.hypot(dx, dz);
      const nx = -dz / len;
      const nz = dx / len;

      const baseIdx = (positions.length / 3);

      const y1 = getTerrainHeight(p1.x, p1.z) + 0.12;
      const y2 = getTerrainHeight(p2.x, p2.z) + 0.12;

      // 4 corners of channel segment
      // p1 left
      positions.push(p1.x - nx * p1.width * 0.5, y1, p1.z - nz * p1.width * 0.5);
      uvs.push(0, (i / ARROYO_CHANNELS.length) * 8);

      // p1 right
      positions.push(p1.x + nx * p1.width * 0.5, y1, p1.z + nz * p1.width * 0.5);
      uvs.push(1, (i / ARROYO_CHANNELS.length) * 8);

      // p2 left
      positions.push(p2.x - nx * p2.width * 0.5, y2, p2.z - nz * p2.width * 0.5);
      uvs.push(0, ((i + 1) / ARROYO_CHANNELS.length) * 8);

      // p2 right
      positions.push(p2.x + nx * p2.width * 0.5, y2, p2.z + nz * p2.width * 0.5);
      uvs.push(1, ((i + 1) / ARROYO_CHANNELS.length) * 8);

      // 2 triangles
      indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
      indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
    }

    ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    ribbonGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    ribbonGeo.setIndex(indices);
    ribbonGeo.computeVertexNormals();

    this.arroyoMesh = new THREE.Mesh(ribbonGeo, this.waterMaterial);
    this.arroyoMesh.visible = false; // Initially dry gravel
    this.waterMeshGroup.add(this.arroyoMesh);

    // 2. Build Bedrock Tinajas
    TINAJAS.forEach((tinaja) => {
      const geo = new THREE.CylinderGeometry(tinaja.radius, tinaja.radius * 0.75, 0.4, 24);
      const mesh = new THREE.Mesh(geo, this.waterMaterial);
      const groundY = getTerrainHeight(tinaja.x, tinaja.z);
      mesh.position.set(tinaja.x, groundY + 0.1, tinaja.z);
      mesh.userData = { tinajaId: tinaja.id, baseY: groundY + 0.1 };
      this.waterMeshGroup.add(mesh);
      this.tinajaMeshes.push(mesh);
    });

    scene.add(this.waterMeshGroup);
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
        return {
          hasWater: curDepth > 0.05,
          waterHeight: groundY + 0.15,
          depth: curDepth,
          isFlashFlood: false,
          flowVelocity: 0.0,
          sourceName: tinaja.name,
          canDrink: true,
          waterQuality: tinaja.waterQuality,
        };
      }
    }

    // 2. Check Arroyo Channels
    if (this.state.flashFloodLevel > 0.05 || this.state.rainIntensity > 0.15) {
      for (let i = 0; i < ARROYO_CHANNELS.length - 1; i++) {
        const p1 = ARROYO_CHANNELS[i];
        const p2 = ARROYO_CHANNELS[i + 1];

        // Segment projection
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const segLenSq = dx * dx + dz * dz;
        const u = Math.max(0, Math.min(1, ((x - p1.x) * dx + (z - p1.z) * dz) / segLenSq));

        const projX = p1.x + u * dx;
        const projZ = p1.z + u * dz;
        const distToCenter = Math.hypot(x - projX, z - projZ);

        const currentWidth = p1.width * (1 - u) + p2.width * u;
        if (distToCenter <= currentWidth * 0.6) {
          const maxRise = p1.maxFloodRise * (1 - u) + p2.maxFloodRise * u;
          const surgeHeight = maxRise * this.state.flashFloodLevel;
          const groundY = getTerrainHeight(x, z);

          return {
            hasWater: surgeHeight > 0.08,
            waterHeight: groundY + surgeHeight,
            depth: surgeHeight,
            isFlashFlood: this.state.flashFloodActive && surgeHeight > 0.4,
            flowVelocity: this.state.streamFlowVelocity,
            sourceName: 'Arroyo Wash Channel',
            canDrink: true,
            waterQuality: this.state.flashFloodActive ? 'flood_silt' : 'pure_rain',
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
      sourceName: 'Arid Bedrock',
      canDrink: false,
      waterQuality: 'stagnant_alkali',
    };
  }

  /**
   * Main per-frame update loop for desert hydrological cycles.
   */
  public update(delta: number, weather: WeatherType) {
    this.state.currentWeather = weather;

    // 1. Rain intensity target
    let targetRain = 0.0;
    if (weather === 'storm') {
      targetRain = 1.0; // Torrential cloudburst
    } else if (weather === 'light_rain') {
      targetRain = 0.45; // Desert drizzle
    } else if (weather === 'clouds') {
      targetRain = 0.05; // Mist/humidity
    }

    // Smoothly transition rain intensity
    this.state.rainIntensity += (targetRain - this.state.rainIntensity) * Math.min(1.0, delta * 0.4);

    // 2. Soil moisture & storm accumulation
    if (this.state.rainIntensity > 0.2) {
      // Water accumulates faster than desert soil can absorb (Sonoran caliche hardpan has low infiltration rate)
      this.state.stormAccumulation = Math.min(100.0, this.state.stormAccumulation + delta * this.state.rainIntensity * 6.5);
      this.state.soilMoisture = Math.min(1.0, this.state.soilMoisture + delta * 0.15);

      // Replenish tinajas with rainwater
      TINAJAS.forEach((tinaja) => {
        tinaja.waterLevel = Math.min(1.0, tinaja.waterLevel + delta * 0.04 * this.state.rainIntensity);
      });
    } else {
      // Arid sun evaporative loss
      this.state.stormAccumulation = Math.max(0.0, this.state.stormAccumulation - delta * 1.2);
      this.state.soilMoisture = Math.max(0.04, this.state.soilMoisture - delta * 0.03);

      // Slow tinaja evaporation
      TINAJAS.forEach((tinaja) => {
        if (!tinaja.isPerennial) {
          tinaja.waterLevel = Math.max(0.0, tinaja.waterLevel - delta * 0.002);
        }
      });
    }

    // 3. Flash Flood Threshold Trigger
    // In the Superstition Mountains, ~30-40 seconds of intense rainfall triggers rapid wash surges
    if (this.state.stormAccumulation > 35.0 && !this.state.flashFloodActive) {
      this.state.flashFloodActive = true;
      if (!this.flashFloodWarningTriggered) {
        this.flashFloodWarningTriggered = true;
        this.onFlashFloodWarning?.('⚠️ FLASH FLOOD ALERT: Mountain runoff is surging through the canyon washes! Climb to high ground!');
      }
    } else if (this.state.stormAccumulation < 15.0 && this.state.flashFloodActive) {
      this.state.flashFloodActive = false;
      this.flashFloodWarningTriggered = false;
      this.onFlashFloodReceded?.();
    }

    // 4. Flash flood surge height & stream velocity
    const targetFloodLevel = this.state.flashFloodActive ? Math.min(1.0, this.state.stormAccumulation / 75.0) : 0.0;
    this.state.flashFloodLevel += (targetFloodLevel - this.state.flashFloodLevel) * Math.min(1.0, delta * 0.6);

    this.state.streamFlowVelocity = this.state.flashFloodLevel * 4.8; // Up to 4.8 m/s rushing current

    // 5. Update 3D Water Mesh Visuals
    if (this.arroyoMesh) {
      if (this.state.flashFloodLevel > 0.02 || this.state.rainIntensity > 0.25) {
        this.arroyoMesh.visible = true;
        // Raise water height along normal
        const pos = this.arroyoMesh.geometry.attributes.position as THREE.BufferAttribute;
        // Smoothly adjust scale on Y
        this.arroyoMesh.position.y = this.state.flashFloodLevel * 1.8;
      } else {
        this.arroyoMesh.visible = false;
      }
    }

    // Muddy brown color during flash flood surge, clear teal during calm
    if (this.state.flashFloodActive) {
      this.waterMaterial.color.setHex(0x735135); // Muddy torrent
      this.waterMaterial.roughness = 0.35;
      this.waterMaterial.opacity = 0.92;
    } else {
      this.waterMaterial.color.setHex(0x225566); // Clear desert oasis
      this.waterMaterial.roughness = 0.12;
      this.waterMaterial.opacity = 0.82;
    }

    // Update tinaja water levels visually
    this.tinajaMeshes.forEach((mesh) => {
      const tinajaId = mesh.userData.tinajaId;
      const tinaja = TINAJAS.find((t) => t.id === tinajaId);
      if (tinaja) {
        const baseY = mesh.userData.baseY || mesh.position.y;
        mesh.position.y = baseY + tinaja.waterLevel * 0.35;
        mesh.scale.set(1.0, Math.max(0.1, tinaja.waterLevel), 1.0);
      }
    });
  }

  public getState(): HydrologicalState {
    return { ...this.state };
  }
}
