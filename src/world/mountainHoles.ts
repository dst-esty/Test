import * as THREE from 'three';
import { MountainDustParticleSystem } from './mountainDustParticles';
import { getTerrainHeight } from './terrain';
import { soundEngine } from '../audio/soundEffects';
import { safeMergeGeometries } from './foliage';

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
  domain?: 'surface' | 'underground';
  mineLevel?: number;
  entranceTerrainY?: number;
  isPassThrough?: boolean;
  isTimbered?: boolean;
  exitPosition?: THREE.Vector3;
  holeType?: MountainHoleType; // 'drift' (main tunnel), 'branch' (side cross-cut), or 'raise' (upward chimney)
  parentId?: string;           // ID of parent tunnel if branched or raised off another
  group: THREE.Group;
  rimMesh: THREE.Mesh;
  cavityMesh: THREE.Mesh;
  backWallMesh?: THREE.Mesh;
  exitRimMesh?: THREE.Mesh;
  portalRocksMesh?: THREE.Mesh;
  exitPortalRocksMesh?: THREE.Mesh;
  veinMesh?: THREE.Mesh;
  sillRubbleMesh?: THREE.Mesh;
  timberLintel?: THREE.Mesh;
  exitTimberLintel?: THREE.Mesh;
  timberSets?: THREE.Group[];
  ladderGroup?: THREE.Group;   // Climbable wooden ladder for upward raises
  interiorGlow?: THREE.PointLight;
  entrancePointLight?: THREE.PointLight;
  workingFacePointLight?: THREE.PointLight;
  exitPointLight?: THREE.PointLight;
  invQuaternion?: THREE.Quaternion;
}

