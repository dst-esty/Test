import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { getTerrainHeight } from '../world/terrain';
import { LANDMARK_OBSTACLES, WORLD_BOUNDARY_RADIUS } from './collisionEngine';
import type { DesertFoliageManager } from '../world/foliage';

export interface MovementResult {
  position: THREE.Vector3;
  isGrounded: boolean;
  collided: boolean;
  atBoundary?: boolean;
}

export class RapierPhysicsManager {
  private static instance: RapierPhysicsManager | null = null;
  private initialized = false;
  private world: RAPIER.World | null = null;
  private characterController: RAPIER.KinematicCharacterController | null = null;
  private playerBody: RAPIER.RigidBody | null = null;
  private playerCollider: RAPIER.Collider | null = null;

  // Local terrain collider around player
  private terrainCollider: RAPIER.Collider | null = null;
  private terrainRigidBody: RAPIER.RigidBody | null = null;
  private lastTerrainCenter = new THREE.Vector2(99999, 99999);

  // Dynamic rock colliders
  private dynamicRockRigidBodies: RAPIER.RigidBody[] = [];
  private dynamicRockColliders: RAPIER.Collider[] = [];

  // Landmark & rock obstacle colliders
  private obstacleColliders: RAPIER.Collider[] = [];

  public static async getInstance(): Promise<RapierPhysicsManager> {
    if (!RapierPhysicsManager.instance) {
      RapierPhysicsManager.instance = new RapierPhysicsManager();
      await RapierPhysicsManager.instance.init();
    }
    return RapierPhysicsManager.instance;
  }

  public isReady(): boolean {
    return this.initialized && this.world !== null && this.characterController !== null;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await RAPIER.init();

      // Gravity: standard earth gravity
      const gravity = { x: 0.0, y: -9.81, z: 0.0 };
      this.world = new RAPIER.World(gravity);

      // Create Kinematic Character Controller
      // Skin offset: small clearance to avoid micro-penetration
      const skinOffset = 0.03;
      this.characterController = this.world.createCharacterController(skinOffset);

      // Autostep: smoothly step over small ledges, rocks, stairs up to 0.65m high
      this.characterController.enableAutostep(0.65, 0.2, true);

      // Max walkable slope: ~50 degrees (0.87 radians). Steeper slopes are treated as cliffs/walls
      this.characterController.setMaxSlopeClimbAngle((50 * Math.PI) / 180);

      // Minimum slope slide angle: >52 degrees forces character to naturally slide down steep canyon walls
      this.characterController.setMinSlopeSlideAngle((52 * Math.PI) / 180);

      // Snap to ground distance: keeps character firmly planted when running downhill
      this.characterController.enableSnapToGround(0.45);

      // Player kinematic rigid body
      const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 20, 0);
      this.playerBody = this.world.createRigidBody(bodyDesc);

      // Capsule Collider: half-height = 0.45m, radius = 0.40m (total character height ~1.7m)
      const capsuleDesc = RAPIER.ColliderDesc.capsule(0.45, 0.40);
      this.playerCollider = this.world.createCollider(capsuleDesc, this.playerBody);

      // Register landmark obstacles (buildings, pier, stagecoach, table boulder, etc.)
      this.registerLandmarks();

