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
  { name: "Weaver's Needle", x: 80, z: 15, radius: 19.5, height: 140 },
  // 2. Eye of the Needle rock arch pillars
  { name: 'Eye of the Needle (West Pillar)', x: 126.5, z: -40, radius: 2.2, height: 14 },
  { name: 'Eye of the Needle (East Pillar)', x: 133.5, z: -40, radius: 2.2, height: 14 },
  // 3. Lost Dutchman Mine canyon portal rocks
  { name: 'Lost Dutchman Portal (Left Buttress)', x: 154, z: 110, radius: 5.5, height: 18 },
  { name: 'Lost Dutchman Portal (Right Buttress)', x: 166, z: 110, radius: 5.5, height: 18 },
  // 4. Peralta Stone Cabin (Dugout)
  { name: 'Peralta Stone Dugout Cabin', x: 30, z: -90, radius: 3.8, height: 3.5 },
  // 5. Historic Town of Tortilla Flat buildings along the Salt River (town center: x: 0, z: -250)
  { name: 'Tortilla Flat Saloon', x: -14.8, z: -246, radius: 5.0, height: 9.0 },
  { name: 'Tortilla Flat Mercantile & Assayer', x: -14.8, z: -261.5, radius: 4.8, height: 7.5 },
  { name: 'Tortilla Flat Territorial Jail', x: 14.8, z: -258.5, radius: 4.5, height: 6.5 },
  { name: 'Tortilla Flat Livery & Barn', x: 14.8, z: -242.5, radius: 5.0, height: 7.5 },
  { name: 'Tortilla Flat Water Tower', x: -13.0, z: -233.5, radius: 3.5, height: 12.0 },
  { name: 'Concord Stagecoach', x: 0, z: -252, radius: 2.0, height: 3.2 },
  { name: 'Salt River Project Freight Depot', x: 13.0, z: -298, radius: 4.8, height: 7.0 },
  { name: 'Salt River Timber Pier & Boat Landing', x: -2.0, z: -304, radius: 3.8, height: 4.0 },
  // 6. Pistol Canyon Sun-Bleached Granite Table Boulder & Tinaja
  { name: 'Pistol Canyon Table Boulder', x: -46, z: -130, radius: 2.2, height: 2.5 },
];

