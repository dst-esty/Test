import * as THREE from 'three';
import { getTerrainHeight } from './terrain';
import { createFlutedCylinderGeometry } from './foliage';

/**
 * Builds the authentic real-world landmarks and historical sites from Jacob Emerick's
 * famous "Malapais Loop: Failed Return in Peters Canyon" expedition (June 2016).
 *
 * Real-world features modeled:
 * 1. Malapais North Scree & Rose Quartz Slope (135X, -228Z):
 *    - Translucent pink rose quartz crystalline veins and loose mineral specimens
 *    - The Lost Peralta Horseshoe resting on sun-baked rock along an ancient packpath
 *    - Suspicious triangular cliff cave with stacked prospector debris
 * 2. Peters Canyon Narrows & The Chasm Toehold Ledge (236X, -282Z):
 *    - Sheer vertical polished volcanic walls towering overhead
 *    - 15-foot high toehold ledge along the right cliff face above a deep water chasm
 *    - The authentic rustic "Two-Foot Wooden Ladder" wedged in the slickrock bypass
 * 3. The Pinch of Peter's Canyon & Deep Plunge Tinaja (238X, -288Z):
 *    - The dramatic sharp westward bend where Peters Canyon turns toward Tortilla Flat
 *    - Tall dry-fall / pour-off drop into an emerald plunge pool (canteen refill point)
 *    - Water-polished pale boulders in the wash
 * 4. Silhouetted Desert Bighorn Sheep Herd:
 *    - Four desert bighorn sheep perched along the high canyon rims watching travelers below
 *    - A curious bighorn ram standing on a rock shelf 20 feet above the waterfall pool
 * 5. Jacob Emerick's 2016 Emergency Bivouac Lean-To & SAR Extraction Site (220X, -305Z):
 *    - Weathered juniper and beargrass lean-to shelter built under a natural canyon alcove
 *    - Cool flat resting rock, stone campfire ring with embers, and dropped headlamp
 *    - Engraved backcountry expedition marker post detailing the 2016 Malapais Loop ordeal
 *      and 11:30 PM helicopter rescue by Search & Rescue
 */
