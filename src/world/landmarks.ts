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
  tortillaFlat: THREE.Group;
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
  // Geologically authentic model of Arizona's iconic 1,000-ft volcanic plug.
  // Features:
  // - Monolithic dacite neck with steep, near-vertical columnar jointing facets
  // - North-South elongated profile matching the real landmark
  // - Iconic summit saddle notch (the "Needle's Eye") cleanly dividing the sharp North Fang from the South Shoulder
  // - Sweeping volcanic talus apron with radiating jagged volcanic dikes & fallen talus boulders
  const needleGroup = new THREE.Group();
  const needleY = getTerrainHeight(80, 15);
  needleGroup.position.set(80, needleY, 15);

  const spireHeight = 82;
  const spireRadial = 44;
  const spireHeightSegs = 56;
  const spireGeo = new THREE.CylinderGeometry(3.6, 22.0, spireHeight, spireRadial, spireHeightSegs, false);
  const sPos = spireGeo.attributes.position;
  const sColors = new Float32Array(sPos.count * 3);

  for (let i = 0; i < sPos.count; i++) {
    let px = sPos.getX(i);
    let py = sPos.getY(i);
    let pz = sPos.getZ(i);

    const t = (py + spireHeight / 2) / spireHeight; // 0.0 at base to 1.0 at summit
    const angle = Math.atan2(pz, px);
    const radius = Math.hypot(px, pz);

    // 1. Talus apron flare at base (t < 0.28)
    const talusFlaring = t < 0.28 ? 1.0 + Math.pow((0.28 - t) / 0.28, 2.2) * 1.35 : 1.0;

    // 2. Sheer volcanic columnar fluting and horizontal strata shelves (middle shaft)
    const fluting = Math.cos(angle * 8.0) * 0.16 + Math.sin(angle * 16.0) * 0.06;
    const horizontalLedges = Math.sin(t * 26.0) * 0.05 * (1.0 - t * 0.35);
    const sheerFacets = 1.0 - Math.pow(Math.sin(angle), 4.0) * 0.14;

    // 3. Iconic Summit Saddle Notch ("The Needle's Eye", t >= 0.80)
    // In real life, the summit splits along the North-South (Z) axis into:
    // - Central V-notch saddle cleft (drops down significantly)
    // - High, sharp North Fang (towers on Z > 0)
    // - Weathered South Shoulder (broad crag on Z < 0)
    if (t >= 0.80) {
      const s = (t - 0.80) / 0.20; // 0.0 to 1.0 within the summit zone
      const zn = Math.sin(angle); // -1.0 (South) to +1.0 (North)

      if (Math.abs(zn) < 0.40) {
        // Deep V-shaped saddle notch cleft
        const notchDepth = (1.0 - Math.pow(Math.abs(zn) / 0.40, 2.0)) * 12.0 * s;
        py -= notchDepth;
      } else if (zn > 0.22) {
        // North Fang (tall sharp eagle-beak needle point)
        const fangRise = Math.pow((zn - 0.22) / 0.78, 1.4) * 8.2 * s;
        py += fangRise;
      } else if (zn < -0.22) {
        // South Shoulder (weathered twin crown)
        const shoulderRise = Math.pow((-zn - 0.22) / 0.78, 1.5) * 4.2 * s;
        py += shoulderRise + Math.sin(angle * 4.0) * 0.8 * s;
      }
    }

    // 4. North-South Elliptical Aspect Ratio (wider along Z, narrower across X)
    const newRadius = radius * talusFlaring * (1.0 + fluting + horizontalLedges) * sheerFacets;
    px = Math.cos(angle) * newRadius * 0.82;
    pz = Math.sin(angle) * newRadius * 1.34;

    // Micro-rock roughness displacement
    px += Math.sin(py * 1.6 + angle * 3.0) * 0.25;
    pz += Math.cos(py * 1.8 + angle * 4.0) * 0.25;

    sPos.setX(i, px);
    sPos.setY(i, py);
    sPos.setZ(i, pz);

    // 5. Authentic Arizona Volcanic Dacite & Desert Varnish Color Palette
    const strataBand = Math.sin(py * 0.45) * 0.5 + 0.5;
    const varnishStreaks = Math.cos(py * 2.2 + angle * 4.0) * 0.5 + 0.5;

    let r = 0.65;
    let g = 0.32;
    let b = 0.18;

    if (t > 0.82) {
      // Weathered summit crests: deep manganese patina from atmospheric exposure
      r = 0.32 + strataBand * 0.08;
      g = 0.22 + strataBand * 0.06;
      b = 0.17 + strataBand * 0.04;
    } else if (fluting < -0.04 || varnishStreaks > 0.75) {
      // Water-erosion runoff gullies with dark desert varnish
      r = 0.26 + varnishStreaks * 0.06;
      g = 0.18 + varnishStreaks * 0.04;
      b = 0.14 + varnishStreaks * 0.03;
    } else if (strataBand > 0.65) {
      // Golden buff welded tuff ledges
      r = 0.76 + varnishStreaks * 0.06;
      g = 0.52 + varnishStreaks * 0.05;
      b = 0.32 + varnishStreaks * 0.04;
    } else if (t < 0.26) {
      // Basal talus scree gravel
      r = 0.72 + strataBand * 0.05;
      g = 0.54 + strataBand * 0.04;
      b = 0.38 + strataBand * 0.03;
    } else {
      // Terracotta volcanic dacite sheer cliff walls
      r = 0.66 + varnishStreaks * 0.05;
      g = 0.31 + varnishStreaks * 0.04;
      b = 0.18 + varnishStreaks * 0.03;
    }

    sColors[i * 3] = r;
    sColors[i * 3 + 1] = g;
    sColors[i * 3 + 2] = b;
  }

  spireGeo.setAttribute('color', new THREE.BufferAttribute(sColors, 3));
  spireGeo.computeVertexNormals();

  const needleRockMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.90,
    metalness: 0.06,
    side: THREE.DoubleSide,
    flatShading: false,
  });

  const spire = new THREE.Mesh(spireGeo, needleRockMat);
  spire.position.y = spireHeight * 0.5 - 2.0;
  spire.castShadow = true;
  spire.receiveShadow = true;
  spire.frustumCulled = false;
  needleGroup.add(spire);

  // Radiating Volcanic Dike Fins & Scree Buttresses:
  // In real Superstition geology, intrusive volcanic dikes radiate from volcanic plugs.
  // We model 3 natural jagged knife-edge rock fins branching down the slopes.
  const dikeConfigs = [
    { angle: -Math.PI * 0.65, length: 36, startH: 22, endH: 3, width: 4.8 }, // Toward Needle Canyon
    { angle: 0.15, length: 32, startH: 18, endH: 2.5, width: 4.2 },           // Toward Bluff Spring
    { angle: Math.PI * 0.55, length: 34, startH: 20, endH: 3.2, width: 4.5 }, // Toward Peralta Ridge
  ];

  dikeConfigs.forEach((dike) => {
    const dikeGeo = new THREE.BoxGeometry(dike.width, dike.startH, dike.length, 4, 8, 8);
    const dPos = dikeGeo.attributes.position;
    const dCols = new Float32Array(dPos.count * 3);

    for (let j = 0; j < dPos.count; j++) {
      let dx = dPos.getX(j);
      let dy = dPos.getY(j);
      let dz = dPos.getZ(j);

      const zNorm = (dz + dike.length / 2) / dike.length; // 0 near needle to 1 at far tip
      // Taper height as dike extends away from the central spire
      dy *= (1.0 - zNorm * 0.75);

      // Serrated knife-edge ridge crest on top
      if (dy > 0) {
        dy += Math.sin(zNorm * 18.0) * 1.4 + Math.cos(dx * 2.0) * 0.8;
      }
      // Stepped jointing on sides
      dx *= (1.0 + Math.sin(dy * 1.2) * 0.2);

      dPos.setX(j, dx);
      dPos.setY(j, dy);
      dPos.setZ(j, dz);

      // Desert varnish and terracotta color
      const isCrest = dy > dike.startH * 0.25;
      dCols[j * 3] = isCrest ? 0.42 : 0.64;
      dCols[j * 3 + 1] = isCrest ? 0.26 : 0.36;
      dCols[j * 3 + 2] = isCrest ? 0.18 : 0.22;
    }

    dikeGeo.setAttribute('color', new THREE.BufferAttribute(dCols, 3));
    dikeGeo.computeVertexNormals();

    const dikeMesh = new THREE.Mesh(dikeGeo, needleRockMat);
    const distFromCenter = 16 + dike.length * 0.42;
    dikeMesh.position.set(
      Math.cos(dike.angle) * distFromCenter,
      dike.startH * 0.35,
      Math.sin(dike.angle) * distFromCenter
    );
    dikeMesh.rotation.y = -dike.angle + Math.PI / 2;
    dikeMesh.castShadow = true;
    dikeMesh.receiveShadow = true;
    needleGroup.add(dikeMesh);
  });

  // Giant Fallen Dacite Corestone Boulders on the talus apron
  const talusBoulders = [
    { x: -14, z: 12, size: 5.4, rot: 0.4 },
    { x: 16, z: -10, size: 4.8, rot: 1.2 },
    { x: -10, z: -18, size: 6.2, rot: 2.1 },
    { x: 18, z: 15, size: 5.0, rot: 0.8 },
    { x: 0, z: 22, size: 4.2, rot: 1.7 },
  ];

  talusBoulders.forEach((tb) => {
    const bGeo = new THREE.DodecahedronGeometry(tb.size, 1);
    const bPos = bGeo.attributes.position;
    const bCols = new Float32Array(bPos.count * 3);

    for (let k = 0; k < bPos.count; k++) {
      let bx = bPos.getX(k);
      let by = bPos.getY(k);
      let bz = bPos.getZ(k);

      // Chiseled angular talus fracture
      bx *= 1.0 + Math.sin(by * 1.5) * 0.22;
      by *= 0.78; // Slightly flattened tabular block
      bz *= 1.0 + Math.cos(bx * 1.4) * 0.22;

      bPos.setX(k, bx);
      bPos.setY(k, by);
      bPos.setZ(k, bz);

      bCols[k * 3] = 0.58 + Math.sin(k) * 0.08;
      bCols[k * 3 + 1] = 0.32 + Math.cos(k) * 0.05;
      bCols[k * 3 + 2] = 0.20 + Math.sin(k * 2) * 0.04;
    }

    bGeo.setAttribute('color', new THREE.BufferAttribute(bCols, 3));
    bGeo.computeVertexNormals();

    const boulderMesh = new THREE.Mesh(bGeo, needleRockMat);
    boulderMesh.position.set(tb.x, tb.size * 0.42, tb.z);
    boulderMesh.rotation.set(0.2, tb.rot, -0.15);
    boulderMesh.castShadow = true;
    boulderMesh.receiveShadow = true;
    needleGroup.add(boulderMesh);
  });

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

  // ==========================================
  // 9. Historic Town of Tortilla Flat (1880s Frontier Settlement)
  // Stagecoach stop along the Apache Trail with the Saloon, Mercantile,
  // Sheriff's Jail, Concord Stagecoach, Water Tower & Spring Trough
  // ==========================================
  const tortillaGroup = new THREE.Group();
  const townX = -15;
  const townZ = -150;
  const townY = getTerrainHeight(townX, townZ);
  tortillaGroup.position.set(townX, townY, townZ);

  // Canvas sign texture helper for authentic 1880s Western lettering
  function makeWoodSignTexture(title: string, sub: string = '', width = 512, height = 128) {
    if (typeof document === 'undefined') return new THREE.Texture();
    const cvs = document.createElement('canvas');
    cvs.width = width;
    cvs.height = height;
    const ctx = cvs.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#2b1b11';
      ctx.fillRect(0, 0, width, height);
      // Outer border & inner gold pinstripe
      ctx.strokeStyle = '#57351c';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, width - 8, height - 8);
      ctx.strokeStyle = '#c69947';
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Title
      ctx.fillStyle = '#f6e4be';
      ctx.font = 'bold 36px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, width / 2, sub ? height * 0.4 : height / 2);

      // Subtitle
      if (sub) {
        ctx.font = 'italic 18px serif';
        ctx.fillStyle = '#d4ac61';
        ctx.fillText(sub, width / 2, height * 0.74);
      }
    }
    const tex = new THREE.CanvasTexture(cvs);
    tex.needsUpdate = true;
    return tex;
  }

  // Shared Town Materials
  const tfWoodDark = new THREE.MeshStandardMaterial({ color: 0x3d2616, roughness: 0.94 });
  const tfWoodWeathered = new THREE.MeshStandardMaterial({ color: 0x543c29, roughness: 0.92 });
  const tfWoodPlank = new THREE.MeshStandardMaterial({ color: 0x694e36, roughness: 0.88 });
  const tfStoneWall = new THREE.MeshStandardMaterial({ color: 0x584c42, roughness: 0.95 });
  const tfIron = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.85, roughness: 0.4 });
  const tfBrass = new THREE.MeshStandardMaterial({ color: 0xc89832, metalness: 0.9, roughness: 0.3 });
  const tfWaterMat = new THREE.MeshStandardMaterial({
    color: 0x2b8ea8,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });

  // A. Main Street Dirt Road Bed
  const street = new THREE.Mesh(new THREE.BoxGeometry(14, 0.08, 48), new THREE.MeshStandardMaterial({ color: 0x7a5b3e, roughness: 0.98 }));
  street.position.set(0, 0.04, 0);
  street.receiveShadow = true;
  tortillaGroup.add(street);

  // Wagon wheel rut impressions in dirt
  for (const rx of [-2.4, 2.4]) {
    const rut = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 46), new THREE.MeshStandardMaterial({ color: 0x5e442c, roughness: 0.99 }));
    rut.position.set(rx, 0.07, 0);
    tortillaGroup.add(rut);
  }

  // B. Raised Wooden Boardwalk Porches
  // West boardwalk (in front of Saloon & Mercantile)
  const westBoardwalk = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.28, 38), tfWoodPlank);
  westBoardwalk.position.set(-8.8, 0.14, 0);
  westBoardwalk.receiveShadow = true;
  westBoardwalk.castShadow = true;
  tortillaGroup.add(westBoardwalk);

  // East boardwalk (in front of Jail & Sheriff)
  const eastBoardwalk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 24), tfWoodPlank);
  eastBoardwalk.position.set(8.8, 0.14, -6);
  eastBoardwalk.receiveShadow = true;
  eastBoardwalk.castShadow = true;
  tortillaGroup.add(eastBoardwalk);

  // ------------------------------------------------------------------
  // 1. THE TORTILLA FLAT SALOON & RESTAURANT
  // ------------------------------------------------------------------
  const saloonGroup = new THREE.Group();
  saloonGroup.position.set(-14.5, 0, 4);

  // Main Saloon Hall Building
  const saloonBody = new THREE.Mesh(new THREE.BoxGeometry(8.5, 6.2, 12), tfWoodWeathered);
  saloonBody.position.set(0, 3.1, 0);
  saloonBody.castShadow = true;
  saloonBody.receiveShadow = true;
  saloonGroup.add(saloonBody);

  // Western False-Front Stepped Parapet Facade
  const saloonFacade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8.2, 12.4), tfWoodDark);
  saloonFacade.position.set(4.25, 4.1, 0);
  saloonFacade.castShadow = true;
  saloonGroup.add(saloonFacade);

  // Decorative stepped top cornice on false front
  const corniceTop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 6.5), tfWoodDark);
  corniceTop.position.set(4.25, 8.7, 0);
  corniceTop.castShadow = true;
  saloonGroup.add(corniceTop);

  // Saloon Painted Front Sign
  const saloonSignTex = makeWoodSignTexture('TORTILLA FLAT SALOON', 'EST. 1880 - COLD SARSAPARILLA & WHISKEY');
  const saloonSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 1.6, 8.5),
    new THREE.MeshStandardMaterial({ map: saloonSignTex, roughness: 0.7 })
  );
  saloonSign.position.set(4.55, 6.8, 0);
  saloonSign.rotation.y = -Math.PI / 2;
  saloonSign.castShadow = true;
  saloonGroup.add(saloonSign);

  // Covered Porch Overhang & Heavy Timber Posts
  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 12.6), tfWoodDark);
  porchRoof.position.set(5.8, 4.4, 0);
  porchRoof.rotation.z = -0.12;
  porchRoof.castShadow = true;
  saloonGroup.add(porchRoof);

  for (let pz = -5.2; pz <= 5.2; pz += 3.4) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.2, 0.32), tfWoodDark);
    post.position.set(7.4, 2.1, pz);
    post.castShadow = true;
    saloonGroup.add(post);
  }

  // Classic Swinging Batwing Doors
  const doorHole = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.8), new THREE.MeshBasicMaterial({ color: 0x0a0604 }));
  doorHole.position.set(4.47, 1.6, 0);
  doorHole.rotation.y = Math.PI / 2;
  saloonGroup.add(doorHole);

  for (const dz of [-0.42, 0.42]) {
    const batwing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.75), tfWoodPlank);
    batwing.position.set(4.48, 1.6, dz);
    batwing.castShadow = true;
    saloonGroup.add(batwing);
  }

  // Porch Wooden Bench & Whiskey Barrels
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 2.4), tfWoodPlank);
  bench.position.set(6.4, 0.4, 3.8);
  bench.castShadow = true;
  saloonGroup.add(bench);

  for (let b = 0; b < 3; b++) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.05, 10), tfWoodDark);
    barrel.position.set(6.2 + (b % 2) * 0.5, 0.55, -4.2 - b * 0.7);
    barrel.castShadow = true;
    saloonGroup.add(barrel);
  }

  // Hitching Rail with Saddle Barstools
  const hitchRail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6.5), tfWoodDark);
  hitchRail.position.set(8.2, 1.1, 0);
  hitchRail.rotation.x = Math.PI / 2;
  hitchRail.castShadow = true;
  saloonGroup.add(hitchRail);

  for (const hpz of [-2.8, 0, 2.8]) {
    const hPost = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), tfWoodDark);
    hPost.position.set(8.2, 0.6, hpz);
    saloonGroup.add(hPost);
  }

  // Warm glowing interior porch lantern
  const saloonLight = new THREE.PointLight(0xff9933, 2.8, 16);
  saloonLight.position.set(5.5, 3.5, 0);
  saloonGroup.add(saloonLight);

  const saloonLanternMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.38, 6), tfBrass);
  saloonLanternMesh.position.copy(saloonLight.position);
  saloonGroup.add(saloonLanternMesh);

  tortillaGroup.add(saloonGroup);

  // ------------------------------------------------------------------
  // 2. MERCANTILE TRADING POST & ASSAY OFFICE
  // ------------------------------------------------------------------
  const storeGroup = new THREE.Group();
  storeGroup.position.set(-14.5, 0, -11);

  const storeBody = new THREE.Mesh(new THREE.BoxGeometry(8.2, 5.4, 9), tfWoodPlank);
  storeBody.position.set(0, 2.7, 0);
  storeBody.castShadow = true;
  storeBody.receiveShadow = true;
  storeGroup.add(storeBody);

  const storeFacade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.0, 9.4), tfWoodDark);
  storeFacade.position.set(4.1, 3.5, 0);
  storeFacade.castShadow = true;
  storeGroup.add(storeFacade);

  const storeSignTex = makeWoodSignTexture('GENERAL MERCANTILE & ASSAY', 'PROVISIONS - MINING HARDWARE - ORE WEIGHED');
  const storeSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 1.4, 7.8),
    new THREE.MeshStandardMaterial({ map: storeSignTex, roughness: 0.7 })
  );
  storeSign.position.set(4.35, 5.8, 0);
  storeSign.rotation.y = -Math.PI / 2;
  storeSign.castShadow = true;
  storeGroup.add(storeSign);

  // Stacked mining dynamite crates, sacks & pickaxes
  for (let c = 0; c < 4; c++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.85), tfWoodWeathered);
    crate.position.set(5.8 + (c % 2) * 0.6, 0.45 + (c > 1 ? 0.6 : 0), -2.2 + Math.floor(c / 2) * 0.9);
    crate.castShadow = true;
    storeGroup.add(crate);
  }

  // Outdoor Assayer gold balance scale table
  const assayTable = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 1.8), tfWoodDark);
  assayTable.position.set(6.2, 0.5, 2.2);
  assayTable.castShadow = true;
  storeGroup.add(assayTable);

  const goldScale = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.6), tfBrass);
  goldScale.position.set(6.2, 1.1, 2.2);
  storeGroup.add(goldScale);

  tortillaGroup.add(storeGroup);

  // ------------------------------------------------------------------
  // 3. TORTILLA FLAT SHERIFF & TOWN JAIL
  // ------------------------------------------------------------------
  const jailGroup = new THREE.Group();
  jailGroup.position.set(13.5, 0, -8);

  const jailBody = new THREE.Mesh(new THREE.BoxGeometry(7.5, 4.8, 8.5), tfStoneWall);
  jailBody.position.set(0, 2.4, 0);
  jailBody.castShadow = true;
  jailBody.receiveShadow = true;
  jailGroup.add(jailBody);

  const jailSignTex = makeWoodSignTexture('SHERIFF & TOWN JAIL', 'TORTILLA FLAT MARSHAL - TERRITORY OF ARIZONA');
  const jailSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 1.2, 6.2),
    new THREE.MeshStandardMaterial({ map: jailSignTex, roughness: 0.7 })
  );
  jailSign.position.set(-3.85, 4.2, 0);
  jailSign.rotation.y = Math.PI / 2;
  jailSign.castShadow = true;
  jailGroup.add(jailSign);

  // Iron-barred jail window
  const barWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.0), new THREE.MeshBasicMaterial({ color: 0x080808 }));
  barWindow.position.set(-3.76, 2.5, 2.2);
  barWindow.rotation.y = -Math.PI / 2;
  jailGroup.add(barWindow);

  for (let b = -0.4; b <= 0.4; b += 0.2) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0), tfIron);
    bar.position.set(-3.78, 2.5, 2.2 + b);
    jailGroup.add(bar);
  }

  // Heavy timber jail door with bronze sheriff star
  const jailDoor = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.6, 1.4), tfWoodDark);
  jailDoor.position.set(-3.8, 1.4, -1.5);
  jailGroup.add(jailDoor);

  const starBadge = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), tfBrass);
  starBadge.position.set(-3.9, 1.8, -1.5);
  jailGroup.add(starBadge);

  tortillaGroup.add(jailGroup);

  // ------------------------------------------------------------------
  // 4. LIVERY STABLE, CORRAL & BLACKSMITH FORGE
  // ------------------------------------------------------------------
  const liveryGroup = new THREE.Group();
  liveryGroup.position.set(14.0, 0, 8);

  // Open timber barn with pitched roof
  const barnRoof = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.3, 10.5), tfWoodDark);
  barnRoof.position.set(0, 4.4, 0);
  barnRoof.rotation.z = 0.2;
  barnRoof.castShadow = true;
  liveryGroup.add(barnRoof);

  // Barn timber posts
  for (const bx of [-3.5, 3.5]) {
    for (const bz of [-4.5, 0, 4.5]) {
      const bPost = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.4, 0.35), tfWoodWeathered);
      bPost.position.set(bx, 2.2, bz);
      bPost.castShadow = true;
      liveryGroup.add(bPost);
    }
  }

  // Golden Hay Bales
  const hayMat = new THREE.MeshStandardMaterial({ color: 0xc4a045, roughness: 0.98 });
  for (let h = 0; h < 6; h++) {
    const bale = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 0.8), hayMat);
    bale.position.set(-1.8 + (h % 2) * 1.3, 0.4 + Math.floor(h / 2) * 0.65, -2.5 + (h % 3) * 0.4);
    bale.castShadow = true;
    liveryGroup.add(bale);
  }

  // Blacksmith anvil on timber stump
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.75, 8), tfWoodDark);
  stump.position.set(1.5, 0.4, 2.5);
  stump.castShadow = true;
  liveryGroup.add(stump);

  const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.95), tfIron);
  anvil.position.set(1.5, 0.9, 2.5);
  anvil.castShadow = true;
  liveryGroup.add(anvil);

  // Wooden split-rail corral fence
  const fenceMat = tfWoodWeathered;
  for (let fz = -4; fz <= 6; fz += 2.5) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4), fenceMat);
    post.position.set(5.5, 0.7, fz);
    liveryGroup.add(post);
  }
  for (let fy of [0.6, 1.1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 10.5), fenceMat);
    rail.position.set(5.5, fy, 1);
    liveryGroup.add(rail);
  }

  tortillaGroup.add(liveryGroup);

  // ------------------------------------------------------------------
  // 5. ELEVATED WOODEN WATER TOWER & SPRING WATER TROUGH
  // Connected to waterRefillPoints for 100% Canteen Hydration
  // ------------------------------------------------------------------
  const waterTowerGroup = new THREE.Group();
  waterTowerGroup.position.set(-12.5, 0, 15);

  // 4 Tall heavy timber stilt legs
  for (const tx of [-1.5, 1.5]) {
    for (const tz of [-1.5, 1.5]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.38, 6.2, 0.38), tfWoodDark);
      leg.position.set(tx, 3.1, tz);
      leg.castShadow = true;
      waterTowerGroup.add(leg);
    }
  }

  // Horizontal and diagonal cross-ties
  const platform = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.3, 4.2), tfWoodPlank);
  platform.position.set(0, 6.2, 0);
  platform.castShadow = true;
  waterTowerGroup.add(platform);

  // Round Cedar Water Cistern Tank
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 2.8, 14), tfWoodWeathered);
  tank.position.set(0, 7.7, 0);
  tank.castShadow = true;
  waterTowerGroup.add(tank);

  // Iron compression hoops on cistern
  for (const hy of [6.7, 7.7, 8.7]) {
    const hoop = new THREE.Mesh(new THREE.CylinderGeometry(2.14, 2.14, 0.08, 14), tfIron);
    hoop.position.set(0, hy, 0);
    waterTowerGroup.add(hoop);
  }

  // Conical cedar roof
  const tankRoof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.2, 14), tfWoodDark);
  tankRoof.position.set(0, 9.7, 0);
  tankRoof.castShadow = true;
  waterTowerGroup.add(tankRoof);

  // Water downspout pipe pouring into the horse trough
  const downspout = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.8), tfIron);
  downspout.position.set(2.2, 3.2, 0);
  waterTowerGroup.add(downspout);

  // Long Carved Cedar Horse Water Trough
  const trough = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 3.6), tfWoodPlank);
  trough.position.set(3.2, 0.35, 0);
  trough.castShadow = true;
  waterTowerGroup.add(trough);

  // Clear spring water mesh inside trough
  const troughWater = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 3.3), tfWaterMat);
  troughWater.position.set(3.2, 0.6, 0);
  waterTowerGroup.add(troughWater);

  // Sign on water tower: "TORTILLA FLAT ARTESIAN WELL"
  const wellSignTex = makeWoodSignTexture('ARTESIAN WELL WATER', 'FREE SPRING WATER FOR HORSES & PROSPECTORS');
  const wellSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.8, 3.4),
    new THREE.MeshStandardMaterial({ map: wellSignTex, roughness: 0.7 })
  );
  wellSign.position.set(2.0, 5.4, 0);
  wellSign.rotation.y = -Math.PI / 2;
  waterTowerGroup.add(wellSign);

  // Register water refill point in world coordinates!
  waterRefillPoints.push(new THREE.Vector3(townX - 9.3, townY + 0.6, townZ + 15));

  tortillaGroup.add(waterTowerGroup);

  // ------------------------------------------------------------------
  // 6. HISTORIC CONCORD OVERLAND STAGECOACH
  // ------------------------------------------------------------------
  const coachGroup = new THREE.Group();
  coachGroup.position.set(0, 0, -2);
  coachGroup.rotation.y = 0.08;

  const coachRedMat = new THREE.MeshStandardMaterial({ color: 0x822416, roughness: 0.65 });
  const coachYellowMat = new THREE.MeshStandardMaterial({ color: 0xd99f2b, roughness: 0.5 });
  const coachCanvasMat = new THREE.MeshStandardMaterial({ color: 0xc8b693, roughness: 0.95 });

  // Main Coach Cabin Body
  const coachBody = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.85, 3.4), coachRedMat);
  coachBody.position.set(0, 1.85, 0);
  coachBody.castShadow = true;
  coachGroup.add(coachBody);

  // Curved passenger doors & windows (black insets)
  for (const cx of [-1.06, 1.06]) {
    const doorOutline = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4), new THREE.MeshBasicMaterial({ color: 0x1a0805 }));
    doorOutline.position.set(cx, 1.85, 0);
    doorOutline.rotation.y = cx > 0 ? Math.PI / 2 : -Math.PI / 2;
    coachGroup.add(doorOutline);
  }

  // Driver's Elevated Bench Seat & Footboard
  const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 0.9), coachRedMat);
  driverSeat.position.set(0, 2.5, 1.6);
  driverSeat.castShadow = true;
  coachGroup.add(driverSeat);

  const footboard = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.15, 0.7), tfWoodDark);
  footboard.position.set(0, 2.05, 2.1);
  coachGroup.add(footboard);

  // Roof Luggage Railing with Canvas Covered Baggage & Trunks
  const roofRail = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.25, 2.6), tfIron);
  roofRail.position.set(0, 2.9, -0.3);
  coachGroup.add(roofRail);

  for (let t = 0; t < 3; t++) {
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.65), coachCanvasMat);
    trunk.position.set((t - 1) * 0.6, 3.15, -0.3 + (t % 2) * 0.3);
    trunk.castShadow = true;
    coachGroup.add(trunk);
  }

  // 4 Large Spoked Wooden Wheels
  // Rear Wheels (large, 1.6m diam)
  for (const wx of [-1.2, 1.2]) {
    const rWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.16, 16), coachYellowMat);
    rWheel.position.set(wx, 0.8, -1.2);
    rWheel.rotation.z = Math.PI / 2;
    rWheel.castShadow = true;
    coachGroup.add(rWheel);
  }

  // Front Wheels (smaller, 1.2m diam)
  for (const wx of [-1.15, 1.15]) {
    const fWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.16, 16), coachYellowMat);
    fWheel.position.set(wx, 0.6, 1.2);
    fWheel.rotation.z = Math.PI / 2;
    fWheel.castShadow = true;
    coachGroup.add(fWheel);
  }

  // Horse Hitch Pole extending forward
  const hitchPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2), tfWoodDark);
  hitchPole.position.set(0, 0.5, 3.8);
  hitchPole.rotation.x = Math.PI / 2;
  coachGroup.add(hitchPole);

  // Carriage Brass Lanterns
  for (const lx of [-1.15, 1.15]) {
    const cLantern = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.2), tfBrass);
    cLantern.position.set(lx, 2.6, 1.6);
    coachGroup.add(cLantern);
  }

  tortillaGroup.add(coachGroup);

  // ------------------------------------------------------------------
  // 7. TOWN SQUARE CAMPFIRE & TRAVELERS' REST
  // ------------------------------------------------------------------
  const campGroup = new THREE.Group();
  campGroup.position.set(2.5, 0, 13.5);

  // Stone ring fire pit
  for (let a = 0; a < 10; a++) {
    const angle = (a / 10) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), tfStoneWall);
    stone.position.set(Math.cos(angle) * 1.1, 0.15, Math.sin(angle) * 1.1);
    campGroup.add(stone);
  }

  // Glowing charcoal ash bed
  const ashBed = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 12),
    new THREE.MeshStandardMaterial({ color: 0x1f0d06, emissive: 0xaa2200, emissiveIntensity: 0.8 })
  );
  ashBed.position.set(0, 0.06, 0);
  ashBed.rotation.x = -Math.PI / 2;
  campGroup.add(ashBed);

  // Charred mesquite logs
  for (let l = 0; l < 4; l++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2), tfWoodDark);
    log.position.set(0, 0.2, 0);
    log.rotation.x = 0.35;
    log.rotation.y = (l * Math.PI) / 2;
    campGroup.add(log);
  }

  // Cast iron coffee kettle on iron tripod
  const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.4, 8), tfIron);
  kettle.position.set(0, 0.45, 0);
  campGroup.add(kettle);

  // Flickering campfire light
  const campLight = new THREE.PointLight(0xff6611, 2.8, 15);
  campLight.position.set(0, 0.8, 0);
  campGroup.add(campLight);

  // Rustic split log benches for travelers
  for (const bz of [-2.2, 2.2]) {
    const benchLog = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 0.5), tfWoodWeathered);
    benchLog.position.set(0, 0.3, bz);
    campGroup.add(benchLog);
  }

  tortillaGroup.add(campGroup);

  // ------------------------------------------------------------------
  // 8. TOWN WELCOME GATEWAY & HISTORIC DISTANCE SIGNPOST
  // ------------------------------------------------------------------
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0, 23);

  // Gateway tall timber posts
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 0.4), tfWoodDark);
  postL.position.set(-4.5, 2.75, 0);
  postL.castShadow = true;
  gateGroup.add(postL);

  const postR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 0.4), tfWoodDark);
  postR.position.set(4.5, 2.75, 0);
  postR.castShadow = true;
  gateGroup.add(postR);

  const gateLintel = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.45, 0.45), tfWoodDark);
  gateLintel.position.set(0, 5.3, 0);
  gateLintel.castShadow = true;
  gateGroup.add(gateLintel);

  // Arch Welcome Sign
  const archSignTex = makeWoodSignTexture('WELCOME TO TORTILLA FLAT', 'POPULATION 6 — ELEVATION 1,720 FT — APACHE TRAIL', 600, 140);
  const archSign = new THREE.Mesh(
    new THREE.BoxGeometry(8.2, 1.4, 0.15),
    new THREE.MeshStandardMaterial({ map: archSignTex, roughness: 0.7 })
  );
  archSign.position.set(0, 4.3, 0);
  archSign.castShadow = true;
  gateGroup.add(archSign);

  tortillaGroup.add(gateGroup);

  // Mileage Fingerpost Sign
  const fingerpost = new THREE.Group();
  fingerpost.position.set(4.5, 0, 18);

  const fpPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.8), tfWoodDark);
  fpPole.position.set(0, 1.4, 0);
  fingerpost.add(fpPole);

  const trailSignTex = makeWoodSignTexture('← PERALTA TRAILHEAD 140m', 'WEAVERS NEEDLE: 190m | LOST MINE: 320m', 512, 128);
  const trailSign = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.7, 0.08),
    new THREE.MeshStandardMaterial({ map: trailSignTex, roughness: 0.7 })
  );
  trailSign.position.set(0, 2.3, 0);
  fingerpost.add(trailSign);

  tortillaGroup.add(fingerpost);

  // Add the entire historic town to the scene
  scene.add(tortillaGroup);

  return {
    weaversNeedle: needleGroup,
    trailhead: trailheadGroup,
    spring: springGroup,
    massacre: massacreGroup,
    dugout: dugoutGroup,
    eyeRock: eyeGroup,
    mine: mineGroup,
    mineInterior,
    tortillaFlat: tortillaGroup,
    waterRefillPoints,
  };
}