// Scratch vector allocations to eliminate per-frame GC churn in collision loops
const _scratchTestPos = new THREE.Vector3();
const _scratchLocalP = new THREE.Vector3();

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
  public onHolesChanged?: () => void;
  public readonly domain: 'surface' | 'underground';
  private scene: THREE.Scene;
  public readonly rootGroup: THREE.Group;

  // Shared reusable geometries and materials for optimal performance
  private readonly sharedMaterials: Map<string, THREE.Material> = new Map();
  private isInsideMountainRock?: (pos: THREE.Vector3) => boolean;

  public getMaterial<T extends THREE.Material>(key: string, create: () => T): T {
    let mat = this.sharedMaterials.get(key);
    if (!mat) {
      mat = create();
      this.sharedMaterials.set(key, mat);
    }
    return mat as T;
  }

  constructor(
    scene: THREE.Scene,
    dustParticles?: MountainDustParticleSystem,
    domain: 'surface' | 'underground' = 'surface'
  ) {
    this.scene = scene;
    this.dustParticleSystem = dustParticles;
    this.domain = domain;
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = domain === 'surface' ? 'AboveGroundMountainTunnels' : 'SubterraneanMineTunnels';
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
   * Strictly limited to Above-Ground Mountain Adits; subterranean mine drifts do not break out to surface daylight.
   */
  public checkHolePassThrough(hole: MountainHole): boolean {
    if (this.domain === 'underground' || !hole.isSurface) return false;
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
      // If point is along the tunnel bore from entrance (z = 0) to working face / exit (z = -h.depth)
      const maxRearZ = h.isPassThrough ? -h.depth - 2.8 : -h.depth - 1.5;
      if (localP.z <= 2.8 && localP.z >= maxRearZ) {
        const horizDist = Math.hypot(localP.x, localP.y);
        if (horizDist <= Math.max(2.8, h.radius * 1.6)) {
          return h;
        }
      }
      // Also check world distance to entrance or back face / exit portal
      const distToEntrance = h.position.distanceTo(point);
      const exitPos = (h.isPassThrough && h.exitPosition)
        ? h.exitPosition
        : h.position.clone().add(
            new THREE.Vector3(0, 0, -h.depth).applyQuaternion(h.group.quaternion)
          );
      const distToFace = exitPos.distanceTo(point);
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
    _scratchTestPos.set(worldX, worldY, worldZ);
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i];

      if (h.holeType === 'raise') {
        // Upward vertical raise chimney
        // Entrance is at h.position (ceiling of drift/cavern). Extends upward by h.depth
        const dx = _scratchTestPos.x - h.position.x;
        const dz = _scratchTestPos.z - h.position.z;
        const horizDist = Math.hypot(dx, dz);
        const radiusAllowance = Math.max(1.5, h.radius * 1.35) + toleranceMargin;
        const minY = h.position.y - 3.2;
        const maxY = h.position.y + h.depth + 1.5;

        if (horizDist <= radiusAllowance && _scratchTestPos.y >= minY && _scratchTestPos.y <= maxY) {
          // Standing or climbing inside the raise chimney.
          const isAtTopPlatform = _scratchTestPos.y >= h.position.y + h.depth - 0.6;
          const topStagingY = h.position.y + h.depth - 0.25;
          return {
            inside: true,
            floorY: isAtTopPlatform ? topStagingY : undefined,
            hole: h,
            distFromEntrance: Math.max(0, _scratchTestPos.y - h.position.y),
            isRaise: true,
          };
        }
        continue;
      }

      // Horizontal drift, branch tunnel, or pass-through tunnel
      // Check distance to entrance portal and exit portal (if pass-through)
      const distToEntrance = _scratchTestPos.distanceTo(h.position);
      const exitPos = (h.isPassThrough && h.exitPosition)
        ? h.exitPosition
        : h.position.clone().add(new THREE.Vector3(0, 0, -h.depth).applyQuaternion(h.group.quaternion));
      const distToExit = _scratchTestPos.distanceTo(exitPos);
      const maxBoundingDist = h.depth + h.radius + 8.5;

      if (distToEntrance > maxBoundingDist && distToExit > h.radius + 8.5) {
        continue;
      }

      _scratchLocalP.copy(_scratchTestPos).sub(h.position);
      const invQuat = h.invQuaternion || h.group.quaternion.clone().invert();
      _scratchLocalP.applyQuaternion(invQuat);

      const z = _scratchLocalP.z;
      // Along the tunnel bore: allow generous threshold outside entrance (+6.5m in front of portal)
      // down to beyond the exit portal (-depth - 6.5m if pass-through, or -depth - 1.2m if dead-end)
      const maxFrontZ = 6.5 + toleranceMargin;
      const maxRearZ = h.isPassThrough ? -h.depth - 6.5 - toleranceMargin : -h.depth - 1.2;

      if (z <= maxFrontZ && z >= maxRearZ) {
        // Lateral width tolerance: flare out wider in front of entrance and exit portals to form an inviting approach apron
        let allowableHalfWidth = Math.max(2.2, h.radius * 1.5) + toleranceMargin;
        if (z > 0) {
          // Entrance approach apron (widens smoothly as player approaches from exterior)
          allowableHalfWidth += Math.min(3.8, z * 0.85);
        } else if (h.isPassThrough && z < -h.depth) {
          // Exit approach apron
          allowableHalfWidth += Math.min(3.8, (-z - h.depth) * 0.85);
        }

        const isWithinWidth = Math.abs(_scratchLocalP.x) <= allowableHalfWidth;

        // Ground elevation at entrance and exit portals
        const isUndergroundDomain = this.domain === 'underground' || !h.isSurface;
        const entranceFloorY = typeof h.entranceTerrainY === 'number' ? h.entranceTerrainY : (h.position.y - h.radius * 0.88);
        const exitFloorY = (h.isPassThrough && h.exitPosition)
          ? (isUndergroundDomain ? entranceFloorY : getTerrainHeight(h.exitPosition.x, h.exitPosition.z))
          : entranceFloorY;

        // Grade the floor smoothly through the mountain between entrance and exit
        const tGrade = Math.min(1.0, Math.max(0.0, -z / Math.max(0.1, h.depth)));
        const tunnelGradedFloorY = h.isPassThrough
          ? THREE.MathUtils.lerp(entranceFloorY, exitFloorY, tGrade)
          : entranceFloorY;

        // Vertical clearance: generous leeway (±7.5m) so floor, feet, eye-height, or sloping terrain outside never causes false rejection
        const ceilingY = tunnelGradedFloorY + h.radius * 2.2;
        const minY = tunnelGradedFloorY - 7.5 - toleranceMargin;
        const maxY = ceilingY + 7.5 + toleranceMargin;
        const isWithinHeight = _scratchTestPos.y >= minY && _scratchTestPos.y <= maxY;

        if (isWithinWidth && isWithinHeight) {
          let currentFloorY = tunnelGradedFloorY;
          if (z > 0) {
            // Entrance transition: blend smoothly from tunnel entrance floor to exterior terrain
            const extY = isUndergroundDomain ? entranceFloorY : getTerrainHeight(worldX, worldZ);
            const blend = Math.min(1.0, z / 4.5);
            currentFloorY = THREE.MathUtils.lerp(entranceFloorY, extY, blend);
          } else if (h.isPassThrough && z < -h.depth) {
            // Exit transition: blend smoothly from exit portal floor to exterior hillside terrain
            const extY = isUndergroundDomain ? exitFloorY : getTerrainHeight(worldX, worldZ);
            const blend = Math.min(1.0, (-z - h.depth) / 4.5);
            currentFloorY = THREE.MathUtils.lerp(exitFloorY, extY, blend);
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
    _scratchTestPos.set(candX, candGroundY, candZ);
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i];
      if (h.holeType === 'raise') continue;

      _scratchLocalP.copy(_scratchTestPos).sub(h.position);
      const invQuat = h.invQuaternion || h.group.quaternion.clone().invert();
      _scratchLocalP.applyQuaternion(invQuat);

      // Only restrict boundaries once the player has actually stepped well inside the tunnel (z < -0.8m from entrance)
      // and if pass-through, stop restricting before reaching the exit portal (z > -h.depth + 0.8m)
      const minZ = h.isPassThrough ? -h.depth + 0.8 : -h.depth - 1.5;
      if (_scratchLocalP.z < -0.8 && _scratchLocalP.z >= minZ) {
        const entranceFloorY = typeof h.entranceTerrainY === 'number' ? h.entranceTerrainY : (h.position.y - h.radius * 0.88);
        const exitFloorY = (h.isPassThrough && h.exitPosition)
          ? ((this.domain === 'underground' || !h.isSurface) ? entranceFloorY : getTerrainHeight(h.exitPosition.x, h.exitPosition.z))
          : entranceFloorY;
        const tGrade = Math.min(1.0, Math.max(0.0, -_scratchLocalP.z / Math.max(0.1, h.depth)));
        const floorY = h.isPassThrough ? THREE.MathUtils.lerp(entranceFloorY, exitFloorY, tGrade) : entranceFloorY;
        const ceilingY = floorY + h.radius * 2.2;
        if (candGroundY < floorY - 6.0 || candGroundY > ceilingY + 6.0) continue;

        // Check back working face: player cannot walk through solid bedrock past -h.depth UNLESS pass-through!
        if (!h.isPassThrough) {
          const faceLimit = -h.depth + playerRadius + 0.05;
          if (_scratchLocalP.z < faceLimit) {
            const worldNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(h.group.quaternion).normalize();
            return {
              blocked: true,
              reason: 'tunnel_working_face',
              normal: { x: worldNormal.x, z: worldNormal.z },
            };
          }
        }

        // Check side ribs (left/right walls) with generous width and flared collars near portals
        const distFromEntrance = -_scratchLocalP.z;
        const distFromExit = h.depth + _scratchLocalP.z;
        const distFromNearestEnd = h.isPassThrough ? Math.min(distFromEntrance, distFromExit) : distFromEntrance;
        const tFlare = Math.min(1.0, Math.max(0.0, distFromNearestEnd / 2.5));
        const effectiveRadius = THREE.MathUtils.lerp(h.radius * 1.55, h.radius * 1.15, tFlare);
        const wallLimit = Math.max(1.5, effectiveRadius - playerRadius * 0.7);

        if (Math.abs(_scratchLocalP.x) > wallLimit) {
          const localNormalX = _scratchLocalP.x > 0 ? -1 : 1;
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
      // Test if ray origin or direction is near the hole entrance, tunnel line, or exit portal
      const distToEntrance = raycaster.ray.origin.distanceTo(h.position);
      const exitPos = (h.isPassThrough && h.exitPosition)
        ? h.exitPosition
        : h.position.clone().add(
            new THREE.Vector3(0, 0, -h.depth).applyQuaternion(h.group.quaternion)
          );
      const distToExit = raycaster.ray.origin.distanceTo(exitPos);
      const minDistToEnds = Math.min(distToEntrance, distToExit);
      if (minDistToEnds > maxDist + 2.8 && distToEntrance > maxDist + h.depth + 2.0) continue;

      // Test intersection only against primary structural meshes for speed
      const targets: THREE.Object3D[] = [];
      if (h.cavityMesh) targets.push(h.cavityMesh);
      if (h.rimMesh) targets.push(h.rimMesh);
      if (h.backWallMesh) targets.push(h.backWallMesh);
      if (h.exitRimMesh) targets.push(h.exitRimMesh);
      if (targets.length === 0) continue;

      const hits = raycaster.intersectObjects(targets, false);
      if (hits.length > 0 && hits[0].distance <= maxDist) {
        const hitPt = hits[0].point;
        // Check if hit is near the deep working face
        const invQuat = h.invQuaternion || h.group.quaternion.clone().invert();
        _scratchLocalP.copy(hitPt).sub(h.position).applyQuaternion(invQuat);

        const rayDir = raycaster.ray.direction;
        // Vector pointing straight into the tunnel bore
        const tunnelForward = new THREE.Vector3(0, 0, -1).applyQuaternion(h.group.quaternion);
        const isAimingDownTunnel = rayDir.dot(tunnelForward) > 0.25;

        // For pass-through tunnels, there is no solid back face barrier
        const isBackFace = !h.isPassThrough && (_scratchLocalP.z <= -h.depth * 0.45 || isAimingDownTunnel);
        // Only trigger ceiling if deliberately aiming upward
        const isCeiling = !isBackFace && (_scratchLocalP.y > h.radius * 0.70 || rayDir.y > 0.65);
        // Only trigger side wall if aiming into lateral rib
        const isSideWall = !isBackFace && !isCeiling && Math.abs(_scratchLocalP.x) > h.radius * 0.65 && _scratchLocalP.z > -h.depth * 0.85;

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
          const localNormal = new THREE.Vector3(_scratchLocalP.x < 0 ? 1 : -1, 0, 0);
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
    branchInfo?: { isBranch?: boolean; isCeiling?: boolean; mineLevel?: number },
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
    // Realistic excavation scaling: steady chisel progress without instant massive tunnels
    const baseDepthIncrement = isDynamite ? 3.5 : isPickaxe ? 0.85 : 0.45;
    const baseRadiusIncrement = isDynamite ? 0.25 : isPickaxe ? 0.06 : 0.03;

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
        const distToEntrance = h.position.distanceTo(hitPoint);
        const dot = h.normal.dot(normal);
        if (distToEntrance < 3.2 && dot > 0.35) return true;
        // Check along tunnel centerline
        const localHit = hitPoint.clone().sub(h.position).applyQuaternion(h.group.quaternion.clone().invert());
        if (localHit.z <= 0.5 && localHit.z >= -h.depth - 1.5 && Math.hypot(localHit.x, localHit.y) <= h.radius * 1.6) {
          return true;
        }
        return false;
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
      existing.domain = this.domain;
      if (branchInfo?.mineLevel !== undefined) {
        existing.mineLevel = branchInfo.mineLevel;
      }
      // Auto-correct orientation only on very shallow initial strike (< 1.0m) if misaligned
      if (existing.depth < 1.0 && normal.lengthSq() > 0.01 && existing.normal.dot(normal) < 0.2) {
        existing.normal.copy(normal);
        const quat = computeHoleQuaternion(existing.holeType || 'drift', normal);
        existing.group.quaternion.copy(quat);
        existing.invQuaternion = quat.clone().invert();
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

      if (justBrokeThrough) {
        soundEngine.playMountainBreakthrough();
      }

      // Gold discovery calculations
      let goldAwarded = 0;
      let msg = '';
      const roll = Math.random();

      const isSubterranean = this.domain === 'underground' || !existing.isSurface;
      const typeLabel =
        existing.holeType === 'raise'
          ? (isSubterranean ? 'Subterranean Stope Raise' : 'Upward Mountain Chimney')
          : existing.holeType === 'branch'
          ? (isSubterranean ? 'Subterranean Cross-Cut Drift' : 'Side Cross-Cut Adit')
          : (isSubterranean ? 'Subterranean Mine Drift' : 'Mountain Adit');

      if (justBrokeThrough && !isSubterranean) {
        msg = `🎉 DAYLIGHT! BORE BROKE THROUGH THE MOUNTAIN! Pass-through ridge tunnel opened (-${existing.depth.toFixed(1)}m)! You can now walk freely right through the mountain ridge!`;
      } else if (existing.isPassThrough && !isSubterranean) {
        msg = `⛏️ Widened Mountain Pass-Through Tunnel (${existing.depth.toFixed(1)}m)! Natural daylight streams through both portals (+2 Quarry Stone)`;
      } else if (existing.depth >= 1.2 && !existing.hasExposedGoldVein && roll < 0.7) {
        existing.hasExposedGoldVein = true;
        goldAwarded = 2 + Math.floor(Math.random() * 4);
        existing.goldAwardedTotal += goldAwarded;
        msg = isSubterranean
          ? `⛏️ BORED DEEPER INTO ${typeLabel.toUpperCase()} (${existing.holeType === 'raise' ? '+' : '-'}${existing.depth.toFixed(1)}m)! Struck high-grade Gold Quartz Vein in deep bedrock! (+${goldAwarded} oz Gold)`
          : `⛏️ BORED DEEPER INTO ${typeLabel.toUpperCase()} (${existing.holeType === 'raise' ? '+' : '-'}${existing.depth.toFixed(1)}m)! Struck high-grade Gold Quartz Vein in mountain face! (+${goldAwarded} oz Gold)`;
      } else if (existing.hasExposedGoldVein && roll < 0.5) {
        goldAwarded = 1 + Math.floor(Math.random() * 3);
        existing.goldAwardedTotal += goldAwarded;
        msg = `⛏️ Chiseled ${typeLabel} Face (${existing.holeType === 'raise' ? '+' : '-'}${existing.depth.toFixed(1)}m): Extracted +${goldAwarded} oz Gold Quartz from cavity!`;
      } else if (existing.depth >= 6.0 && roll < 0.4) {
        // Deep bonanza strike!
        goldAwarded = 3 + Math.floor(Math.random() * 5);
        existing.goldAwardedTotal += goldAwarded;
        msg = `✨ BONANZA VEIN BREACH at ${existing.holeType === 'raise' ? '+' : '-'}${existing.depth.toFixed(1)}m deep inside ${typeLabel}! Extracted +${goldAwarded} oz Native Electrum & Gold!`;
      } else if (existing.depth >= 3.0) {
        msg = isSubterranean
          ? `⛏️ Advanced ${typeLabel} to ${existing.holeType === 'raise' ? '+' : '-'}${existing.depth.toFixed(1)}m in bedrock! (+2 Quarry Stone)`
          : `⛏️ Carved deeper into ${typeLabel} (${existing.holeType === 'raise' ? '+' : '-'}${existing.depth.toFixed(1)}m) in solid rock! (+2 Building Stone)`;
      } else {
        msg = isSubterranean
          ? `⛏️ Excavated ${typeLabel} to ${existing.holeType === 'raise' ? '+' : '-'}${existing.depth.toFixed(1)}m in ${rockType}! (+2 Quarry Stone)`
          : `⛏️ Carved ${typeLabel} to ${existing.holeType === 'raise' ? '+' : '-'}${existing.depth.toFixed(1)}m in Mountain Rock! (+2 Building Stone)`;
      }

      // Rebuild 3D visual geometry strictly ONCE per excavation strike
      this.rebuildHoleVisuals(existing);

      if (this.dustParticleSystem) {
        const mat = existing.hasExposedGoldVein ? 'quartz_gold' : rockType;
        const mult = isDynamite ? 2.8 : isPickaxe ? 1.0 + Math.min(2.0, existing.depth * 0.15) : 0.8;
        this.dustParticleSystem.triggerMountainStrike(existing.position, normal, mat, mult);

        if (justBrokeThrough && existing.exitPosition) {
          const exitNormal = existing.normal.clone().negate();
          this.dustParticleSystem.triggerMountainStrike(existing.exitPosition, exitNormal, mat, 3.2);
        }
      }

      this.onHolesChanged?.();

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

    // Otherwise, create a brand new walk-in excavation cavity!
    const initialDepth = isDynamite ? 5.5 : isPickaxe ? 1.2 : 0.6;
    const initialRadius = isDynamite ? 2.0 : 1.45;
    const hasGoldVein = Math.random() < 0.35;
    const initialGold = hasGoldVein ? 1 : 0;

    const holeType: MountainHoleType = isCeilingStrike ? 'raise' : isBranchStrike ? 'branch' : 'drift';

    const holePosition = hitPoint.clone();
    let entranceFloorY: number | undefined;

    // Center horizontal tunnel vertically on the ground floor so player walks straight in seamlessly!
    if (holeType !== 'raise') {
      if (this.domain === 'underground' || !isSurface) {
        entranceFloorY = terrainYAtHit !== undefined ? terrainYAtHit : (hitPoint.y - initialRadius * 0.88);
      } else {
        const frontX = hitPoint.x + normal.x * 1.8;
        const frontZ = hitPoint.z + normal.z * 1.8;
        const groundOutside = getTerrainHeight(frontX, frontZ);

        if (terrainYAtHit !== undefined && Math.abs(terrainYAtHit - groundOutside) < 4.0) {
          entranceFloorY = Math.min(terrainYAtHit, groundOutside);
        } else if (Math.abs(hitPoint.y - groundOutside) < 6.0) {
          entranceFloorY = groundOutside;
        } else {
          entranceFloorY = hitPoint.y - initialRadius * 0.88;
        }
      }
      holePosition.y = entranceFloorY + initialRadius * 0.92;
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
      domain: this.domain,
      mineLevel: branchInfo?.mineLevel || (this.domain === 'underground' ? 1 : 0),
      entranceTerrainY: entranceFloorY,
      holeType,
      parentId: parentTunnel?.id,
      group: holeGroup,
      invQuaternion: quat.clone().invert(),
      rimMesh: undefined as unknown as THREE.Mesh,
      cavityMesh: undefined as unknown as THREE.Mesh,
    };

    const brokeThrough = this.checkHolePassThrough(newHole);
    if (brokeThrough) {
      newHole.isPassThrough = true;
      soundEngine.playMountainBreakthrough();
    }
    this.rebuildHoleVisuals(newHole);
    this.rootGroup.add(holeGroup);
    this.holes.push(newHole);

    let msg = '';
    const isSubterranean = this.domain === 'underground' || !isSurface;
    if (brokeThrough && !isSubterranean) {
      msg = `🎉 DAYLIGHT! BLAST PIERCED THE RIDGE! Pass-through ridge tunnel opened (-${initialDepth.toFixed(1)}m)! Both portals are now open!`;
    } else if (holeType === 'raise') {
      msg = isSubterranean
        ? `⛏️ SUBTERRANEAN STOPE RAISE STARTED (+${initialDepth.toFixed(1)}m)! Chiseled upward into cavern roof!${hasGoldVein ? ' (+1 oz Gold)' : ' (+1 Quarry Stone)'}`
        : `⛏️ UPWARD MOUNTAIN CHIMNEY STARTED (+${initialDepth.toFixed(1)}m)! Carved upward into mountain rock!${hasGoldVein ? ' (+1 oz Gold)' : ' (+1 Building Stone)'}`;
    } else if (holeType === 'branch') {
      msg = isSubterranean
        ? `⛏️ SUBTERRANEAN CROSS-CUT DRIFT STARTED (-${initialDepth.toFixed(1)}m)! Carved side drift into cavern wall!${hasGoldVein ? ' (+1 oz Gold)' : ' (+1 Quarry Stone)'}`
        : `⛏️ BRANCH MOUNTAIN ADIT STARTED (-${initialDepth.toFixed(1)}m)! Side cross-cut carved into rock!${hasGoldVein ? ' (+1 oz Gold)' : ' (+1 Building Stone)'}`;
    } else {
      if (isSubterranean) {
        msg = hasGoldVein
          ? `⛏️ EXCAVATED SUBTERRANEAN DRIFT (-${initialDepth.toFixed(1)}m)! Exposed Glittering Gold Quartz Vein in Level ${newHole.mineLevel || 1} Strata! (+1 oz Gold)`
          : `⛏️ EXCAVATED SUBTERRANEAN DRIFT (-${initialDepth.toFixed(1)}m)! Carved into cavern bedrock! (+2 Quarry Stone)`;
      } else {
        msg = hasGoldVein
          ? `⛰️ EXCAVATED WALK-IN ROCK CAVITY (-${initialDepth.toFixed(1)}m)! Exposed Glittering Gold Quartz Vein in cliff! (+1 oz Gold)`
          : `⛰️ EXCAVATED WALK-IN ROCK CAVITY (-${initialDepth.toFixed(1)}m)! Carved cavity into mountain face! (+2 Building Stone)`;
      }
    }

    if (this.dustParticleSystem) {
      const mat = hasGoldVein ? 'quartz_gold' : rockType;
      const mult = isDynamite ? 2.2 : isPickaxe ? 1.1 : 0.8;
      this.dustParticleSystem.triggerMountainStrike(holePosition, normal, mat, mult);

      if (brokeThrough && newHole.exitPosition) {
        const exitNormal = newHole.normal.clone().negate();
        this.dustParticleSystem.triggerMountainStrike(newHole.exitPosition, exitNormal, mat, 3.2);
      }
    }

    this.onHolesChanged?.();

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
    // Clear existing mesh children from group, PRESERVING existing PointLights to avoid WebGL shader recompilation!
    const toRemove: THREE.Object3D[] = [];
    hole.group.children.forEach((child) => {
      if (child instanceof THREE.PointLight) return;
      toRemove.push(child);
    });
    toRemove.forEach((child) => {
      hole.group.remove(child);
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
        }
      });
    });

    const R = hole.radius;
    const D = hole.depth;

    // Helper to merge an array of transformed geometries into one mesh with one draw call
    const mergeAndAdd = (
      geos: THREE.BufferGeometry[],
      material: THREE.Material
    ): THREE.Mesh | undefined => {
      if (geos.length === 0) return undefined;
      let mesh: THREE.Mesh | undefined;
      if (geos.length === 1) {
        mesh = new THREE.Mesh(geos[0], material);
        mesh.frustumCulled = false;
        hole.group.add(mesh);
      } else {
        const merged = safeMergeGeometries(geos);
        geos.forEach((g) => g.dispose());
        if (merged) {
          mesh = new THREE.Mesh(merged, material);
          mesh.frustumCulled = false;
          hole.group.add(mesh);
        }
      }
      return mesh;
    };

    // Helper to generate an organic, fractured desert boulder geometry
    const makeBoulderGeo = (
      radius: number,
      scaleX: number,
      scaleY: number,
      scaleZ: number,
      seed: number
    ): THREE.BufferGeometry => {
      const geo = new THREE.DodecahedronGeometry(radius, 0);
      geo.scale(scaleX, scaleY, scaleZ);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const n = 1.0 + Math.sin(x * 5.2 + seed) * 0.14 + Math.cos(y * 6.1 + z * 4.3 + seed * 1.7) * 0.12;
        pos.setXYZ(i, x * n, y * n, z * n);
      }
      geo.computeVertexNormals();
      return geo;
    };

    // Helper to construct a comprehensive natural boulder screen/buttress around a portal
    const createPortalRocksCluster = (originZ: number, deltaGradeY: number): THREE.BufferGeometry[] => {
      const geos: THREE.BufferGeometry[] = [];

      // 1. Radial rim boulders directly around the entrance opening (sealing seams and cylinder edge)
      const numRimRocks = 14;
      for (let i = 0; i < numRimRocks; i++) {
        const angle = (i / numRimRocks) * Math.PI * 2;
        const isFloor = Math.abs(angle - (-Math.PI * 0.5)) < 0.38;
        const bR = isFloor ? R * 0.30 : R * (0.45 + (Math.sin(i * 3.7) * 0.5 + 0.5) * 0.28);
        const dist = R * (isFloor ? 0.98 : 1.16 + (Math.cos(i * 2.3) * 0.5 + 0.5) * 0.24);
        const bx = Math.cos(angle) * dist;
        const by = Math.sin(angle) * dist + deltaGradeY;
        const bz = originZ + (Math.sin(i * 4.1) * 0.2 - 0.18);

        const bGeo = makeBoulderGeo(
          bR,
          0.90 + (Math.cos(i * 5) * 0.5 + 0.5) * 0.35,
          0.85 + (Math.sin(i * 3) * 0.5 + 0.5) * 0.35,
          1.15 + (Math.sin(i * 7) * 0.5 + 0.5) * 0.45,
          i * 3.1
        );
        const rotM = new THREE.Matrix4().makeRotationFromEuler(
          new THREE.Euler(angle * 0.4, angle * 0.6, (i * 1.3) % Math.PI)
        );
        rotM.setPosition(bx, by, bz);
        bGeo.applyMatrix4(rotM);
        geos.push(bGeo);
      }

      // 2. Heavy Flanking Buttress Rocks (Left & Right)
      // These step outwards and backwards into the mountain slope to conceal the sides of the tunnel
      const flankLayers = [
        // Left flank
        { x: -R * 1.35, y: -R * 0.55, z: originZ - 0.3, rad: R * 0.70, sx: 1.25, sy: 0.95, sz: 1.35 },
        { x: -R * 1.55, y: R * 0.05,  z: originZ - 0.5, rad: R * 0.78, sx: 1.15, sy: 1.25, sz: 1.45 },
        { x: -R * 1.40, y: R * 0.65,  z: originZ - 0.4, rad: R * 0.68, sx: 1.35, sy: 1.05, sz: 1.25 },
        { x: -R * 1.85, y: -R * 0.20, z: originZ - 0.9, rad: R * 0.92, sx: 1.45, sy: 1.35, sz: 1.55 },
        { x: -R * 1.70, y: R * 0.50,  z: originZ - 0.8, rad: R * 0.84, sx: 1.25, sy: 1.15, sz: 1.35 },
        { x: -R * 2.15, y: R * 0.10,  z: originZ - 1.2, rad: R * 1.10, sx: 1.55, sy: 1.45, sz: 1.65 },

        // Right flank (where the user's camera looks across the exposed slope)
        { x: R * 1.35,  y: -R * 0.55, z: originZ - 0.3, rad: R * 0.70, sx: 1.25, sy: 0.95, sz: 1.35 },
        { x: R * 1.55,  y: R * 0.05,  z: originZ - 0.5, rad: R * 0.78, sx: 1.15, sy: 1.25, sz: 1.45 },
        { x: R * 1.40,  y: R * 0.65,  z: originZ - 0.4, rad: R * 0.68, sx: 1.35, sy: 1.05, sz: 1.25 },
        { x: R * 1.85,  y: -R * 0.20, z: originZ - 0.9, rad: R * 0.92, sx: 1.45, sy: 1.35, sz: 1.55 },
        { x: R * 1.70,  y: R * 0.50,  z: originZ - 0.8, rad: R * 0.84, sx: 1.25, sy: 1.15, sz: 1.35 },
        { x: R * 2.15,  y: R * 0.10,  z: originZ - 1.2, rad: R * 1.10, sx: 1.55, sy: 1.45, sz: 1.65 },

        // 3. Top Rock Brow / Natural Overhanging Keystone Ledge
        { x: -R * 0.65, y: R * 1.18, z: originZ - 0.25, rad: R * 0.68, sx: 1.35, sy: 0.85, sz: 1.45 },
        { x: 0,         y: R * 1.32, z: originZ - 0.20, rad: R * 0.76, sx: 1.45, sy: 0.90, sz: 1.55 },
        { x: R * 0.65,  y: R * 1.18, z: originZ - 0.25, rad: R * 0.68, sx: 1.35, sy: 0.85, sz: 1.45 },
        { x: -R * 0.35, y: R * 1.55, z: originZ - 0.60, rad: R * 0.88, sx: 1.55, sy: 1.15, sz: 1.55 },
        { x: R * 0.35,  y: R * 1.55, z: originZ - 0.60, rad: R * 0.88, sx: 1.55, sy: 1.15, sz: 1.55 },
        { x: 0,         y: R * 1.80, z: originZ - 1.00, rad: R * 1.15, sx: 1.65, sy: 1.25, sz: 1.65 },

        // 4. Base Scree & Talus Apron (Natural ground transition)
        { x: -R * 1.12, y: -R * 0.85, z: originZ + 0.18, rad: R * 0.44, sx: 1.3, sy: 0.5, sz: 1.2 },
        { x: R * 1.12,  y: -R * 0.85, z: originZ + 0.18, rad: R * 0.44, sx: 1.3, sy: 0.5, sz: 1.2 },
        { x: -R * 1.48, y: -R * 0.88, z: originZ + 0.35, rad: R * 0.58, sx: 1.4, sy: 0.6, sz: 1.3 },
        { x: R * 1.48,  y: -R * 0.88, z: originZ + 0.35, rad: R * 0.58, sx: 1.4, sy: 0.6, sz: 1.3 },
      ];

      for (let f = 0; f < flankLayers.length; f++) {
        const item = flankLayers[f];
        const fGeo = makeBoulderGeo(item.rad, item.sx, item.sy, item.sz, f * 4.7 + originZ);
        const fMat = new THREE.Matrix4()
          .makeRotationFromEuler(new THREE.Euler(0.25 * Math.sin(f), 0.35 * Math.cos(f), 0.2 * f))
          .setPosition(item.x, item.y + deltaGradeY, item.z);
        fGeo.applyMatrix4(fMat);
        geos.push(fGeo);
      }

      return geos;
    };

    // 1. Organic 3D Mountain Rock Collar Ring (Flared Volumetric Rock Collar that seals entrance seam)
    const collarLength = 0.65;
    const collarOuterR = R * 1.34;
    const collarInnerR = R * 0.95;
    const collarGeo = new THREE.CylinderGeometry(
      collarOuterR,
      collarInnerR,
      collarLength,
      18,
      2,
      true
    );
    collarGeo.rotateX(Math.PI / 2);
    collarGeo.translate(0, 0, -collarLength * 0.5 - 0.04);

    const colAttr = collarGeo.attributes.position;
    for (let i = 0; i < colAttr.count; i++) {
      const angle = Math.atan2(colAttr.getY(i), colAttr.getX(i));
      const noise = (Math.sin(angle * 7) + Math.cos(angle * 5)) * 0.035 * R;
      colAttr.setX(i, colAttr.getX(i) * (1.0 + noise));
      colAttr.setY(i, colAttr.getY(i) * (1.0 + noise));
    }
    collarGeo.computeVertexNormals();

    const rimMat = this.getMaterial(`rim_${hole.rockColor}`, () => new THREE.MeshStandardMaterial({
      color: new THREE.Color(hole.rockColor).offsetHSL(0.01, -0.04, 0.06),
      roughness: 0.94,
      metalness: 0.04,
      side: THREE.DoubleSide,
      flatShading: true,
    }));

    const rimMesh = new THREE.Mesh(collarGeo, rimMat);
    rimMesh.frustumCulled = false;
    hole.group.add(rimMesh);
    hole.rimMesh = rimMesh;

    // 1b. Heavy Natural Mountain Boulders Surrounding Entrance to Conceal Tunnel
    const entranceRockGeos = createPortalRocksCluster(0, 0);
    hole.portalRocksMesh = mergeAndAdd(entranceRockGeos, rimMat);

    // 2. Excavated Interior Cavity Bore (Deep into the Mountain along -Z)
    const isAdit = D >= 1.4;
    const rearR = isAdit ? Math.max(R * 0.96, R - 0.08) : R * 0.88;
    const heightSegs = Math.max(4, Math.min(20, Math.floor(D * 1.5)));

    const entranceFloorY = typeof hole.entranceTerrainY === 'number' ? hole.entranceTerrainY : (hole.position.y - hole.radius * 0.88);
    const exitFloorY = (hole.isPassThrough && hole.exitPosition)
      ? ((this.domain === 'underground' || !hole.isSurface) ? entranceFloorY : getTerrainHeight(hole.exitPosition.x, hole.exitPosition.z))
      : entranceFloorY;
    const deltaY = hole.isPassThrough ? (exitFloorY - entranceFloorY) : 0;

    const cavityGeo = new THREE.CylinderGeometry(
      R * 1.02,
      rearR,
      D,
      16,
      heightSegs,
      true
    );
    cavityGeo.rotateX(Math.PI / 2);
    cavityGeo.translate(0, 0, -D * 0.5);

    const posAttr = cavityGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const z = posAttr.getZ(i);
      const y = posAttr.getY(i);
      const t = Math.min(1.0, Math.max(0.0, -z / Math.max(0.1, D)));
      const gradeY = deltaY * t;

      if (y < -R * 0.55 && isAdit) {
        posAttr.setY(i, -R * 0.88 + gradeY);
      } else {
        const noise = (Math.sin(posAttr.getX(i) * 12 + z * 6) + Math.cos(posAttr.getY(i) * 14)) * 0.035 * R;
        posAttr.setX(i, posAttr.getX(i) + noise);
        posAttr.setY(i, posAttr.getY(i) + gradeY + noise);
      }
    }
    cavityGeo.computeVertexNormals();

    const cavityMat = this.getMaterial(`cavity_${hole.rockColor}`, () => new THREE.MeshStandardMaterial({
      color: new THREE.Color(hole.rockColor).multiplyScalar(0.64),
      roughness: 0.92,
      metalness: 0.05,
      side: THREE.DoubleSide,
      flatShading: true,
    }));

    const cavityMesh = new THREE.Mesh(cavityGeo, cavityMat);
    cavityMesh.frustumCulled = false;
    hole.group.add(cavityMesh);
    hole.cavityMesh = cavityMesh;

    // 2b. Solid Back Wall / Bedrock Face (Only for dead-end excavations)
    if (!hole.isPassThrough) {
      const backWallGeo = new THREE.CircleGeometry(rearR * 1.05, 16);
      const backPos = backWallGeo.attributes.position;
      for (let i = 0; i < backPos.count; i++) {
        backPos.setZ(i, (Math.sin(backPos.getX(i) * 9) + Math.cos(backPos.getY(i) * 9)) * 0.05);
      }
      backWallGeo.computeVertexNormals();

      const backWallMat = this.getMaterial(`back_${hole.rockColor}`, () => new THREE.MeshStandardMaterial({
        color: new THREE.Color(hole.rockColor).multiplyScalar(0.68),
        roughness: 0.92,
        metalness: 0.05,
        side: THREE.DoubleSide,
        flatShading: true,
      }));
      const backWallMesh = new THREE.Mesh(backWallGeo, backWallMat);
      backWallMesh.frustumCulled = false;
      backWallMesh.position.set(0, 0, -D);
      hole.group.add(backWallMesh);
      hole.backWallMesh = backWallMesh;
      hole.exitPortalRocksMesh = undefined;
    } else {
      hole.backWallMesh = undefined;
      const exitCollarGeo = new THREE.TorusGeometry(rearR * 0.96, 0.16, 8, 20);
      const exitRimMat = this.getMaterial(`exitRim_${hole.rockColor}`, () => new THREE.MeshStandardMaterial({
        color: hole.rockColor,
        roughness: 0.94,
        metalness: 0.04,
        flatShading: true,
      }));
      const exitRimMesh = new THREE.Mesh(exitCollarGeo, exitRimMat);
      exitRimMesh.frustumCulled = false;
      exitRimMesh.position.set(0, deltaY, -D - 0.02);
      hole.group.add(exitRimMesh);
      hole.exitRimMesh = exitRimMesh;

      // Heavy Natural Mountain Boulders Surrounding Exit Portal
      const exitRockGeos = createPortalRocksCluster(-D, deltaY);
      hole.exitPortalRocksMesh = mergeAndAdd(exitRockGeos, exitRimMat);
    }

    // Shared materials
    const timberMat = this.getMaterial('timber_default', () => new THREE.MeshStandardMaterial({
      color: 0x5c3d24,
      roughness: 0.88,
      metalness: 0.02,
    }));
    const quartzMat = this.getMaterial('quartz_default', () => new THREE.MeshStandardMaterial({
      color: 0xefede8,
      roughness: 0.38,
      metalness: 0.12,
      bumpScale: 0.08,
    }));
    const goldMat = this.getMaterial('gold_default', () => new THREE.MeshStandardMaterial({
      color: 0xffb81c,
      roughness: 0.22,
      metalness: 0.94,
      emissive: 0x442800,
      emissiveIntensity: 0.35,
    }));
    const lanternMat = this.getMaterial('lantern_body_shared', () => new THREE.MeshStandardMaterial({
      color: 0x1f1d1a,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0xff9922,
      emissiveIntensity: 0.85,
    }));

    // Arrays to collect geometries for batch merging into single draw calls
    const timberGeos: THREE.BufferGeometry[] = [];
    const lanternGeos: THREE.BufferGeometry[] = [];

    // Helper to push a box geometry into timberGeos
    const addTimberBox = (w: number, h: number, d: number, px: number, py: number, pz: number, rotZ: number = 0) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      if (rotZ !== 0) geo.rotateZ(rotZ);
      geo.translate(px, py, pz);
      timberGeos.push(geo);
    };

    // Helper to push a lantern cylinder into lanternGeos
    const addLanternMesh = (px: number, py: number, pz: number) => {
      const geo = new THREE.CylinderGeometry(0.05, 0.07, 0.16, 6);
      geo.translate(px, py, pz);
      lanternGeos.push(geo);
    };

    // 3. Exposed Glittering Quartz & Gold Vein at Deep Back Face
    if (hole.hasExposedGoldVein && !hole.isPassThrough) {
      const quartzGeo = new THREE.BoxGeometry(rearR * 1.1, rearR * 0.32, 0.14);
      const quartzMesh = new THREE.Mesh(quartzGeo, quartzMat);
      quartzMesh.position.set(0, 0, -D * 0.96);
      quartzMesh.rotation.z = 0.45;
      hole.group.add(quartzMesh);
      hole.veinMesh = quartzMesh;

      const goldGeos: THREE.BufferGeometry[] = [];
      const nuggetCount = Math.min(8, 2 + Math.floor(hole.depth * 1.4));
      for (let n = 0; n < nuggetCount; n++) {
        const nGeo = new THREE.DodecahedronGeometry(0.05 + Math.random() * 0.04, 0);
        const offsetX = (n - (nuggetCount - 1) * 0.5) * (rearR * 0.18) + (Math.random() - 0.5) * 0.05;
        const offsetY = offsetX * Math.tan(0.45) + (Math.random() - 0.5) * 0.05;
        const m = new THREE.Matrix4()
          .makeRotationFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI))
          .setPosition(offsetX, offsetY, -D * 0.94 + (Math.random() - 0.5) * 0.02);
        nGeo.applyMatrix4(m);
        goldGeos.push(nGeo);
      }
      mergeAndAdd(goldGeos, goldMat);
    } else {
      hole.veinMesh = undefined;
    }

    // 4. Blasted Chisel Rubble Sill (Merged into 1 mesh)
    const rubbleCount = Math.min(10, 3 + hole.strikes);
    const rubbleMat = this.getMaterial(`rubble_${hole.rockColor}`, () => new THREE.MeshStandardMaterial({
      color: new THREE.Color(hole.rockColor).offsetHSL(0, 0, 0.04),
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    }));
    const rubbleGeos: THREE.BufferGeometry[] = [];
    for (let r = 0; r < rubbleCount; r++) {
      const stoneGeo = new THREE.DodecahedronGeometry(0.04 + Math.random() * 0.06, 0);
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.8;
      const dist = R * (0.8 + Math.random() * 0.35);
      const m = new THREE.Matrix4()
        .makeRotationFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0))
        .setPosition(
          Math.cos(angle) * dist,
          Math.sin(angle) * dist,
          0.04 + (Math.random() - 0.5) * 0.06
        );
      stoneGeo.applyMatrix4(m);
      rubbleGeos.push(stoneGeo);
    }
    hole.sillRubbleMesh = mergeAndAdd(rubbleGeos, rubbleMat);

    // 5. Timber Architecture by Tunnel Type (only if timbered / reinforced)
    hole.timberSets = [];

    if (hole.isTimbered) {
      if (hole.isPassThrough) {
      // Exit portal frame
      addTimberBox(rearR * 1.65, 0.14, 0.16, 0, rearR * 0.80 + deltaY, -D - 0.02);
      addTimberBox(0.12, rearR * 1.65, 0.14, -rearR * 0.78, -0.04 + deltaY, -D - 0.02);
      addTimberBox(0.12, rearR * 1.65, 0.14, rearR * 0.78, -0.04 + deltaY, -D - 0.02);
      addLanternMesh(rearR * 0.4, rearR * 0.65 + deltaY, -D - 0.2);
    }

    if (hole.holeType === 'raise') {
      // 5a. UPWARD RAISE: Corner posts, ring collars, top platform, and climbable ladder
      const postLength = D + 0.3;
      const postOffsets = [
        [-R * 0.62, -R * 0.62],
        [R * 0.62, -R * 0.62],
        [-R * 0.62, R * 0.62],
        [R * 0.62, R * 0.62],
      ];
      postOffsets.forEach(([px, py]) => {
        addTimberBox(0.12, 0.12, postLength, px, py, -D * 0.5);
      });

      const numRings = Math.max(1, Math.floor(D / 1.5));
      for (let r = 0; r <= numRings; r++) {
        const rz = -Math.min(D, r * 1.5);
        addTimberBox(R * 1.35, 0.11, 0.12, 0, R * 0.62, rz);
        addTimberBox(R * 1.35, 0.11, 0.12, 0, -R * 0.62, rz);
        addTimberBox(0.11, R * 1.35, 0.12, -R * 0.62, 0, rz);
        addTimberBox(0.11, R * 1.35, 0.12, R * 0.62, 0, rz);
      }

      if (D >= 1.6) {
        const plankCount = 4;
        for (let p = 0; p < plankCount; p++) {
          const px = (p - (plankCount - 1) * 0.5) * (R * 0.32);
          addTimberBox(R * 0.28, R * 1.15, 0.06, px, 0, -D + 0.32);
        }
      }

      // Ladder side rails and rungs
      const ladderTotalLength = D + 2.2;
      const ladderMidZ = -(D - 2.2) * 0.5;
      addTimberBox(0.06, 0.08, ladderTotalLength, -0.20, -R * 0.62, ladderMidZ);
      addTimberBox(0.06, 0.08, ladderTotalLength, 0.20, -R * 0.62, ladderMidZ);

      const numRungs = Math.floor(ladderTotalLength / 0.32);
      for (let rung = 0; rung <= numRungs; rung++) {
        const rungZ = 2.0 - rung * 0.32;
        if (rungZ < -D + 0.1) break;
        const rungGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.40, 6);
        rungGeo.rotateZ(Math.PI * 0.5);
        rungGeo.translate(0, -R * 0.62 + 0.02, rungZ);
        timberGeos.push(rungGeo);
      }

      addLanternMesh(0, R * 0.42, -D + 0.7);

    } else if (hole.holeType === 'branch') {
      // 5b. BRANCH TUNNEL: Junction arch, side posts, sill, knee braces
      addTimberBox(R * 1.65, 0.16, 0.18, 0, R * 0.80, 0.04);
      addTimberBox(0.14, R * 1.65, 0.16, -R * 0.78, -0.04, 0.04);
      addTimberBox(0.14, R * 1.65, 0.16, R * 0.78, -0.04, 0.04);
      addTimberBox(R * 1.5, 0.10, 0.16, 0, -R * 0.88, 0.04);
      addTimberBox(0.09, 0.32, 0.12, -R * 0.62, R * 0.66, 0.04, -Math.PI * 0.25);
      addTimberBox(0.09, 0.32, 0.12, R * 0.62, R * 0.66, 0.04, Math.PI * 0.25);
      addLanternMesh(R * 0.72, R * 0.45, 0.22);

      if (hole.depth >= 2.5) {
        const numSets = Math.floor((hole.depth - 0.6) / 2.5);
        for (let s = 1; s <= numSets; s++) {
          const setDist = s * 2.5;
          if (setDist > hole.depth - 0.5) break;
          addTimberBox(R * 1.55, 0.13, 0.14, 0, R * 0.80, -setDist);
          addTimberBox(0.12, R * 1.65, 0.13, -R * 0.76, -0.04, -setDist, -0.04);
          addTimberBox(0.12, R * 1.65, 0.13, R * 0.76, -0.04, -setDist, 0.04);
          addTimberBox(R * 1.45, 0.08, 0.14, 0, -R * 0.88, -setDist);
        }
      }

      if (hole.depth >= 3.0) {
        const lightSteps = Math.floor(hole.depth / 3.5);
        for (let l = 1; l <= lightSteps; l++) {
          const lz = -Math.min(hole.depth - 0.7, l * 3.5);
          addLanternMesh(R * 0.42, R * 0.35, lz);
        }
      }

    } else {
      // 5c. MAIN DRIFT TUNNEL
      if (hole.depth >= 1.2) {
        // Robust Western mine portal framing bent with wide walk-in clearance
        addTimberBox(0.16, R * 1.82, 0.18, -R * 0.88, -0.02, 0.04);
        addTimberBox(0.16, R * 1.82, 0.18, R * 0.88, -0.02, 0.04);
        addTimberBox(R * 2.05, 0.18, 0.20, 0, R * 0.86, 0.04);
        // Mortise and tenon corner knee braces
        addTimberBox(0.10, 0.36, 0.14, -R * 0.68, R * 0.70, 0.04, -Math.PI * 0.25);
        addTimberBox(0.10, 0.36, 0.14, R * 0.68, R * 0.70, 0.04, Math.PI * 0.25);
        // Mud-sill threshold timber flush with floor
        addTimberBox(R * 1.85, 0.06, 0.20, 0, -R * 0.90, 0.04);
        // Weathered mine portal sign board above lintel
        addTimberBox(R * 1.30, 0.26, 0.08, 0, R * 1.05, 0.06);
        // Working miner's lantern
        addLanternMesh(R * 0.55, R * 0.66, 0.20);

        // Sets along the bore
        if (hole.depth >= 2.8) {
          const numSets = Math.floor((hole.depth - 0.8) / 2.5);
          for (let s = 1; s <= numSets; s++) {
            const setDist = s * 2.5;
            if (setDist > hole.depth - 0.6) break;
            const setGradeY = deltaY * (setDist / Math.max(0.1, D));
            addTimberBox(R * 1.55, 0.13, 0.14, 0, R * 0.80 + setGradeY, -setDist);
            addTimberBox(0.12, R * 1.65, 0.13, -R * 0.76, -0.04 + setGradeY, -setDist, -0.04);
            addTimberBox(0.12, R * 1.65, 0.13, R * 0.76, -0.04 + setGradeY, -setDist, 0.04);
            addTimberBox(R * 1.45, 0.08, 0.14, 0, -R * 0.88 + setGradeY, -setDist);
          }
        }

        if (hole.depth >= 2.5) {
          const lightSteps = Math.max(1, Math.floor(hole.depth / 3.5));
          for (let l = 1; l <= lightSteps; l++) {
            const lz = -Math.min(hole.depth - 0.7, l * 3.5);
            const lightGradeY = deltaY * (-lz / Math.max(0.1, D));
            addLanternMesh(R * 0.42, R * 0.45 + lightGradeY, lz);
          }
        }
      }

      // Wooden Track Planks (Sleepers) & Steel Rails along floor
      if (isAdit && D >= 2.0) {
        const sleeperMat = this.getMaterial('sleeper_default', () => new THREE.MeshStandardMaterial({
          color: 0x4a3525,
          roughness: 0.94,
          metalness: 0.02,
        }));
        const railMat = this.getMaterial('rail_default', () => new THREE.MeshStandardMaterial({
          color: 0x3a3c40,
          roughness: 0.45,
          metalness: 0.85,
        }));

        const sleeperGeos: THREE.BufferGeometry[] = [];
        const numSleepers = Math.floor(D / 1.2);
        for (let s = 0; s <= numSleepers; s++) {
          const sz = -s * 1.2;
          if (sz < -D + 0.2) break;
          const sGrade = deltaY * (-sz / Math.max(0.1, D));
          const sGeo = new THREE.BoxGeometry(R * 1.15, 0.05, 0.16);
          sGeo.translate(0, -R * 0.86 + sGrade, sz);
          sleeperGeos.push(sGeo);
        }
        mergeAndAdd(sleeperGeos, sleeperMat);

        const railGeos: THREE.BufferGeometry[] = [];
        const rGeoL = new THREE.BoxGeometry(0.04, 0.045, D);
        const matL = new THREE.Matrix4();
        if (deltaY !== 0) matL.makeRotationX(-Math.atan2(deltaY, D));
        matL.setPosition(-R * 0.36, -R * 0.83 + deltaY * 0.5, -D * 0.5);
        rGeoL.applyMatrix4(matL);
        railGeos.push(rGeoL);

        const rGeoR = new THREE.BoxGeometry(0.04, 0.045, D);
        const matR = new THREE.Matrix4();
        if (deltaY !== 0) matR.makeRotationX(-Math.atan2(deltaY, D));
        matR.setPosition(R * 0.36, -R * 0.83 + deltaY * 0.5, -D * 0.5);
        rGeoR.applyMatrix4(matR);
        railGeos.push(rGeoR);

        mergeAndAdd(railGeos, railMat);
      }

      // 5d. Subterranean Wall Rock Bolts & Heavy Steel Washer Plates
      const isSubterranean = this.domain === 'underground' || !hole.isSurface;
      if (isSubterranean && D >= 1.8) {
        const boltMat = this.getMaterial('rock_bolt_steel', () => new THREE.MeshStandardMaterial({
          color: 0x48494b,
          metalness: 0.85,
          roughness: 0.35,
        }));
        const boltGeos: THREE.BufferGeometry[] = [];
        const boltSteps = Math.floor(D / 1.8);
        for (let b = 1; b <= boltSteps; b++) {
          const bz = -b * 1.8;
          if (bz < -D + 0.3) break;
          // Left wall plate
          const pL = new THREE.BoxGeometry(0.04, 0.16, 0.16);
          pL.translate(-R * 0.96, R * 0.2 + deltaY * (-bz / Math.max(0.1, D)), bz);
          boltGeos.push(pL);
          // Right wall plate
          const pR = new THREE.BoxGeometry(0.04, 0.16, 0.16);
          pR.translate(R * 0.96, R * 0.2 + deltaY * (-bz / Math.max(0.1, D)), bz);
          boltGeos.push(pR);
        }
        mergeAndAdd(boltGeos, boltMat);
      }
    }
  }

    // Merge all collected timber elements into 1 mesh
    hole.timberLintel = mergeAndAdd(timberGeos, timberMat);

    // Merge all collected lantern bodies into 1 mesh
    mergeAndAdd(lanternGeos, lanternMat);

    // Update stable PointLights (avoids shader recompilations)
    if (hole.isTimbered) {
      if (hole.holeType === 'raise') {
        if (!hole.workingFacePointLight) {
          hole.workingFacePointLight = new THREE.PointLight(0xffb044, 2.0, 10.0);
          hole.group.add(hole.workingFacePointLight);
        }
        hole.workingFacePointLight.position.set(0, 0, -D + 0.7);
        hole.workingFacePointLight.visible = true;
        if (hole.entrancePointLight) hole.entrancePointLight.visible = false;
      } else {
        if (hole.depth >= 1.2) {
          if (!hole.entrancePointLight) {
            hole.entrancePointLight = new THREE.PointLight(0xffb555, 1.8, Math.max(10.0, R * 8.0));
            hole.group.add(hole.entrancePointLight);
          }
          hole.entrancePointLight.position.set(R * 0.4, R * 0.65, 0.2);
          hole.entrancePointLight.visible = true;
        } else if (hole.entrancePointLight) {
          hole.entrancePointLight.visible = false;
        }

        if (hole.depth >= 2.5) {
          if (!hole.workingFacePointLight) {
            hole.workingFacePointLight = new THREE.PointLight(0xffaa44, 1.6, 9.0);
            hole.group.add(hole.workingFacePointLight);
          }
          const lz = -Math.min(hole.depth - 0.7, Math.max(1.8, hole.depth * 0.75));
          const lightGradeY = deltaY * (-lz / Math.max(0.1, D));
          hole.workingFacePointLight.position.set(0, R * 0.35 + lightGradeY, lz);
          hole.workingFacePointLight.visible = true;
        } else if (hole.workingFacePointLight) {
          hole.workingFacePointLight.visible = false;
        }
      }
    } else {
      if (hole.entrancePointLight) hole.entrancePointLight.visible = false;
      if (hole.workingFacePointLight) hole.workingFacePointLight.visible = false;
    }

    if (hole.isPassThrough) {
      if (!hole.exitPointLight) {
        hole.exitPointLight = new THREE.PointLight(0xfffaec, 2.2, Math.max(12.0, R * 8.5));
        hole.group.add(hole.exitPointLight);
      }
      hole.exitPointLight.position.set(0, R * 0.4 + deltaY, -D - 0.2);
      hole.exitPointLight.visible = true;
    } else if (hole.exitPointLight) {
      hole.exitPointLight.visible = false;
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