export function buildPetersCanyonPinchAndBivouac(
  scene: THREE.Scene,
  waterRefillPoints: THREE.Vector3[]
): THREE.Group {
  const rootGroup = new THREE.Group();

  // -------------------------------------------------------------------------
  // SHARED MATERIALS
  // -------------------------------------------------------------------------
  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x24201d,
    roughness: 0.92,
    metalness: 0.1,
  });

  const polishedDaciteMat = new THREE.MeshStandardMaterial({
    color: 0x8a7b6d,
    roughness: 0.45,
    metalness: 0.05,
  });

  const paleRiverBoulderMat = new THREE.MeshStandardMaterial({
    color: 0xded2c4,
    roughness: 0.85,
  });

  const roseQuartzMat = new THREE.MeshStandardMaterial({
    color: 0xefa0b8,
    roughness: 0.28,
    metalness: 0.04,
  });

  const rustedIronMat = new THREE.MeshStandardMaterial({
    color: 0x4a362c,
    roughness: 0.82,
    metalness: 0.65,
  });

  const weatheredWoodMat = new THREE.MeshStandardMaterial({
    color: 0x544335,
    roughness: 0.88,
  });

  const tinajaEmeraldWaterMat = new THREE.MeshStandardMaterial({
    color: 0x1a7266,
    roughness: 0.12,
    metalness: 0.15,
  });

  const sheepFurMat = new THREE.MeshStandardMaterial({
    color: 0x766657,
    roughness: 0.9,
  });

  const sheepHornMat = new THREE.MeshStandardMaterial({
    color: 0xbf9b68,
    roughness: 0.5,
  });

  const brassPlaqueMat = new THREE.MeshStandardMaterial({
    color: 0xc89d44,
    roughness: 0.35,
    metalness: 0.85,
  });

  // =========================================================================
  // 1. MALAPAIS NORTH SCREE & ROSE QUARTZ SLOPE (135, -228)
  // Descending the steep 1,000-ft scree from Malapais Mountain to Peters Canyon
  // =========================================================================
  const screeGroup = new THREE.Group();
  const screeX = 135;
  const screeZ = -228;
  const screeY = getTerrainHeight(screeX, screeZ);
  screeGroup.position.set(screeX, screeY, screeZ);

  // A. Rose Quartz Mineral Matrix Outcrop
  const quartzMatrixRock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.6, 1),
    basaltMat
  );
  quartzMatrixRock.position.set(0, 0.4, 0);
  quartzMatrixRock.scale.set(1.4, 0.7, 1.1);
  quartzMatrixRock.castShadow = true;
  quartzMatrixRock.receiveShadow = true;
  screeGroup.add(quartzMatrixRock);

  // Embedded rose quartz crystalline clusters protruding from rock
  const quartzCrystalOffsets = [
    { x: 0.2, y: 0.75, z: 0.1, sx: 0.35, sy: 0.5, sz: 0.35, rx: 0.3, ry: 0.4 },
    { x: -0.3, y: 0.7, z: -0.2, sx: 0.4, sy: 0.6, sz: 0.3, rx: -0.4, ry: 0.8 },
    { x: 0.45, y: 0.55, z: -0.25, sx: 0.3, sy: 0.45, sz: 0.28, rx: 0.2, ry: -0.5 },
    { x: -0.15, y: 0.82, z: 0.3, sx: 0.38, sy: 0.52, sz: 0.32, rx: -0.2, ry: 0.3 },
    { x: 0.0, y: 0.95, z: -0.05, sx: 0.42, sy: 0.65, sz: 0.38, rx: 0.1, ry: 1.1 },
  ];

  quartzCrystalOffsets.forEach((q) => {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35, 0),
      roseQuartzMat
    );
    crystal.position.set(q.x, q.y, q.z);
    crystal.scale.set(q.sx, q.sy, q.sz);
    crystal.rotation.set(q.rx, q.ry, 0.2);
    crystal.castShadow = true;
    screeGroup.add(crystal);
  });

  // Loose Rose Quartz chunks scattered down the scree slope
  const looseQuartzPoints = [
    { x: 1.4, z: 0.8, r: 0.22 },
    { x: -1.2, z: 1.5, r: 0.28 },
    { x: 2.1, z: -1.0, r: 0.25 },
    { x: -0.8, z: -1.8, r: 0.2 },
    { x: 1.8, z: 2.2, r: 0.3 },
  ];
  looseQuartzPoints.forEach((pt) => {
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(pt.r, 0), roseQuartzMat);
    chunk.position.set(pt.x, pt.r * 0.5, pt.z);
    chunk.rotation.set(Math.random(), Math.random(), Math.random());
    chunk.castShadow = true;
    screeGroup.add(chunk);
  });

  // B. The Lost Peralta Rusted Horseshoe
  // Sitting atop a flat sun-baked basalt table stone along the old packpath trace
  const horseshoeStone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.65, 0.3, 7),
    basaltMat
  );
  horseshoeStone.position.set(-2.2, 0.15, 0.8);
  horseshoeStone.castShadow = true;
  screeGroup.add(horseshoeStone);

  const shoeGroup = new THREE.Group();
  shoeGroup.position.set(-2.2, 0.32, 0.8);
  shoeGroup.rotation.x = -Math.PI / 2;
  shoeGroup.rotation.z = 0.45;

  // Horseshoe arch (torus segment)
  const shoeArch = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.024, 6, 14, Math.PI * 1.35),
    rustedIronMat
  );
  shoeGroup.add(shoeArch);

  // Horseshoe calkins (cleats at heels)
  const calkinGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
  const c1 = new THREE.Mesh(calkinGeo, rustedIronMat);
  c1.position.set(-0.13, -0.06, 0.01);
  shoeGroup.add(c1);
  const c2 = new THREE.Mesh(calkinGeo, rustedIronMat);
  c2.position.set(0.13, -0.06, 0.01);
  shoeGroup.add(c2);
  screeGroup.add(shoeGroup);

  // C. Suspicious Triangular Cliff Cave across the ravine
  const caveGroup = buildSuspiciousTriangularCave(145, -235);
  rootGroup.add(caveGroup);

  rootGroup.add(screeGroup);

  // =========================================================================
  // 2. PETERS CANYON NARROWS & THE CHASM TOEHOLD LEDGE (236, -282)
  // Sheer polished walls, 15-ft toehold ledge, and the Two-Foot Rustic Ladder
  // =========================================================================
  const narrowsGroup = new THREE.Group();
  const narrowsX = 236;
  const narrowsZ = -282;
  const narrowsY = getTerrainHeight(narrowsX, narrowsZ);
  narrowsGroup.position.set(narrowsX, narrowsY, narrowsZ);

  // A. Towering Polished Volcanic Chasm Walls
  // Right Wall (East side) with 15-foot toehold ledge
  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 14.0, 16.0),
    polishedDaciteMat
  );
  rightWall.position.set(4.5, 6.0, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  narrowsGroup.add(rightWall);

  // The 15-Foot Toehold Ledge along right wall (approx 4.5m above canyon floor)
  const toeholdLedge = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.45, 10.0),
    polishedDaciteMat
  );
  toeholdLedge.position.set(2.4, 4.4, 0);
  toeholdLedge.receiveShadow = true;
  narrowsGroup.add(toeholdLedge);

  // Left Wall (West side)
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 14.0, 16.0),
    polishedDaciteMat
  );
  leftWall.position.set(-4.5, 6.0, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  narrowsGroup.add(leftWall);

  // Narrow Slot Chasm Pool beneath the ledge
  const chasmWater = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.4, 12.0),
    tinajaEmeraldWaterMat
  );
  chasmWater.position.set(0, 0.15, 0);
  chasmWater.receiveShadow = true;
  narrowsGroup.add(chasmWater);

  // B. The Authentic "Two-Foot Rustic Wooden Ladder"
  // Wedged against the left rock face for dropping down the slickrock traverse
  const ladderGroup = new THREE.Group();
  ladderGroup.position.set(-2.3, 0.65, -3.2);
  ladderGroup.rotation.z = 0.22;
  ladderGroup.rotation.y = 0.4;

  const poleGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.1, 5);
  const leftPole = new THREE.Mesh(poleGeo, weatheredWoodMat);
  leftPole.position.set(-0.2, 0, 0);
  leftPole.castShadow = true;
  ladderGroup.add(leftPole);

  const rightPole = new THREE.Mesh(poleGeo, weatheredWoodMat);
  rightPole.position.set(0.2, 0, 0);
  rightPole.castShadow = true;
  ladderGroup.add(rightPole);

  // 3 hand-hewn rungs
  for (let r = -1; r <= 1; r++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 5), weatheredWoodMat);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, r * 0.32, 0);
    rung.castShadow = true;
    ladderGroup.add(rung);
  }
  narrowsGroup.add(ladderGroup);

  // Polished river boulders in wash
  for (let b = 0; b < 6; b++) {
    const rb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + (b % 3) * 0.25, 1), paleRiverBoulderMat);
    rb.position.set((Math.random() - 0.5) * 2.5, 0.3, (Math.random() - 0.5) * 10);
    rb.scale.set(1.2, 0.7, 1.0);
    rb.castShadow = true;
    narrowsGroup.add(rb);
  }

  rootGroup.add(narrowsGroup);

  // =========================================================================
  // 3. THE PINCH OF PETER'S CANYON & DEEP PLUNGE TINAJA (238, -288)
  // Sharp westward bend, tall dry fall pour-off, and emerald tinaja pool
  // =========================================================================
  const pinchGroup = new THREE.Group();
  const pinchX = 238;
  const pinchZ = -288;
  const pinchY = getTerrainHeight(pinchX, pinchZ);
  pinchGroup.position.set(pinchX, pinchY, pinchZ);

  // A. Tall Waterfall / Dry-Fall Pour-Off Rock Chute
  // Smoothly scoured vertical basalt amphitheater
  const chuteGeo = new THREE.CylinderGeometry(3.5, 4.2, 5.5, 12, 1, true, 0, Math.PI);
  const dryFallChute = new THREE.Mesh(chuteGeo, polishedDaciteMat);
  dryFallChute.position.set(0, 2.6, 2.5);
  dryFallChute.rotation.y = Math.PI;
  dryFallChute.castShadow = true;
  dryFallChute.receiveShadow = true;
  pinchGroup.add(dryFallChute);

  // B. Deep Emerald Bedrock Plunge Pool (Tinaja)
  const poolRadius = 2.8;
  const tinajaPoolMesh = new THREE.Mesh(
    new THREE.CircleGeometry(poolRadius, 20),
    tinajaEmeraldWaterMat
  );
  tinajaPoolMesh.position.set(0, 0.2, 0);
  tinajaPoolMesh.rotation.x = -Math.PI / 2;
  tinajaPoolMesh.receiveShadow = true;
  pinchGroup.add(tinajaPoolMesh);

  // Ring of polished river stones framing the pool
  const poolStoneMat = new THREE.MeshStandardMaterial({ color: 0x5a4d42, roughness: 0.8 });
  const stoneCount = 14;
  for (let i = 0; i < stoneCount; i++) {
    const ang = (i / stoneCount) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), poolStoneMat);
    stone.position.set(
      Math.cos(ang) * (poolRadius + 0.3),
      0.25,
      Math.sin(ang) * (poolRadius + 0.3)
    );
    stone.scale.set(1.1, 0.6, 1.0);
    stone.castShadow = true;
    pinchGroup.add(stone);
  }

  // Register the Pinch Tinaja as a fresh water refill point
  waterRefillPoints.push(new THREE.Vector3(pinchX, pinchY + 0.25, pinchZ));

  // C. The Pinch Trail & Geography Guidepost
  const pinchPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.09, 2.1, 6),
    weatheredWoodMat
  );
  pinchPost.position.set(2.8, 1.05, -2.4);
  pinchPost.castShadow = true;
  pinchGroup.add(pinchPost);

  const pinchBoard = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.42, 0.08),
    weatheredWoodMat
  );
  pinchBoard.position.set(2.8, 1.8, -2.4);
  pinchBoard.rotation.y = -0.3;
  pinchGroup.add(pinchBoard);

  rootGroup.add(pinchGroup);

  // =========================================================================
  // 4. JUDGING DESERT BIGHORN SHEEP (High Canyon Rims & Overlook Ledge)
  // Matching Jacob's narrative: 4 sheep watching from the high rim, and one
  // curious ram perched 20 feet above the waterfall
  // =========================================================================
  function createBighornMesh(isRam: boolean = true): THREE.Group {
    const sheep = new THREE.Group();

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1.1), sheepFurMat);
    body.position.set(0, 0.85, 0);
    body.castShadow = true;
    sheep.add(body);

    // Neck & Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.5, 6), sheepFurMat);
    neck.position.set(0, 1.15, 0.45);
    neck.rotation.x = 0.5;
    sheep.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.42), sheepFurMat);
    head.position.set(0, 1.35, 0.65);
    sheep.add(head);

    // Muzzle
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.24), paleRiverBoulderMat);
    muzzle.position.set(0, 1.25, 0.85);
    sheep.add(muzzle);

    // Curled Horns (for rams)
    if (isRam) {
      const hornGeo = new THREE.TorusGeometry(0.22, 0.065, 6, 12, Math.PI * 1.2);
      const leftHorn = new THREE.Mesh(hornGeo, sheepHornMat);
      leftHorn.position.set(-0.2, 1.5, 0.6);
      leftHorn.rotation.set(0.3, -0.4, 0.6);
      leftHorn.castShadow = true;
      sheep.add(leftHorn);

      const rightHorn = new THREE.Mesh(hornGeo, sheepHornMat);
      rightHorn.position.set(0.2, 1.5, 0.6);
      rightHorn.rotation.set(0.3, 0.4, -0.6);
      rightHorn.castShadow = true;
      sheep.add(rightHorn);
    }

    // 4 Legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.85, 5);
    const legPositions = [
      { x: -0.24, z: 0.35 },
      { x: 0.24, z: 0.35 },
      { x: -0.24, z: -0.35 },
      { x: 0.24, z: -0.35 },
    ];
    legPositions.forEach((lp) => {
      const leg = new THREE.Mesh(legGeo, sheepFurMat);
      leg.position.set(lp.x, 0.42, lp.z);
      leg.castShadow = true;
      sheep.add(leg);
    });

    return sheep;
  }

  // 4 Bighorn Sheep silhouetted along the high canyon rims
  const rimSheepLocations = [
    { x: 226, z: -286, rotY: 1.2, isRam: true },
    { x: 228, z: -282, rotY: 0.9, isRam: false },
    { x: 255, z: -282, rotY: -1.4, isRam: false },
    { x: 258, z: -278, rotY: -1.7, isRam: true },
  ];

  rimSheepLocations.forEach((loc) => {
    const sy = getTerrainHeight(loc.x, loc.z);
    const sheep = createBighornMesh(loc.isRam);
    sheep.position.set(loc.x, sy, loc.z);
    sheep.rotation.y = loc.rotY;
    rootGroup.add(sheep);
  });

  // Curious Ram perched on the rock shelf 20 feet (6m) above the waterfall pool
  const ramLedgeX = 235;
  const ramLedgeZ = -286;
  const ramLedgeY = getTerrainHeight(ramLedgeX, ramLedgeZ) + 5.5;

  const ramLedge = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.0, 1.8),
    polishedDaciteMat
  );
  ramLedge.position.set(ramLedgeX, ramLedgeY - 0.5, ramLedgeZ);
  ramLedge.castShadow = true;
  rootGroup.add(ramLedge);

  const curiousRam = createBighornMesh(true);
  curiousRam.position.set(ramLedgeX, ramLedgeY, ramLedgeZ);
  curiousRam.rotation.y = 0.5;
  rootGroup.add(curiousRam);

  // =========================================================================
  // 5. JACOB EMERICK'S 2016 EMERGENCY BIVOUAC & SAR RESCUE SITE (220, -305)
  // Lean-to shelter, smooth resting rock, emergency fire ring, and SAR post
  // =========================================================================
  const bivouacGroup = new THREE.Group();
  const bivouacX = 220;
  const bivouacZ = -305;
  const bivouacY = getTerrainHeight(bivouacX, bivouacZ);
  bivouacGroup.position.set(bivouacX, bivouacY, bivouacZ);

  // A. Shallow Canyon Wall Overhang / Alcove
  const alcoveBluff = new THREE.Mesh(
    new THREE.BoxGeometry(7.0, 6.0, 4.0),
    basaltMat
  );
  alcoveBluff.position.set(-2.5, 3.0, 2.2);
  alcoveBluff.castShadow = true;
  alcoveBluff.receiveShadow = true;
  bivouacGroup.add(alcoveBluff);

  // B. Hand-Built Branch Lean-To Shelter
  // Slanted cedar & desert hackberry poles leaned against the rock alcove
  const thatchMat = new THREE.MeshStandardMaterial({
    color: 0x6e624c,
    roughness: 0.96,
  });

  const poleCount = 6;
  for (let p = 0; p < poleCount; p++) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 2.6, 5),
      weatheredWoodMat
    );
    pole.position.set(-2.4 + p * 0.35, 1.1, 0.8);
    pole.rotation.x = -0.55;
    pole.rotation.z = (Math.random() - 0.5) * 0.15;
    pole.castShadow = true;
    bivouacGroup.add(pole);
  }

  // Thatch roof layer (beargrass, yucca fronds & dead leafy boughs)
  const thatchRoof = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.12, 1.8),
    thatchMat
  );
  thatchRoof.position.set(-1.5, 1.15, 0.8);
  thatchRoof.rotation.x = -0.55;
  thatchRoof.castShadow = true;
  bivouacGroup.add(thatchRoof);

  // C. The Cool Resting Rock (where Jacob laid down to rest his injured shin/knee)
  const restingRock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.0, 1),
    paleRiverBoulderMat
  );
  restingRock.position.set(1.5, 0.35, 0.2);
  restingRock.scale.set(1.6, 0.5, 1.2);
  restingRock.castShadow = true;
  restingRock.receiveShadow = true;
  bivouacGroup.add(restingRock);

  // D. Emergency Campfire Hearth & Fallen Headlamp
  const hearthStones = 7;
  for (let h = 0; h < hearthStones; h++) {
    const ang = (h / hearthStones) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), basaltMat);
    stone.position.set(Math.cos(ang) * 0.7, 0.12, -1.6 + Math.sin(ang) * 0.7);
    bivouacGroup.add(stone);
  }

  // Charred wood embers inside fire ring
  const charcoalMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
  const charcoal = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.08, 8), charcoalMat);
  charcoal.position.set(0, 0.08, -1.6);
  bivouacGroup.add(charcoal);

  // Fallen Hiking Headlamp on rock
  const headlampMat = new THREE.MeshStandardMaterial({ color: 0x2b3846, metalness: 0.4, roughness: 0.5 });
  const headlampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), headlampMat);
  headlampMesh.position.set(1.2, 0.65, 0.1);
  bivouacGroup.add(headlampMesh);

  // E. Weatherproof Backcountry Expedition Plaque Post
  const bivPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 2.2, 6),
    weatheredWoodMat
  );
  bivPost.position.set(2.6, 1.1, -1.5);
  bivPost.castShadow = true;
  bivouacGroup.add(bivPost);

  const bivSign = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.5, 0.08),
    weatheredWoodMat
  );
  bivSign.position.set(2.6, 1.85, -1.5);
  bivSign.rotation.y = -0.25;
  bivouacGroup.add(bivSign);

  // Engraved bronze memorial plate
  const bivPlaque = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.36, 0.02),
    brassPlaqueMat
  );
  bivPlaque.position.set(2.6, 1.85, -1.45);
  bivPlaque.rotation.y = -0.25;
  bivouacGroup.add(bivPlaque);

  rootGroup.add(bivouacGroup);

  scene.add(rootGroup);
  return rootGroup;
}

