import * as THREE from 'three';
import { MountainDustParticleSystem } from './mountainDustParticles';
import { getTerrainHeight } from './terrain';

export type MountainHoleType = 'drift' | 'branch' | 'raise';

export interface MountainHole {
  id: string;
  position: THREE.Vector3; // World coordinates on mountain face or cavern wall
  normal: THREE.Vector3;   // Outward-facing surface normal
  depth: number;           // Depth penetrated into mountain/rock in meters
  radius: number;          // Opening width radius in meters
  strikes: number;         // Number of pickaxe blows
  rockColor: number;       // Tint of surrounding mountain rock
  rockType: string;        // 'volcanic_crag' | 'stepped_mesa' | 'fault_monocline' | 'canyon_spire' | 'granite';
  hasExposedGoldVein: boolean;
  goldAwardedTotal: number;
  isSurface?: boolean;
  entranceTerrainY?: number;
  isPassThrough?: boolean;
  exitPosition?: THREE.Vector3;
  holeType?: MountainHoleType; // 'drift' (main tunnel), 'branch' (side cross-cut), or 'raise' (upward chimney)
  parentId?: string;           // ID of parent tunnel if branched or raised off another
  group: THREE.Group;
  rimMesh: THREE.Mesh;
  cavityMesh: THREE.Mesh;
  exitRimMesh?: THREE.Mesh;
  veinMesh?: THREE.Mesh;
  sillRubbleMesh?: THREE.Mesh;
  timberLintel?: THREE.Mesh;
  exitTimberLintel?: THREE.Mesh;
  timberSets?: THREE.Group[];
  ladderGroup?: THREE.Group;   // Climbable wooden ladder for upward raises
  interiorGlow?: THREE.PointLight;
}

export interface DigMountainHoleResult {
  hole: MountainHole;
  isNew: boolean;
  depthReached: number;
  goldAwarded: number;
  rocksAwarded: number;
  message: string;
  hitPoint: THREE.Vector3;
  debrisType: 'granite' | 'sandstone' | 'dirt';
}

/**
 * Procedural 3D Excavation Engine for Mountain Rock Faces & Outcroppings.
 * Generates visible, volumetric rock-hewn holes, prospector adits, and exploratory cavities
 * carved directly into solid mountain bedrock with pickaxe strikes.
 */
export function computeHoleQuaternion(holeType: MountainHoleType, normal: THREE.Vector3): THREE.Quaternion {
  const quat = new THREE.Quaternion();
  if (holeType === 'raise') {
    // Upward chimney into ceiling: local -Z points straight UP (0, 1, 0), local +Z points DOWN (0, -1, 0)
    const forward = new THREE.Vector3(0, -1, 0);
    const up = new THREE.Vector3(0, 0, 1);
    const right = new THREE.Vector3(1, 0, 0);
    const matrix = new THREE.Matrix4().makeBasis(right, up, forward);
    quat.setFromRotationMatrix(matrix);
  } else {
    // Horizontal drift or cross-cut: local +Y is strictly world UP (0, 1, 0).
    // Local +Z points outward along horizontal normal; local -Z points into the mountain.
    // This ensures timber sets, portals, lintels, and walking floor are always plumb, level, and centered.
    const forwardXZ = new THREE.Vector3(normal.x, 0, normal.z);
    if (forwardXZ.lengthSq() < 0.001) {
      forwardXZ.set(0, 0, 1);
    } else {
      forwardXZ.normalize();
    }
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, forwardXZ).normalize();
    const matrix = new THREE.Matrix4().makeBasis(right, up, forwardXZ);
    quat.setFromRotationMatrix(matrix);
  }
  return quat;
}

export class MountainHoleManager {
  public holes: MountainHole[] = [];
  public dustParticleSystem?: MountainDustParticleSystem;
  private scene: THREE.Scene;
  private readonly rootGroup: THREE.Group;

  // Shared reusable geometries and materials for optimal performance
  private readonly sharedMaterials: Map<string, THREE.Material> = new Map();
  private isInsideMountainRock?: (pos: THREE.Vector3) => boolean;

  constructor(scene: THREE.Scene, dustParticles?: MountainDustParticleSystem) {
    this.scene = scene;
    this.dustParticleSystem = dustParticles;
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'MountainExcavatedHoles';
    this.scene.add(this.rootGroup);
  }

  public setDustParticleSystem(ps: MountainDustParticleSystem) {
    this.dustParticleSystem = ps;
  }

  public setRockCheckCallback(cb: (pos: THREE.Vector3) => boolean) {
    this.isInsideMountainRock = cb;
  }

  /**
   * Evaluates if a tunnel bore has broken through a mountain ridge, peak, or outcropping to daylight.
   */
  public checkHolePassThrough(hole: MountainHole): boolean {
    if (hole.holeType === 'raise') return false;
    // Tunnel requires sufficient depth (minimum 2.8m) to pierce through
    if (hole.depth < 2.8) return false;

    // Local -Z is the bore direction into the mountain
    const boreDir = new THREE.Vector3(0, 0, -1).applyQuaternion(hole.group.quaternion).normalize();
    const exitPos = hole.position.clone().add(boreDir.clone().multiplyScalar(hole.depth));

    // Sample terrain elevation at the potential exit coordinate
    const groundYAtExit = getTerrainHeight(exitPos.x, exitPos.z);

    // Check if exit position is still embedded inside an outcropping rock volume
    const insideRock = this.isInsideMountainRock ? this.isInsideMountainRock(exitPos) : false;

    // If outside rock colliders and exit elevation is at or above the terrain slope (emerged into open air):
    if (!insideRock && exitPos.y >= groundYAtExit - 0.55) {
      hole.isPassThrough = true;
      hole.exitPosition = exitPos;
      return true;
    }
    return false;
  }