      this.initialized = true;
    } catch (err) {
      console.warn('Rapier3D physics initialization error:', err);
    }
  }

  private registerLandmarks(): void {
    if (!this.world) return;

    LANDMARK_OBSTACLES.forEach((obs) => {
      const cy = getTerrainHeight(obs.x, obs.z) + obs.height * 0.5;
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(obs.x, cy, obs.z);
      const rb = this.world!.createRigidBody(bodyDesc);
      const cylinderDesc = RAPIER.ColliderDesc.cylinder(obs.height * 0.5, obs.radius);
      const col = this.world!.createCollider(cylinderDesc, rb);
      this.obstacleColliders.push(col);
    });
  }

  /**
   * Updates local terrain trimesh around the player if they have moved significantly.
   * Generates a 48m x 48m high-resolution triangle mesh collider from getTerrainHeight().
   */
  public updateLocalTerrain(
    playerX: number,
    playerZ: number,
    foliageManager?: DesertFoliageManager | null
  ): void {
    if (!this.world) return;

    // Check if player has moved more than 8m from last patch center
    const distSq = (playerX - this.lastTerrainCenter.x) ** 2 + (playerZ - this.lastTerrainCenter.y) ** 2;
    if (distSq < 64 && this.terrainCollider !== null) {
      return;
    }

    this.lastTerrainCenter.set(playerX, playerZ);

    // Grid parameters: 48m x 48m with 1m resolution (49x49 vertices = 2401 vertices, 4608 triangles)
    // Extremely fast for Rapier to construct (~1ms) and provides accurate canyon and cliff geometry
    const gridSize = 48;
    const step = 1.0;
    const half = gridSize / 2;
    const originX = Math.floor(playerX - half);
    const originZ = Math.floor(playerZ - half);
    const numX = gridSize + 1;
    const numZ = gridSize + 1;

    const vertices = new Float32Array(numX * numZ * 3);
    let vIdx = 0;
    for (let iz = 0; iz < numZ; iz++) {
      const z = originZ + iz * step;
      for (let ix = 0; ix < numX; ix++) {
        const x = originX + ix * step;
        const y = getTerrainHeight(x, z);
        vertices[vIdx++] = x;
        vertices[vIdx++] = y;
        vertices[vIdx++] = z;
      }
    }

    // Indices for two triangles per quad cell
    const numQuads = gridSize * gridSize;
    const indices = new Uint32Array(numQuads * 6);
    let iIdx = 0;
    for (let iz = 0; iz < gridSize; iz++) {
      for (let ix = 0; ix < gridSize; ix++) {
        const i0 = iz * numX + ix;
        const i1 = i0 + 1;
        const i2 = (iz + 1) * numX + ix;
        const i3 = i2 + 1;

        indices[iIdx++] = i0;
        indices[iIdx++] = i2;
        indices[iIdx++] = i1;

        indices[iIdx++] = i1;
        indices[iIdx++] = i2;
        indices[iIdx++] = i3;
      }
    }

    // Clean up old terrain collider
    if (this.terrainCollider && this.terrainRigidBody) {
      this.world.removeCollider(this.terrainCollider, false);
      this.world.removeRigidBody(this.terrainRigidBody);
      this.terrainCollider = null;
      this.terrainRigidBody = null;
    }

    // Clean up dynamic rock colliders
    for (const col of this.dynamicRockColliders) {
      this.world.removeCollider(col, false);
    }
    this.dynamicRockColliders = [];
    for (const rb of this.dynamicRockRigidBodies) {
      this.world.removeRigidBody(rb);
    }
    this.dynamicRockRigidBodies = [];

    // Create new fixed trimesh
    const bodyDesc = RAPIER.RigidBodyDesc.fixed();
    this.terrainRigidBody = this.world.createRigidBody(bodyDesc);
    const trimeshDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
    this.terrainCollider = this.world.createCollider(trimeshDesc, this.terrainRigidBody);

    // Register nearby physical boulders from foliageManager
    if (foliageManager?.rockColliders) {
      for (const rock of foliageManager.rockColliders) {
        const dx = rock.x - playerX;
        const dz = rock.z - playerZ;
        if (dx * dx + dz * dz < 26 * 26) {
          const rHeight = Math.max(0.6, rock.radius * 1.2);
          const rbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(rock.x, rock.y + rHeight * 0.5, rock.z);
          const rb = this.world.createRigidBody(rbDesc);
          const cDesc = RAPIER.ColliderDesc.cylinder(rHeight * 0.5, rock.radius * 0.88);
          const col = this.world.createCollider(cDesc, rb);
          this.dynamicRockRigidBodies.push(rb);
          this.dynamicRockColliders.push(col);
        }
      }
    }
  }

  /**
   * Computes kinematic movement vector using Rapier's character controller.
   * Slides automatically along steep canyon walls and rocks, and handles steps.
   */
  public computeMovement(
    currentPos: THREE.Vector3,
    desiredTranslation: THREE.Vector3,
    foliageManager?: DesertFoliageManager | null
  ): MovementResult {
    if (
      !this.world ||
      !this.characterController ||
      !this.playerBody ||
      !this.playerCollider
    ) {
      return {
        position: currentPos.clone().add(desiredTranslation),
        isGrounded: true,
        collided: false,
      };
    }

    // Ensure player body is at character's capsule center
    // Capsule center is 0.85m above foot position
    const capsuleCenterY = currentPos.y + 0.85;
    this.playerBody.setTranslation({ x: currentPos.x, y: capsuleCenterY, z: currentPos.z }, true);

    // Update local terrain patch & nearby obstacles
    this.updateLocalTerrain(currentPos.x, currentPos.z, foliageManager);

    // Compute movement with collision query
    this.characterController.computeColliderMovement(
      this.playerCollider,
      { x: desiredTranslation.x, y: desiredTranslation.y, z: desiredTranslation.z },
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS
    );

    const computed = this.characterController.computedMovement();
    const isGrounded = this.characterController.computedGrounded();

    let resolvedX = currentPos.x + computed.x;
    let resolvedZ = currentPos.z + computed.z;
    let atBoundary = false;

    // Enforce world perimeter boundary
    const distFromCenter = Math.hypot(resolvedX, resolvedZ);
    if (distFromCenter > WORLD_BOUNDARY_RADIUS) {
      const angle = Math.atan2(resolvedZ, resolvedX);
      resolvedX = Math.cos(angle) * WORLD_BOUNDARY_RADIUS;
      resolvedZ = Math.sin(angle) * WORLD_BOUNDARY_RADIUS;
      atBoundary = true;
    }

    const resolvedPos = new THREE.Vector3(
      resolvedX,
      currentPos.y + computed.y,
      resolvedZ
    );

    const collided =
      atBoundary ||
      Math.abs(computed.x - desiredTranslation.x) > 0.001 ||
      Math.abs(computed.z - desiredTranslation.z) > 0.001;

    return {
      position: resolvedPos,
      isGrounded,
      collided,
      atBoundary,
    };
  }

  public dispose(): void {
    if (this.world) {
      this.world.free();
      this.world = null;
    }
    this.initialized = false;
  }
}