/**
 * Builds the authentic, photorealistic Suspicious Triangular Cliff Cave landmark
 * based on real-world reference photography from Peters Canyon / Malapais North Scree.
 *
 * Real-world geological and historical characteristics:
 * - Imposing weathered volcanic rhyolite/tuff rock bluff with vertical jointing & crags
 * - Natural gothic/triangular cavern fissure opening with inclined left & right bedrock jambs
 * - Deep, recessed interior cavern hollow extending 6.5+ meters into the cliff with shadowed void
 * - Prominent monolithic right buttress with horizontal jointing matching the exact photo formation
 * - Vibrant chartreuse/yellow-green crustose lichen patinas across the lower rock terraces
 * - Stacked prospector dry-stone barricade and weathered cedar timber prop across threshold
 * - Interior prospector campfire hearth, antique rusted pickaxe head, and hidden cache tin
 * - Foreground Sonoran saguaro cactus and desert sage tufts clinging to the rock shelves
 */
export function buildSuspiciousTriangularCave(caveX: number, caveZ: number): THREE.Group {
  const caveGroup = new THREE.Group();
  const caveY = getTerrainHeight(caveX, caveZ);
  caveGroup.position.set(caveX, caveY, caveZ);
  // Orient outward toward the Peters Canyon approach trail (viewed looking south-southeast)
  caveGroup.rotation.y = -0.12;

  // -------------------------------------------------------------------------
  // 1. DEDICATED GEOLOGICAL & HISTORICAL MATERIALS
  // -------------------------------------------------------------------------
  // Warm weathered desert red-brown rhyolitic tuff
  const cliffRhyoliteMat = new THREE.MeshStandardMaterial({
    color: 0x6e5040,
    roughness: 0.94,
    metalness: 0.04,
  });

  // Sunlit ochre/buff facet highlights
  const cliffTanMat = new THREE.MeshStandardMaterial({
    color: 0x8c6d54,
    roughness: 0.92,
    metalness: 0.03,
  });

  // Deep shadowed basalt jointing & crevices
  const cliffDarkBasaltMat = new THREE.MeshStandardMaterial({
    color: 0x362b22,
    roughness: 0.96,
    metalness: 0.05,
  });

  // Distinctive chartreuse/yellow-green crustose lichen (exact match to photo!)
  const cliffLichenMat = new THREE.MeshStandardMaterial({
    color: 0xa2ae4a,
    roughness: 0.95,
    metalness: 0.02,
  });

  // Dark cavern interior stone
  const cavernInteriorMat = new THREE.MeshStandardMaterial({
    color: 0x14100d,
    roughness: 0.99,
    metalness: 0.0,
  });

  // Pure light-absorbing cavern void backplane
  const cavernVoidMat = new THREE.MeshBasicMaterial({
    color: 0x050403,
    side: THREE.DoubleSide,
  });

  // Weathered prospector cedar timber
  const prospectorWoodMat = new THREE.MeshStandardMaterial({
    color: 0x584738,
    roughness: 0.95,
  });

  // Antique oxidized iron
  const rustedRelicMat = new THREE.MeshStandardMaterial({
    color: 0x483428,
    roughness: 0.85,
    metalness: 0.65,
  });

  // Charred campfire coals & embers
  const charcoalMat = new THREE.MeshStandardMaterial({
    color: 0x0e0e0e,
    roughness: 0.98,
  });

  // Sonoran ribbed cactus green
  const saguaroGreenMat = new THREE.MeshStandardMaterial({
    color: 0x3b572e,
    roughness: 0.86,
  });

  // Pale dusty silver-green desert sage foliage
  const desertSageMat = new THREE.MeshStandardMaterial({
    color: 0x65775f,
    roughness: 0.92,
  });

  // -------------------------------------------------------------------------
  // 2. THE NATURAL GOTHIC / TRIANGULAR CAVERN PORTAL (Mouth & Jambs)
  // -------------------------------------------------------------------------
  // Left Jamb (Angled Bedrock Slabs leaning inward at ~22°)
  const leftJambLower = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 3.8), cliffRhyoliteMat);
  leftJambLower.position.set(-1.6, 1.0, 0.5);
  leftJambLower.rotation.z = -0.38;
  leftJambLower.rotation.y = 0.12;
  leftJambLower.castShadow = true;
  leftJambLower.receiveShadow = true;
  caveGroup.add(leftJambLower);

  const leftJambMid = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 3.4), cliffTanMat);
  leftJambMid.position.set(-1.0, 2.4, 0.8);
  leftJambMid.rotation.z = -0.38;
  leftJambMid.castShadow = true;
  leftJambMid.receiveShadow = true;
  caveGroup.add(leftJambMid);

  const leftJambUpper = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 3.0), cliffRhyoliteMat);
  leftJambUpper.position.set(-0.4, 3.6, 1.0);
  leftJambUpper.rotation.z = -0.42;
  leftJambUpper.castShadow = true;
  leftJambUpper.receiveShadow = true;
  caveGroup.add(leftJambUpper);

  // Right Jamb (Angled Bedrock Slabs leaning inward at ~22°)
  const rightJambLower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 3.8), cliffRhyoliteMat);
  rightJambLower.position.set(1.7, 1.0, 0.5);
  rightJambLower.rotation.z = 0.38;
  rightJambLower.rotation.y = -0.12;
  rightJambLower.castShadow = true;
  rightJambLower.receiveShadow = true;
  caveGroup.add(rightJambLower);

  const rightJambMid = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 3.4), cliffTanMat);
  rightJambMid.position.set(1.1, 2.4, 0.8);
  rightJambMid.rotation.z = 0.38;
  rightJambMid.castShadow = true;
  rightJambMid.receiveShadow = true;
  caveGroup.add(rightJambMid);

  const rightJambUpper = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 3.0), cliffRhyoliteMat);
  rightJambUpper.position.set(0.4, 3.6, 1.0);
  rightJambUpper.rotation.z = 0.42;
  rightJambUpper.castShadow = true;
  rightJambUpper.receiveShadow = true;
  caveGroup.add(rightJambUpper);

  // Overhanging Keystone Apex Block (Gothic Point Arch Cap at 4.2m height)
  const keystoneApex = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 3.2), cliffRhyoliteMat);
  keystoneApex.position.set(0, 4.35, 0.7);
  keystoneApex.castShadow = true;
  keystoneApex.receiveShadow = true;
  caveGroup.add(keystoneApex);

  // Natural jagged rock nodules along the apex arch
  const archNodule1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 1), cliffTanMat);
  archNodule1.position.set(-0.25, 4.15, 0.2);
  archNodule1.scale.set(1.1, 0.8, 1.2);
  archNodule1.castShadow = true;
  caveGroup.add(archNodule1);

  const archNodule2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 1), cliffRhyoliteMat);
  archNodule2.position.set(0.28, 4.2, 0.3);
  archNodule2.scale.set(0.9, 0.7, 1.1);
  archNodule2.castShadow = true;
  caveGroup.add(archNodule2);

  // -------------------------------------------------------------------------
  // 3. RECESSED INTERIOR CAVERN CHAMBER & VOID TUNNEL (6.5m Deep)
  // -------------------------------------------------------------------------
  // Left inner cavern tunnel wall (dark rough volcanic stone)
  const innerWallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.0, 6.2), cavernInteriorMat);
  innerWallLeft.position.set(-1.35, 2.0, 3.1);
  innerWallLeft.rotation.z = -0.20;
  innerWallLeft.receiveShadow = true;
  caveGroup.add(innerWallLeft);

  // Right inner cavern tunnel wall
  const innerWallRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.0, 6.2), cavernInteriorMat);
  innerWallRight.position.set(1.35, 2.0, 3.1);
  innerWallRight.rotation.z = 0.20;
  innerWallRight.receiveShadow = true;
  caveGroup.add(innerWallRight);

  // Vaulted cleft ceiling
  const innerCeiling = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 6.2), cavernInteriorMat);
  innerCeiling.position.set(0, 3.85, 3.1);
  innerCeiling.castShadow = true;
  innerCeiling.receiveShadow = true;
  caveGroup.add(innerCeiling);

  // Cavern stone floor stepping slightly upward into the mountain
  const innerFloor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.35, 6.2), cavernInteriorMat);
  innerFloor.position.set(0, -0.05, 3.1);
  innerFloor.receiveShadow = true;
  caveGroup.add(innerFloor);

  // Pitch-black cavern void backplate (absorbs sunlight, creates true cavern depth)
  const voidBackplate = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.8), cavernVoidMat);
  voidBackplate.position.set(0, 1.9, 6.2);
  caveGroup.add(voidBackplate);

  // -------------------------------------------------------------------------
  // 4. THE PROMINENT MONOLITHIC RIGHT BUTTRESS (Exact geological match to photo!)
  // -------------------------------------------------------------------------
  // Heavy main vertical column
  const buttressBase = new THREE.Mesh(new THREE.BoxGeometry(3.6, 6.5, 5.0), cliffRhyoliteMat);
  buttressBase.position.set(3.5, 3.2, 0.8);
  buttressBase.castShadow = true;
  buttressBase.receiveShadow = true;
  caveGroup.add(buttressBase);

  // Protruding front facet with sunlit tan tone
  const buttressProw = new THREE.Mesh(new THREE.BoxGeometry(2.8, 5.2, 2.4), cliffTanMat);
  buttressProw.position.set(3.0, 2.6, -1.2);
  buttressProw.rotation.y = -0.15;
  buttressProw.castShadow = true;
  buttressProw.receiveShadow = true;
  caveGroup.add(buttressProw);

  // Horizontal bedding fracture crevice 1
  const bedFracture1 = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 5.2), cliffDarkBasaltMat);
  bedFracture1.position.set(3.5, 2.2, 0.8);
  caveGroup.add(bedFracture1);

  // Horizontal bedding fracture crevice 2
  const bedFracture2 = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 5.2), cliffDarkBasaltMat);
  bedFracture2.position.set(3.5, 4.5, 0.8);
  caveGroup.add(bedFracture2);

  // Upper buttress crag top
  const buttressTop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.2, 4.2), cliffRhyoliteMat);
  buttressTop.position.set(3.6, 7.6, 1.2);
  buttressTop.castShadow = true;
  buttressTop.receiveShadow = true;
  caveGroup.add(buttressTop);

  // -------------------------------------------------------------------------
  // 5. LEFT CLIFF BUTTRESS & STEPPED CRAGS
  // -------------------------------------------------------------------------
  const leftButtressMain = new THREE.Mesh(new THREE.BoxGeometry(3.2, 5.4, 4.8), cliffRhyoliteMat);
  leftButtressMain.position.set(-3.4, 2.8, 0.8);
  leftButtressMain.castShadow = true;
  leftButtressMain.receiveShadow = true;
  caveGroup.add(leftButtressMain);

  const leftButtressOuter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 4.2, 4.0), cliffTanMat);
  leftButtressOuter.position.set(-5.4, 2.0, 0.4);
  leftButtressOuter.castShadow = true;
  leftButtressOuter.receiveShadow = true;
  caveGroup.add(leftButtressOuter);

  // -------------------------------------------------------------------------
  // 6. UPPER CLIFF MASSIF & SKYLINE PINNACLES (Reaching 12.5m elevation)
  // -------------------------------------------------------------------------
  // Central cliff face above cave apex
  const upperCentralWall = new THREE.Mesh(new THREE.BoxGeometry(6.8, 5.5, 5.5), cliffRhyoliteMat);
  upperCentralWall.position.set(0.2, 7.2, 2.5);
  upperCentralWall.castShadow = true;
  upperCentralWall.receiveShadow = true;
  caveGroup.add(upperCentralWall);

  // Jagged summit pinnacles
  const pinnacle1 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.4, 3.8, 5), cliffRhyoliteMat);
  pinnacle1.position.set(-1.2, 10.8, 2.0);
  pinnacle1.rotation.y = 0.4;
  pinnacle1.castShadow = true;
  caveGroup.add(pinnacle1);

  const pinnacle2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.6, 4.5, 6), cliffTanMat);
  pinnacle2.position.set(1.0, 11.2, 2.2);
  pinnacle2.rotation.y = 0.8;
  pinnacle2.castShadow = true;
  caveGroup.add(pinnacle2);

  const pinnacle3 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.1, 3.2, 5), cliffRhyoliteMat);
  pinnacle3.position.set(2.8, 10.2, 1.8);
  pinnacle3.rotation.y = -0.3;
  pinnacle3.castShadow = true;
  caveGroup.add(pinnacle3);

  // -------------------------------------------------------------------------
  // 7. VIBRANT LICHEN PATINA TERRACES & TALUS SCREE (Signature Photo Feature)
  // -------------------------------------------------------------------------
  // Stepped rock shelves directly below the cave mouth encrusted with chartreuse lichen
  const lichenShelfCenter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 2.8), cliffLichenMat);
  lichenShelfCenter.position.set(0, -0.6, -1.5);
  lichenShelfCenter.receiveShadow = true;
  caveGroup.add(lichenShelfCenter);

  const lichenShelfLeft = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 3.4), cliffLichenMat);
  lichenShelfLeft.position.set(-2.4, -1.4, -2.4);
  lichenShelfLeft.receiveShadow = true;
  caveGroup.add(lichenShelfLeft);

  const lichenBoulderCenter = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 1), cliffLichenMat);
  lichenBoulderCenter.position.set(0.8, -1.2, -2.8);
  lichenBoulderCenter.scale.set(1.5, 0.9, 1.3);
  lichenBoulderCenter.receiveShadow = true;
  caveGroup.add(lichenBoulderCenter);

  const lichenShelfRight = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 2.6), cliffLichenMat);
  lichenShelfRight.position.set(2.8, -0.8, -2.0);
  lichenShelfRight.receiveShadow = true;
  caveGroup.add(lichenShelfRight);

  // Loose talus scree boulders tumbling down the slope
  for (let b = 0; b < 14; b++) {
    const bRad = 0.35 + (b % 4) * 0.15;
    const bMat = b % 3 === 0 ? cliffLichenMat : (b % 2 === 0 ? cliffRhyoliteMat : cliffDarkBasaltMat);
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(bRad, 0), bMat);
    const bx = (b % 2 === 0 ? 1 : -1) * (0.8 + (b * 0.35));
    const bz = -2.2 - (b * 0.3);
    boulder.position.set(bx, -0.6 - (b * 0.16), bz);
    boulder.rotation.set(b * 0.7, b * 1.1, b * 0.3);
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    caveGroup.add(boulder);
  }

  // -------------------------------------------------------------------------
  // 8. PROSPECTOR DRY-LAID FIELDSTONE BARRICADE & HISTORICAL RELICS
  // -------------------------------------------------------------------------
  // Stacked prospector fieldstone wall partially choking the threshold
  const fieldstoneCount = 11;
  for (let s = 0; s < fieldstoneCount; s++) {
    const stoneGeo = new THREE.DodecahedronGeometry(0.24 + (s % 3) * 0.08, 0);
    const stoneMesh = new THREE.Mesh(stoneGeo, s % 2 === 0 ? cliffDarkBasaltMat : cliffRhyoliteMat);
    const sx = -1.1 + s * 0.22;
    const sy = 0.16 + (s % 3) * 0.24;
    const sz = 0.1 + ((s * 7) % 5) * 0.06;
    stoneMesh.position.set(sx, sy, sz);
    stoneMesh.rotation.set(s * 0.5, s * 0.9, 0);
    stoneMesh.castShadow = true;
    stoneMesh.receiveShadow = true;
    caveGroup.add(stoneMesh);
  }

  // Tumbled stones fallen outside the barricade
  for (let t = 0; t < 5; t++) {
    const tumbled = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), cliffRhyoliteMat);
    tumbled.position.set(-0.6 + t * 0.3, 0.12, -0.4 - (t % 2) * 0.2);
    tumbled.castShadow = true;
    caveGroup.add(tumbled);
  }

  // Weathered hand-hewn juniper timber beam wedged against inner left cleft wall
  const timberProp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.08, 3.1, 6),
    prospectorWoodMat
  );
  timberProp.position.set(-0.85, 1.45, 0.8);
  timberProp.rotation.z = -0.28;
  timberProp.rotation.y = 0.25;
  timberProp.castShadow = true;
  caveGroup.add(timberProp);

  // Prospector campfire hearth inside the cavern shelter
  const hearthGroup = new THREE.Group();
  hearthGroup.position.set(0.2, 0.15, 2.6);
  for (let h = 0; h < 7; h++) {
    const ang = (h / 7) * Math.PI * 2;
    const hStone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), cliffDarkBasaltMat);
    hStone.position.set(Math.cos(ang) * 0.45, 0.06, Math.sin(ang) * 0.45);
    hearthGroup.add(hStone);
  }
  const charcoalEmbers = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.30, 0.05, 8),
    charcoalMat
  );
  charcoalEmbers.position.set(0, 0.04, 0);
  hearthGroup.add(charcoalEmbers);
  caveGroup.add(hearthGroup);

  // Antique rusted prospector pickaxe head resting on interior rock ledge
  const pickaxeGroup = new THREE.Group();
  pickaxeGroup.position.set(-1.05, 0.42, 1.8);
  pickaxeGroup.rotation.z = 0.5;
  pickaxeGroup.rotation.y = 0.3;
  const pickBlade = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.03, 5, 10, Math.PI * 0.8),
    rustedRelicMat
  );
  pickaxeGroup.add(pickBlade);
  const pickEye = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 6), rustedRelicMat);
  pickaxeGroup.add(pickEye);
  caveGroup.add(pickaxeGroup);

  // Vintage square prospector cache tin / kerosene can
  const cacheTin = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.32, 0.22),
    rustedRelicMat
  );
  cacheTin.position.set(1.15, 0.22, 2.4);
  cacheTin.rotation.y = 0.4;
  cacheTin.castShadow = true;
  caveGroup.add(cacheTin);

  // Faint Peralta Spanish Cross chiseled into the right rock jamb
  const crossGroup = new THREE.Group();
  crossGroup.position.set(1.18, 1.6, 0.5);
  crossGroup.rotation.y = -Math.PI / 2;
  const crossVert = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.015), cliffDarkBasaltMat);
  crossGroup.add(crossVert);
  const crossHoriz = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.015), cliffDarkBasaltMat);
  crossHoriz.position.y = 0.04;
  crossGroup.add(crossHoriz);
  caveGroup.add(crossGroup);

  // -------------------------------------------------------------------------
  // 9. DESERT FLORA ACCENTS (Matching Reference Photography)
  // -------------------------------------------------------------------------
  // Iconic Lower-Right Saguaro Cactus (standing on the lichen rock terrace)
  const lowerRightSaguaro = createLedgeSaguaro(4.4, true, saguaroGreenMat);
  lowerRightSaguaro.position.set(4.6, -0.8, -3.2);
  lowerRightSaguaro.rotation.y = 0.4;
  caveGroup.add(lowerRightSaguaro);

  // Upper Ridge Saguaro (silhouetted against the sky)
  const upperRidgeSaguaro = createLedgeSaguaro(3.2, false, saguaroGreenMat);
  upperRidgeSaguaro.position.set(-3.6, 7.0, 2.2);
  upperRidgeSaguaro.rotation.y = -0.2;
  caveGroup.add(upperRidgeSaguaro);

  // Desert Sage / Brittlebush Tufts nestled in rock crevices
  const sagePositions = [
    [-1.8, -0.1, -1.2],
    [1.6, -0.2, -1.4],
    [-3.2, 0.2, -0.8],
    [3.4, 0.3, -1.8],
    [0.6, -1.1, -3.6],
    [-2.2, -1.2, -3.2],
    [-0.8, 1.2, -0.3],
    [2.1, 1.4, -0.2],
    [-4.5, 4.2, 1.2],
  ];

  sagePositions.forEach(([sx, sy, sz], idx) => {
    const sRad = 0.35 + (idx % 3) * 0.12;
    const sage = new THREE.Mesh(new THREE.DodecahedronGeometry(sRad, 1), desertSageMat);
    sage.position.set(sx, sy, sz);
    sage.scale.set(1.2, 0.6, 1.2);
    sage.castShadow = true;
    sage.receiveShadow = true;
    caveGroup.add(sage);
  });

  return caveGroup;
}