export const PLAYER_COLLISION_RADIUS = 0.42;
export const MAX_STEP_HEIGHT = 0.65; // Meters: allows stepping onto rocks, curbs, and trail steps
export const MAX_WALKABLE_SLOPE = 1.25; // Slope ratio: ~51 degrees, allows scrambling up mountain ridges and trails while blocking sheer vertical cliffs
export const WORLD_BOUNDARY_RADIUS = 2500.0; // Expansive Superstition Mountains Wilderness frontier (~5 km across)

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
  // 0. Mountain Excavation Adit Tunnel Check:
  // If moving inside an excavated mountain hole/tunnel corridor, steep slopes, cliff steps, and mountain outcroppings are hollowed out!
  const isInsideTunnel = Boolean(
    foliageManager?.mountainHoleManager?.isInsideMountainTunnel(
      candX,
      currentGroundY,
      candZ,
      0.95
    )?.inside
  );
  const startInTunnel = Boolean(
    foliageManager?.mountainHoleManager?.isInsideMountainTunnel(
      startX,
      currentGroundY,
      startZ,
      0.95
    )?.inside
  );

  // Proximity to ANY portal (entrance or exit of pass-through) within 8.0 meters
  const isNearAnyPortal = Boolean(
    foliageManager?.mountainHoleManager?.holes.some((h) => {
      const distEntCand = Math.hypot(candX - h.position.x, candZ - h.position.z);
      const distEntStart = Math.hypot(startX - h.position.x, startZ - h.position.z);
      const exitPos = (h.isPassThrough && h.exitPosition) ? h.exitPosition : null;
      const distExitCand = exitPos ? Math.hypot(candX - exitPos.x, candZ - exitPos.z) : 999;
      const distExitStart = exitPos ? Math.hypot(startX - exitPos.x, startZ - exitPos.z) : 999;
      return Math.min(distEntCand, distEntStart, distExitCand, distExitStart) < 8.0;
    })
  );

  const isNavigatingTunnel = isInsideTunnel || startInTunnel || isNearAnyPortal;

  // 1. Boundary & Perimeter Mountains Check
  // Natural mountain passes, saddles, and canyon corridors cut through the perimeter mountains
  const isApacheTrailOrSaltRiver =
    (candZ < -150 && candZ >= -235 && Math.abs(candX) < 40) || // Apache Trail pass
    (candZ < -225 && candZ > -325 && Math.abs(candX) < 290);  // Salt River Canyon & Tortilla Flat valley

  const isFremontSaddle = Math.hypot(candX - 30, candZ - 220) < 36; // Fremont Saddle (South)
  const isTerrapinPass = Math.hypot(candX - 210, candZ - (-10)) < 34; // Terrapin Pass (East)
  const isPeraltaPass = Math.hypot(candX - (-160), candZ - 120) < 36; // Peralta Pass (Southwest)
  const isBluffSpringsGap = Math.hypot(candX - (-190), candZ - (-20)) < 34; // Bluff Springs Gap (West)
  const isNeedleCanyonChasm = candX > 110 && candX < 185 && candZ > -70 && candZ < 150; // Needle Canyon chasm
  const isFishCreekCanyon = candX < -40 && candX > -180 && candZ < -170 && candZ > -300; // Fish Creek Canyon
  const isPistolCanyon = candX > -85 && candX < -15 && candZ < -55 && candZ > -195; // Pistol Canyon box gorge
  const isMalapaisRidge = Math.hypot(candX - 95, candZ - (-155)) < 75; // Malapais Mountain massif & summit ridge

  const isNavigablePassOrCanyon =
    isApacheTrailOrSaltRiver ||
    isFremontSaddle ||
    isTerrapinPass ||
    isPeraltaPass ||
    isBluffSpringsGap ||
    isNeedleCanyonChasm ||
    isFishCreekCanyon ||
    isPistolCanyon ||
    isMalapaisRidge;

  const distFromCenter = Math.hypot(candX, candZ);
  const isHardWorldBoundary = distFromCenter > WORLD_BOUNDARY_RADIUS || Math.abs(candX) > 2550 || Math.abs(candZ) > 2550;

  // The perimeter mountains and valleys are explorable up to the dense out-of-bounds cloud bank
  if (isHardWorldBoundary && !isNavigatingTunnel) {
    const normDist = distFromCenter > 0.0001 ? distFromCenter : 1;
    return {
      blocked: true,
      reason: 'frontier_boundary',
      normal: { x: -candX / normDist, z: -candZ / normDist },
    };
  }

  // 2. Terrain Slope, Hill, and Mountain Cliff Face Check
  // If player is inside an excavated mountain drift adit, they are walking through the hollowed bedrock!
  const candGroundY = getTerrainHeight(candX, candZ);
  const dh = candGroundY - currentGroundY;
  const stepDist = Math.hypot(candX - startX, candZ - startZ);

  if (!isNavigatingTunnel && stepDist > 0.0005) {
    const dirX = (candX - startX) / stepDist;
    const dirZ = (candZ - startZ) / stepDist;

    // A sudden vertical elevation step higher than knee height cannot be walked through
    if (dh > MAX_STEP_HEIGHT && !isAirborne) {
      return {
        blocked: true,
        reason: 'cliff_step',
        normal: { x: -dirX, z: -dirZ },
      };
    }

    // Continuous slope evaluation:
    // If dh > 0.02m uphill, check the frame slope
    if (dh > 0.02) {
      const frameSlope = dh / stepDist;
      if (frameSlope > MAX_WALKABLE_SLOPE) {
        return {
          blocked: true,
          reason: 'steep_slope',
          normal: { x: -dirX, z: -dirZ },
        };
      }
    }

    // Forward capsule probe:
    // Probes the terrain slope at the leading edge of the player's physical collision capsule (0.38m ahead)
    const probeX = candX + dirX * 0.38;
    const probeZ = candZ + dirZ * 0.38;
    const probeGroundY = getTerrainHeight(probeX, probeZ);
    const probeRise = probeGroundY - candGroundY;
    // If the ground 0.38m ahead rises steeply (> MAX_WALKABLE_SLOPE * 0.38 = ~0.47m)
    // or rises higher than knee height (0.50m), the capsule is colliding with a steep canyon wall or rock face!
    if (probeRise > 0.46 && !isAirborne) {
      const eps = 0.4;
      const hL = getTerrainHeight(probeX - eps, probeZ);
      const hR = getTerrainHeight(probeX + eps, probeZ);
      const hD = getTerrainHeight(probeX, probeZ - eps);
      const hU = getTerrainHeight(probeX, probeZ + eps);
      const gradX = hR - hL;
      const gradZ = hU - hD;
      const gradLen = Math.hypot(gradX, gradZ) || 1.0;
      return {
        blocked: true,
        reason: 'steep_cliff_wall',
        normal: { x: -gradX / gradLen, z: -gradZ / gradLen },
      };
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
      // De-penetration tolerance: if player started already embedded inside landmark,
      // allow movements that step away from the center
      const startDistSq = (startX - lm.x) ** 2 + (startZ - lm.z) ** 2;
      if (startDistSq < combinedRad * combinedRad && distSq > startDistSq) {
        continue;
      }
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
      PLAYER_COLLISION_RADIUS,
      startX,
      startZ
    );
    if (fRes.hit) {
      if (isNavigatingTunnel) {
        // If navigating inside an excavated tunnel, neither the mountain outcrop nor any rock intersecting the excavated bore blocks passage
        const isRockInTunnel = fRes.collider?.type === 'mountain' || fRes.collider?.type === 'boulder';
        if (!isRockInTunnel) {
          return {
            blocked: true,
            reason: 'cactus',
            normal: fRes.normal,
          };
        }
      } else {
        return {
          blocked: true,
          reason: fRes.collider?.type === 'mountain' ? 'mountain_outcrop' : 'boulder',
          normal: fRes.normal,
        };
      }
    }
  }

  // 4b. Tunnel Wall & Back Working Face Boundary Check (keeps player inside the excavated corridor)
  if (isNavigatingTunnel && foliageManager?.mountainHoleManager?.testTunnelBoundaryCollision) {
    const tunnelCol = foliageManager.mountainHoleManager.testTunnelBoundaryCollision(
      candX,
      currentGroundY,
      candZ,
      PLAYER_COLLISION_RADIUS
    );
    if (tunnelCol.blocked) {
      return {
        blocked: true,
        reason: tunnelCol.reason || 'tunnel_wall',
        normal: tunnelCol.normal,
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
      const bStartRes = mineBuildingSystem.checkCollision(
        startX,
        currentGroundY,
        startZ,
        PLAYER_COLLISION_RADIUS
      );
      if (!bStartRes.hit) {
        return {
          blocked: true,
          reason: bRes.structure?.type || 'mine_structure',
        };
      }
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
  // 0. Automatic Embedded Unstuck / De-penetration:
  // If the player starts embedded inside any obstacle, eject them outward EXCEPT when they are navigating an excavated mountain tunnel!
  const directX = startX + targetDx;
  const directZ = startZ + targetDz;

  const startInTunnel = Boolean(
    foliageManager?.mountainHoleManager?.isInsideMountainTunnel(
      startX,
      currentGroundY,
      startZ,
      0.95
    )?.inside
  );
  const targetInTunnel = Boolean(
    foliageManager?.mountainHoleManager?.isInsideMountainTunnel(
      directX,
      currentGroundY,
      directZ,
      0.95
    )?.inside
  );

  const isNearAnyPortal = Boolean(
    foliageManager?.mountainHoleManager?.holes.some((h) => {
      const distEntStart = Math.hypot(startX - h.position.x, startZ - h.position.z);
      const distEntTarget = Math.hypot(directX - h.position.x, directZ - h.position.z);
      const exitPos = (h.isPassThrough && h.exitPosition) ? h.exitPosition : null;
      const distExitStart = exitPos ? Math.hypot(startX - exitPos.x, startZ - exitPos.z) : 999;
      const distExitTarget = exitPos ? Math.hypot(directX - exitPos.x, directZ - exitPos.z) : 999;
      return Math.min(distEntStart, distEntTarget, distExitStart, distExitTarget) < 8.5;
    })
  );

  const isNavigatingTunnel = startInTunnel || targetInTunnel || isNearAnyPortal;

  if (!isNavigatingTunnel && foliageManager && typeof foliageManager.checkObstacleCollision === 'function') {
    const stuckCheck = foliageManager.checkObstacleCollision(
      startX,
      currentGroundY,
      startZ,
      PLAYER_COLLISION_RADIUS
    );
    if (stuckCheck.hit && stuckCheck.collider) {
      const c = stuckCheck.collider;
      const dx = startX - c.x;
      const dz = startZ - c.z;
      const dist = Math.hypot(dx, dz);
      const safeRadius = c.radius + PLAYER_COLLISION_RADIUS + 0.2;
      const dirX = dist > 0.001 ? dx / dist : (targetDx !== 0 ? Math.sign(targetDx) : 1);
      const dirZ = dist > 0.001 ? dz / dist : (targetDz !== 0 ? Math.sign(targetDz) : 0);
      return {
        x: c.x + dirX * safeRadius,
        z: c.z + dirZ * safeRadius,
        isBlocked: true,
        slid: true,
        blockedReason: 'freed_from_obstacle',
      };
    }
  }

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
