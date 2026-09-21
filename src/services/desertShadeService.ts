import * as THREE from 'three';
import { getTerrainHeight } from '../world/terrain';
import { getCelestialDirections } from '../world/atmosphere';
import { WeatherType, BuiltStructure, Vector3D } from '../types';
import { HarvestableTree } from '../world/foliage';

export interface ShadeQueryResult {
  isInShade: boolean;
  shadeFactor: number; // 0.0 (full baking sun) to 1.0 (deep cool shade)
  shadeReason: string;
  sourceType: 'canopy' | 'cliff' | 'cave' | 'structure' | 'town' | 'twilight' | 'weather' | 'none';
}

export interface DesertShadeContext {
  position: Vector3D;
  timeOfDay: number; // 0 to 24
  weather: WeatherType;
  isInsideMine?: boolean;
  isUnderground?: boolean;
  currentMineLevel?: number;
  isInsideMountainTunnel?: boolean;
  springTrees?: HarvestableTree[];
  builtStructures?: BuiltStructure[];
}

/**
 * DesertShadeService:
 * Real-time Sonoran Desert micro-climate and shade evaluation engine.
 * Accurately determines whether the prospector is protected by:
 * 1. Leafy canopies of Fremont cottonwood, willow, and mesquite groves
 * 2. Looming canyon walls (Needle Canyon, Peters Canyon, Laberinto, Weaver's Needle shadow)
 * 3. Subterranean adits, excavated stopes, drift rooms, and mountain tunnels
 * 4. Built prospector camps, timber portal timbering, and lean-to awnings
 * 5. Tortilla Flat saloon verandas and covered boardwalks
 * 6. Diurnal nocturnal cooling (starlight & twilight) and storm cloud cover
 */
class DesertShadeService {
  /**
   * Evaluates shade coverage at the given player position and environmental state.
   */
  public queryShade(ctx: DesertShadeContext): ShadeQueryResult {
    const {
      position,
      timeOfDay,
      weather,
      isInsideMine = false,
      isUnderground = false,
      currentMineLevel = 0,
      isInsideMountainTunnel = false,
      springTrees = [],
      builtStructures = [],
    } = ctx;

    // 1. Subterranean caves, mine levels, and mountain tunnels
    if (isInsideMine || isUnderground || currentMineLevel > 0 || isInsideMountainTunnel) {
      return {
        isInShade: true,
        shadeFactor: 1.0,
        shadeReason: 'Subterranean Cavern & Mine Shaft',
        sourceType: 'cave',
      };
    }

    // 2. Diurnal Cycle: Nighttime and deep twilight (before 5:45 AM or after 6:30 PM)
    if (timeOfDay < 5.75 || timeOfDay > 18.5) {
      return {
        isInShade: true,
        shadeFactor: 1.0,
        shadeReason: 'Cool Desert Twilight & Night Air',
        sourceType: 'twilight',
      };
    }

    // 3. Severe Weather: Thunderstorm and soaking rain cloud cover
    if (weather === 'storm' || weather === 'light_rain') {
      return {
        isInShade: true,
        shadeFactor: 0.9,
        shadeReason: 'Thick Storm Clouds & Rain',
        sourceType: 'weather',
      };
    }

    // 4. Riparian & Desert Tree Canopies (Cottonwoods, Mesquite, Willows)
    // Standing within 6.8m of an un-felled spring tree grants full canopy shade
    for (let i = 0; i < springTrees.length; i++) {
      const tree = springTrees[i];
      if (tree.isFelled) continue;
      const dx = position.x - tree.position.x;
      const dz = position.z - tree.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < 48.0) { // ~6.9m radius canopy
        return {
          isInShade: true,
          shadeFactor: 1.0,
          shadeReason: `${tree.name || 'Desert'} Canopy Shade`,
          sourceType: 'canopy',
        };
      }
    }

    // 5. Built Prospector Structures & Camp Lean-tos
    for (let i = 0; i < builtStructures.length; i++) {
      const s = builtStructures[i];
      const dx = position.x - s.position.x;
      const dz = position.z - s.position.z;
      const distSq = dx * dx + dz * dz;
      // Structures provide a sheltered footprint
      const shelterRadiusSq = s.type === 'prospector_camp' ? 36.0 : 25.0; // 5m - 6m
      if (distSq < shelterRadiusSq) {
        return {
          isInShade: true,
          shadeFactor: 1.0,
          shadeReason: 'Prospector Shelter & Awning',
          sourceType: 'structure',
        };
      }
    }

    // 6. Tortilla Flat Covered Verandas & Boardwalks
    // Town center is around (0, -246). Buildings line the street (x: -28 to +28, z: -275 to -220)
    const distToTownCenter = Math.hypot(position.x, position.z - (-246));
    if (distToTownCenter < 42.0) {
      // If close to town buildings / verandas (not in the center of the dusty main road)
      if (Math.abs(position.x) > 4.5 && Math.abs(position.x) < 26.0 && position.z > -270 && position.z < -222) {
        return {
          isInShade: true,
          shadeFactor: 1.0,
          shadeReason: 'Tortilla Flat Saloon Veranda',
          sourceType: 'town',
        };
      }
    }

    // 7. Mountain Ridge, Canyon Wall, and Weaver's Needle Shadow Casting
    // Physically trace a ray from the player toward the celestial sun position.
    // If the mountain terrain crests above the sun's line of sight, the player is in canyon shade!
    const { sunDir } = getCelestialDirections(timeOfDay);
    const horizLen = Math.hypot(sunDir.x, sunDir.z);

    // If sun is very close to horizon (< ~5° elevation), long mountain shadows blanket valleys
    if (sunDir.y <= 0.08) {
      return {
        isInShade: true,
        shadeFactor: 0.85,
        shadeReason: 'Low Horizon Mountain Shadow',
        sourceType: 'cliff',
      };
    }

    if (horizLen > 0.01) {
      const dirX = sunDir.x / horizLen;
      const dirZ = sunDir.z / horizLen;
      const sunSlope = sunDir.y / horizLen;

      // Sample terrain heights along the direction toward the sun
      // Distances match near cliff faces up to prominent mountain ridges
      const sampleDistances = [8, 18, 32, 55, 90, 140, 210, 300];
      for (let i = 0; i < sampleDistances.length; i++) {
        const dist = sampleDistances[i];
        const sampleX = position.x + dirX * dist;
        const sampleZ = position.z + dirZ * dist;
        const terrainY = getTerrainHeight(sampleX, sampleZ);
        const heightDiff = terrainY - position.y;

        // If the terrain along the solar ray rises sufficiently above the sun angle,
        // it occludes the sun directly!
        const terrainSlope = heightDiff / dist;
        if (terrainSlope > sunSlope) {
          const depth = Math.min(1.0, 0.75 + (terrainSlope - sunSlope) * 0.8);
          return {
            isInShade: true,
            shadeFactor: depth,
            shadeReason: 'Canyon Wall & Mountain Shadow',
            sourceType: 'cliff',
          };
        }
      }
    }

    // 8. Open Desert Sun
    return {
      isInShade: false,
      shadeFactor: 0.0,
      shadeReason: 'Scorching Desert Sun',
      sourceType: 'none',
    };
  }
}

export const desertShadeService = new DesertShadeService();