/**
 * Creates a detailed, pleated Sonoran Saguaro cactus for landmark cliff ledges.
 */
function createLedgeSaguaro(
  height: number,
  hasArms: boolean,
  mat: THREE.Material
): THREE.Group {
  const sagGroup = new THREE.Group();

  // Fluted pleated main trunk
  const trunkGeo = createFlutedCylinderGeometry(0.30, 0.36, height, 24, 16, 0.07, true);
  const trunk = new THREE.Mesh(trunkGeo, mat);
  trunk.position.y = height * 0.5;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  sagGroup.add(trunk);

  // Brown flower scar apex
  const tip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.06, 0.05, 6),
    new THREE.MeshStandardMaterial({ color: 0x48321e, roughness: 0.9 })
  );
  tip.position.y = height + 0.03;
  sagGroup.add(tip);

  if (hasArms) {
    // Left upward-curving arm
    const armHGeo = createFlutedCylinderGeometry(0.18, 0.18, 1.1, 16, 12, 0.05, false);
    armHGeo.rotateZ(Math.PI / 2);
    const armH1 = new THREE.Mesh(armHGeo, mat);
    armH1.position.set(-0.65, height * 0.46, 0);
    armH1.castShadow = true;
    sagGroup.add(armH1);

    const armVGeo1 = createFlutedCylinderGeometry(0.16, 0.20, 1.5, 16, 12, 0.05, true);
    const armV1 = new THREE.Mesh(armVGeo1, mat);
    armV1.position.set(-1.15, height * 0.46 + 0.75, 0);
    armV1.castShadow = true;
    sagGroup.add(armV1);

    // Right upward-curving arm
    const armH2 = new THREE.Mesh(armHGeo, mat);
    armH2.position.set(0.60, height * 0.58, 0.08);
    armH2.rotation.y = 0.2;
    armH2.castShadow = true;
    sagGroup.add(armH2);

    const armVGeo2 = createFlutedCylinderGeometry(0.16, 0.20, 1.2, 16, 12, 0.05, true);
    const armV2 = new THREE.Mesh(armVGeo2, mat);
    armV2.position.set(1.1, height * 0.58 + 0.60, 0.08);
    armV2.castShadow = true;
    sagGroup.add(armV2);
  }

  return sagGroup;
}
