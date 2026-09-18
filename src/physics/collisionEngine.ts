import * as THREE from 'three';
import { DesertFoliageManager } from '../world/foliage';
import { MovableRockManager } from '../world/movableRocks';
import { MineBuildingSystem } from '../world/mineBuilding';

export interface CollisionResult {
  x: number;
  z: number;
  isBlocked: boolean;
  blockedReason?: string;
  slid?: boolean;
}

export interface LandmarkObstacle {
  name: string;
  x: number;
  z: number;
  radius: number;
  height: number;
}

// Fixed iconic landmarks with solid physical geometry that cannot be walked through
export const LANDMARK_OBSTACLES: LandmarkObstacle[] = [
  // 1. Weaver's Needle monolithic volcanic core
  { name: "Weaver's Needle", x: 80, z: 15, radius: 21.5, height: 85 },
  // 2. Eye of the Needle rock arch pillars
  { name: 'Eye of the Needle (West Pillar)', x: 126.5, z: -40, radius: 2.2, height: 14 },
  { name: 'Eye of the Needle (East Pillar)', x: 133.5, z: -40, radius: 2.2, height: 14 },
  // 3. Lost Dutchman Mine canyon portal rocks
  { name: 'Lost Dutchman Portal (Left Buttress)', x: 154, z: 110, radius: 5.5, height: 18 },
  { name: 'Lost Dutchman Portal (Right Buttress)', x: 166, z: 110, radius: 5.5, height: 18 },
  // 4. Peralta Stone Cabin (Dugout)
  { name: 'Peralta Stone Dugout Cabin', x: 30, z: -90, radius: 3.8, height: 3.5 },
  // 5. Historic Town of Tortilla Flat buildings
  { name: 'Tortilla Flat Saloon', x: -29.0, z: -146, radius: 4.8, height: 8.0 },
  { name: 'Tortilla Flat Mercantile & Assayer', x: -29.0, z: -161, radius: 4.6, height: 7.0 },
  { name: 'Tortilla Flat Territorial Jail', x: -1.0, z: -158, radius: 4.2, height: 5.5 },
  { name: 'Tortilla Flat Livery & Barn', x: -0.5, z: -142, radius: 4.5, height: 6.5 },
  { name: 'Tortilla Flat Water Tower', x: -27.0, z: -135, radius: 3.6, height: 12.0 },
];

export const PLAYER_COLLISION_RADIUS = 0.42;
export const MAX_STEP_HEIGHT = 0.58; // Meters: allows stepping onto small curbs and gravel mounds
export const MAX_WALKABLE_SLOPE = 1.15; // Slope ratio: ~49 degrees, steep hills and cliffs cannot be scaled on foot
export const PERIMETER_MOUNTAIN_RADIUS = 205.0; // Perimeter mountain wall enclosing the Superstition wilderness

/**
 * Checks whether a candidate (x, z) location is passable or obstructed by:
 * - Steep mountain cliffs, sheer hills, or sudden elevation steps
 * - Perimeter mountain range
 * - Instanced boulders, rock outcroppings, and cacti
 * - Movable / placed rocks
 * - Built mine structures
 * - Landmark structures (Weaver's Needle, cabins, town buildings)
 */
export function testPositionCollision(
  candX: number,
  candZ: number,
  startX: number,
  startZ: number,
  currentGroundY: number,
  getTerrainHeight: (x: number, z: number) => number,
  foliageManager?: DesertFoliageManager | null,
  movableRockManager?: MovableRockManager | null,
  mineBuildingSystem?: MineBuildingSystem | null,
  isAirborne: boolean = false
): { blocked: boolean; reason?: string; normal?: { x: number; z: number } } {
  // 1. Boundary & Perimeter Mountains Check
  const distFromCenter = Math.hypot(candX, candZ);
  if (distFromCenter > PERIMETER_MOUNTAIN_RADIUS) {
    const normDist = distFromCenter > 0.0001 ? distFromCenter : 1;
    return {
      blocked: true,
      reason: 'perimeter_mountain',
      normal: { x: -candX / normDist, z: -candZ / normDist },
    };
  }

  // 2. Terrain Slope, Hill, and Mountain Cliff Face Check
  const candGroundY = getTerrainHeight(candX, candZ);
  const dh = candGroundY - currentGroundY;

  // When moving uphill:
  if (dh > 0) {
    // A sudden vertical elevation step higher than knee height cannot be walked through
    if (dh > MAX_STEP_HEIGHT && !isAirborne) {
      const stepDist = Math.hypot(candX - startX, candZ - startZ);
      const normalX = stepDist > 0.0001 ? (startX - candX) / stepDist : 0;
      const normalZ = stepDist > 0.0001 ? (startZ - candZ) / stepDist : 0;
      return {
        blocked: true,
        reason: 'cliff_step',
        normal: { x: normalX, z: normalZ },
      };
    }

    // A slope steeper than MAX_WALKABLE_SLOPE (~49 degrees) is an impassable hill/mountain
    const stepDist = Math.hypot(candX - startX, candZ - startZ);
    if (stepDist > 0.001) {
      const slope = dh / stepDist;
      if (slope > MAX_WALKABLE_SLOPE) {
        return {
          blocked: true,
          reason: 'steep_slope',
          normal: { x: (startX - candX) / stepDist, z: (startZ - candZ) / stepDist },
        };
      }
    }
  }

  // 3. Landmark Solid Obstacles (Weaver's Needle, Peralta Dugout, Town Buildings)
  for (let i = 0; i < LANDMARK_OBSTACLES.length; i++) {
    const lm = LANDMARK_OBSTACLES[i];
    const combinedRad = lm.radius + PLAYER_COLLISION_RADIUS;
    const dx = candX - lm.x;
    if (Math.abs(dx) > combinedRad) continue;
    const dz = candZ - lm.z;
    if (Math.abs(dz) > combinedRad) continue;

    const distSq = dx * dx + dz * dz;
    if (distSq < combinedRad * combinedRad) {
      const dist = Math.sqrt(distSq);
      return {
        blocked: true,
        reason: lm.name,
        normal: {
          x: dist > 0.0001 ? dx / dist : 1,
          z: dist > 0.0001 ? dz / dist : 0,
        },
      };
    }
  }

  // 4. Instanced Boulders, Mountain Outcroppings, and Cacti (Foliage Manager)
  if (foliageManager && typeof foliageManager.checkObstacleCollision === 'function') {
    const fRes = foliageManager.checkObstacleCollision(
      candX,
      candGroundY,
      candZ,
      PLAYER_COLLISION_RADIUS
    );
    if (fRes.hit) {
      return {
        blocked: true,
        reason: fRes.collider?.type === 'mountain' ? 'mountain_outcrop' : 'boulder',
        normal: fRes.normal,
      };
    }
  }

  // 5. Placed / Resting Movable Physical Rocks
  if (movableRockManager && typeof movableRockManager.checkCollision === 'function') {
    const rRes = movableRockManager.checkCollision(
      candX,
      candGroundY,
      candZ,
      PLAYER_COLLISION_RADIUS
    );
    if (rRes.hit) {
      return {
        blocked: true,
        reason: 'movable_rock',
        normal: rRes.normal,
      };
    }
  }

  // 6. Built Mine Structures (Cabins, Portals, Headframes, Forge)
  if (mineBuildingSystem && typeof mineBuildingSystem.checkCollision === 'function') {
    const bRes = mineBuildingSystem.checkCollision(
      candX,
      candGroundY,
      candZ,
      PLAYER_COLLISION_RADIUS
    );
    if (bRes.hit) {
      return {
        blocked: true,
        reason: bRes.structure?.type || 'mine_structure',
      };
    }
  }

  return { blocked: false };
}

