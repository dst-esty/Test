import * as THREE from 'three';
import { getTerrainHeight } from './terrain';

/**
 * Builds the summit features for Malapais Mountain (USGS Elev. 4,229 ft / 1,289 m).
 * Topographically authentic:
 * - USGS Triangulation Benchmark brass geodetic survey monument & stone pillar
 * - Summit basalt rock cairn with wooden sighting staff
 * - Vintage brass surveyor's transit on wooden tripod aimed south at Weaver's Needle
 * - Hexagonal dark basalt caprock ("malpaís") columnar crags along the summit rim
 */
export function buildMalapaisMountainSummit(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  const summitX = 95;
  const summitZ = -155;
  const summitY = getTerrainHeight(summitX, summitZ);

  group.position.set(summitX, summitY, summitZ);

  // Materials
  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x221e1c,
    roughness: 0.92,
    metalness: 0.1,
  });

  const stonePillarMat = new THREE.MeshStandardMaterial({
    color: 0x6e655c,
    roughness: 0.85,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.85,
    roughness: 0.25,
  });

  const woodTripodMat = new THREE.MeshStandardMaterial({
    color: 0x4a321e,
    roughness: 0.78,
  });

  // 1. USGS Triangulation Station Monument
  const monumentPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.55, 1.0, 10),
    stonePillarMat
  );
  monumentPillar.position.set(0, 0.5, 0);
  monumentPillar.castShadow = true;
  monumentPillar.receiveShadow = true;
  group.add(monumentPillar);

  // Stamped Brass Geodetic Benchmark Disk
  const benchmarkDisk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16),
    brassMat
  );
  benchmarkDisk.position.set(0, 1.02, 0);
  group.add(benchmarkDisk);

  // Crosshairs engraved into disk
  const crosshairH = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.008, 0.02), stonePillarMat);
  crosshairH.position.set(0, 1.041, 0);
  group.add(crosshairH);
  const crosshairV = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, 0.36), stonePillarMat);
  crosshairV.position.set(0, 1.041, 0);
  group.add(crosshairV);

  // 2. Historic Basalt Summit Cairn (piled rocks marking 4,229 ft)
  const cairnGroup = new THREE.Group();
  cairnGroup.position.set(2.8, 0, 1.5);

  const rockPositions = [
    { x: 0, y: 0.35, z: 0, r: 0.55 },
    { x: 0.4, y: 0.3, z: 0.3, r: 0.48 },
    { x: -0.35, y: 0.32, z: -0.2, r: 0.5 },
    { x: 0.1, y: 0.8, z: 0.1, r: 0.42 },
    { x: -0.2, y: 0.78, z: 0.25, r: 0.4 },
    { x: 0.25, y: 0.75, z: -0.15, r: 0.38 },
    { x: 0.0, y: 1.25, z: 0.05, r: 0.35 },
    { x: -0.1, y: 1.6, z: 0.0, r: 0.3 },
    { x: 0.05, y: 1.95, z: -0.05, r: 0.25 },
  ];

  rockPositions.forEach((rock) => {
    const rMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(rock.r, 1), basaltMat);
    rMesh.position.set(rock.x, rock.y, rock.z);
    rMesh.rotation.set(Math.random(), Math.random(), Math.random());
    rMesh.castShadow = true;
    cairnGroup.add(rMesh);
  });

  // Wooden Sighting Mast stuck in the cairn
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), woodTripodMat);
  mast.position.set(0, 1.8, 0);
  cairnGroup.add(mast);

  // Red weathered surveyor's flag ribbon
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), flagMat);
  flag.position.set(0.2, 2.8, 0);
  flag.rotation.y = 0.3;
  cairnGroup.add(flag);

  group.add(cairnGroup);

  // 3. Vintage Surveyor's Transit on Wooden Tripod
  const transitGroup = new THREE.Group();
  transitGroup.position.set(-2.2, 0, 1.8);

  // 3 Tripod Legs
  for (let angle = 0; angle < Math.PI * 2; angle += (Math.PI * 2) / 3) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 1.45, 6), woodTripodMat);
    leg.position.set(Math.cos(angle) * 0.35, 0.68, Math.sin(angle) * 0.35);
    leg.rotation.z = Math.cos(angle) * -0.26;
    leg.rotation.x = Math.sin(angle) * 0.26;
    leg.castShadow = true;
    transitGroup.add(leg);
  }

  // Brass Transit Mount & Compass Rose Plate
  const transitHead = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.15, 12), brassMat);
  transitHead.position.set(0, 1.4, 0);
  transitGroup.add(transitHead);

  // Optical Telescope Aimed South toward Weaver's Needle
  const telescope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.65, 10), brassMat);
  telescope.position.set(0, 1.55, 0);
  telescope.rotation.x = Math.PI / 2 + 0.12; // tilted slightly downward toward Weaver's Needle
  telescope.castShadow = true;
  transitGroup.add(telescope);

  group.add(transitGroup);

  // 4. Hexagonal Basalt Column Clusters (Columnar Jointing along plateau edge)
  const columnOffsets = [
    { x: -5.5, z: -4.0, h: 2.8 },
    { x: -6.2, z: -3.2, h: 3.4 },
    { x: -5.0, z: -5.0, h: 2.2 },
    { x: 4.8, z: -5.5, h: 3.1 },
    { x: 5.6, z: -4.8, h: 2.6 },
    { x: 6.2, z: -6.0, h: 3.6 },
    { x: -7.0, z: 2.0, h: 2.5 },
    { x: 7.5, z: 1.5, h: 2.9 },
  ];

  columnOffsets.forEach((col) => {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.55, col.h, 6),
      basaltMat
    );
    pillar.position.set(col.x, col.h / 2 - 0.4, col.z);
    pillar.rotation.y = Math.random() * Math.PI;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
  });

  scene.add(group);
  return group;
}

