import * as THREE from 'three';
import { MountainDustParticleSystem } from './mountainDustParticles';

export interface MountainHole {
  id: string;
  position: THREE.Vector3; // World coordinates on mountain face
  normal: THREE.Vector3;   // Outward-facing surface normal
  depth: number;           // Depth penetrated into mountain in meters
  radius: number;          // Opening width radius in meters
  strikes: number;         // Number of pickaxe blows
  rockColor: number;       // Tint of surrounding mountain rock
  rockType: string;        // 'volcanic_crag' | 'stepped_mesa' | 'fault_monocline' | 'canyon_spire' | 'granite';
  hasExposedGoldVein: boolean;
  goldAwardedTotal: number;
  group: THREE.Group;
  rimMesh: THREE.Mesh;
  cavityMesh: THREE.Mesh;
  veinMesh?: THREE.Mesh;
  sillRubbleMesh?: THREE.Mesh;
  timberLintel?: THREE.Mesh;
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
export class MountainHoleManager {
  public holes: MountainHole[] = [];
  public dustParticleSystem?: MountainDustParticleSystem;
  private scene: THREE.Scene;
  private readonly rootGroup: THREE.Group;

  // Shared reusable geometries and materials for optimal performance
  private readonly sharedMaterials: Map<string, THREE.Material> = new Map();

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