/**
 * Resolves player horizontal movement with kinematic wall-sliding against hills, rocks, and mountains.
 * If the direct path is obstructed, it automatically tests sliding along unobstructed axes or surface tangents.
 * If completely blocked, it halts the player at the barrier.
 */
export function resolveKinematicMovement(
  startX: number,
  startZ: number,
  targetDx: number,
  targetDz: number,
  currentGroundY: number,
  getTerrainHeight: (x: number, z: number) => number,
  foliageManager?: DesertFoliageManager | null,
  movableRockManager?: MovableRockManager | null,
  mineBuildingSystem?: MineBuildingSystem | null,
  isAirborne: boolean = false
): CollisionResult {
  const directX = startX + targetDx;
  const directZ = startZ + targetDz;

  // 1. First attempt: Direct movement
  const directCheck = testPositionCollision(
    directX,
    directZ,
    startX,
    startZ,
    currentGroundY,
    getTerrainHeight,
    foliageManager,
    movableRockManager,
    mineBuildingSystem,
    isAirborne
  );

  if (!directCheck.blocked) {
    return {
      x: directX,
      z: directZ,
      isBlocked: false,
    };
  }

  // 2. Second attempt: Smooth wall-sliding
  // Try X alone
  let resolvedX = startX;
  let didSlideX = false;
  if (Math.abs(targetDx) > 0.0001) {
    const checkX = testPositionCollision(
      startX + targetDx,
      startZ,
      startX,
      startZ,
      currentGroundY,
      getTerrainHeight,
      foliageManager,
      movableRockManager,
      mineBuildingSystem,
      isAirborne
    );
    if (!checkX.blocked) {
      resolvedX = startX + targetDx;
      didSlideX = true;
    }
  }

  // Try Z alone
  let resolvedZ = startZ;
  let didSlideZ = false;
  if (Math.abs(targetDz) > 0.0001) {
    const checkZ = testPositionCollision(
      resolvedX,
      startZ + targetDz,
      resolvedX,
      startZ,
      currentGroundY,
      getTerrainHeight,
      foliageManager,
      movableRockManager,
      mineBuildingSystem,
      isAirborne
    );
    if (!checkZ.blocked) {
      resolvedZ = startZ + targetDz;
      didSlideZ = true;
    }
  }

  if (didSlideX || didSlideZ) {
    return {
      x: resolvedX,
      z: resolvedZ,
      isBlocked: true,
      slid: true,
      blockedReason: directCheck.reason,
    };
  }

  // 3. Third attempt: Tangent vector sliding if an obstacle surface normal was returned
  if (directCheck.normal) {
    const nx = directCheck.normal.x;
    const nz = directCheck.normal.z;
    const dot = targetDx * nx + targetDz * nz;
    if (dot < 0) {
      // Vector projection onto plane tangent
      const tanDx = targetDx - dot * nx;
      const tanDz = targetDz - dot * nz;
      if (Math.hypot(tanDx, tanDz) > 0.0001) {
        const checkTan = testPositionCollision(
          startX + tanDx,
          startZ + tanDz,
          startX,
          startZ,
          currentGroundY,
          getTerrainHeight,
          foliageManager,
          movableRockManager,
          mineBuildingSystem,
          isAirborne
        );
        if (!checkTan.blocked) {
          return {
            x: startX + tanDx,
            z: startZ + tanDz,
            isBlocked: true,
            slid: true,
            blockedReason: directCheck.reason,
          };
        }
      }
    }
  }

  // 4. Completely blocked by solid obstacle: halt firmly at current position
  return {
    x: startX,
    z: startZ,
    isBlocked: true,
    slid: false,
    blockedReason: directCheck.reason,
  };
}
