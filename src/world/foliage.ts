import * as THREE from 'three';
import { getTerrainHeight } from './terrain';
import { DebrisType } from '../types';

export interface GoldDeposit {
  id: string;
  position: THREE.Vector3;
  mined: boolean;
  ounces: number;
  mesh: THREE.Group;
}

export interface StrikeFoliageResult {
  hit: boolean;
  type?: 'boulder' | 'outcropping' | 'gold_deposit' | 'saguaro' | 'barrel' | 'prickly' | 'cholla' | 'scrub';
  hitPoint?: THREE.Vector3;
  debrisType?: DebrisType;
  goldAwarded?: number;
  blocksDug?: number;
  hydrationAwarded?: number;
  message?: string;
  depositId?: string;
}

export interface ExplodeFoliageResult {
  goldBlasted: number;
  rocksBlasted: number;
  hydrationBlasted: number;
  destroyedPoints: Array<{ pos: THREE.Vector3; type: DebrisType }>;
}

export class DesertFoliageManager {
  public goldDeposits: GoldDeposit[] = [];
  public interactiveMeshes: THREE.Object3D[] = [];
  public saguaroGroup: THREE.Group = new THREE.Group();
  public barrelMesh!: THREE.InstancedMesh;
  public boulderMesh!: THREE.InstancedMesh;
  public scrubMesh!: THREE.InstancedMesh;
  public grassMesh!: THREE.InstancedMesh;
  public pricklyMesh!: THREE.InstancedMesh;
  public chollaMesh!: THREE.InstancedMesh;
  public outcroppingMesh!: THREE.InstancedMesh;