  /**
   * Finds an existing mountain hole within proximity threshold, checking entrance, bore corridor, and working face
   */
  public findNearbyHole(point: THREE.Vector3, threshold: number = 2.5): MountainHole | undefined {
    let closest: MountainHole | undefined;
    let minDist = threshold;
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i];
      // Check in local space of tunnel
      const localP = point.clone().sub(h.position);
      localP.applyQuaternion(h.group.quaternion.clone().invert());
      // If point is along the tunnel bore from entrance (z = 0) to working face (z = -h.depth)
      if (localP.z <= 2.4 && localP.z >= -h.depth - 1.5) {
        const horizDist = Math.hypot(localP.x, localP.y);
        if (horizDist <= Math.max(2.6, h.radius * 1.5)) {
          return h;
        }
      }
      // Also check world distance to entrance or back face
      const distToEntrance = h.position.distanceTo(point);
      const backFacePos = h.position.clone().add(
        new THREE.Vector3(0, 0, -h.depth).applyQuaternion(h.group.quaternion)
      );
      const distToFace = backFacePos.distanceTo(point);
      const dist = Math.min(distToEntrance, distToFace);
      if (dist < minDist) {
        minDist = dist;
        closest = h;
      }
    }
    return closest;
  }

  /**
   * Checks if a 3D world coordinate is inside the carved corridor of any mountain adit,
   * side cross-cut branch drift, or upward raise/stope chimney.
   */
  public isInsideMountainTunnel(
    worldX: number,
    worldY: number,
    worldZ: number,
    toleranceMargin: number = 0.65
  ): { inside: boolean; floorY?: number; hole?: MountainHole; distFromEntrance?: number; isRaise?: boolean } {
    const testPos = new THREE.Vector3(worldX, worldY, worldZ);
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i];
      // Quick bounding sphere check
      const distToHole = testPos.distanceTo(h.position);
      if (distToHole > h.depth + h.radius + 4.5) continue;

      if (h.holeType === 'raise') {
        // Upward vertical raise chimney
        // Entrance is at h.position (ceiling of drift/cavern). Extends upward by h.depth
        const dx = testPos.x - h.position.x;
        const dz = testPos.z - h.position.z;
        const horizDist = Math.hypot(dx, dz);
        const radiusAllowance = Math.max(1.5, h.radius * 1.35) + toleranceMargin;
        const minY = h.position.y - 3.2;
        const maxY = h.position.y + h.depth + 1.5;

        if (horizDist <= radiusAllowance && testPos.y >= minY && testPos.y <= maxY) {
          // Standing or climbing inside the raise chimney.
          const isAtTopPlatform = testPos.y >= h.position.y + h.depth - 0.6;
          const topStagingY = h.position.y + h.depth - 0.25;
          return {
            inside: true,
            floorY: isAtTopPlatform ? topStagingY : undefined,
            hole: h,
            distFromEntrance: Math.max(0, testPos.y - h.position.y),
            isRaise: true,
          };
        }
        continue;
      }

      // Horizontal drift or side branch tunnel
      const localP = testPos.clone().sub(h.position);
      const invQuat = h.group.quaternion.clone().invert();
      localP.applyQuaternion(invQuat);

      const z = localP.z;
      // Along the tunnel bore: allow generous threshold outside entrance (+2.8m in front of portal)
      // down to beyond the back face (-depth - 0.6m, or -depth - 2.8m if pass-through)
      const maxRearZ = h.isPassThrough ? -h.depth - 2.8 : -h.depth - 0.6;
      if (z <= 2.8 && z >= maxRearZ) {
        const halfWidth = Math.max(1.6, h.radius * 1.25) + toleranceMargin;
        const isWithinWidth = Math.abs(localP.x) <= halfWidth;

        // Vertical clearance: check from floor to ceiling
        const floorY = typeof h.entranceTerrainY === 'number' ? h.entranceTerrainY : (h.position.y - h.radius * 0.88);
        const ceilingY = floorY + h.radius * 1.95;
        // Check accommodates testPos.y given as feet (floorY) OR head/eye level (floorY + 1.7)
        const isWithinHeight =
          testPos.y >= floorY - 1.2 - toleranceMargin && testPos.y <= ceilingY + 1.8 + toleranceMargin;

        if (isWithinWidth && isWithinHeight) {
          // Inside tunnel corridor! Smoothly blend floor elevation if in the entrance transition zone
          let currentFloorY = floorY;
          if (z > 0) {
            const exteriorY = typeof h.entranceTerrainY === 'number' ? h.entranceTerrainY : floorY;
            const blend = Math.min(1.0, z / 2.8);
            currentFloorY = THREE.MathUtils.lerp(floorY, exteriorY, blend);
          } else if (h.isPassThrough && z < -h.depth) {
            // Exit portal transition zone: blend smoothly to the opposite hillside ground elevation
            const exitGroundY = h.exitPosition ? getTerrainHeight(h.exitPosition.x, h.exitPosition.z) : floorY;
            const blend = Math.min(1.0, (-z - h.depth) / 2.8);
            currentFloorY = THREE.MathUtils.lerp(floorY, exitGroundY, blend);
          }

          return {
            inside: true,
            floorY: currentFloorY,
            hole: h,
            distFromEntrance: Math.max(0, -z),
          };
        }
      }
    }
    return { inside: false };
  }

  /**
   * Tests if movement inside a mountain tunnel is colliding with the left/right rock ribs or the back working face.
   * Returns blocked: true and a collision sliding normal if hitting tunnel boundary.
   */
  public testTunnelBoundaryCollision(
    candX: number,
    candGroundY: number,
    candZ: number,
    playerRadius: number = 0.42
  ): { blocked: boolean; reason?: string; normal?: { x: number; z: number } } {
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i];
      if (h.holeType === 'raise') continue;

      const testPos = new THREE.Vector3(candX, candGroundY, candZ);
      const localP = testPos.clone().sub(h.position);
      const invQuat = h.group.quaternion.clone().invert();
      localP.applyQuaternion(invQuat);

      // Only restrict boundaries once the player has actually stepped inside the tunnel (z < -0.2)
      // If pass-through, stop restricting once player exits the other side (z < -h.depth + 0.2)
      const minZ = h.isPassThrough ? -h.depth + 0.2 : -h.depth - 1.2;
      if (localP.z < -0.2 && localP.z >= minZ) {
        const floorY = typeof h.entranceTerrainY === 'number' ? h.entranceTerrainY : (h.position.y - h.radius * 0.88);
        const ceilingY = floorY + h.radius * 1.95;
        if (candGroundY < floorY - 1.5 || candGroundY > ceilingY + 1.5) continue;

        // Check back working face: player cannot walk through solid bedrock past -h.depth UNLESS pass-through!
        if (!h.isPassThrough) {
          const faceLimit = -h.depth + playerRadius + 0.15;
          if (localP.z < faceLimit) {
            const worldNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(h.group.quaternion).normalize();
            return {
              blocked: true,
              reason: 'tunnel_working_face',
              normal: { x: worldNormal.x, z: worldNormal.z },
            };
          }
        }

        // Check side ribs (left/right walls)
        const wallLimit = h.radius * 0.88 - playerRadius;
        if (Math.abs(localP.x) > wallLimit) {
          const localNormalX = localP.x > 0 ? -1 : 1;
          const worldNormal = new THREE.Vector3(localNormalX, 0, 0).applyQuaternion(h.group.quaternion).normalize();
          return {
            blocked: true,
            reason: 'tunnel_wall',
            normal: { x: worldNormal.x, z: worldNormal.z },
          };
        }
      }
    }
    return { blocked: false };
  }

  /**
   * Checks if player is standing near an upward raise ladder and can climb up/down
   */
  public isNearRaiseLadder(
    pos: THREE.Vector3 | { x: number; y: number; z: number },
    horizontalTolerance: number = 1.6
  ): { near: boolean; hole?: MountainHole; ladderPos?: THREE.Vector3; minY?: number; maxY?: number } {
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i];
      if (h.holeType !== 'raise') continue;

      const ladderX = h.position.x;
      const ladderZ = h.position.z;
      const horizDist = Math.hypot(pos.x - ladderX, pos.z - ladderZ);

      if (horizDist <= horizontalTolerance + h.radius * 0.75) {
        const minY = h.position.y - 3.2;
        const maxY = h.position.y + h.depth + 0.3;
        if (pos.y >= minY - 0.5 && pos.y <= maxY + 0.8) {
          return {
            near: true,
            hole: h,
            ladderPos: new THREE.Vector3(ladderX, pos.y, ladderZ),
            minY,
            maxY,
          };
        }
      }
    }
    return { near: false };
  }

  /**
   * Raycasts directly against active mountain hole entrance and interior meshes.
   * Accurately detects whether striking working face, overhead ceiling (raise), or lateral ribs (branch).
   */
  public raycastMountainHoles(raycaster: THREE.Raycaster, maxDist: number = 7.5): {
    hit: boolean;
    hole?: MountainHole;
    point?: THREE.Vector3;
    distance?: number;
    isBackFace?: boolean;
    isCeiling?: boolean;
    isSideWall?: boolean;
    strikeNormal?: THREE.Vector3;
  } {
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i];
      // Test if ray origin or direction is near the hole entrance or tunnel line
      const distToEntrance = raycaster.ray.origin.distanceTo(h.position);
      if (distToEntrance > maxDist + h.depth + 2.0) continue;

      // Test intersection against the hole's hierarchy (rim, cavity walls, back wall, vein)
      const hits = raycaster.intersectObject(h.group, true);
      if (hits.length > 0 && hits[0].distance <= maxDist) {
        const hitPt = hits[0].point;
        // Check if hit is near the deep working face
        const localHit = hitPt.clone().sub(h.position);
        const invQuat = h.group.quaternion.clone().invert();
        localHit.applyQuaternion(invQuat);

        const isBackFace = localHit.z <= -h.depth * 0.72;
        // Check if hitting ceiling (overhead raise) or lateral side wall (side branch)
        const isCeiling = !isBackFace && (localHit.y > h.radius * 0.35 || raycaster.ray.direction.y > 0.42);
        const isSideWall = !isBackFace && !isCeiling && Math.abs(localHit.x) > h.radius * 0.30;

        let strikeNormal: THREE.Vector3;
        if (isBackFace) {
          strikeNormal = h.normal.clone();
        } else if (isCeiling) {
          // Normal pointing down into tunnel so local -Z points straight UP
          const localNormal = new THREE.Vector3(0, -1, 0);
          strikeNormal = localNormal.applyQuaternion(h.group.quaternion).normalize();
          if (strikeNormal.y > -0.3) {
            strikeNormal.set(0, -1, 0);
          }
        } else if (isSideWall) {
          // Normal pointing inward toward tunnel center from side rib
          const localNormal = new THREE.Vector3(localHit.x < 0 ? 1 : -1, 0, 0);
          strikeNormal = localNormal.applyQuaternion(h.group.quaternion).normalize();
        } else {
          strikeNormal = h.normal.clone();
        }

        return {
          hit: true,
          hole: h,
          point: hitPt,
          distance: hits[0].distance,
          isBackFace,
          isCeiling,
          isSideWall,
          strikeNormal,
        };
      }
    }
    return { hit: false };
  }

  /**
   * Digs a visible hole or deepens an existing hole directly on a mountain face,
   * carves branching side cross-cut drifts into tunnel walls, or excavates upward raise chimneys into the roof.
   */
  public digMountainHole(
    hitPoint: THREE.Vector3,
    surfaceNormal: THREE.Vector3,
    rockColor: number = 0x8a4528,
    rockType: string = 'volcanic_crag',
    tool: string = 'pickaxe',
    isSurface: boolean = false,
    existingHole?: MountainHole,
    branchInfo?: { isBranch?: boolean; isCeiling?: boolean },
    terrainYAtHit?: number
  ): DigMountainHoleResult {
    // Clean and normalize normal vector
    const normal = surfaceNormal.clone();
    if (normal.lengthSq() < 0.001) {
      normal.set(0, 0, 1);
    } else {
      normal.normalize();
    }

    const isPickaxe = tool === 'pickaxe';
    const isDynamite = tool === 'dynamite';
    // Walk-in adit scaling: comfortable walk-in proportions right away
    const baseDepthIncrement = isDynamite ? 2.8 : isPickaxe ? 0.95 : 0.45;
    const baseRadiusIncrement = isDynamite ? 0.25 : isPickaxe ? 0.08 : 0.04;

    const isCeilingStrike = branchInfo?.isCeiling || normal.y < -0.45;
    const isBranchRequest = branchInfo?.isBranch;

    // Detect if this hit corresponds to an existing hole (either deepening it, or branching off it)
    let existing: MountainHole | undefined = existingHole;
    let parentTunnel: MountainHole | undefined;
    let isBranchStrike = false;

    if (existingHole) {
      if (isCeilingStrike && existingHole.holeType !== 'raise') {
        // Striking ceiling of an existing tunnel: start or deepen an upward raise
        existing = this.holes.find((h) => h.holeType === 'raise' && h.parentId === existingHole.id);
        parentTunnel = existingHole;
      } else if (isBranchRequest && existingHole.holeType !== 'branch') {
        // Striking side wall of an existing tunnel: start or deepen a side cross-cut drift
        isBranchStrike = true;
        parentTunnel = existingHole;
        existing = this.holes.find(
          (h) => h.holeType === 'branch' && h.parentId === existingHole.id && h.position.distanceTo(hitPoint) < 1.8
        );
      } else {
        existing = existingHole;
      }
    } else if (isCeilingStrike) {
      // Look for an existing raise nearby to deepen
      existing = this.holes.find((h) => h.holeType === 'raise' && h.position.distanceTo(hitPoint) < 2.0);
      if (!existing) {
        // If inside a tunnel, that tunnel is the parent of the new raise!
        const insideCheck = this.isInsideMountainTunnel(hitPoint.x, hitPoint.y, hitPoint.z, 0.8);
        if (insideCheck.inside && insideCheck.hole) {
          parentTunnel = insideCheck.hole;
        }
      }
    } else {
      // Lateral or forward strike
      // 1. Check if an existing hole is aligned with this strike vector to deepen
      existing = this.holes.find((h) => {
        const dist = h.position.distanceTo(hitPoint);
        const dot = h.normal.dot(normal);
        return dist < 2.4 && dot > 0.4;
      });

      // 2. If no direct match, check if hit is inside an existing tunnel or near its side wall to branch!
      if (!existing) {
        const insideCheck = this.isInsideMountainTunnel(hitPoint.x, hitPoint.y, hitPoint.z, 0.9);
        const parentCandidate = insideCheck.inside ? insideCheck.hole : this.findNearbyHole(hitPoint, 2.5);
        if (parentCandidate) {
          const dot = parentCandidate.normal.dot(normal);
          if (Math.abs(dot) < 0.65) {
            // This is a SIDE BRANCH off parentCandidate!
            isBranchStrike = true;
            parentTunnel = parentCandidate;
            existing = this.holes.find(
              (h) => h.holeType === 'branch' && h.parentId === parentCandidate.id && h.position.distanceTo(hitPoint) < 1.8
            );
          } else {
            // Forward working face deepening of parentCandidate
            existing = parentCandidate;
          }
        }
      }
    }

    if (existing) {
      existing.strikes += 1;
      existing.isSurface = isSurface || existing.isSurface;
      // Auto-correct orientation if normal was previously inverted or misaligned
      if (normal.lengthSq() > 0.01 && existing.normal.dot(normal) < 0.2) {
        existing.normal.copy(normal);
        const quat = computeHoleQuaternion(existing.holeType || 'drift', normal);
        existing.group.quaternion.copy(quat);
      }
      // Max depth up to 32.0m (capped at 18.0m on surface outcroppings so it stays within mountain bounds)
      const maxDepth = isSurface ? 18.0 : 32.0;
      existing.depth = Math.min(maxDepth, existing.depth + baseDepthIncrement);
      // Radius expands to a spacious walk-in adit passage (~1.6m - 2.4m radius = ~3.2m - 4.8m wide tunnel)
      existing.radius = Math.min(2.40, Math.max(1.60, existing.radius + baseRadiusIncrement));

      // Keep horizontal floor aligned with ground
      if (existing.entranceTerrainY !== undefined && existing.holeType !== 'raise') {
        existing.position.y = existing.entranceTerrainY + existing.radius * 0.88;
        existing.group.position.y = existing.position.y;
      }

      // Check if deepening the tunnel pierced daylight through the mountain ridge
      const previouslyPassThrough = Boolean(existing.isPassThrough);
      const nowPassThrough = this.checkHolePassThrough(existing);
      const justBrokeThrough = !previouslyPassThrough && nowPassThrough;

      // Rebuild 3D visual geometry to reflect the newly deepened excavation
      this.rebuildHoleVisuals(existing);

      // Gold discovery calculations
      let goldAwarded = 0;
      let msg = '';
      const roll = Math.random();

      const typeLabel =
        existing.holeType === 'raise'
          ? 'Upward Stope Chimney'
          : existing.holeType === 'branch'
          ? 'Side Cross-Cut Drift'
          : 'Mountain Drift';

      if (justBrokeThrough) {
        msg = `🎉 DAYLIGHT! BORE BROKE THROUGH THE MOUNTAIN! Pass-through tunnel opened (-${existing.depth.toFixed(1)}m)! You can now walk freely right through the mountain ridge!`;
      } else if (existing.isPassThrough) {
        msg = `⛏️ Widened Mountain Pass-Through Tunnel (${existing.depth.toFixed(1)}m)! Natural daylight streams through both portals (+2 Quarry Stone)`;
      } else if (existing.depth >= 1.2 && !existing.hasExposedGoldVein && roll < 0.7) {
        existing.hasExposedGoldVein = true;
        goldAwarded = 2 + Math.floor(Math.random() * 4);
        existing.goldAwardedTotal += goldAwarded;
        this.rebuildHoleVisuals(existing);
        msg = `⛏️ BORED DEEPER INTO ${typeLabel.toUpperCase()} (${existing.holeType === 'raise' ? '+' : '-'}${existing.depth.toFixed(1)}m)! Struck high-grade Gold Quartz Vein in bedrock! (+${goldAwarded} oz Gold)`;
      } else if (existing.hasExposedGoldVein && roll < 0.5) {
        goldAwarded = 1 + Math.floor(Math.random() * 3);
        existing.goldAwardedTotal += goldAwarded;
        msg = `⛏️ Chiseled ${typeLabel} Face (${existing.holeType === 'raise' ? '+' : '-'}${existing.depth.toFixed(1)}m): Extracted +${goldAwarded} oz Gold Quartz from cavity!`;
      } else if (existing.depth >= 6.0 && roll < 0.4) {
        // Deep mountain bonanza strike!
        goldAwarded = 3 + Math.floor(Math.random() * 5);
        existing.goldAwardedTotal += goldAwarded;
        msg = `✨ BONANZA VEIN BREACH at ${existing.holeType === 'raise' ? '+' : '-'}${existing.depth.toFixed(1)}m deep inside ${typeLabel}! Extracted +${goldAwarded} oz Native Electrum & Gold!`;
      } else if (existing.depth >= 3.0) {
        msg = `⛏️ Advanced ${typeLabel} to ${existing.holeType === 'raise' ? '+' : '-'}${existing.depth.toFixed(1)}m! Erected timber support sets inside (+2 Quarry Stone)`;
      } else {
        msg = `⛏️ Carved ${typeLabel} to ${existing.holeType === 'raise' ? '+' : '-'}${existing.depth.toFixed(1)}m! (+2 Building Stone)`;
      }

      if (this.dustParticleSystem) {
        const mat = existing.hasExposedGoldVein ? 'quartz_gold' : rockType;
        const mult = isDynamite ? 2.8 : isPickaxe ? 1.0 + Math.min(2.0, existing.depth * 0.15) : 0.8;
        this.dustParticleSystem.triggerMountainStrike(existing.position, normal, mat, mult);
      }

      return {
        hole: existing,
        isNew: false,
        depthReached: existing.depth,
        goldAwarded,
        rocksAwarded: isDynamite ? 5 : 2,
        message: msg,
        hitPoint: existing.position.clone(),
        debrisType: rockType.includes('sand') ? 'sandstone' : 'granite',
      };
    }

    // Otherwise, create a brand new walk-in excavation tunnel!
    const initialDepth = isDynamite ? 4.5 : isPickaxe ? 2.4 : 1.4;
    const initialRadius = isDynamite ? 1.95 : 1.60;
    const hasGoldVein = Math.random() < 0.35;
    const initialGold = hasGoldVein ? 1 : 0;

    const holeType: MountainHoleType = isCeilingStrike ? 'raise' : isBranchStrike ? 'branch' : 'drift';

    const holePosition = hitPoint.clone();
    let entranceFloorY: number | undefined;

    // Center horizontal tunnel vertically on the ground floor so player walks straight in seamlessly!
    if (holeType !== 'raise') {
      if (terrainYAtHit !== undefined) {
        entranceFloorY = terrainYAtHit;
      } else {
        // Default floor level sampled from hit point
        entranceFloorY = hitPoint.y - 0.5;
      }
      holePosition.y = entranceFloorY + initialRadius * 0.88;
    }

    const holeGroup = new THREE.Group();
    holeGroup.position.copy(holePosition);

    const quat = computeHoleQuaternion(holeType, normal);
    holeGroup.quaternion.copy(quat);

    const holeId = `mtn_hole_${holeType}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const newHole: MountainHole = {
      id: holeId,
      position: holePosition.clone(),
      normal: normal.clone(),
      depth: initialDepth,
      radius: initialRadius,
      strikes: 1,
      rockColor,
      rockType,
      hasExposedGoldVein: hasGoldVein,
      goldAwardedTotal: initialGold,
      isSurface,
      entranceTerrainY: entranceFloorY,
      holeType,
      parentId: parentTunnel?.id,
      group: holeGroup,
      rimMesh: undefined as unknown as THREE.Mesh,
      cavityMesh: undefined as unknown as THREE.Mesh,
    };

    const brokeThrough = this.checkHolePassThrough(newHole);
    if (brokeThrough) {
      newHole.isPassThrough = true;
    }
    this.rebuildHoleVisuals(newHole);
    this.rootGroup.add(holeGroup);
    this.holes.push(newHole);

    let msg = '';
    if (brokeThrough) {
      msg = `🎉 DAYLIGHT! BLAST PIERCED THE RIDGE! Pass-through tunnel opened (-${initialDepth.toFixed(1)}m)! Both portals are now open!`;
    } else if (holeType === 'raise') {
      msg = `⛏️ UPWARD RAISE STARTED (+${initialDepth.toFixed(1)}m)! Timber cribbing & climbable ladder erected overhead!${hasGoldVein ? ' (+1 oz Gold)' : ' (+1 Building Stone)'}`;
    } else if (holeType === 'branch') {
      msg = `⛏️ BRANCH TUNNEL STARTED (-${initialDepth.toFixed(1)}m)! Timber portal erected for side cross-cut drift!${hasGoldVein ? ' (+1 oz Gold)' : ' (+1 Building Stone)'}`;
    } else {
      msg = hasGoldVein
        ? `⛏️ EXCAVATED WALK-IN ADIT PORTAL (-${initialDepth.toFixed(1)}m)! Exposed Glittering Gold Quartz Vein! (+1 oz Gold)`
        : `⛏️ EXCAVATED WALK-IN ADIT PORTAL (-${initialDepth.toFixed(1)}m)! Timbered entrance drift carved into mountain! (+2 Building Stone)`;
    }

    if (this.dustParticleSystem) {
      const mat = hasGoldVein ? 'quartz_gold' : rockType;
      const mult = isDynamite ? 2.2 : isPickaxe ? 1.1 : 0.8;
      this.dustParticleSystem.triggerMountainStrike(holePosition, normal, mat, mult);
    }

    return {
      hole: newHole,
      isNew: true,
      depthReached: initialDepth,
      goldAwarded: initialGold,
      rocksAwarded: isDynamite ? 5 : 2,
      message: msg,
      hitPoint: holePosition.clone(),
      debrisType: rockType.includes('sand') ? 'sandstone' : 'granite',
    };
  }

  /**
   * Constructs the authentic 3D physical meshes for a mountain hole:
   * - Outer jagged chiseled collar/rim
   * - Deep, concave hollow cavity projecting into the mountain
   * - Exposed quartz crystal & gold vein ribbon at the rear wall
   * - Fallen chisel rubble sill
   * - Split timber lintel prop if deep enough
   */
  private rebuildHoleVisuals(hole: MountainHole): void {
    // Clear existing children from group
    while (hole.group.children.length > 0) {
      const child = hole.group.children[0];
      hole.group.remove(child);
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
    }

    const R = hole.radius;
    const D = hole.depth;

    // 1. Organic 3D Mountain Rock Collar Ring (Flared Volumetric Rock Collar that seals entrance seam)
    // Flared 3D geometry wraps from +0.08m outside the rock face into -0.32m of the bore,
    // completely eliminating any see-through gaps, polygon clipping, or raw cutout stepping.
    const collarLength = 0.40;
    const collarOuterR = R * 1.28;
    const collarInnerR = R * 1.02;
    const collarGeo = new THREE.CylinderGeometry(
      collarOuterR, // at z = +0.08 (outer mountain rock face)
      collarInnerR, // at z = -0.32 (inner tunnel bore)
      collarLength,
      16,
      2,
      true // open-ended cylinder
    );
    collarGeo.rotateX(Math.PI / 2);
    collarGeo.translate(0, 0, -collarLength * 0.5 + 0.08);

    // Perturb collar vertices slightly for rough chiseled rock look
    const colAttr = collarGeo.attributes.position;
    for (let i = 0; i < colAttr.count; i++) {
      const angle = Math.atan2(colAttr.getY(i), colAttr.getX(i));
      const noise = (Math.sin(angle * 7) + Math.cos(angle * 5)) * 0.035 * R;
      colAttr.setX(i, colAttr.getX(i) * (1.0 + noise));
      colAttr.setY(i, colAttr.getY(i) * (1.0 + noise));
    }
    collarGeo.computeVertexNormals();

    const rimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hole.rockColor).offsetHSL(0.01, -0.04, 0.06),
      roughness: 0.94,
      metalness: 0.04,
      side: THREE.DoubleSide,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
    });

    const rimMesh = new THREE.Mesh(collarGeo, rimMat);
    hole.group.add(rimMesh);
    hole.rimMesh = rimMesh;

    // 2. Excavated Interior Cavity Bore (Deep into the Mountain along -Z)
    // For shallow gouges (< 1.4m), it tapers organically; for walk-in adits (>= 1.4m), it forms a full navigable tunnel bore
    const isAdit = D >= 1.4;
    const rearR = isAdit ? Math.max(R * 0.96, R - 0.08) : R * 0.88;
    const heightSegs = Math.max(4, Math.min(24, Math.floor(D * 1.6)));

    const cavityGeo = new THREE.CylinderGeometry(
      R * 1.02,   // entrance radius (at z = 0, fully covers cutout)
      rearR,      // interior rear radius (at z = -D)
      D,          // length of excavated bore
      16,         // radial segments
      heightSegs, // height segments along the tunnel
      true        // open-ended ensures tunnel mouth is clear and unobstructed
    );

    // Rotate geometry so cylinder axis lies along Z (facing into -Z)
    cavityGeo.rotateX(Math.PI / 2);
    cavityGeo.translate(0, 0, -D * 0.5);

    // Perturb vertices for organic hand-pickaxe chisel facets, keeping the floor flat for easy walking
    const posAttr = cavityGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const z = posAttr.getZ(i);
      const y = posAttr.getY(i);
      if (z < -0.05) {
        // Flatten the bottom floor uniformly so prospectors have smooth, level footing
        if (y < -R * 0.55 && isAdit) {
          posAttr.setY(i, -R * 0.88);
        } else {
          const noise = (Math.sin(posAttr.getX(i) * 12 + z * 6) + Math.cos(posAttr.getY(i) * 14)) * 0.035 * R;
          posAttr.setX(i, posAttr.getX(i) + noise);
          posAttr.setY(i, posAttr.getY(i) + noise);
        }
      }
    }
    cavityGeo.computeVertexNormals();

    // Realistic interior rock material: BackSide renders the interior wall while keeping exterior invisible
    const darkInteriorColor = new THREE.Color(hole.rockColor).multiplyScalar(0.68);
    const cavityMat = new THREE.MeshStandardMaterial({
      color: darkInteriorColor,
      roughness: 0.88,
      metalness: 0.05,
      side: THREE.BackSide,
      flatShading: true,
    });

    const cavityMesh = new THREE.Mesh(cavityGeo, cavityMat);
    hole.group.add(cavityMesh);
    hole.cavityMesh = cavityMesh;

    // 2b. Solid Back Wall / Bedrock Face of the Excavation Cavity (Only for dead-end excavations)
    if (!hole.isPassThrough) {
      const backWallGeo = new THREE.CircleGeometry(rearR * 1.05, 16);
      // Perturb back wall vertices so it looks like rough fractured granite
      const backPos = backWallGeo.attributes.position;
      for (let i = 0; i < backPos.count; i++) {
        backPos.setZ(i, (Math.sin(backPos.getX(i) * 9) + Math.cos(backPos.getY(i) * 9)) * 0.05);
      }
      backWallGeo.computeVertexNormals();

      const backWallMat = new THREE.MeshStandardMaterial({
        color: darkInteriorColor,
        roughness: 0.92,
        metalness: 0.05,
        side: THREE.FrontSide,
        flatShading: true,
      });
      const backWallMesh = new THREE.Mesh(backWallGeo, backWallMat);
      backWallMesh.position.set(0, 0, -D);
      hole.group.add(backWallMesh);
    } else {
      // Pass-Through Exit Portal visual architecture on opposite mountain face
      const exitCollarGeo = new THREE.TorusGeometry(rearR * 0.96, 0.16, 8, 20);
      const exitRimMat = new THREE.MeshStandardMaterial({
        color: hole.rockColor,
        roughness: 0.94,
        metalness: 0.04,
        flatShading: true,
      });
      const exitRimMesh = new THREE.Mesh(exitCollarGeo, exitRimMat);
      exitRimMesh.position.set(0, 0, -D - 0.02);
      hole.group.add(exitRimMesh);
      hole.exitRimMesh = exitRimMesh;

      // Exit Timber Portal Archway
      const exitTimberMat = new THREE.MeshStandardMaterial({
        color: 0x5c3d24,
        roughness: 0.88,
        metalness: 0.02,
      });

      const exitBeamGeo = new THREE.BoxGeometry(rearR * 1.65, 0.14, 0.16);
      const exitBeamMesh = new THREE.Mesh(exitBeamGeo, exitTimberMat);
      exitBeamMesh.position.set(0, rearR * 0.80, -D - 0.02);
      hole.group.add(exitBeamMesh);
      hole.exitTimberLintel = exitBeamMesh;

      const exitPostGeo = new THREE.BoxGeometry(0.12, rearR * 1.65, 0.14);
      const exitPostL = new THREE.Mesh(exitPostGeo, exitTimberMat);
      exitPostL.position.set(-rearR * 0.78, -0.04, -D - 0.02);
      hole.group.add(exitPostL);

      const exitPostR = new THREE.Mesh(exitPostGeo, exitTimberMat);
      exitPostR.position.set(rearR * 0.78, -0.04, -D - 0.02);
      hole.group.add(exitPostR);

      // Exit Portal Lantern
      const exitLight = new THREE.PointLight(0xffb555, 1.8, Math.max(10.0, rearR * 8.0));
      exitLight.position.set(rearR * 0.4, rearR * 0.65, -D - 0.2);
      hole.group.add(exitLight);

      const exitLantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 0.18, 6),
        new THREE.MeshStandardMaterial({
          color: 0x1c1917,
          metalness: 0.8,
          roughness: 0.2,
          emissive: 0xff9922,
          emissiveIntensity: 0.8,
        })
      );
      exitLantern.position.set(rearR * 0.4, rearR * 0.65, -D - 0.2);
      hole.group.add(exitLantern);
    }

    // 3. Exposed Glittering Quartz & Gold Vein at the Deep Back Face (only if dead-end excavation)
    if (hole.hasExposedGoldVein && !hole.isPassThrough) {
      const veinGroup = new THREE.Group();

      // Quartz seam band across working face
      const quartzGeo = new THREE.BoxGeometry(rearR * 1.1, rearR * 0.32, 0.14);
      const quartzMat = new THREE.MeshStandardMaterial({
        color: 0xefede8,
        roughness: 0.38,
        metalness: 0.12,
        bumpScale: 0.08,
      });
      const quartzMesh = new THREE.Mesh(quartzGeo, quartzMat);
      quartzMesh.position.set(0, 0, -D * 0.96);
      quartzMesh.rotation.z = 0.45;
      veinGroup.add(quartzMesh);

      // Sparkling native gold nodules embedded in the quartz
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffb81c,
        roughness: 0.22,
        metalness: 0.94,
        emissive: 0x442800,
        emissiveIntensity: 0.35,
      });

      const nuggetCount = Math.min(8, 2 + Math.floor(hole.depth * 1.4));
      for (let n = 0; n < nuggetCount; n++) {
        const nGeo = new THREE.DodecahedronGeometry(0.05 + Math.random() * 0.04, 0);
        const nMesh = new THREE.Mesh(nGeo, goldMat);
        const offsetX = (n - (nuggetCount - 1) * 0.5) * (rearR * 0.18) + (Math.random() - 0.5) * 0.05;
        const offsetY = offsetX * Math.tan(0.45) + (Math.random() - 0.5) * 0.05;
        nMesh.position.set(offsetX, offsetY, -D * 0.94 + (Math.random() - 0.5) * 0.02);
        nMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        veinGroup.add(nMesh);
      }

      hole.group.add(veinGroup);
      hole.veinMesh = quartzMesh;
    }

    // 4. Blasted Chisel Rubble Sill at the Bottom of the Opening
    const rubbleGroup = new THREE.Group();
    const rubbleCount = Math.min(10, 3 + hole.strikes);
    const rubbleMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hole.rockColor).offsetHSL(0, 0, 0.04),
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });

    for (let r = 0; r < rubbleCount; r++) {
      const stoneGeo = new THREE.DodecahedronGeometry(0.04 + Math.random() * 0.06, 0);
      const stoneMesh = new THREE.Mesh(stoneGeo, rubbleMat);
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.8;
      const dist = R * (0.8 + Math.random() * 0.35);
      stoneMesh.position.set(
        Math.cos(angle) * dist,
        Math.sin(angle) * dist,
        0.04 + (Math.random() - 0.5) * 0.06
      );
      stoneMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rubbleGroup.add(stoneMesh);
    }
    hole.group.add(rubbleGroup);

    // 5. Timber Support Architecture (Automatic Support for Raises, Branches, and Drifts)
    hole.timberSets = [];
    const timberMat = new THREE.MeshStandardMaterial({
      color: 0x5c3d24,
      roughness: 0.88,
      metalness: 0.02,
    });

    if (hole.holeType === 'raise') {
      // 5a. UPWARD RAISE ARCHITECTURE: Vertical Timber Cribbing, Staging, and Climbable Ladder
      const cribGroup = new THREE.Group();

      // Four heavy vertical corner posts bounding the raise
      const postLength = D + 0.3;
      const cornerPostGeo = new THREE.BoxGeometry(0.12, 0.12, postLength);
      const postOffsets = [
        [-R * 0.62, -R * 0.62],
        [R * 0.62, -R * 0.62],
        [-R * 0.62, R * 0.62],
        [R * 0.62, R * 0.62],
      ];
      postOffsets.forEach(([px, py]) => {
        const post = new THREE.Mesh(cornerPostGeo, timberMat);
        post.position.set(px, py, -D * 0.5);
        cribGroup.add(post);
      });

      // Horizontal square-set collar cribbing rings every 1.5m up the chimney
      const numRings = Math.max(1, Math.floor(D / 1.5));
      for (let r = 0; r <= numRings; r++) {
        const rz = -Math.min(D, r * 1.5);
        const ringBeamGeoX = new THREE.BoxGeometry(R * 1.35, 0.11, 0.12);
        const ringBeamGeoY = new THREE.BoxGeometry(0.11, R * 1.35, 0.12);

        const beamTop = new THREE.Mesh(ringBeamGeoX, timberMat);
        beamTop.position.set(0, R * 0.62, rz);
        cribGroup.add(beamTop);

        const beamBottom = new THREE.Mesh(ringBeamGeoX, timberMat);
        beamBottom.position.set(0, -R * 0.62, rz);
        cribGroup.add(beamBottom);

        const beamLeft = new THREE.Mesh(ringBeamGeoY, timberMat);
        beamLeft.position.set(-R * 0.62, 0, rz);
        cribGroup.add(beamLeft);

        const beamRight = new THREE.Mesh(ringBeamGeoY, timberMat);
        beamRight.position.set(R * 0.62, 0, rz);
        cribGroup.add(beamRight);
      }

      // Wooden staging / work platform planks at top stope
      if (D >= 1.6) {
        const plankCount = 4;
        const plankGeo = new THREE.BoxGeometry(R * 0.28, R * 1.15, 0.06);
        for (let p = 0; p < plankCount; p++) {
          const plank = new THREE.Mesh(plankGeo, timberMat);
          const px = (p - (plankCount - 1) * 0.5) * (R * 0.32);
          plank.position.set(px, 0, -D + 0.32);
          cribGroup.add(plank);
        }
      }

      // Authentic Climbable Wooden Ladder (hangs down into drift/cavern below for seamless mounting)
      const ladderGroup = new THREE.Group();
      const ladderTotalLength = D + 2.2;
      const ladderMidZ = -(D - 2.2) * 0.5;

      const railGeo = new THREE.BoxGeometry(0.06, 0.08, ladderTotalLength);
      const railL = new THREE.Mesh(railGeo, timberMat);
      railL.position.set(-0.20, -R * 0.62, ladderMidZ);
      ladderGroup.add(railL);

      const railR = new THREE.Mesh(railGeo, timberMat);
      railR.position.set(0.20, -R * 0.62, ladderMidZ);
      ladderGroup.add(railR);

      // Wooden ladder rungs spaced every 0.32m
      const numRungs = Math.floor(ladderTotalLength / 0.32);
      const rungGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.40, 6);
      rungGeo.rotateZ(Math.PI * 0.5);
      for (let rung = 0; rung <= numRungs; rung++) {
        const rungZ = 2.0 - rung * 0.32;
        if (rungZ < -D + 0.1) break;
        const rungMesh = new THREE.Mesh(rungGeo, timberMat);
        rungMesh.position.set(0, -R * 0.62 + 0.02, rungZ);
        ladderGroup.add(rungMesh);
      }

      hole.ladderGroup = ladderGroup;
      hole.group.add(cribGroup);
      hole.group.add(ladderGroup);

      // Warm hanging lantern at top stope working face
      const stopeLight = new THREE.PointLight(0xffb044, 2.2, 10.0);
      stopeLight.position.set(0, 0, -D + 0.7);
      hole.group.add(stopeLight);

      const stopeLantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 0.16, 6),
        new THREE.MeshStandardMaterial({
          color: 0x222222,
          metalness: 0.9,
          roughness: 0.3,
          emissive: 0xff8811,
          emissiveIntensity: 0.8,
        })
      );
      stopeLantern.position.set(0, R * 0.42, -D + 0.7);
      hole.group.add(stopeLantern);

    } else if (hole.holeType === 'branch') {
      // 5b. BRANCH TUNNEL ARCHITECTURE: Heavy Timber T-Junction Portal Frame
      const portalGroup = new THREE.Group();

      // Header lintel across upper arch of junction
      const lintelGeo = new THREE.BoxGeometry(R * 1.65, 0.16, 0.18);
      const lintel = new THREE.Mesh(lintelGeo, timberMat);
      lintel.position.set(0, R * 0.80, 0.04);
      portalGroup.add(lintel);

      // Heavy vertical portal posts on both sides of the new branch opening
      const postGeo = new THREE.BoxGeometry(0.14, R * 1.65, 0.16);
      const postL = new THREE.Mesh(postGeo, timberMat);
      postL.position.set(-R * 0.78, -0.04, 0.04);
      portalGroup.add(postL);

      const postR = new THREE.Mesh(postGeo, timberMat);
      postR.position.set(R * 0.78, -0.04, 0.04);
      portalGroup.add(postR);

      // Floor sill beam
      const sillGeo = new THREE.BoxGeometry(R * 1.5, 0.10, 0.16);
      const sill = new THREE.Mesh(sillGeo, timberMat);
      sill.position.set(0, -R * 0.88, 0.04);
      portalGroup.add(sill);

      // Diagonal knee braces reinforcing the junction corners
      const braceGeo = new THREE.BoxGeometry(0.09, 0.32, 0.12);
      const braceL = new THREE.Mesh(braceGeo, timberMat);
      braceL.position.set(-R * 0.62, R * 0.66, 0.04);
      braceL.rotation.z = -Math.PI * 0.25;
      portalGroup.add(braceL);

      const braceR = new THREE.Mesh(braceGeo, timberMat);
      braceR.position.set(R * 0.62, R * 0.66, 0.04);
      braceR.rotation.z = Math.PI * 0.25;
      portalGroup.add(braceR);

      // Brass miner's lantern mounted directly on the branch junction post
      const junctionLight = new THREE.PointLight(0xffb844, 2.0, 10.0);
      junctionLight.position.set(R * 0.72, R * 0.45, 0.22);
      portalGroup.add(junctionLight);

      const junctionLantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 0.16, 6),
        new THREE.MeshStandardMaterial({
          color: 0x1f1d1a,
          metalness: 0.85,
          roughness: 0.25,
          emissive: 0xff9922,
          emissiveIntensity: 0.85,
        })
      );
      junctionLantern.position.set(R * 0.72, R * 0.45, 0.22);
      portalGroup.add(junctionLantern);

      hole.group.add(portalGroup);
      hole.timberLintel = lintel;

      // Internal branch square-set timber frames every 2.5m along branch depth
      if (hole.depth >= 2.5) {
        const numSets = Math.floor((hole.depth - 0.6) / 2.5);
        for (let s = 1; s <= numSets; s++) {
          const setDist = s * 2.5;
          if (setDist > hole.depth - 0.5) break;

          const setGroup = new THREE.Group();
          setGroup.position.set(0, 0, -setDist);

          const capLog = new THREE.Mesh(new THREE.BoxGeometry(R * 1.55, 0.13, 0.14), timberMat);
          capLog.position.set(0, R * 0.80, 0);
          setGroup.add(capLog);

          const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, R * 1.65, 0.13), timberMat);
          legL.position.set(-R * 0.76, -0.04, 0);
          legL.rotation.z = -0.04;
          setGroup.add(legL);

          const legR = new THREE.Mesh(new THREE.BoxGeometry(0.12, R * 1.65, 0.13), timberMat);
          legR.position.set(R * 0.76, -0.04, 0);
          legR.rotation.z = 0.04;
          setGroup.add(legR);

          const spreader = new THREE.Mesh(new THREE.BoxGeometry(R * 1.45, 0.08, 0.14), timberMat);
          spreader.position.set(0, -R * 0.88, 0);
          setGroup.add(spreader);

          hole.group.add(setGroup);
          hole.timberSets.push(setGroup);
        }
      }

      // Branch corridor lanterns
      if (hole.depth >= 3.0) {
        const lightSteps = Math.floor(hole.depth / 3.5);
        for (let l = 1; l <= lightSteps; l++) {
          const lz = -Math.min(hole.depth - 0.7, l * 3.5);
          const corridorLight = new THREE.PointLight(0xffaa44, 1.6, 9.0);
          corridorLight.position.set(0, R * 0.35, lz);
          hole.group.add(corridorLight);
        }
      }

    } else {
      // 5c. MAIN DRIFT TUNNEL ARCHITECTURE (Standard Drift Portals and Sets)
      if (hole.depth >= 1.2) {
        // Entrance Portal Header Beam across upper arch
        const beamGeo = new THREE.BoxGeometry(R * 1.65, 0.14, 0.16);
        const beamMesh = new THREE.Mesh(beamGeo, timberMat);
        beamMesh.position.set(0, R * 0.80, 0.02);
        hole.group.add(beamMesh);

        // Entrance wooden vertical prop posts
        const postGeo = new THREE.BoxGeometry(0.12, R * 1.65, 0.14);
        const postL = new THREE.Mesh(postGeo, timberMat);
        postL.position.set(-R * 0.78, -0.04, 0.02);
        hole.group.add(postL);

        const postR = new THREE.Mesh(postGeo, timberMat);
        postR.position.set(R * 0.78, -0.04, 0.02);
        hole.group.add(postR);
        hole.timberLintel = beamMesh;

        // Internal Drift Timber Sets (every ~2.5m along the tunnel depth)
        if (hole.depth >= 2.8) {
          const numSets = Math.floor((hole.depth - 0.8) / 2.5);
          for (let s = 1; s <= numSets; s++) {
            const setDist = s * 2.5;
            if (setDist > hole.depth - 0.6) break;

            const setGroup = new THREE.Group();
            setGroup.position.set(0, 0, -setDist);

            // Cap log
            const capLog = new THREE.Mesh(new THREE.BoxGeometry(R * 1.55, 0.13, 0.14), timberMat);
            capLog.position.set(0, R * 0.80, 0);
            setGroup.add(capLog);

            // Left leg post
            const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, R * 1.65, 0.13), timberMat);
            legL.position.set(-R * 0.76, -0.04, 0);
            legL.rotation.z = -0.04;
            setGroup.add(legL);

            // Right leg post
            const legR = new THREE.Mesh(new THREE.BoxGeometry(0.12, R * 1.65, 0.13), timberMat);
            legR.position.set(R * 0.76, -0.04, 0);
            legR.rotation.z = 0.04;
            setGroup.add(legR);

            // Spreader sill at bottom
            const sill = new THREE.Mesh(new THREE.BoxGeometry(R * 1.45, 0.08, 0.14), timberMat);
            sill.position.set(0, -R * 0.88, 0);
            setGroup.add(sill);

            hole.group.add(setGroup);
            hole.timberSets.push(setGroup);
          }
        }
      }

      // Portal & Drift Adit Illumination
      if (hole.depth >= 1.2) {
        const entranceLight = new THREE.PointLight(0xffb555, 1.8, Math.max(10.0, R * 8.0));
        entranceLight.position.set(R * 0.4, R * 0.65, 0.2);
        hole.group.add(entranceLight);

        const entranceLantern = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.08, 0.18, 6),
          new THREE.MeshStandardMaterial({
            color: 0x1c1917,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0xff9922,
            emissiveIntensity: 0.8,
          })
        );
        entranceLantern.position.set(R * 0.4, R * 0.65, 0.2);
        hole.group.add(entranceLantern);

        if (hole.depth >= 2.5) {
          const lightSteps = Math.max(1, Math.floor(hole.depth / 3.5));
          for (let l = 1; l <= lightSteps; l++) {
            const lz = -Math.min(hole.depth - 0.7, l * 3.5);
            const corridorLight = new THREE.PointLight(0xffaa44, 1.6, 9.0);
            corridorLight.position.set(0, R * 0.35, lz);
            hole.group.add(corridorLight);

            const lanternMesh = new THREE.Mesh(
              new THREE.CylinderGeometry(0.05, 0.07, 0.16, 6),
              new THREE.MeshStandardMaterial({
                color: 0x222222,
                metalness: 0.9,
                roughness: 0.3,
                emissive: 0xff8811,
                emissiveIntensity: 0.75,
              })
            );
            lanternMesh.position.set(R * 0.42, R * 0.45, lz);
            hole.group.add(lanternMesh);
          }
        }
      }
    }
  }

  /**
   * Returns a list of nearby holes for HUD proximity prompts
   */
  public getNearbyHole(playerPos: THREE.Vector3, maxDist: number = 3.2): MountainHole | undefined {
    return this.findNearbyHole(playerPos, maxDist);
  }

  public dispose(): void {
    for (const h of this.holes) {
      this.scene.remove(h.group);
      h.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    this.holes = [];
    this.scene.remove(this.rootGroup);
  }
}
