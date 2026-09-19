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
  isSurface?: boolean;
  group: THREE.Group;
  rimMesh: THREE.Mesh;
  cavityMesh: THREE.Mesh;
  veinMesh?: THREE.Mesh;
  sillRubbleMesh?: THREE.Mesh;
  timberLintel?: THREE.Mesh;
  timberSets?: THREE.Group[];
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
   * Checks if a 3D world coordinate is inside the carved corridor of any mountain adit.
   * Returns information on whether the player is inside, the tunnel floor Y, and the hole instance.
   */
  public isInsideMountainTunnel(
    worldX: number,
    worldY: number,
    worldZ: number,
    toleranceMargin: number = 0.5
  ): { inside: boolean; floorY?: number; hole?: MountainHole; distFromEntrance?: number } {
    const testPos = new THREE.Vector3(worldX, worldY, worldZ);
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i];
      // Quick bounding sphere check
      const distToHole = testPos.distanceTo(h.position);
      if (distToHole > h.depth + h.radius + 3.0) continue;

      // Project test point into hole local space
      // In local space:
      // - (0,0,0) is entrance mouth
      // - local +Z is outward facing away from mountain
      // - local -Z is into the mountain tunnel (0 down to -depth)
      const localP = testPos.clone().sub(h.position);
      // Invert hole quaternion rotation to get local coordinates
      const invQuat = h.group.quaternion.clone().invert();
      localP.applyQuaternion(invQuat);

      const z = localP.z;
      // Along the tunnel bore: allow slight threshold outside entrance (+1.2m) down to beyond the back face (-depth - 0.5m)
      if (z <= 1.2 && z >= -h.depth - 0.5) {
        const halfWidth = Math.max(1.3, h.radius * 1.25) + toleranceMargin;
        const isWithinWidth = Math.abs(localP.x) <= halfWidth;

        // Vertical clearance: generous leeway from bedrock floor up to ceiling
        const minLocalY = -h.radius * 1.4 - toleranceMargin;
        const maxLocalY = h.radius * 1.4 + 1.2 + toleranceMargin;
        const isWithinHeight = localP.y >= minLocalY && localP.y <= maxLocalY;

        if (isWithinWidth && isWithinHeight) {
          // Inside tunnel corridor! Calculate tunnel bedrock floor Y
          // Floor in local space is at bottom sill: y ≈ -h.radius * 0.92
          const localFloor = new THREE.Vector3(localP.x, -h.radius * 0.92, z);
          localFloor.applyQuaternion(h.group.quaternion).add(h.position);

          return {
            inside: true,
            floorY: localFloor.y,
            hole: h,
            distFromEntrance: Math.max(0, -z),
          };
        }
      }
    }
    return { inside: false };
  }

  /**
   * Raycasts directly against active mountain hole entrance and interior meshes
   */
  public raycastMountainHoles(raycaster: THREE.Raycaster, maxDist: number = 7.5): {
    hit: boolean;
    hole?: MountainHole;
    point?: THREE.Vector3;
    distance?: number;
    isBackFace?: boolean;
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
        const isBackFace = localHit.z <= -h.depth * 0.75;

        return {
          hit: true,
          hole: h,
          point: hitPt,
          distance: hits[0].distance,
          isBackFace,
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
    tool: string = 'pickaxe',
    isSurface: boolean = false
  ): DigMountainHoleResult {
    // Clean and normalize normal vector
    const normal = surfaceNormal.clone();
    if (normal.lengthSq() < 0.001) {
      normal.set(0, 0, 1);
    } else {
      normal.normalize();
    }

    // Check if an existing hole is close enough to be deepened
    // Check both entrance proximity and along tunnel bore proximity
    let existing = this.findNearbyHole(hitPoint, 1.6);
    if (!existing) {
      const insideCheck = this.isInsideMountainTunnel(hitPoint.x, hitPoint.y, hitPoint.z, 0.8);
      if (insideCheck.inside && insideCheck.hole) {
        existing = insideCheck.hole;
      }
    }

    const isPickaxe = tool === 'pickaxe';
    const isDynamite = tool === 'dynamite';
    // Walk-in adit scaling: pickaxe penetrates ~0.45m - 0.65m per swing; dynamite blasts ~1.5m - 2.2m!
    const baseDepthIncrement = isDynamite ? 1.8 : isPickaxe ? 0.55 : 0.28;
    const baseRadiusIncrement = isDynamite ? 0.35 : isPickaxe ? 0.09 : 0.04;

    if (existing) {
      existing.strikes += 1;
      existing.isSurface = isSurface || existing.isSurface;
      // Auto-correct orientation if normal was previously inverted or misaligned
      if (normal.lengthSq() > 0.01 && existing.normal.dot(normal) < 0.2) {
        existing.normal.copy(normal);
        const defaultNormal = new THREE.Vector3(0, 0, 1);
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultNormal, normal);
        existing.group.quaternion.copy(quat);
      }
      // Max depth up to 25.0m (capped at 14.0m on surface so it does not puncture out the back of outcroppings)
      const maxDepth = isSurface ? 14.0 : 25.0;
      existing.depth = Math.min(maxDepth, existing.depth + baseDepthIncrement);
      // Radius expands to a walk-in adit passage (~1.4m - 1.85m radius = ~2.8m - 3.7m wide tunnel)
      existing.radius = Math.min(1.85, Math.max(1.15, existing.radius + baseRadiusIncrement));

      // Rebuild 3D visual geometry to reflect the newly deepened excavation
      this.rebuildHoleVisuals(existing);

      // Gold discovery calculations
      let goldAwarded = 0;
      let msg = '';
      const roll = Math.random();

      if (existing.depth >= 1.2 && !existing.hasExposedGoldVein && roll < 0.7) {
        existing.hasExposedGoldVein = true;
        goldAwarded = 2 + Math.floor(Math.random() * 4);
        existing.goldAwardedTotal += goldAwarded;
        this.rebuildHoleVisuals(existing);
        msg = `⛏️ BORED DEEPER INTO MOUNTAIN (-${existing.depth.toFixed(1)}m)! Struck high-grade Gold Quartz Vein in bedrock! (+${goldAwarded} oz Gold)`;
      } else if (existing.hasExposedGoldVein && roll < 0.5) {
        goldAwarded = 1 + Math.floor(Math.random() * 3);
        existing.goldAwardedTotal += goldAwarded;
        msg = `⛏️ Chiseled Mountain Adit Face (-${existing.depth.toFixed(1)}m): Extracted +${goldAwarded} oz Gold Quartz from cavity!`;
      } else if (existing.depth >= 6.0 && roll < 0.4) {
        // Deep mountain bonanza strike!
        goldAwarded = 3 + Math.floor(Math.random() * 5);
        existing.goldAwardedTotal += goldAwarded;
        msg = `✨ BONANZA VEIN BREACH at -${existing.depth.toFixed(1)}m deep inside mountain! Extracted +${goldAwarded} oz Native Electrum & Gold!`;
      } else if (existing.depth >= 3.0) {
        msg = `⛏️ Driven Mountain Drift Tunnel to -${existing.depth.toFixed(1)}m! Erected timber support sets inside adit (+2 Quarry Stone)`;
      } else {
        msg = `⛏️ Carved Mountain Adit to -${existing.depth.toFixed(1)}m deep! (+2 Building Stone)`;
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
      isSurface,
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
    // For shallow gouges (< 2m), it tapers organically; for walk-in adits (>= 2m), it forms a full navigable tunnel bore
    const isAdit = D >= 2.0;
    const rearR = isAdit ? Math.max(R * 0.88, R - 0.18) : R * 0.62;
    const heightSegs = Math.max(4, Math.min(24, Math.floor(D * 1.6)));

    const cavityGeo = new THREE.CylinderGeometry(
      R * 0.98,   // top/entrance radius (at z = 0)
      rearR,      // interior rear radius (at z = -D)
      D,          // length of excavated bore
      14,         // radial segments
      heightSegs, // height segments along the tunnel
      false       // open-ended
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
        // Flatten the bottom floor slightly so prospectors have stable footing
        if (y < -R * 0.55 && isAdit) {
          posAttr.setY(i, Math.max(-R * 0.92, y * 0.88));
        } else {
          const noise = (Math.sin(posAttr.getX(i) * 12 + z * 6) + Math.cos(posAttr.getY(i) * 14)) * 0.04 * R;
          posAttr.setX(i, posAttr.getX(i) + noise);
          posAttr.setY(i, posAttr.getY(i) + noise);
        }
      }
    }
    cavityGeo.computeVertexNormals();

    // Realistic interior rock material that catches lantern light with rocky texture
    const darkInteriorColor = new THREE.Color(hole.rockColor).multiplyScalar(0.68);
    const cavityMat = new THREE.MeshStandardMaterial({
      color: darkInteriorColor,
      roughness: 0.88,
      metalness: 0.05,
      side: THREE.BackSide, // Only interior tunnel walls render: exterior is culled so it never shows as a tube in open air
      flatShading: true,
    });

    const cavityMesh = new THREE.Mesh(cavityGeo, cavityMat);
    hole.group.add(cavityMesh);
    hole.cavityMesh = cavityMesh;

    // 2b. Solid Back Wall / Bedrock Face of the Excavation Cavity (Working Face)
    const backWallGeo = new THREE.CircleGeometry(rearR * 1.02, 14);
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
      side: THREE.FrontSide, // Front side faces toward entrance (+Z)
      flatShading: true,
    });
    const backWallMesh = new THREE.Mesh(backWallGeo, backWallMat);
    backWallMesh.position.set(0, 0, -D);
    hole.group.add(backWallMesh);

    // 3. Exposed Glittering Quartz & Gold Vein at the Deep Back Face
    if (hole.hasExposedGoldVein) {
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

    // 5. Timber Support Architecture (Lintels, Portals, and Square-Set Drift Frames)
    hole.timberSets = [];
    if (hole.depth >= 1.2) {
      const timberMat = new THREE.MeshStandardMaterial({
        color: 0x5c3d24,
        roughness: 0.88,
        metalness: 0.02,
      });

      // Entrance Portal Header Beam across upper arch
      const beamGeo = new THREE.BoxGeometry(R * 1.55, 0.14, 0.16);
      const beamMesh = new THREE.Mesh(beamGeo, timberMat);
      beamMesh.position.set(0, R * 0.72, 0.02);
      hole.group.add(beamMesh);

      // Entrance wooden side wedge cleats / vertical prop posts
      const wedgeGeo = new THREE.BoxGeometry(0.12, R * 1.1, 0.14);
      const postL = new THREE.Mesh(wedgeGeo, timberMat);
      postL.position.set(-R * 0.68, R * 0.15, 0.02);
      hole.group.add(postL);

      const postR = new THREE.Mesh(wedgeGeo, timberMat);
      postR.position.set(R * 0.68, R * 0.15, 0.02);
      hole.group.add(postR);
      hole.timberLintel = beamMesh;

      // 5b. Internal Drift Timber Sets (every ~2.5m along the tunnel depth)
      if (hole.depth >= 2.8) {
        const numSets = Math.floor((hole.depth - 0.8) / 2.5);
        for (let s = 1; s <= numSets; s++) {
          const setDist = s * 2.5;
          if (setDist > hole.depth - 0.6) break;

          const setGroup = new THREE.Group();
          setGroup.position.set(0, 0, -setDist);

          // Cap log
          const capLog = new THREE.Mesh(new THREE.BoxGeometry(R * 1.45, 0.13, 0.14), timberMat);
          capLog.position.set(0, R * 0.68, 0);
          setGroup.add(capLog);

          // Left leg post
          const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, R * 1.35, 0.13), timberMat);
          legL.position.set(-R * 0.64, 0, 0);
          legL.rotation.z = -0.06;
          setGroup.add(legL);

          // Right leg post
          const legR = new THREE.Mesh(new THREE.BoxGeometry(0.12, R * 1.35, 0.13), timberMat);
          legR.position.set(R * 0.64, 0, 0);
          legR.rotation.z = 0.06;
          setGroup.add(legR);

          // Spreader sill at bottom
          const sill = new THREE.Mesh(new THREE.BoxGeometry(R * 1.35, 0.08, 0.14), timberMat);
          sill.position.set(0, -R * 0.72, 0);
          setGroup.add(sill);

          hole.group.add(setGroup);
          hole.timberSets.push(setGroup);
        }
      }
    }

    // 6. Portal & Drift Adit Illumination (Entrance Lantern & Interior Corridor Lights)
    if (hole.depth >= 1.2) {
      // Entrance arch lantern: warms up the portal mouth and illuminates the entrance area
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

      // Deep adit corridor lighting (spaced every 3.5m down the drift and at the working face)
      if (hole.depth >= 2.5) {
        const lightSteps = Math.max(1, Math.floor(hole.depth / 3.5));
        for (let l = 1; l <= lightSteps; l++) {
          const lz = -Math.min(hole.depth - 0.7, l * 3.5);
          const corridorLight = new THREE.PointLight(0xffaa44, 1.6, 9.0);
          corridorLight.position.set(0, R * 0.35, lz);
          hole.group.add(corridorLight);

          // Hanging miner's lantern fixture
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
