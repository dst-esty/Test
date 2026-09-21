import * as THREE from 'three';
import { getTerrainHeight } from './terrain';

/**
 * Builds the summit & massif features for Malapais Mountain (USGS Elev. 4,229 ft / 1,289 m).
 * Topographically authentic Sonoran volcanic geology:
 * - Main South Peak (USGS Elev. 4,229 ft): Triangulation Benchmark, historic cairn, vintage surveyor transit & columnar rim crags
 * - North Peak (USGS Elev. 4,159 ft): Secondary summit cairn & northern rim columnar basalt palisades overlooking Boulder Canyon
 * - Ancillary Volcanic Humps: West Rim Hump (3,850 ft), Southwest Hump (3,920 ft), and Peak 3509 Foothill Hump
 * - West Side Canyon (Deep Basalt Chasm): Sheer vertical columnar basalt canyon walls, dry bedrock tinaja pour-off chute, and talus boulders
 */
export function buildMalapaisMountainSummit(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();

  // Materials
  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x221e1c,
    roughness: 0.92,
    metalness: 0.1,
  });

  const weatheredBasaltMat = new THREE.MeshStandardMaterial({
    color: 0x362c28,
    roughness: 0.88,
    metalness: 0.08,
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

  const talusMat = new THREE.MeshStandardMaterial({
    color: 0x2e2723,
    roughness: 0.95,
  });

  // =========================================================================
  // 1. MAIN SOUTH PEAK (USGS Elev. 4,229 ft / 1,289 m) at (95, -205)
  // =========================================================================
  const southPeakGroup = new THREE.Group();
  const southX = 95;
  const southZ = -205;
  const southY = getTerrainHeight(southX, southZ);
  southPeakGroup.position.set(southX, southY, southZ);

  // A. USGS Triangulation Station Monument
  const monumentPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.55, 1.0, 10),
    stonePillarMat
  );
  monumentPillar.position.set(0, 0.5, 0);
  monumentPillar.castShadow = true;
  monumentPillar.receiveShadow = true;
  southPeakGroup.add(monumentPillar);

  // Stamped Brass Geodetic Benchmark Disk
  const benchmarkDisk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16),
    brassMat
  );
  benchmarkDisk.position.set(0, 1.02, 0);
  southPeakGroup.add(benchmarkDisk);

  // Crosshairs engraved into disk
  const crosshairH = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.008, 0.02), stonePillarMat);
  crosshairH.position.set(0, 1.041, 0);
  southPeakGroup.add(crosshairH);
  const crosshairV = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, 0.36), stonePillarMat);
  crosshairV.position.set(0, 1.041, 0);
  southPeakGroup.add(crosshairV);

  // B. Historic Basalt Summit Cairn (marking 4,229 ft)
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

  // Wooden Sighting Mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), woodTripodMat);
  mast.position.set(0, 1.8, 0);
  cairnGroup.add(mast);

  // Red weathered surveyor's flag ribbon
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), flagMat);
  flag.position.set(0.2, 2.8, 0);
  flag.rotation.y = 0.3;
  cairnGroup.add(flag);
  southPeakGroup.add(cairnGroup);

  // C. Vintage Surveyor's Transit on Wooden Tripod Aimed South
  const transitGroup = new THREE.Group();
  transitGroup.position.set(-2.2, 0, 1.8);

  for (let angle = 0; angle < Math.PI * 2; angle += (Math.PI * 2) / 3) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 1.45, 6), woodTripodMat);
    leg.position.set(Math.cos(angle) * 0.35, 0.68, Math.sin(angle) * 0.35);
    leg.rotation.z = Math.cos(angle) * -0.26;
    leg.rotation.x = Math.sin(angle) * 0.26;
    leg.castShadow = true;
    transitGroup.add(leg);
  }

  const transitHead = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.15, 12), brassMat);
  transitHead.position.set(0, 1.4, 0);
  transitGroup.add(transitHead);

  const telescope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.65, 10), brassMat);
  telescope.position.set(0, 1.55, 0);
  telescope.rotation.x = Math.PI / 2 + 0.12;
  telescope.castShadow = true;
  transitGroup.add(telescope);
  southPeakGroup.add(transitGroup);

  // D. Hexagonal Basalt Columns along South Peak rim
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
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, col.h, 6), basaltMat);
    pillar.position.set(col.x, col.h / 2 - 0.4, col.z);
    pillar.rotation.y = Math.random() * Math.PI;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    southPeakGroup.add(pillar);
  });

  group.add(southPeakGroup);

  // =========================================================================
  // 2. NORTH PEAK (USGS Elev. 4,159 ft / 1,268 m) at (96, -242)
  // =========================================================================
  const northPeakGroup = new THREE.Group();
  const northX = 96;
  const northZ = -242;
  const northY = getTerrainHeight(northX, northZ);
  northPeakGroup.position.set(northX, northY, northZ);

  // Secondary Summit Rock Cairn
  const northCairn = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const r = 0.5 - i * 0.05;
    const cMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), basaltMat);
    cMesh.position.set((Math.random() - 0.5) * 0.2, i * 0.32 + 0.2, (Math.random() - 0.5) * 0.2);
    cMesh.rotation.set(Math.random(), Math.random(), Math.random());
    cMesh.castShadow = true;
    northCairn.add(cMesh);
  }
  // Weathered wooden cedar marker post
  const northMarker = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.8, 6), woodTripodMat);
  northMarker.position.set(0, 1.4, 0);
  northMarker.castShadow = true;
  northCairn.add(northMarker);
  northPeakGroup.add(northCairn);

  // Northern Escarpment Columnar Crags overlooking Boulder Canyon
  const northCrags = [
    { x: -3.5, z: -5.0, h: 4.2 },
    { x: 0.0, z: -6.5, h: 4.8 },
    { x: 3.2, z: -5.2, h: 3.8 },
    { x: 5.5, z: -3.0, h: 3.4 },
    { x: -5.2, z: -2.8, h: 3.6 },
  ];
  northCrags.forEach((crag) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, crag.h, 6), weatheredBasaltMat);
    p.position.set(crag.x, crag.h / 2 - 0.5, crag.z);
    p.rotation.y = Math.random() * Math.PI;
    p.castShadow = true;
    p.receiveShadow = true;
    northPeakGroup.add(p);
  });

  group.add(northPeakGroup);

  // =========================================================================
  // 3. ANCILLARY VOLCANIC HUMPS (Subsidiary Volcanic Knolls & Ridges)
  // =========================================================================
  // A. West Rim Ancillary Hump (Elev. 3,850 ft) at (64, -188)
  const westHumpGroup = new THREE.Group();
  const westHX = 64;
  const westHZ = -188;
  const westHY = getTerrainHeight(westHX, westHZ);
  westHumpGroup.position.set(westHX, westHY, westHZ);

  // Volcanic basalt knoll spires & outcrop
  const westHumpPillars = [
    { x: 0, z: 0, h: 3.6, r: 0.8 },
    { x: -1.8, z: 1.2, h: 2.8, r: 0.6 },
    { x: 1.5, z: -1.0, h: 3.2, r: 0.65 },
    { x: -2.5, z: -1.5, h: 2.4, r: 0.55 },
  ];
  westHumpPillars.forEach((p) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.9, p.r, p.h, 6), basaltMat);
    m.position.set(p.x, p.h / 2 - 0.3, p.z);
    m.castShadow = true;
    m.receiveShadow = true;
    westHumpGroup.add(m);
  });
  // Trail cairn on West Rim Hump
  const westHumpCairn = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 6), weatheredBasaltMat);
  westHumpCairn.position.set(0.8, 0.45, 1.4);
  westHumpGroup.add(westHumpCairn);
  group.add(westHumpGroup);

  // B. Southwest Ancillary Hump (Elev. 3,920 ft) at (74, -228)
  const swHumpGroup = new THREE.Group();
  const swHX = 74;
  const swHZ = -228;
  const swHY = getTerrainHeight(swHX, swHZ);
  swHumpGroup.position.set(swHX, swHY, swHZ);

  const swPillars = [
    { x: 0, z: 0, h: 3.8, r: 0.85 },
    { x: 1.6, z: 1.4, h: 2.9, r: 0.6 },
    { x: -1.5, z: -1.2, h: 3.1, r: 0.65 },
  ];
  swPillars.forEach((p) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.88, p.r, p.h, 6), basaltMat);
    m.position.set(p.x, p.h / 2 - 0.3, p.z);
    m.castShadow = true;
    m.receiveShadow = true;
    swHumpGroup.add(m);
  });
  group.add(swHumpGroup);

  // C. Peak 3509 Foothill Hump (Elev. 3,509 ft) at (44, -182)
  const p3509Group = new THREE.Group();
  const p3509X = 44;
  const p3509Z = -182;
  const p3509Y = getTerrainHeight(p3509X, p3509Z);
  p3509Group.position.set(p3509X, p3509Y, p3509Z);

  const p3509Boulders = [
    { x: 0, y: 0.6, z: 0, r: 1.2 },
    { x: -1.2, y: 0.4, z: 0.8, r: 0.8 },
    { x: 1.0, y: 0.5, z: -0.7, r: 0.9 },
  ];
  p3509Boulders.forEach((b) => {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(b.r, 1), weatheredBasaltMat);
    m.position.set(b.x, b.y, b.z);
    m.rotation.set(Math.random(), Math.random(), Math.random());
    m.castShadow = true;
    p3509Group.add(m);
  });
  group.add(p3509Group);

  // =========================================================================
  // 4. MALAPAIS WEST SIDE CANYON (Deep Basalt Chasm & Dry Tinaja Chute)
  // Splits the western rockface between the ancillary humps from x: 82 to x: 26
  // =========================================================================
  const canyonGroup = new THREE.Group();

  // A. North Rim Palisades (Towering Columnar Basalt Cliff Walls)
  const northRimPillars = [
    { x: 78, z: -198, h: 5.5, r: 0.8 },
    { x: 72, z: -197, h: 6.2, r: 0.9 },
    { x: 65, z: -196, h: 6.8, r: 0.95 },
    { x: 58, z: -195, h: 6.0, r: 0.9 },
    { x: 50, z: -196, h: 5.4, r: 0.85 },
    { x: 42, z: -197, h: 4.8, r: 0.8 },
    { x: 35, z: -198, h: 4.0, r: 0.75 },
  ];
  northRimPillars.forEach((p) => {
    const y = getTerrainHeight(p.x, p.z);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.9, p.r, p.h, 6), basaltMat);
    col.position.set(p.x, y + p.h / 2 - 0.8, p.z);
    col.rotation.y = Math.random() * Math.PI;
    col.castShadow = true;
    col.receiveShadow = true;
    canyonGroup.add(col);
  });

  // B. South Rim Palisades (Guarding the southern cliff face)
  const southRimPillars = [
    { x: 80, z: -214, h: 5.2, r: 0.85 },
    { x: 74, z: -215, h: 6.0, r: 0.9 },
    { x: 67, z: -216, h: 6.5, r: 0.95 },
    { x: 60, z: -215, h: 6.2, r: 0.9 },
    { x: 52, z: -214, h: 5.6, r: 0.85 },
    { x: 44, z: -215, h: 5.0, r: 0.8 },
    { x: 36, z: -216, h: 4.2, r: 0.75 },
  ];
  southRimPillars.forEach((p) => {
    const y = getTerrainHeight(p.x, p.z);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.9, p.r, p.h, 6), basaltMat);
    col.position.set(p.x, y + p.h / 2 - 0.8, p.z);
    col.rotation.y = Math.random() * Math.PI;
    col.castShadow = true;
    col.receiveShadow = true;
    canyonGroup.add(col);
  });

  // C. Headwall Dry Tinaja Chute & Pour-Off (at x: 82, z: -206)
  // Slickrock water chute where flash flood waters plunge into the chasm
  const chuteX = 82;
  const chuteZ = -206;
  const chuteY = getTerrainHeight(chuteX, chuteZ);

  const pourOffGroup = new THREE.Group();
  pourOffGroup.position.set(chuteX, chuteY, chuteZ);

  // Bedrock amphitheater bowl
  const bowlMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(3.0, 1.8, 1.2, 12, 1, true),
    weatheredBasaltMat
  );
  bowlMesh.position.set(0, 0.4, 0);
  bowlMesh.castShadow = true;
  bowlMesh.receiveShadow = true;
  pourOffGroup.add(bowlMesh);

  // Scoured pothole tinaja rim rocks
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    const tr = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), basaltMat);
    tr.position.set(Math.cos(a) * 2.2, 0.4, Math.sin(a) * 2.2);
    tr.castShadow = true;
    pourOffGroup.add(tr);
  }
  canyonGroup.add(pourOffGroup);

  // D. Canyon Floor Talus & Scree Boulders (along the rugged wash bottom)
  const canyonFloorPoints = [
    { x: 74, z: -206, r: 1.1 },
    { x: 68, z: -205, r: 1.4 },
    { x: 62, z: -207, r: 1.2 },
    { x: 55, z: -206, r: 1.5 },
    { x: 48, z: -205, r: 1.3 },
    { x: 40, z: -207, r: 1.1 },
    { x: 32, z: -206, r: 0.95 },
  ];
  canyonFloorPoints.forEach((pt) => {
    const y = getTerrainHeight(pt.x, pt.z);
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(pt.r, 1), talusMat);
    boulder.position.set(pt.x, y + pt.r * 0.7, pt.z);
    boulder.rotation.set(Math.random(), Math.random(), Math.random());
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    canyonGroup.add(boulder);

    // Accompanying shattered basalt scree cluster
    for (let s = 0; s < 3; s++) {
      const scree = new THREE.Mesh(new THREE.DodecahedronGeometry(pt.r * 0.35, 0), basaltMat);
      scree.position.set(
        pt.x + (Math.random() - 0.5) * 2.5,
        y + pt.r * 0.25,
        pt.z + (Math.random() - 0.5) * 2.5
      );
      scree.rotation.set(Math.random(), Math.random(), Math.random());
      scree.castShadow = true;
      canyonGroup.add(scree);
    }
  });

  // E. West Rim Overlook Crag (Projecting basalt promontory at 62, -196)
  const overlookX = 62;
  const overlookZ = -196;
  const overlookY = getTerrainHeight(overlookX, overlookZ);
  const overlookCrag = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.4, 2.0), weatheredBasaltMat);
  overlookCrag.position.set(overlookX, overlookY + 0.6, overlookZ);
  overlookCrag.rotation.y = 0.2;
  overlookCrag.castShadow = true;
  canyonGroup.add(overlookCrag);

  group.add(canyonGroup);

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
