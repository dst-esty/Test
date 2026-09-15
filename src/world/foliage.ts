import * as THREE from 'three';
import { getTerrainHeight } from './terrain';

export interface GoldDeposit {
  id: string;
  position: THREE.Vector3;
  mined: boolean;
  ounces: number;
  mesh: THREE.Group;
}

/**
 * Creates instanced saguaro cacti, barrel cacti, boulders, and desert scrub.
 */
export function createDesertFoliage(scene: THREE.Scene): {
  goldDeposits: GoldDeposit[];
  interactiveMeshes: THREE.Object3D[];
} {
  const interactiveMeshes: THREE.Object3D[] = [];
  const goldDeposits: GoldDeposit[] = [];

  // ==========================================
  // 1. Saguaro Cacti Generation
  // ==========================================
  const saguaroCount = 350;
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

  const saguaroGroup = new THREE.Group();

  for (let i = 0; i < saguaroCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 15 + Math.random() * 180;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = getTerrainHeight(x, z);

    // Skip steep high summits or right on top of trailhead
    if (y > 45 || Math.hypot(x - (-120), z - (-120)) < 15) continue;

    const scale = 0.7 + Math.random() * 0.8;
    const singleCactus = new THREE.Group();
    singleCactus.position.set(x, y + (3 * scale) - 0.2, z);
    singleCactus.scale.set(scale, scale, scale);

    const trunk = new THREE.Mesh(trunkGeo, saguaroMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    singleCactus.add(trunk);

    // Add arms probabilistically
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
    saguaroGroup.add(singleCactus);
  }
  scene.add(saguaroGroup);

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
  const barrelMesh = new THREE.InstancedMesh(barrelGeo, barrelMat, barrelCount);
  barrelMesh.castShadow = true;

  const dummy = new THREE.Object3D();
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
    barrelMesh.setMatrixAt(bIdx++, dummy.matrix);
  }
  barrelMesh.instanceMatrix.needsUpdate = true;
  scene.add(barrelMesh);

  // ==========================================
  // 3. Desert Boulders & Red Rock Scree (Instanced)
  // ==========================================
  const boulderCount = 400;
  const boulderGeo = new THREE.DodecahedronGeometry(1.2, 1);
  const boulderMat = new THREE.MeshStandardMaterial({
    color: 0x9b4a2e,
    roughness: 0.95,
  });
  const boulderMesh = new THREE.InstancedMesh(boulderGeo, boulderMat, boulderCount);
  boulderMesh.castShadow = true;
  boulderMesh.receiveShadow = true;

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
    boulderMesh.setMatrixAt(rIdx++, dummy.matrix);
  }
  boulderMesh.instanceMatrix.needsUpdate = true;
  scene.add(boulderMesh);

  // ==========================================
  // 4. Desert Scrub & Creosote Bushes
  // ==========================================
  const scrubCount = 350;
  const scrubGeo = new THREE.IcosahedronGeometry(0.8, 1);
  const scrubMat = new THREE.MeshStandardMaterial({
    color: 0x6e7845,
    roughness: 0.9,
    wireframe: false,
  });
  const scrubMesh = new THREE.InstancedMesh(scrubGeo, scrubMat, scrubCount);
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
    scrubMesh.setMatrixAt(sIdx++, dummy.matrix);
  }
  scrubMesh.instanceMatrix.needsUpdate = true;
  scene.add(scrubMesh);

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

    // Host quartz rock
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.7, 1),
      new THREE.MeshStandardMaterial({ color: 0xd8d4cb, roughness: 0.7 })
    );
    goldGroup.add(rock);

    // Gold ribbon crystals
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
    scene.add(goldGroup);
    interactiveMeshes.push(goldGroup);

    goldDeposits.push({
      id: `gold_${idx}`,
      position: new THREE.Vector3(loc.x, gy + 0.5, loc.z),
      mined: false,
      ounces: loc.ounces,
      mesh: goldGroup,
    });
  });

  return { goldDeposits, interactiveMeshes };
}