  /**
   * Finds an existing mountain hole within proximity threshold
   */
  public findNearbyHole(point: THREE.Vector3, threshold: number = 1.15): MountainHole | undefined {
    let closest: MountainHole | undefined;
    let minDist = threshold;
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i];
      const dist = h.position.distanceTo(point);
      if (dist < minDist) {
        minDist = dist;
        closest = h;
      }
    }
    return closest;
  }

  /**
   * Raycasts directly against active mountain hole entrance meshes
   */
  public raycastMountainHoles(raycaster: THREE.Raycaster, maxDist: number = 6.5): {
    hit: boolean;
    hole?: MountainHole;
    point?: THREE.Vector3;
    distance?: number;
  } {
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i];
      const dist = raycaster.ray.origin.distanceTo(h.position);
      if (dist > maxDist + 1.0) continue;

      // Test intersection against the hole's entry rim and cavity
      const hits = raycaster.intersectObject(h.group, true);
      if (hits.length > 0 && hits[0].distance <= maxDist) {
        return {
          hit: true,
          hole: h,
          point: hits[0].point,
          distance: hits[0].distance,
        };
      }
    }
    return { hit: false };
  }

  /**
   * Digs a visible hole or deepens an existing hole directly on a mountain face
   */
  public digMountainHole(
    hitPoint: THREE.Vector3,
    surfaceNormal: THREE.Vector3,
    rockColor: number = 0x8a4528,
    rockType: string = 'volcanic_crag',
    tool: string = 'pickaxe'
  ): DigMountainHoleResult {
    // Clean and normalize normal vector
    const normal = surfaceNormal.clone();
    if (normal.lengthSq() < 0.001) {
      normal.set(0, 0, 1);
    } else {
      normal.normalize();
    }

    // Check if an existing hole is close enough to be deepened
    const existing = this.findNearbyHole(hitPoint, 1.25);
    const isPickaxe = tool === 'pickaxe';
    const isDynamite = tool === 'dynamite';

    const baseDepthIncrement = isDynamite ? 1.2 : isPickaxe ? 0.42 : 0.22;
    const baseRadiusIncrement = isDynamite ? 0.35 : isPickaxe ? 0.08 : 0.04;

    if (existing) {
      existing.strikes += 1;
      existing.depth = Math.min(3.2, existing.depth + baseDepthIncrement);
      existing.radius = Math.min(1.35, existing.radius + baseRadiusIncrement);

      // Rebuild 3D visual geometry to reflect the newly deepened excavation
      this.rebuildHoleVisuals(existing);

      // Gold discovery calculations
      let goldAwarded = 0;
      let msg = '';
      if (existing.depth >= 1.0 && !existing.hasExposedGoldVein && Math.random() < 0.65) {
        existing.hasExposedGoldVein = true;
        goldAwarded = 2 + Math.floor(Math.random() * 3);
        existing.goldAwardedTotal += goldAwarded;
        this.rebuildHoleVisuals(existing);
        msg = `⛏️ BORED DEEPER INTO MOUNTAIN (-${existing.depth.toFixed(1)}m)! Struck high-grade Gold Quartz Vein in bedrock! (+${goldAwarded} oz Gold)`;
      } else if (existing.hasExposedGoldVein && Math.random() < 0.45) {
        goldAwarded = 1 + Math.floor(Math.random() * 2);
        existing.goldAwardedTotal += goldAwarded;
        msg = `⛏️ Chiseled Mountain Adit (-${existing.depth.toFixed(1)}m): Extracted +${goldAwarded} oz Gold Quartz from cavity!`;
      } else if (existing.depth >= 2.0) {
        msg = `⛏️ Driven Mountain Drift Tunnel to -${existing.depth.toFixed(1)}m! Exposed solid metamorphic mountain core (+2 Quarry Stone)`;
      } else {
        msg = `⛏️ Carved Mountain Hole to -${existing.depth.toFixed(1)}m deep! (+2 Building Stone)`;
      }

      if (this.dustParticleSystem) {
        const mat = existing.hasExposedGoldVein ? 'quartz_gold' : rockType;
        const mult = isDynamite ? 2.4 : isPickaxe ? 1.0 + existing.depth * 0.2 : 0.8;
        this.dustParticleSystem.triggerMountainStrike(existing.position, normal, mat, mult);
      }

      return {
        hole: existing,
        isNew: false,
        depthReached: existing.depth,
        goldAwarded,
        rocksAwarded: isDynamite ? 4 : 2,
        message: msg,
        hitPoint: existing.position.clone(),
        debrisType: rockType.includes('sand') ? 'sandstone' : 'granite',
      };
    }

    // Otherwise, create a brand new visible hole on the mountain face
    const initialDepth = baseDepthIncrement;
    const initialRadius = isDynamite ? 0.85 : 0.46;
    const hasGoldVein = Math.random() < 0.28;
    const initialGold = hasGoldVein ? 1 : 0;

    const holeGroup = new THREE.Group();
    holeGroup.position.copy(hitPoint);

    // Orient group so local +Z is pointing along the outward normal (away from mountain),
    // and local -Z points into the mountain interior!
    const defaultNormal = new THREE.Vector3(0, 0, 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultNormal, normal);
    holeGroup.quaternion.copy(quat);

    const holeId = `mtn_hole_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const newHole: MountainHole = {
      id: holeId,
      position: hitPoint.clone(),
      normal: normal.clone(),
      depth: initialDepth,
      radius: initialRadius,
      strikes: 1,
      rockColor,
      rockType,
      hasExposedGoldVein: hasGoldVein,
      goldAwardedTotal: initialGold,
      group: holeGroup,
      rimMesh: undefined as unknown as THREE.Mesh,
      cavityMesh: undefined as unknown as THREE.Mesh,
    };

    this.rebuildHoleVisuals(newHole);
    this.rootGroup.add(holeGroup);
    this.holes.push(newHole);

    const msg = hasGoldVein
      ? `⛏️ Pickaxe gouged visible hole into mountain face (-${initialDepth.toFixed(1)}m)! Glittering gold flecks exposed! (+1 oz Gold)`
      : `⛏️ Pickaxe gouged visible excavation hole into mountain rock (-${initialDepth.toFixed(1)}m)! (+1 Building Stone)`;

    if (this.dustParticleSystem) {
      const mat = hasGoldVein ? 'quartz_gold' : rockType;
      const mult = isDynamite ? 2.2 : isPickaxe ? 1.1 : 0.8;
      this.dustParticleSystem.triggerMountainStrike(hitPoint, normal, mat, mult);
    }

    return {
      hole: newHole,
      isNew: true,
      depthReached: initialDepth,
      goldAwarded: initialGold,
      rocksAwarded: 2,
      message: msg,
      hitPoint: hitPoint.clone(),
      debrisType: 'granite',
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
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }

    const R = hole.radius;
    const D = hole.depth;

    // 1. Outer Jagged Chiseled Collar Rim
    // Extrudes an irregular polygonal ring around the hole mouth to show fractured rock borders
    const segments = 14;
    const rimShape = new THREE.Shape();
    const holePath = new THREE.Path();

    const outerR = R * 1.48;
    const innerR = R * 0.94;

    // Outer contour
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const seed = Math.sin(angle * 5 + hole.strikes) * 0.14 + Math.cos(angle * 3) * 0.08;
      const r = outerR * (1.0 + seed);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) rimShape.moveTo(x, y);
      else rimShape.lineTo(x, y);
    }

    // Inner opening cutout
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const seed = Math.cos(angle * 6 + hole.strikes * 2) * 0.12;
      const r = innerR * (1.0 + seed);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) holePath.moveTo(x, y);
      else holePath.lineTo(x, y);
    }
    rimShape.holes.push(holePath);

    const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.04,
      bevelThickness: 0.05,
    });

    // Outer rim material: matches surrounding rock with freshly-fractured lighter edge roughness
    const rimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hole.rockColor).offsetHSL(0.02, -0.05, 0.08),
      roughness: 0.96,
      metalness: 0.04,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
    });

    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.set(0, 0, 0.01);
    hole.group.add(rimMesh);
    hole.rimMesh = rimMesh;

    // 2. Excavated Concave Interior Cavity (Deep into the Mountain along -Z)
    // A tapering, rough-hewn polygonal hollow penetrating into the mountain bedrock
    const cavityGeo = new THREE.CylinderGeometry(
      R * 0.96,   // top/entrance radius (at z = 0)
      R * 0.62,   // bottom/interior rear radius (at z = -D)
      D,          // length of excavated bore
      12,         // radial segments
      4,          // height segments
      false       // open-ended
    );

    // Rotate geometry so cylinder axis lies along Z (facing into -Z)
    cavityGeo.rotateX(Math.PI / 2);
    cavityGeo.translate(0, 0, -D * 0.5);

    // Perturb vertices for organic hand-pickaxe chisel facets
    const posAttr = cavityGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const z = posAttr.getZ(i);
      if (z < -0.05) {
        const noise = (Math.sin(posAttr.getX(i) * 12 + z * 8) + Math.cos(posAttr.getY(i) * 14)) * 0.04 * R;
        posAttr.setX(i, posAttr.getX(i) + noise);
        posAttr.setY(i, posAttr.getY(i) + noise);
      }
    }
    cavityGeo.computeVertexNormals();

    // Dark interior rock material with high ambient occlusion and deep shadow
    const darkInteriorColor = new THREE.Color(hole.rockColor).multiplyScalar(0.42);
    const cavityMat = new THREE.MeshStandardMaterial({
      color: darkInteriorColor,
      roughness: 0.98,
      metalness: 0.08,
      side: THREE.DoubleSide, // Allows viewing inside the carved cave
      flatShading: true,
    });

    const cavityMesh = new THREE.Mesh(cavityGeo, cavityMat);
    hole.group.add(cavityMesh);
    hole.cavityMesh = cavityMesh;

    // 2b. Solid Back Wall / Bedrock Face of the Excavation Cavity
    const backWallGeo = new THREE.CircleGeometry(R * 0.64, 12);
    // Perturb back wall vertices so it looks like rough fractured granite
    const backPos = backWallGeo.attributes.position;
    for (let i = 0; i < backPos.count; i++) {
      backPos.setZ(i, (Math.sin(backPos.getX(i) * 9) + Math.cos(backPos.getY(i) * 9)) * 0.05);
    }
    backWallGeo.computeVertexNormals();

    const backWallMesh = new THREE.Mesh(backWallGeo, cavityMat);
    backWallMesh.position.set(0, 0, -D);
    hole.group.add(backWallMesh);

    // 3. Exposed Glittering Quartz & Gold Vein at the Deep Back Face
    if (hole.hasExposedGoldVein) {
      const veinGroup = new THREE.Group();

      // Quartz seam band
      const quartzGeo = new THREE.BoxGeometry(R * 0.85, R * 0.28, 0.12);
      const quartzMat = new THREE.MeshStandardMaterial({
        color: 0xefede8,
        roughness: 0.38,
        metalness: 0.12,
        bumpScale: 0.08,
      });
      const quartzMesh = new THREE.Mesh(quartzGeo, quartzMat);
      quartzMesh.position.set(0, 0, -D * 0.94);
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

      const nuggetCount = Math.min(6, 2 + Math.floor(hole.depth * 1.5));
      for (let n = 0; n < nuggetCount; n++) {
        const nGeo = new THREE.DodecahedronGeometry(0.045 + Math.random() * 0.035, 0);
        const nMesh = new THREE.Mesh(nGeo, goldMat);
        const offsetX = (n - (nuggetCount - 1) * 0.5) * (R * 0.14) + (Math.random() - 0.5) * 0.04;
        const offsetY = offsetX * Math.tan(0.45) + (Math.random() - 0.5) * 0.04;
        nMesh.position.set(offsetX, offsetY, -D * 0.92 + (Math.random() - 0.5) * 0.02);
        nMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        veinGroup.add(nMesh);
      }

      hole.group.add(veinGroup);
      hole.veinMesh = quartzMesh;
    }

    // 4. Blasted Chisel Rubble Sill at the Bottom of the Opening
    const rubbleGroup = new THREE.Group();
    const rubbleCount = Math.min(8, 3 + hole.strikes);
    const rubbleMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hole.rockColor).offsetHSL(0, 0, 0.04),
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });

    for (let r = 0; r < rubbleCount; r++) {
      const stoneGeo = new THREE.DodecahedronGeometry(0.04 + Math.random() * 0.05, 0);
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

    // 5. Timber Lintel Prop (for deep adit excavations >= 1.2m)
    if (hole.depth >= 1.2) {
      const timberMat = new THREE.MeshStandardMaterial({
        color: 0x5c3d24,
        roughness: 0.88,
        metalness: 0.02,
      });

      // Split header beam across upper arch
      const beamGeo = new THREE.BoxGeometry(R * 1.55, 0.12, 0.14);
      const beamMesh = new THREE.Mesh(beamGeo, timberMat);
      beamMesh.position.set(0, R * 0.72, 0.02);
      hole.group.add(beamMesh);

      // Wooden wedge cleats
      const wedgeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.15);
      const wedgeL = new THREE.Mesh(wedgeGeo, timberMat);
      wedgeL.position.set(-R * 0.65, R * 0.76, 0.03);
      wedgeL.rotation.z = -0.2;
      hole.group.add(wedgeL);

      const wedgeR = new THREE.Mesh(wedgeGeo, timberMat);
      wedgeR.position.set(R * 0.65, R * 0.76, 0.03);
      wedgeR.rotation.z = 0.2;
      hole.group.add(wedgeR);

      hole.timberLintel = beamMesh;
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
