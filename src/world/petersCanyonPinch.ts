import * as THREE from 'three';
import { getTerrainHeight } from './terrain';

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
  const caveGroup = new THREE.Group();
  const caveX = 145;
  const caveZ = -235;
  const caveY = getTerrainHeight(caveX, caveZ);
  caveGroup.position.set(caveX, caveY, caveZ);

  // Dark triangular hollow carved into the rock face
  const caveArchMat = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.98 });
  const caveCone = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 4.0, 3),
    caveArchMat
  );
  caveCone.position.set(0, 1.8, 0);
  caveCone.rotation.z = -Math.PI / 2;
  caveCone.rotation.y = 0.3;
  caveGroup.add(caveCone);

  // Stacked prospector debris/dry-laid fieldstones inside entrance
  for (let s = 0; s < 7; s++) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), basaltMat);
    stone.position.set(
      (Math.random() - 0.5) * 1.2,
      0.2 + (s % 3) * 0.22,
      (Math.random() - 0.5) * 1.0
    );
    caveGroup.add(stone);
  }
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
