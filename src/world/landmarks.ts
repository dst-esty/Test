import * as THREE from 'three';
import { getTerrainHeight } from './terrain';
import { Landmark } from '../types';

export interface LandmarkMeshes {
  weaversNeedle: THREE.Group;
  trailhead: THREE.Group;
  spring: THREE.Group;
  massacre: THREE.Group;
  dugout: THREE.Group;
  eyeRock: THREE.Group;
  mine: THREE.Group;
  mineInterior: THREE.Group;
  waterRefillPoints: THREE.Vector3[];
}

export function createLandmarkStructures(
  scene: THREE.Scene,
  landmarks: Landmark[]
): LandmarkMeshes {
  const waterRefillPoints: THREE.Vector3[] = [];

  // ==========================================
  // 1. Weaver's Needle (Towering volcanic neck)
  // ==========================================
  const needleGroup = new THREE.Group();
  const needleY = getTerrainHeight(80, 15);
  needleGroup.position.set(80, needleY, 15);

  const needleRockMat = new THREE.MeshStandardMaterial({
    color: 0x823c26,
    roughness: 0.95,
    metalness: 0.1,
    flatShading: true,
  });

  // Main monolithic spire
  const spireGeo = new THREE.CylinderGeometry(4.5, 14, 65, 9);
  const spire = new THREE.Mesh(spireGeo, needleRockMat);
  spire.position.y = 32;
  spire.castShadow = true;
  spire.receiveShadow = true;
  needleGroup.add(spire);

  // Twin notch peak (the famous saddle notch of Weaver's Needle)
  const summitNorth = new THREE.Mesh(new THREE.ConeGeometry(3.5, 14, 7), needleRockMat);
  summitNorth.position.set(0, 68, 2);
  summitNorth.castShadow = true;
  needleGroup.add(summitNorth);

  const summitSouth = new THREE.Mesh(new THREE.ConeGeometry(3, 11, 6), needleRockMat);
  summitSouth.position.set(0, 66, -2.5);
  summitSouth.castShadow = true;
  needleGroup.add(summitSouth);

  // Scree buttresses at base
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const buttress = new THREE.Mesh(new THREE.ConeGeometry(7, 28, 5), needleRockMat);
    buttress.position.set(Math.cos(angle) * 12, 12, Math.sin(angle) * 12);
    buttress.rotation.z = Math.cos(angle) * 0.2;
    buttress.castShadow = true;
    needleGroup.add(buttress);
  }
  scene.add(needleGroup);

  // ==========================================
  // 2. Peralta Trailhead Base Camp
  // ==========================================
  const trailheadGroup = new THREE.Group();
  const thY = getTerrainHeight(-120, -120);
  trailheadGroup.position.set(-120, thY, -120);

  // Lean-to wooden frame & canvas shelter
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const canvasMat = new THREE.MeshStandardMaterial({ color: 0xcfc0a2, roughness: 0.8, side: THREE.DoubleSide });

  const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 3, 6);
  for (const [px, pz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    const post = new THREE.Mesh(postGeo, woodMat);
    post.position.set(px, 1.5, pz);
    trailheadGroup.add(post);
  }

  // Slanted canvas roof
  const roofGeo = new THREE.PlaneGeometry(5, 5);
  roofGeo.rotateX(Math.PI / 3);
  const roof = new THREE.Mesh(roofGeo, canvasMat);
  roof.position.set(0, 2.7, 0);
  roof.castShadow = true;
  trailheadGroup.add(roof);

  // Trail Register & Peralta Map on wooden post
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.1), woodMat);
  signBoard.position.set(-2, 1.6, 0);
  trailheadGroup.add(signBoard);

  const parchment = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xe6d5ac, roughness: 0.5 })
  );
  parchment.position.set(-2, 1.6, 0.06);
  trailheadGroup.add(parchment);

  // Fresh Water Barrel (replenishes hydration!)
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.7, 1.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.7 })
  );
  barrel.position.set(1.5, 0.7, -1.2);
  trailheadGroup.add(barrel);
  waterRefillPoints.push(new THREE.Vector3(-120 + 1.5, thY, -120 - 1.2));

  // Campfire circle
  const campfireGroup = new THREE.Group();
  campfireGroup.position.set(0, 0.1, 3.5);
  for (let r = 0; r < 8; r++) {
    const cAngle = (r / 8) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), woodMat);
    stone.position.set(Math.cos(cAngle) * 0.8, 0.15, Math.sin(cAngle) * 0.8);
    campfireGroup.add(stone);
  }
  // Charred embers
  const embers = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 0.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x221105, emissive: 0x552200, emissiveIntensity: 0.5 })
  );
  campfireGroup.add(embers);
  trailheadGroup.add(campfireGroup);

  scene.add(trailheadGroup);

  // ==========================================
  // 3. Hieroglyphic Oasis & Spring
  // ==========================================
  const springGroup = new THREE.Group();
  const spY = getTerrainHeight(-70, -20);
  springGroup.position.set(-70, spY, -20);

  // Shimmering spring pool
  const waterGeo = new THREE.CircleGeometry(6, 16);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1b7a82,
    roughness: 0.1,
    metalness: 0.8,
    transparent: true,
    opacity: 0.85,
  });
  const pool = new THREE.Mesh(waterGeo, waterMat);
  pool.position.y = 0.3;
  springGroup.add(pool);
  waterRefillPoints.push(new THREE.Vector3(-70, spY, -20));

  // Ancient Petroglyph Boulders with carvings
  const petroMat = new THREE.MeshStandardMaterial({ color: 0x2c2b2a, roughness: 0.9 });
  for (let p = 0; p < 5; p++) {
    const bAngle = (p / 5) * Math.PI * 2 + 0.3;
    const pRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), petroMat);
    pRock.position.set(Math.cos(bAngle) * 7.5, 1.2, Math.sin(bAngle) * 7.5);
    pRock.castShadow = true;
    springGroup.add(pRock);

    // Carved symbols (glowing subtle ochre petroglyph glyphs)
    const glyph = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.45, 8),
      new THREE.MeshBasicMaterial({ color: 0xdfbc83, side: THREE.DoubleSide })
    );
    glyph.position.set(Math.cos(bAngle) * 6.5, 1.6, Math.sin(bAngle) * 6.5);
    glyph.lookAt(-70, spY + 1.6, -20);
    springGroup.add(glyph);
  }

  // Desert Cottonwood Trees near the water
  const treeTrunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 5, 6);
  const foliageGeo = new THREE.DodecahedronGeometry(2.5, 1);
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x476326, roughness: 0.8 });

  for (const [tx, tz] of [[-5, 5], [6, -4], [-4, -6]]) {
    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);

    const trunk = new THREE.Mesh(treeTrunkGeo, woodMat);
    trunk.position.y = 2.5;
    trunk.castShadow = true;
    tree.add(trunk);

    const crown = new THREE.Mesh(foliageGeo, foliageMat);
    crown.position.y = 5.5;
    crown.castShadow = true;
    tree.add(crown);

    springGroup.add(tree);
  }
  scene.add(springGroup);

  // ==========================================
  // 4. 1848 Peralta Massacre Grounds
  // ==========================================
  const massacreGroup = new THREE.Group();
  const mgY = getTerrainHeight(-40, 90);
  massacreGroup.position.set(-40, mgY, 90);

  // Old weathered wooden memorial crosses
  for (let c = 0; c < 5; c++) {
    const crossGroup = new THREE.Group();
    crossGroup.position.set((c - 2) * 3 + (Math.random() - 0.5), 0, (Math.random() - 0.5) * 3);
    crossGroup.rotation.y = Math.random() * 0.5;
    crossGroup.rotation.z = (Math.random() - 0.5) * 0.15; // slightly tilted

    const vBeam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.18), woodMat);
    vBeam.position.y = 1.2;
    vBeam.castShadow = true;
    crossGroup.add(vBeam);

    const hBeam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.18), woodMat);
    hBeam.position.y = 1.7;
    hBeam.castShadow = true;
    crossGroup.add(hBeam);

    // Stone cairn at base
    const cairn = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.6, 6), petroMat);
    cairn.position.y = 0.3;
    crossGroup.add(cairn);

    massacreGroup.add(crossGroup);
  }

  // Peralta Silver Spur & Stirrup relic on rock
  const relicRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 1), petroMat);
  relicRock.position.set(2, 0.8, 2);
  massacreGroup.add(relicRock);

  const silverRelic = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.08, 8, 12),
    new THREE.MeshStandardMaterial({ color: 0xd9e1e8, metalness: 0.9, roughness: 0.3 })
  );
  silverRelic.position.set(2, 1.8, 2);
  silverRelic.rotation.x = Math.PI / 4;
  massacreGroup.add(silverRelic);

  scene.add(massacreGroup);

  // ==========================================
  // 5. Jacob Waltz's Abandoned Dugout / Stone Cabin
  // ==========================================
  const dugoutGroup = new THREE.Group();
  const dgY = getTerrainHeight(30, -90);
  dugoutGroup.position.set(30, dgY, -90);

  const stoneWallMat = new THREE.MeshStandardMaterial({ color: 0x6e5241, roughness: 0.95 });
  // Four low stone wall ruins
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(6, 1.8, 0.5), stoneWallMat);
  wallN.position.set(0, 0.9, -2.5);
  dugoutGroup.add(wallN);

  const wallS1 = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 0.5), stoneWallMat);
  wallS1.position.set(-1.8, 0.9, 2.5);
  dugoutGroup.add(wallS1);

  const wallS2 = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 0.5), stoneWallMat);
  wallS2.position.set(1.8, 0.9, 2.5);
  dugoutGroup.add(wallS2); // leaves 2m doorway in center

  const wallW = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 5.5), stoneWallMat);
  wallW.position.set(-3, 0.9, 0);
  dugoutGroup.add(wallW);

  const wallE = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 5.5), stoneWallMat);
  wallE.position.set(3, 0.9, 0);
  dugoutGroup.add(wallE);

  // Hearth & chimney
  const hearth = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 1.2), stoneWallMat);
  hearth.position.set(-2.2, 1.6, -1.8);
  dugoutGroup.add(hearth);

  // Prospector's Pickaxe leaning on stone wall
  const pickaxeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 5), woodMat);
  pickaxeHandle.position.set(1.2, 0.6, 2.2);
  pickaxeHandle.rotation.z = -0.3;
  dugoutGroup.add(pickaxeHandle);

  const pickHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.08, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.4 })
  );
  pickHead.position.set(1.4, 1.1, 2.2);
  pickHead.rotation.z = -0.3;
  dugoutGroup.add(pickHead);

  // Old Table with Jacob Waltz's Journal
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.9), woodMat);
  table.position.set(0, 0.4, 0);
  dugoutGroup.add(table);

  const journalMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.06, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.6 })
  );
  journalMesh.position.set(0, 0.83, 0);
  dugoutGroup.add(journalMesh);

  scene.add(dugoutGroup);

  // ==========================================
  // 6. Eye of the Needle Bluff
  // ==========================================
  const eyeGroup = new THREE.Group();
  const eyeY = getTerrainHeight(130, -40);
  eyeGroup.position.set(130, eyeY, -40);

  // High bluff arch with a hollow center aperture
  const archPillar1 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.5, 12, 7), needleRockMat);
  archPillar1.position.set(-3.5, 6, 0);
  archPillar1.castShadow = true;
  eyeGroup.add(archPillar1);

  const archPillar2 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.5, 12, 7), needleRockMat);
  archPillar2.position.set(3.5, 6, 0);
  archPillar2.castShadow = true;
  eyeGroup.add(archPillar2);

  const archLintel = new THREE.Mesh(new THREE.BoxGeometry(9, 3, 3.5), needleRockMat);
  archLintel.position.set(0, 12, 0);
  archLintel.castShadow = true;
  eyeGroup.add(archLintel);

  // Golden ray pointer marker
  const pointerPillar = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.5, 4), needleRockMat);
  pointerPillar.position.set(0, 1.2, 4);
  eyeGroup.add(pointerPillar);

  scene.add(eyeGroup);

  // ==========================================
  // 7. The Lost Dutchman Mine Shaft & Secret Canyon
  // ==========================================
  const mineGroup = new THREE.Group();
  const mineY = getTerrainHeight(160, 110);
  mineGroup.position.set(160, mineY, 110);

  // Imposing canyon cleft rocks surrounding the entrance
  const cleftRock1 = new THREE.Mesh(new THREE.BoxGeometry(10, 16, 8), needleRockMat);
  cleftRock1.position.set(-6, 8, 0);
  cleftRock1.castShadow = true;
  mineGroup.add(cleftRock1);

  const cleftRock2 = new THREE.Mesh(new THREE.BoxGeometry(10, 16, 8), needleRockMat);
  cleftRock2.position.set(6, 8, 0);
  cleftRock2.castShadow = true;
  mineGroup.add(cleftRock2);

  const cliffCap = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 10), needleRockMat);
  cliffCap.position.set(0, 17, 0);
  cliffCap.castShadow = true;
  mineGroup.add(cliffCap);

  // Heavy timber portal frame
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.95 });
  const timberL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.5, 0.6), beamMat);
  timberL.position.set(-2.2, 2.7, 4);
  timberL.castShadow = true;
  mineGroup.add(timberL);

  const timberR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.5, 0.6), beamMat);
  timberR.position.set(2.2, 2.7, 4);
  timberR.castShadow = true;
  mineGroup.add(timberR);

  const timberTop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.6, 0.6), beamMat);
  timberTop.position.set(0, 5.2, 4);
  timberTop.castShadow = true;
  mineGroup.add(timberTop);

  // Wooden portal sign
  const mineSign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 0.1), beamMat);
  mineSign.position.set(0, 6.0, 4.1);
  mineGroup.add(mineSign);

  // Rusted Ore Cart on rails
  const cartGroup = new THREE.Group();
  cartGroup.position.set(0, 0, 7);
  const cartBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.1, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x5a4a42, metalness: 0.7, roughness: 0.6 })
  );
  cartBody.position.y = 1.0;
  cartGroup.add(cartBody);

  // Rich gold ore lumps inside the cart
  const cartGold = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.5, 1),
    new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.2, emissive: 0x664400, emissiveIntensity: 0.4 })
  );
  cartGold.position.set(0, 1.6, 0);
  cartGroup.add(cartGold);

  // Wooden mine rails
  const railMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 });
  for (const rx of [-0.6, 0.6]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 14), railMat);
    rail.position.set(rx, 0.1, 2);
    mineGroup.add(rail);
  }
  mineGroup.add(cartGroup);

  // Dark mine entrance tunnel (black interior plane / doorway)
  const tunnelBlack = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 5.0),
    new THREE.MeshBasicMaterial({ color: 0x050302, side: THREE.DoubleSide })
  );
  tunnelBlack.position.set(0, 2.5, 3.8);
  mineGroup.add(tunnelBlack);

  // Glowing lantern on post
  const lanternLight = new THREE.PointLight(0xffa500, 2.5, 15);
  lanternLight.position.set(2.2, 3.2, 4.3);
  mineGroup.add(lanternLight);

  const lanternMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 0.4, 6),
    new THREE.MeshStandardMaterial({ color: 0xffeedd, emissive: 0xffaa33, emissiveIntensity: 1.0 })
  );
  lanternMesh.position.copy(lanternLight.position);
  mineGroup.add(lanternMesh);

  scene.add(mineGroup);

  // ==========================================
  // 8. Hidden Mine Drift Interior Chamber
  // Positioned in a separate hollow cave space beneath/behind the entrance
  // ==========================================
  const mineInterior = new THREE.Group();
  mineInterior.position.set(160, mineY - 0.5, 135);

  // Cave walls
  const caveGeo = new THREE.CylinderGeometry(6, 6, 8, 12, 1, true);
  const caveMat = new THREE.MeshStandardMaterial({
    color: 0x241812,
    roughness: 0.95,
    side: THREE.BackSide,
  });
  const caveWall = new THREE.Mesh(caveGeo, caveMat);
  caveWall.position.y = 4;
  mineInterior.add(caveWall);

  const caveRoof = new THREE.Mesh(new THREE.CircleGeometry(6, 12), caveMat);
  caveRoof.position.y = 8;
  caveRoof.rotateX(Math.PI / 2);
  mineInterior.add(caveRoof);

  // Timber support arches inside
  for (let tz = -4; tz <= 4; tz += 4) {
    const arch = new THREE.Group();
    arch.position.set(0, 0, tz);

    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), beamMat);
    postL.position.set(-3.2, 2.5, 0);
    arch.add(postL);

    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), beamMat);
    postR.position.set(3.2, 2.5, 0);
    arch.add(postR);

    const crossB = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 0.5), beamMat);
    crossB.position.set(0, 5, 0);
    arch.add(crossB);

    mineInterior.add(arch);
  }

  // The Mother Lode: Jacob Waltz's Gold Cache Chest & Vein
  const chestGroup = new THREE.Group();
  chestGroup.position.set(0, 0.5, 2);

  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.0, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.7 })
  );
  chest.position.y = 0.5;
  chestGroup.add(chest);

  // Open lid
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.3, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x3d200e, roughness: 0.7 })
  );
  lid.position.set(0, 1.1, -0.4);
  lid.rotation.x = -Math.PI / 4;
  chestGroup.add(lid);

  // Gold ingots & raw bonanza quartz inside the chest
  const goldBarMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.95,
    roughness: 0.15,
    emissive: 0x553300,
    emissiveIntensity: 0.5,
  });

  for (let g = 0; g < 12; g++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.6), goldBarMat);
    bar.position.set((Math.random() - 0.5) * 1.1, 0.9 + (g % 3) * 0.12, (Math.random() - 0.5) * 0.7);
    bar.rotation.y = Math.random() * 0.5;
    chestGroup.add(bar);
  }

  // Golden quartz vein running through cave back wall
  const veinMat = new THREE.MeshStandardMaterial({
    color: 0xffe066,
    metalness: 0.9,
    roughness: 0.2,
    emissive: 0x664400,
    emissiveIntensity: 0.6,
  });
  for (let v = 0; v < 8; v++) {
    const veinChunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 1), veinMat);
    veinChunk.position.set(Math.sin(v) * 2.5, 2 + v * 0.6, 5.2);
    mineInterior.add(veinChunk);
  }

  // Warm interior lantern light
  const caveLight = new THREE.PointLight(0xffb74d, 3, 20);
  caveLight.position.set(0, 4.5, 0);
  mineInterior.add(caveLight);

  mineInterior.add(chestGroup);
  scene.add(mineInterior);

  return {
    weaversNeedle: needleGroup,
    trailhead: trailheadGroup,
    spring: springGroup,
    massacre: massacreGroup,
    dugout: dugoutGroup,
    eyeRock: eyeGroup,
    mine: mineGroup,
    mineInterior,
    waterRefillPoints,
  };
}