/**
 * Builds Pistol Canyon Gorge features.
 * Topographically authentic:
 * - "Roy Bradford's Lost 1870s Colt Army Pistol" on sun-bleached granite boulder
 * - Brass cartridge casings and prospector's expedition field diary
 * - Bedrock Tinaja plunge-pool with clear spring water (refill point)
 * - Carved cedar trail guidepost
 */
export function buildPistolCanyonGorge(
  scene: THREE.Scene,
  waterRefillPoints: THREE.Vector3[]
): THREE.Group {
  const group = new THREE.Group();
  const canyonX = -46;
  const canyonZ = -130;
  const canyonY = getTerrainHeight(canyonX, canyonZ);

  group.position.set(canyonX, canyonY, canyonZ);

  // Materials
  const boulderMat = new THREE.MeshStandardMaterial({
    color: 0x948270,
    roughness: 0.88,
  });

  const gunMetalMat = new THREE.MeshStandardMaterial({
    color: 0x22262a,
    metalness: 0.9,
    roughness: 0.28,
  });

  const gunWoodMat = new THREE.MeshStandardMaterial({
    color: 0x4a2414,
    roughness: 0.72,
  });

  const brassCartridgeMat = new THREE.MeshStandardMaterial({
    color: 0xc49a45,
    metalness: 0.88,
    roughness: 0.25,
  });

  const journalLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x5a341a,
    roughness: 0.85,
  });

  const paperPageMat = new THREE.MeshStandardMaterial({
    color: 0xeae0c8,
    roughness: 0.95,
  });

  const cedarSignMat = new THREE.MeshStandardMaterial({
    color: 0x5c4028,
    roughness: 0.9,
  });

  // 1. Large Sun-Bleached Granite Table Boulder
  const tableBoulder = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.4, 1),
    boulderMat
  );
  tableBoulder.position.set(0, 0.45, 0);
  tableBoulder.scale.set(1.5, 0.7, 1.2);
  tableBoulder.castShadow = true;
  tableBoulder.receiveShadow = true;
  group.add(tableBoulder);

  // 2. Roy Bradford's Lost 1870s Colt Single Action Army Revolver
  const pistolGroup = new THREE.Group();
  pistolGroup.position.set(0.1, 0.96, -0.05);
  pistolGroup.rotation.y = -0.45;

  // Revolver Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.28), gunMetalMat);
  pistolGroup.add(frame);

  // Fluted Cylinder
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.16, 6), gunMetalMat);
  cylinder.rotation.x = Math.PI / 2;
  cylinder.position.set(0, 0.02, 0.02);
  pistolGroup.add(cylinder);

  // 7.5-inch Cavalry Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.42, 8), gunMetalMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, 0.32);
  barrel.castShadow = true;
  pistolGroup.add(barrel);

  // Under-barrel Ejector Rod Tube
  const ejectorRod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 6), gunMetalMat);
  ejectorRod.rotation.x = Math.PI / 2;
  ejectorRod.position.set(0.028, 0.015, 0.3);
  pistolGroup.add(ejectorRod);

  // Hammer & Trigger Guard
  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.08, 0.04), gunMetalMat);
  hammer.position.set(0, 0.08, -0.12);
  hammer.rotation.x = -0.3;
  pistolGroup.add(hammer);

  const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 6, 12, Math.PI), gunMetalMat);
  triggerGuard.position.set(0, -0.06, 0.04);
  triggerGuard.rotation.y = Math.PI / 2;
  pistolGroup.add(triggerGuard);

  // Walnut Wood Grip Handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.11), gunWoodMat);
  handle.position.set(0, -0.12, -0.14);
  handle.rotation.x = 0.45;
  pistolGroup.add(handle);

  group.add(pistolGroup);

  // 3. Scattered .45 Colt Brass Cartridge Casings
  const cartridgePositions = [
    { x: -0.35, z: 0.15, rot: 0.6 },
    { x: -0.28, z: 0.22, rot: 1.8 },
    { x: 0.42, z: 0.1, rot: -0.9 },
  ];

  cartridgePositions.forEach((cp) => {
    const casing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.075, 8),
      brassCartridgeMat
    );
    casing.position.set(cp.x, 0.94, cp.z);
    casing.rotation.z = Math.PI / 2;
    casing.rotation.y = cp.rot;
    group.add(casing);
  });

  // 4. Weathered Prospector's Field Journal (Roy Bradford, 1920)
  const journalGroup = new THREE.Group();
  journalGroup.position.set(-0.32, 0.94, -0.2);
  journalGroup.rotation.y = 0.25;

  const journalCover = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.42), journalLeatherMat);
  journalGroup.add(journalCover);

  const journalPages = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.032, 0.4), paperPageMat);
  journalPages.position.set(0, 0.008, 0);
  journalGroup.add(journalPages);

  group.add(journalGroup);

  // 5. Natural Bedrock Tinaja (Spring Plunge-Pool for Canteen Refills)
  const tinajaGroup = new THREE.Group();
  tinajaGroup.position.set(-3.5, -0.1, 2.5);

  // Basin Ring of polished river stones
  const basinMat = new THREE.MeshStandardMaterial({ color: 0x483a30, roughness: 0.85 });
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 1), basinMat);
    stone.position.set(Math.cos(a) * 2.2, 0.2, Math.sin(a) * 2.0);
    stone.scale.set(1.2, 0.5, 1.0);
    tinajaGroup.add(stone);
  }

  // Water Surface
  const waterGeo = new THREE.CircleGeometry(2.1, 16);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x228899,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.82,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = 0.18;
  tinajaGroup.add(waterMesh);

  group.add(tinajaGroup);

  // Add tinaja coordinates to water refill points
  waterRefillPoints.push(new THREE.Vector3(canyonX - 3.5, canyonY + 0.2, canyonZ + 2.5));

  // 6. Weathered Cedar Trail Post & Sign
  const signGroup = new THREE.Group();
  signGroup.position.set(2.8, 0, -2.2);

  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.2, 6), cedarSignMat);
  signPost.position.set(0, 1.1, 0);
  signPost.castShadow = true;
  signGroup.add(signPost);

  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.28, 0.05), cedarSignMat);
  signBoard.position.set(0, 1.85, 0);
  signBoard.rotation.y = 0.2;
  signBoard.castShadow = true;
  signGroup.add(signBoard);

  group.add(signGroup);

  scene.add(group);
  return group;
}