  private scene: THREE.Scene;
  private readonly zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.init();
  }

  private init() {
    const dummy = new THREE.Object3D();

    // ==========================================
    // 1. Saguaro Cacti Generation
    // ==========================================
    const saguaroCount = 450;
    const saguaroMat = new THREE.MeshStandardMaterial({
      color: 0x2e5a27,
      roughness: 0.85,
      metalness: 0.05,
      bumpScale: 0.05,
    });

    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 6, 8);
    const armVerticalGeo = new THREE.CylinderGeometry(0.25, 0.28, 2.5, 6);
    const armHorizontalGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.4, 6);
    armHorizontalGeo.rotateZ(Math.PI / 2);

    for (let i = 0; i < saguaroCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 280;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = getTerrainHeight(x, z);

      // Skip steep high summits or right on top of trailhead
      if (y > 45 || Math.hypot(x - (-120), z - (-120)) < 15) continue;

      const scale = 0.7 + Math.random() * 0.8;
      const singleCactus = new THREE.Group();
      singleCactus.position.set(x, y + 3 * scale - 0.2, z);
      singleCactus.scale.set(scale, scale, scale);

      const trunk = new THREE.Mesh(trunkGeo, saguaroMat);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      singleCactus.add(trunk);

      const hasLeftArm = Math.random() > 0.3;
      const hasRightArm = Math.random() > 0.4;

      if (hasLeftArm) {
        const armH = new THREE.Mesh(armHorizontalGeo, saguaroMat);
        armH.position.set(-0.9, 0.6, 0);
        armH.castShadow = true;
        singleCactus.add(armH);

        const armV = new THREE.Mesh(armVerticalGeo, saguaroMat);
        armV.position.set(-1.5, 1.8, 0);
        armV.castShadow = true;
        singleCactus.add(armV);
      }

      if (hasRightArm) {
        const armH = new THREE.Mesh(armHorizontalGeo, saguaroMat);
        armH.position.set(0.9, 1.2, 0);
        armH.castShadow = true;
        singleCactus.add(armH);

        const armV = new THREE.Mesh(armVerticalGeo, saguaroMat);
        armV.position.set(1.5, 2.3, 0);
        armV.castShadow = true;
        singleCactus.add(armV);
      }

      singleCactus.rotation.y = Math.random() * Math.PI * 2;
      this.saguaroGroup.add(singleCactus);
    }
    this.scene.add(this.saguaroGroup);

    // ==========================================
    // 2. Barrel Cacti & Prickly Pears (Instanced)
    // ==========================================
    const barrelCount = 280;
    const barrelGeo = new THREE.SphereGeometry(0.55, 6, 6);
    barrelGeo.scale(1, 1.3, 1);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x486b38,
      roughness: 0.9,
    });
    this.barrelMesh = new THREE.InstancedMesh(barrelGeo, barrelMat, barrelCount);
    this.barrelMesh.castShadow = true;

    let bIdx = 0;
    for (let i = 0; i < barrelCount; i++) {
      const rx = (Math.random() - 0.5) * 360;
      const rz = (Math.random() - 0.5) * 360;
      const ry = getTerrainHeight(rx, rz);
      if (ry > 50) continue;

      const bScale = 0.5 + Math.random() * 0.7;
      dummy.position.set(rx, ry + 0.3 * bScale, rz);
      dummy.scale.set(bScale, bScale, bScale);
      dummy.rotation.set(Math.random() * 0.2, Math.random() * Math.PI, Math.random() * 0.2);
      dummy.updateMatrix();
      this.barrelMesh.setMatrixAt(bIdx++, dummy.matrix);
    }
    this.barrelMesh.count = bIdx;
    this.barrelMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.barrelMesh);

    // ==========================================
    // 3. Desert Boulders & Red Rock Scree (Instanced)
    // ==========================================
    const boulderCount = 400;
    const boulderGeo = new THREE.DodecahedronGeometry(1.2, 1);
    const boulderMat = new THREE.MeshStandardMaterial({
      color: 0x9b4a2e,
      roughness: 0.95,
    });
    this.boulderMesh = new THREE.InstancedMesh(boulderGeo, boulderMat, boulderCount);
    this.boulderMesh.castShadow = true;
    this.boulderMesh.receiveShadow = true;

    let rIdx = 0;
    for (let i = 0; i < boulderCount; i++) {
      const rx = (Math.random() - 0.5) * 380;
      const rz = (Math.random() - 0.5) * 380;
      const ry = getTerrainHeight(rx, rz);

      const s = 0.6 + Math.random() * 2.2;
      dummy.position.set(rx, ry + s * 0.3, rz);
      dummy.scale.set(s * (0.8 + Math.random() * 0.5), s, s * (0.8 + Math.random() * 0.5));
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.updateMatrix();
      this.boulderMesh.setMatrixAt(rIdx++, dummy.matrix);
    }
    this.boulderMesh.count = rIdx;
    this.boulderMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.boulderMesh);

    // ==========================================
    // 4. Desert Scrub & Creosote Bushes
    // ==========================================
    const scrubCount = 350;
    const scrubGeo = new THREE.IcosahedronGeometry(0.8, 1);
    const scrubMat = new THREE.MeshStandardMaterial({
      color: 0x6e7845,
      roughness: 0.9,
    });
    this.scrubMesh = new THREE.InstancedMesh(scrubGeo, scrubMat, scrubCount);
    let sIdx = 0;
    for (let i = 0; i < scrubCount; i++) {
      const rx = (Math.random() - 0.5) * 380;
      const rz = (Math.random() - 0.5) * 380;
      const ry = getTerrainHeight(rx, rz);

      const s = 0.5 + Math.random() * 0.8;
      dummy.position.set(rx, ry + s * 0.4, rz);
      dummy.scale.set(s * 1.3, s * 0.8, s * 1.3);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      this.scrubMesh.setMatrixAt(sIdx++, dummy.matrix);
    }
    this.scrubMesh.count = sIdx;
    this.scrubMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.scrubMesh);

    // ==========================================
    // 4B. Realistic Desert Bunchgrass & Needlegrass
    // ==========================================
    const grassCount = 650;
    const grassBladeGeo = new THREE.ConeGeometry(0.35, 1.1, 4);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0xb59e5f,
      roughness: 0.95,
    });
    this.grassMesh = new THREE.InstancedMesh(grassBladeGeo, grassMat, grassCount);
    let gIdx = 0;
    for (let i = 0; i < grassCount; i++) {
      const gx = (Math.random() - 0.5) * 360;
      const gz = (Math.random() - 0.5) * 360;
      const gy = getTerrainHeight(gx, gz);
      if (gy > 42) continue;

      const scale = 0.6 + Math.random() * 0.7;
      dummy.position.set(gx, gy + 0.45 * scale, gz);
      dummy.scale.set(scale * 1.4, scale, scale * 1.4);
      dummy.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * Math.PI, (Math.random() - 0.5) * 0.2);
      dummy.updateMatrix();
      this.grassMesh.setMatrixAt(gIdx++, dummy.matrix);
    }
    this.grassMesh.count = gIdx;
    this.grassMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.grassMesh);

    // ==========================================
    // 4C. Prickly Pear Cacti Clusters (Opuntia)
    // ==========================================
    const pricklyPearCount = 180;
    const padGeo = new THREE.BoxGeometry(0.5, 0.6, 0.08);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x3d6e38,
      roughness: 0.8,
    });
    this.pricklyMesh = new THREE.InstancedMesh(padGeo, padMat, pricklyPearCount * 3);
    let ppIdx = 0;
    for (let i = 0; i < pricklyPearCount; i++) {
      const px = (Math.random() - 0.5) * 340;
      const pz = (Math.random() - 0.5) * 340;
      const py = getTerrainHeight(px, pz);
      if (py > 38) continue;

      const clusterRot = Math.random() * Math.PI * 2;
      dummy.position.set(px, py + 0.35, pz);
      dummy.scale.set(0.8, 0.9, 0.8);
      dummy.rotation.set(0.1, clusterRot, 0.15);
      dummy.updateMatrix();
      this.pricklyMesh.setMatrixAt(ppIdx++, dummy.matrix);

      dummy.position.set(px - 0.25, py + 0.75, pz);
      dummy.scale.set(0.7, 0.75, 0.7);
      dummy.rotation.set(0.2, clusterRot + 0.3, -0.3);
      dummy.updateMatrix();
      this.pricklyMesh.setMatrixAt(ppIdx++, dummy.matrix);

      dummy.position.set(px + 0.28, py + 0.7, pz);
      dummy.scale.set(0.65, 0.7, 0.65);
      dummy.rotation.set(-0.1, clusterRot - 0.2, 0.35);
      dummy.updateMatrix();
      this.pricklyMesh.setMatrixAt(ppIdx++, dummy.matrix);
    }
    this.pricklyMesh.count = ppIdx;
    this.pricklyMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.pricklyMesh);

    // ==========================================
    // 4D. Jumping Cholla Cacti (Cylindropuntia)
    // ==========================================
    const chollaCount = 120;
    const chollaGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.65, 6);
    const chollaMat = new THREE.MeshStandardMaterial({
      color: 0x98a36c,
      roughness: 0.9,
    });
    this.chollaMesh = new THREE.InstancedMesh(chollaGeo, chollaMat, chollaCount * 2);
    let cIdx = 0;
    for (let i = 0; i < chollaCount; i++) {
      const cx = (Math.random() - 0.5) * 320;
      const cz = (Math.random() - 0.5) * 320;
      const cy = getTerrainHeight(cx, cz);
      if (cy > 35) continue;

      dummy.position.set(cx, cy + 0.45, cz);
      dummy.scale.set(1, 1.4, 1);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      this.chollaMesh.setMatrixAt(cIdx++, dummy.matrix);

      dummy.position.set(cx + 0.15, cy + 0.95, cz + 0.1);
      dummy.scale.set(0.9, 0.9, 0.9);
      dummy.rotation.set(0.4, Math.random() * Math.PI, 0.3);
      dummy.updateMatrix();
      this.chollaMesh.setMatrixAt(cIdx++, dummy.matrix);
    }
    this.chollaMesh.count = cIdx;
    this.chollaMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.chollaMesh);

    // ==========================================
    // 4E. Monumental Sandstone Outcroppings & Hoodoos
    // ==========================================
    const outcroppingCount = 45;
    const hoodooGeo = new THREE.CylinderGeometry(2.2, 3.8, 12, 7);
    const outcroppingMat = new THREE.MeshStandardMaterial({
      color: 0xaa5832,
      roughness: 0.9,
      metalness: 0.05,
    });
    this.outcroppingMesh = new THREE.InstancedMesh(hoodooGeo, outcroppingMat, outcroppingCount);
    let ocIdx = 0;
    for (let i = 0; i < outcroppingCount; i++) {
      const angle = (i / outcroppingCount) * Math.PI * 2 + Math.random() * 0.3;
      const r = 50 + Math.random() * 120;
      const ox = Math.cos(angle) * r;
      const oz = Math.sin(angle) * r;
      const oy = getTerrainHeight(ox, oz);

      const s = 0.8 + Math.random() * 1.4;
      dummy.position.set(ox, oy + 5 * s, oz);
      dummy.scale.set(s * (0.8 + Math.random() * 0.4), s, s * (0.8 + Math.random() * 0.4));
      dummy.rotation.set((Math.random() - 0.5) * 0.15, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.15);
      dummy.updateMatrix();
      this.outcroppingMesh.setMatrixAt(ocIdx++, dummy.matrix);
    }
    this.outcroppingMesh.castShadow = true;
    this.outcroppingMesh.receiveShadow = true;
    this.outcroppingMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.outcroppingMesh);

    // ==========================================
    // 5. Rich Gold Quartz Deposits for Mining
    // ==========================================
    const goldLocations = [
      { x: -50, z: -40, ounces: 8, name: 'Peralta Arroyo Nugget' },
      { x: 10, z: -20, ounces: 14, name: 'Needle Pass Quartz Pocket' },
      { x: 110, z: 20, ounces: 22, name: 'East Gully Vein' },
      { x: 145, z: 95, ounces: 35, name: 'Mine Approach Bonanza' },
    ];

    goldLocations.forEach((loc, idx) => {
      const gy = getTerrainHeight(loc.x, loc.z);
      const goldGroup = new THREE.Group();
      goldGroup.position.set(loc.x, gy + 0.4, loc.z);

      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.7, 1),
        new THREE.MeshStandardMaterial({ color: 0xd8d4cb, roughness: 0.7 })
      );
      goldGroup.add(rock);

      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x443300,
        emissiveIntensity: 0.3,
      });
      for (let k = 0; k < 4; k++) {
        const nugget = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), goldMat);
        nugget.position.set((Math.random() - 0.5) * 0.6, 0.2 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6);
        goldGroup.add(nugget);
      }

      goldGroup.name = `gold_${idx}`;
      this.scene.add(goldGroup);
      this.interactiveMeshes.push(goldGroup);

      this.goldDeposits.push({
        id: `gold_${idx}`,
        position: new THREE.Vector3(loc.x, gy + 0.5, loc.z),
        mined: false,
        ounces: loc.ounces,
        mesh: goldGroup,
      });
    });
  }

  /**
   * Strike foliage, boulders, cacti, or quartz deposits with pickaxe, shovel, or rifle
   */
  public strikeFoliageOrRock(raycaster: THREE.Raycaster, maxDist: number = 6.5): StrikeFoliageResult {
    // 1. Check Gold Quartz Deposits
    const unminedDeposits = this.goldDeposits.filter((d) => !d.mined && d.mesh.visible);
    for (const gd of unminedDeposits) {
      const hits = raycaster.intersectObject(gd.mesh, true);
      if (hits.length > 0 && hits[0].distance <= maxDist) {
        gd.mined = true;
        gd.mesh.scale.set(0, 0, 0);
        gd.mesh.visible = false;
        return {
          hit: true,
          type: 'gold_deposit',
          hitPoint: hits[0].point.clone(),
          debrisType: 'quartz_gold',
          goldAwarded: gd.ounces,
          depositId: gd.id,
          message: `🌟 Shattered Gold Quartz Vein! (+${gd.ounces} oz High-Grade Gold)`,
        };
      }
    }

    // 2. Check Desert Boulders
    if (this.boulderMesh) {
      const boulderHits = raycaster.intersectObject(this.boulderMesh, false);
      if (boulderHits.length > 0 && boulderHits[0].distance <= maxDist && boulderHits[0].instanceId !== undefined) {
        const id = boulderHits[0].instanceId;
        const matrix = new THREE.Matrix4();
        this.boulderMesh.getMatrixAt(id, matrix);
        const scale = new THREE.Vector3();
        scale.setFromMatrixScale(matrix);

        if (scale.x > 0.05) {
          this.boulderMesh.setMatrixAt(id, this.zeroMatrix);
          this.boulderMesh.instanceMatrix.needsUpdate = true;

          const goldRoll = Math.random() < 0.35 ? 1 : 0;
          return {
            hit: true,
            type: 'boulder',
            hitPoint: boulderHits[0].point.clone(),
            debrisType: 'granite',
            blocksDug: 2,
            goldAwarded: goldRoll,
            message:
              goldRoll > 0
                ? '💥 Shattered Desert Boulder! (+2 Quarry Rocks, +1 oz Placer Gold)'
                : '💥 Shattered Desert Boulder! (+2 Quarry Rocks for Building)',
          };
        }
      }
    }

    // 3. Check Monumental Sandstone Outcroppings / Hoodoos
    if (this.outcroppingMesh) {
      const ocHits = raycaster.intersectObject(this.outcroppingMesh, false);
      if (ocHits.length > 0 && ocHits[0].distance <= maxDist && ocHits[0].instanceId !== undefined) {
        const id = ocHits[0].instanceId;
        const matrix = new THREE.Matrix4();
        this.outcroppingMesh.getMatrixAt(id, matrix);
        const scale = new THREE.Vector3();
        scale.setFromMatrixScale(matrix);

        if (scale.x > 0.05) {
          this.outcroppingMesh.setMatrixAt(id, this.zeroMatrix);
          this.outcroppingMesh.instanceMatrix.needsUpdate = true;
          return {
            hit: true,
            type: 'outcropping',
            hitPoint: ocHits[0].point.clone(),
            debrisType: 'sandstone',
            blocksDug: 3,
            goldAwarded: Math.random() < 0.35 ? 1 : 0,
            message: '⛏️ Excavated Sandstone Outcropping! (+3 Building Stones)',
          };
        }
      }
    }

    // 4. Check Saguaro Cacti
    if (this.saguaroGroup) {
      const sagHits = raycaster.intersectObjects(this.saguaroGroup.children, true);
      if (sagHits.length > 0 && sagHits[0].distance <= maxDist) {
        let topObj: THREE.Object3D | null = sagHits[0].object;
        while (topObj && topObj.parent !== this.saguaroGroup) {
          topObj = topObj.parent;
        }
        if (topObj && topObj.scale.x > 0.05) {
          topObj.scale.set(0, 0, 0);
          topObj.visible = false;
          return {
            hit: true,
            type: 'saguaro',
            hitPoint: sagHits[0].point.clone(),
            debrisType: 'cactus',
            hydrationAwarded: 15,
            message: '🌵 Chopped Saguaro Cactus: Extracted emergency desert water! (+15% Hydration)',
          };
        }
      }
    }

    // 5. Check Barrel Cacti
    if (this.barrelMesh) {
      const barrelHits = raycaster.intersectObject(this.barrelMesh, false);
      if (barrelHits.length > 0 && barrelHits[0].distance <= maxDist && barrelHits[0].instanceId !== undefined) {
        const id = barrelHits[0].instanceId;
        const matrix = new THREE.Matrix4();
        this.barrelMesh.getMatrixAt(id, matrix);
        const scale = new THREE.Vector3();
        scale.setFromMatrixScale(matrix);

        if (scale.x > 0.05) {
          this.barrelMesh.setMatrixAt(id, this.zeroMatrix);
          this.barrelMesh.instanceMatrix.needsUpdate = true;
          return {
            hit: true,
            type: 'barrel',
            hitPoint: barrelHits[0].point.clone(),
            debrisType: 'cactus',
            hydrationAwarded: 10,
            message: '🌵 Sliced Barrel Cactus: Tapped water reservoir! (+10% Hydration)',
          };
        }
      }
    }

    // 6. Check Prickly Pear Cacti
    if (this.pricklyMesh) {
      const pricklyHits = raycaster.intersectObject(this.pricklyMesh, false);
      if (pricklyHits.length > 0 && pricklyHits[0].distance <= maxDist && pricklyHits[0].instanceId !== undefined) {
        const id = pricklyHits[0].instanceId;
        this.pricklyMesh.setMatrixAt(id, this.zeroMatrix);
        this.pricklyMesh.instanceMatrix.needsUpdate = true;
        return {
          hit: true,
          type: 'prickly',
          hitPoint: pricklyHits[0].point.clone(),
          debrisType: 'cactus',
          hydrationAwarded: 8,
          message: '🌵 Harvested Prickly Pear: Crisp desert moisture! (+8% Hydration)',
        };
      }
    }

    // 7. Check Jumping Cholla
    if (this.chollaMesh) {
      const chollaHits = raycaster.intersectObject(this.chollaMesh, false);
      if (chollaHits.length > 0 && chollaHits[0].distance <= maxDist && chollaHits[0].instanceId !== undefined) {
        const id = chollaHits[0].instanceId;
        this.chollaMesh.setMatrixAt(id, this.zeroMatrix);
        this.chollaMesh.instanceMatrix.needsUpdate = true;
        return {
          hit: true,
          type: 'cholla',
          hitPoint: chollaHits[0].point.clone(),
          debrisType: 'cactus',
          hydrationAwarded: 6,
          message: '🌵 Cleared Jumping Cholla: Disintegrated spiny cactus! (+6% Hydration)',
        };
      }
    }

    // 8. Check Creosote Scrub Bushes
    if (this.scrubMesh) {
      const scrubHits = raycaster.intersectObject(this.scrubMesh, false);
      if (scrubHits.length > 0 && scrubHits[0].distance <= maxDist && scrubHits[0].instanceId !== undefined) {
        const id = scrubHits[0].instanceId;
        this.scrubMesh.setMatrixAt(id, this.zeroMatrix);
        this.scrubMesh.instanceMatrix.needsUpdate = true;
        return {
          hit: true,
          type: 'scrub',
          hitPoint: scrubHits[0].point.clone(),
          debrisType: 'wood',
          blocksDug: 1,
          message: '🌿 Chopped Creosote Scrub for kindling (+1 Wood / Rock)',
        };
      }
    }

    return { hit: false };
  }

  /**
   * Blast destruction of foliage, cacti, boulders and quartz veins from dynamite detonations
   */
  public explodeFoliageAt(center: THREE.Vector3, radius: number = 4.8): ExplodeFoliageResult {
    let goldBlasted = 0;
    let rocksBlasted = 0;
    let hydrationBlasted = 0;
    const destroyedPoints: Array<{ pos: THREE.Vector3; type: DebrisType }> = [];

    // Gold deposits
    for (const gd of this.goldDeposits) {
      if (!gd.mined && gd.position.distanceTo(center) <= radius) {
        gd.mined = true;
        gd.mesh.scale.set(0, 0, 0);
        gd.mesh.visible = false;
        goldBlasted += gd.ounces;
        destroyedPoints.push({ pos: gd.position.clone(), type: 'quartz_gold' });
      }
    }

    // Boulders
    if (this.boulderMesh) {
      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const scale = new THREE.Vector3();
      for (let i = 0; i < this.boulderMesh.count; i++) {
        this.boulderMesh.getMatrixAt(i, matrix);
        scale.setFromMatrixScale(matrix);
        if (scale.x > 0.05) {
          pos.setFromMatrixPosition(matrix);
          if (pos.distanceTo(center) <= radius) {
            this.boulderMesh.setMatrixAt(i, this.zeroMatrix);
            this.boulderMesh.instanceMatrix.needsUpdate = true;
            rocksBlasted += 2;
            if (Math.random() < 0.35) goldBlasted += 1;
            destroyedPoints.push({ pos: pos.clone(), type: 'granite' });
          }
        }
      }
    }

    // Outcroppings
    if (this.outcroppingMesh) {
      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const scale = new THREE.Vector3();
      for (let i = 0; i < this.outcroppingMesh.count; i++) {
        this.outcroppingMesh.getMatrixAt(i, matrix);
        scale.setFromMatrixScale(matrix);
        if (scale.x > 0.05) {
          pos.setFromMatrixPosition(matrix);
          if (pos.distanceTo(center) <= radius * 1.3) {
            this.outcroppingMesh.setMatrixAt(i, this.zeroMatrix);
            this.outcroppingMesh.instanceMatrix.needsUpdate = true;
            rocksBlasted += 3;
            destroyedPoints.push({ pos: pos.clone(), type: 'sandstone' });
          }
        }
      }
    }

    // Saguaros
    if (this.saguaroGroup) {
      for (const c of this.saguaroGroup.children) {
        if (c.scale.x > 0.05 && c.position.distanceTo(center) <= radius) {
          c.scale.set(0, 0, 0);
          c.visible = false;
          hydrationBlasted += 15;
          destroyedPoints.push({ pos: c.position.clone(), type: 'cactus' });
        }
      }
    }

    // Barrel cacti
    if (this.barrelMesh) {
      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const scale = new THREE.Vector3();
      for (let i = 0; i < this.barrelMesh.count; i++) {
        this.barrelMesh.getMatrixAt(i, matrix);
        scale.setFromMatrixScale(matrix);
        if (scale.x > 0.05) {
          pos.setFromMatrixPosition(matrix);
          if (pos.distanceTo(center) <= radius) {
            this.barrelMesh.setMatrixAt(i, this.zeroMatrix);
            this.barrelMesh.instanceMatrix.needsUpdate = true;
            hydrationBlasted += 10;
            destroyedPoints.push({ pos: pos.clone(), type: 'cactus' });
          }
        }
      }
    }

    // Prickly Pear
    if (this.pricklyMesh) {
      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const scale = new THREE.Vector3();
      for (let i = 0; i < this.pricklyMesh.count; i++) {
        this.pricklyMesh.getMatrixAt(i, matrix);
        scale.setFromMatrixScale(matrix);
        if (scale.x > 0.05) {
          pos.setFromMatrixPosition(matrix);
          if (pos.distanceTo(center) <= radius) {
            this.pricklyMesh.setMatrixAt(i, this.zeroMatrix);
            this.pricklyMesh.instanceMatrix.needsUpdate = true;
            destroyedPoints.push({ pos: pos.clone(), type: 'cactus' });
          }
        }
      }
    }

    return { goldBlasted, rocksBlasted, hydrationBlasted, destroyedPoints };
  }

  public dispose() {
    if (this.saguaroGroup) {
      this.scene.remove(this.saguaroGroup);
    }
    if (this.barrelMesh) {
      this.scene.remove(this.barrelMesh);
      this.barrelMesh.geometry.dispose();
    }
    if (this.boulderMesh) {
      this.scene.remove(this.boulderMesh);
      this.boulderMesh.geometry.dispose();
    }
    if (this.scrubMesh) {
      this.scene.remove(this.scrubMesh);
      this.scrubMesh.geometry.dispose();
    }
    if (this.grassMesh) {
      this.scene.remove(this.grassMesh);
      this.grassMesh.geometry.dispose();
    }
    if (this.pricklyMesh) {
      this.scene.remove(this.pricklyMesh);
      this.pricklyMesh.geometry.dispose();
    }
    if (this.chollaMesh) {
      this.scene.remove(this.chollaMesh);
      this.chollaMesh.geometry.dispose();
    }
    if (this.outcroppingMesh) {
      this.scene.remove(this.outcroppingMesh);
      this.outcroppingMesh.geometry.dispose();
    }
    for (const gd of this.goldDeposits) {
      this.scene.remove(gd.mesh);
    }
  }
}

/**
 * Creates instanced saguaro cacti, barrel cacti, boulders, and desert scrub.
 */
export function createDesertFoliage(scene: THREE.Scene): {
  goldDeposits: GoldDeposit[];
  interactiveMeshes: THREE.Object3D[];
  manager: DesertFoliageManager;
} {
  const manager = new DesertFoliageManager(scene);
  return {
    goldDeposits: manager.goldDeposits,
    interactiveMeshes: manager.interactiveMeshes,
    manager,
  };
}
