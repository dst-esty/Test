import * as THREE from 'three';

export const MAX_LIFTABLE_WEIGHT_LBS = 55;

/**
 * Calculates realistic weight based on volumetric cubic scaling for desert igneous/sedimentary rock.
 * A 0.55 scale cobble weighs ~11 lbs; 0.75 scale stone weighs ~27 lbs;
 * 0.90 scale rock weighs ~47 lbs; 1.0 scale rock weighs ~65 lbs (exceeds bare-hands lift threshold).
 */
export function calculateRockWeightLbs(scale: number): number {
  return Math.max(4, Math.round(65 * Math.pow(scale, 3)));
}

export interface MovableRock {
  id: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  isResting: boolean;
  scale: number;
  color: number;
  weightLbs: number;
  radius: number;
}

export class MovableRockManager {
  private scene: THREE.Scene;
  public rocks: MovableRock[] = [];
  private rockGeometry: THREE.BufferGeometry;
  private rockMaterial: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Create a faceted, rugged desert stone geometry
    const baseGeo = new THREE.DodecahedronGeometry(0.35, 1);
    const posAttr = baseGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      // Subtle organic weathering jitter
      const noise = 0.88 + Math.sin(x * 12.0 + y * 7.0) * 0.12 + Math.cos(z * 9.0) * 0.08;
      posAttr.setXYZ(i, x * noise, y * (noise * 0.85), z * noise);
    }
    baseGeo.computeVertexNormals();
    this.rockGeometry = baseGeo;

    this.rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x9b583c,
      roughness: 0.92,
      metalness: 0.06,
      flatShading: true,
    });
  }

  /**
   * Spawn a rock gently placed onto the ground or a surface
   */
  public spawnPlacedRock(
    pos: THREE.Vector3,
    color: number = 0x9b583c,
    scale: number = 0.85,
    rotationY: number = 0
  ): MovableRock {
    const radius = 0.35 * scale;
    const mat = this.rockMaterial.clone();
    mat.color.setHex(color);

    const mesh = new THREE.Mesh(this.rockGeometry, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.set(scale, scale, scale);
    mesh.position.copy(pos);
    mesh.rotation.set(
      (Math.random() - 0.5) * 0.2,
      rotationY || Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.2
    );

    this.scene.add(mesh);

    const rock: MovableRock = {
      id: `movable_rock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      mesh,
      position: pos.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      angularVelocity: new THREE.Vector3(0, 0, 0),
      isResting: true,
      scale,
      color,
      weightLbs: calculateRockWeightLbs(scale),
      radius,
    };

    this.rocks.push(rock);
    return rock;
  }

  /**
   * Spawn a thrown rock with initial ballistic velocity
   */
  public spawnThrownRock(
    origin: THREE.Vector3,
    velocity: THREE.Vector3,
    color: number = 0x9b583c,
    scale: number = 0.85
  ): MovableRock {
    const radius = 0.35 * scale;
    const mat = this.rockMaterial.clone();
    mat.color.setHex(color);

    const mesh = new THREE.Mesh(this.rockGeometry, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.set(scale, scale, scale);
    mesh.position.copy(origin);

    this.scene.add(mesh);

    // Heavier rocks tumble slower with greater inertia
    const tumbleInertia = Math.max(2.5, 9.0 - scale * 4.0);
    const rock: MovableRock = {
      id: `movable_rock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      mesh,
      position: origin.clone(),
      velocity: velocity.clone(),
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * tumbleInertia,
        (Math.random() - 0.5) * tumbleInertia,
        (Math.random() - 0.5) * tumbleInertia
      ),
      isResting: false,
      scale,
      color,
      weightLbs: calculateRockWeightLbs(scale),
      radius,
    };

    this.rocks.push(rock);
    return rock;
  }

  /**
   * Spawn a chipped rock fragment that chips off a mountain cliff face or boulder
   * and tumbles down with physical velocity and gravity to land on the ground.
   */
  public spawnChippedFragment(
    origin: THREE.Vector3,
    ejectionDir: THREE.Vector3,
    color: number = 0x8f4327,
    scale: number = 0.52
  ): MovableRock {
    const radius = 0.35 * scale;
    const mat = this.rockMaterial.clone();
    mat.color.setHex(color);

    const mesh = new THREE.Mesh(this.rockGeometry, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.set(scale, scale, scale);
    mesh.position.copy(origin);

    this.scene.add(mesh);

    // Eject outward and slightly upward from the rock face
    const scatterVel = ejectionDir.clone().normalize().multiplyScalar(1.6 + Math.random() * 1.8);
    scatterVel.x += (Math.random() - 0.5) * 1.4;
    scatterVel.y += 0.8 + Math.random() * 1.6;
    scatterVel.z += (Math.random() - 0.5) * 1.4;

    const rock: MovableRock = {
      id: `movable_rock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      mesh,
      position: origin.clone(),
      velocity: scatterVel,
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      ),
      isResting: false,
      scale,
      color,
      weightLbs: calculateRockWeightLbs(scale),
      radius,
    };

    this.rocks.push(rock);
    return rock;
  }

  /**
   * Spawn a loose rock or chipped fragment using a parameter object
   */
  public spawnLooseRock(opts: {
    position: THREE.Vector3;
    color?: number;
    scale?: number;
    weightLbs?: number;
    ejectionDir?: THREE.Vector3;
    isChippedFragment?: boolean;
  }): MovableRock {
    const origin = opts.position || new THREE.Vector3(0, 0, 0);
    const color = opts.color ?? 0x8f4327;
    const scale = opts.scale ?? 0.5;
    const ejectionDir = opts.ejectionDir || new THREE.Vector3(0, 1, 0);
    if (opts.isChippedFragment) {
      return this.spawnChippedFragment(origin, ejectionDir, color, scale);
    }
    return this.spawnPlacedRock(origin, color, scale);
  }

  /**
   * Raycast to find the closest movable rock within interaction distance
   */
  public raycastMovableRock(
    raycaster: THREE.Raycaster,
    maxDist: number = 3.5
  ): { hit: boolean; rock?: MovableRock; distance?: number; canLift?: boolean; weightLbs?: number } {
    const meshes = this.rocks.map((r) => r.mesh);
    if (meshes.length === 0) return { hit: false };

    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0 && hits[0].distance <= maxDist) {
      const hitMesh = hits[0].object;
      const rock = this.rocks.find((r) => r.mesh === hitMesh);
      if (rock) {
        const canLift = rock.weightLbs <= MAX_LIFTABLE_WEIGHT_LBS;
        return {
          hit: true,
          rock,
          distance: hits[0].distance,
          canLift,
          weightLbs: rock.weightLbs,
        };
      }
    }
    return { hit: false };
  }

  /**
   * Pick up a movable rock by ID, removing it from the physical world.
   * Enforces realistic physical lifting limit (<= 55 lbs) unless force is specified.
   */
  public pickUpRock(rockId: string, ignoreWeight: boolean = false): MovableRock | null {
    const idx = this.rocks.findIndex((r) => r.id === rockId);
    if (idx === -1) return null;

    const rock = this.rocks[idx];
    if (!ignoreWeight && rock.weightLbs > MAX_LIFTABLE_WEIGHT_LBS) {
      return null;
    }

    this.scene.remove(rock.mesh);
    this.rocks.splice(idx, 1);
    return rock;
  }

  /**
   * Physics simulation loop: gravity, terrain collision, bouncy restitution, and rotational tumbling
   */
  public update(
    delta: number,
    getTerrainHeight: (x: number, z: number) => number,
    onImpact?: (volume: number) => void
  ) {
    const gravity = -20.0;
    const clampedDelta = Math.min(0.06, delta);

    for (let i = 0; i < this.rocks.length; i++) {
      const rock = this.rocks[i];
      if (rock.isResting) continue;

      // Apply gravity
      rock.velocity.y += gravity * clampedDelta;

      // Integrate position
      rock.position.x += rock.velocity.x * clampedDelta;
      rock.position.y += rock.velocity.y * clampedDelta;
      rock.position.z += rock.velocity.z * clampedDelta;

      // Integrate angular tumbling
      rock.mesh.rotation.x += rock.angularVelocity.x * clampedDelta;
      rock.mesh.rotation.y += rock.angularVelocity.y * clampedDelta;
      rock.mesh.rotation.z += rock.angularVelocity.z * clampedDelta;

      // Terrain elevation collision check
      const groundY = getTerrainHeight(rock.position.x, rock.position.z);
      const minAltitude = groundY + rock.radius * 0.75;

      if (rock.position.y <= minAltitude) {
        const impactSpeed = Math.hypot(rock.velocity.x, rock.velocity.y, rock.velocity.z);
        rock.position.y = minAltitude;

        if (impactSpeed > 1.8) {
          // Bounce off terrain (heavier rocks absorb shock and bounce less)
          const bounciness = Math.max(0.18, 0.42 - (rock.weightLbs / 120.0));
          rock.velocity.y = -rock.velocity.y * bounciness;
          rock.velocity.x *= 0.62;
          rock.velocity.z *= 0.62;
          rock.angularVelocity.multiplyScalar(0.65);

          if (onImpact) {
            // Sound volume scales with impact momentum
            const vol = Math.min(0.65, (impactSpeed / 12.0) * (0.4 + rock.weightLbs / 60.0));
            onImpact(vol);
          }
        } else {
          // Settle to rest on ground
          rock.velocity.set(0, 0, 0);
          rock.angularVelocity.set(0, 0, 0);
          rock.isResting = true;
          rock.position.y = groundY + rock.radius * 0.7;
        }
      }

      rock.mesh.position.copy(rock.position);
    }
  }

  public checkCollision(
    x: number,
    y: number,
    z: number,
    playerRadius: number = 0.42
  ): { hit: boolean; rock?: MovableRock; normal?: { x: number; z: number } } {
    for (let i = 0; i < this.rocks.length; i++) {
      const rock = this.rocks[i];
      if (rock.weightLbs < 15) continue; // Small lightweight pebbles do not block walking
      const r = (rock.radius || 0.35) * 0.95;
      const combinedRadius = r + playerRadius;
      const dx = x - rock.position.x;
      if (Math.abs(dx) > combinedRadius) continue;
      const dz = z - rock.position.z;
      if (Math.abs(dz) > combinedRadius) continue;

      const distSq = dx * dx + dz * dz;
      if (distSq < combinedRadius * combinedRadius) {
        if (y >= rock.position.y - 0.4 && y <= rock.position.y + r * 2.2) {
          const dist = Math.sqrt(distSq);
          return {
            hit: true,
            rock,
            normal: {
              x: dist > 0.0001 ? dx / dist : 1,
              z: dist > 0.0001 ? dz / dist : 0,
            },
          };
        }
      }
    }
    return { hit: false };
  }

  public dispose() {
    for (const rock of this.rocks) {
      this.scene.remove(rock.mesh);
    }
    this.rocks = [];
    this.rockGeometry.dispose();
    this.rockMaterial.dispose();
  }
}
