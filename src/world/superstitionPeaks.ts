/**
 * Authentic 3D Topographic Structures for Real-World Superstition Peaks & Springs
 *
 * Implements:
 * - Black Top Mesa (Spanish stone arrastra, basalt caprock pillars, Peralta marker)
 * - Battleship Mountain (Knife-edge dacite prow & sheer canyon keel)
 * - Miners Needle (Pinnacled dacite twin spires with natural eyelet window)
 * - Charlebois Spring (Canyon tinaja pool, Fremont cottonwoods, fresh water oasis)
 */

import * as THREE from 'three';
import { getTerrainHeight } from './terrain';

export interface SuperstitionPeakMeshes {
  blackTopMesa: THREE.Group;
  battleshipMountain: THREE.Group;
  minersNeedle: THREE.Group;
  charleboisSpring: THREE.Group;
  fourPeaks: THREE.Group;
  laBargeUpperBox: THREE.Group;
  squawBoxCanyon: THREE.Group;
  petersCanyonAndCave: THREE.Group;
  petersMesa: THREE.Group;
}

export function buildSuperstitionPeaksAndSprings(
  scene: THREE.Scene,
  waterRefillPoints: THREE.Vector3[]
): SuperstitionPeakMeshes {
  // Shared materials
  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x4a3e36,
    roughness: 0.90,
    metalness: 0.08,
  });

  const daciteMat = new THREE.MeshStandardMaterial({
    color: 0xbe6e42,
    roughness: 0.88,
    metalness: 0.04,
  });

  const weatheredWoodMat = new THREE.MeshStandardMaterial({
    color: 0x6e5238,
    roughness: 0.95,
  });

  // =========================================================================
  // 1. Black Top Mesa (USGS Elev. 3,650 ft / 1,113m - Spanish Arrastra Tableland)
  // True USGS Position: (25, terrainY, -45) situated north of Weaver's Needle
  // between Boulder Canyon and Needle Canyon
  // =========================================================================
  const blackTopGroup = new THREE.Group();
  const btmY = getTerrainHeight(25, -45);
  blackTopGroup.position.set(25, btmY, -45);

  // Stepped basalt rim columns along perimeter (deeply rooted into mesa rim)
  const rimAngleCount = 12;
  for (let i = 0; i < rimAngleCount; i++) {
    const angle = (i / rimAngleCount) * Math.PI * 2;
    const r = 24 + Math.sin(i * 1.8) * 4;
    const colX = Math.cos(angle) * r;
    const colZ = Math.sin(angle) * r;
    const colHeight = 12 + Math.random() * 4;
    const colGeo = new THREE.CylinderGeometry(1.4, 2.0, colHeight, 6);
    const colMesh = new THREE.Mesh(colGeo, basaltMat);
    // Anchor deep into the mesa bedrock to prevent floating
    colMesh.position.set(colX, colHeight * 0.5 - 6.0, colZ);
    colMesh.rotation.y = angle + Math.random() * 0.4;
    colMesh.castShadow = true;
    colMesh.receiveShadow = true;
    blackTopGroup.add(colMesh);
  }

  // Historic Spanish Stone Arrastra (1840s gold ore grinding mill)
  const arrastraGroup = new THREE.Group();
  arrastraGroup.position.set(2, 0.2, 2);

  // Circular stone basin rim
  const basinRadius = 4.2;
  const basinSegments = 16;
  for (let i = 0; i < basinSegments; i++) {
    const th1 = (i / basinSegments) * Math.PI * 2;
    const stoneX = Math.cos(th1) * basinRadius;
    const stoneZ = Math.sin(th1) * basinRadius;
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.55 + Math.random() * 0.2),
      basaltMat
    );
    stone.position.set(stoneX, 0.35, stoneZ);
    stone.scale.set(1.4, 0.8, 1.2);
    arrastraGroup.add(stone);
  }

  // Smooth flagstone grinding floor
  const floorGeo = new THREE.CylinderGeometry(basinRadius * 0.95, basinRadius * 0.95, 0.3, 20);
  const floorMesh = new THREE.Mesh(floorGeo, basaltMat);
  floorMesh.position.set(0, 0.15, 0);
  arrastraGroup.add(floorMesh);

  // Center timber pivot post
  const postGeo = new THREE.CylinderGeometry(0.22, 0.26, 2.2, 8);
  const postMesh = new THREE.Mesh(postGeo, weatheredWoodMat);
  postMesh.position.set(0, 1.1, 0);
  arrastraGroup.add(postMesh);

  // Horizontal sweep arm
  const armGeo = new THREE.BoxGeometry(7.2, 0.22, 0.22);
  const armMesh = new THREE.Mesh(armGeo, weatheredWoodMat);
  armMesh.position.set(0, 1.4, 0);
  armMesh.rotation.y = 0.5;
  arrastraGroup.add(armMesh);

  // Drag stones (mullers) tied to arm
  const dragStone1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7), basaltMat);
  dragStone1.position.set(2.4 * Math.cos(0.5), 0.38, 2.4 * Math.sin(0.5));
  dragStone1.scale.set(1.3, 0.7, 1.1);
  arrastraGroup.add(dragStone1);

  blackTopGroup.add(arrastraGroup);
  scene.add(blackTopGroup);

  // =========================================================================
  // 2. Battleship Mountain (USGS Elev. 3,240 ft / 988m - Knife-Edge Dacite Keel)
  // Position: (-85, terrainY, -80)
  //
  // Geological reality: Battleship Mountain is an elongated, sheer dacite keel
  // rising between Boulder Canyon and Willow Springs. The mountain spine is
  // natively sculpted by terrain.ts. The summit ridge features rugged columnar
  // dacite crags, jagged fin ledges, and a summit survey cairn—deeply anchored
  // into the bedrock so NO flat-bottomed geometry or floating pyramids ever appear.
  // =========================================================================
  const battleshipGroup = new THREE.Group();
  const bmY = getTerrainHeight(-85, -80);
  battleshipGroup.position.set(-85, bmY, -80);

  // Rugged dacite crags and fins along the narrow NW-SE keel ridge
  // Axis runs at ~45 degrees (along spine). Each crag extends deeply into the terrain.
  const keelCrags = [
    // Prow fin (Northwest tip)
    { u: -16, v: 0, height: 16, width: 3.2, length: 7.0, anchor: 10 },
    // Main deck ridge crags
    { u: -8,  v: 0.5, height: 18, width: 3.8, length: 8.5, anchor: 11 },
    { u: 0,   v: 0, height: 20, width: 4.2, length: 9.0, anchor: 12 },
    { u: 8,   v: -0.5, height: 17, width: 3.8, length: 8.0, anchor: 11 },
    // Stern fin (Southeast)
    { u: 16,  v: 0, height: 14, width: 3.2, length: 6.5, anchor: 10 },
  ];

  keelCrags.forEach((crag) => {
    // Transform from along-keel coordinates (u along spine, v across keel) to world X/Z
    // Keel spine is at 45 degrees:
    const cos45 = 0.7071;
    const sin45 = 0.7071;
    const cx = crag.u * cos45 - crag.v * sin45;
    const cz = crag.u * sin45 + crag.v * cos45;

    // Create organic, weathered dacite fin geometry (no primitive cones or boxes)
    const cragGeo = new THREE.CylinderGeometry(
      crag.width * 0.4,
      crag.width * 1.2,
      crag.height + crag.anchor,
      12,
      8
    );
    const cPos = cragGeo.attributes.position;
    for (let k = 0; k < cPos.count; k++) {
      let x = cPos.getX(k);
      let y = cPos.getY(k);
      let z = cPos.getZ(k);
      // Knife-edge elongation along the spine (Z) and narrow width across (X)
      x *= 0.55;
      z *= crag.length / crag.width;
      // Irregular rock fracturing
      x += Math.sin(y * 0.8 + z * 0.5) * 0.35;
      z += Math.cos(y * 0.7 + x * 0.6) * 0.4;
      cPos.setX(k, x);
      cPos.setY(k, y);
      cPos.setZ(k, z);
    }
    cragGeo.computeVertexNormals();

    const cragMesh = new THREE.Mesh(cragGeo, daciteMat);
    // Anchor deep into the mountain ridge so it is completely seamless with terrain
    cragMesh.position.set(cx, (crag.height - crag.anchor) * 0.5, cz);
    cragMesh.rotation.y = Math.PI / 4;
    cragMesh.castShadow = true;
    cragMesh.receiveShadow = true;
    battleshipGroup.add(cragMesh);
  });

  // Fallen dacite corestones and scree along the knife-edge deck
  const battleshipBoulders = [
    { u: -12, v: 1.2, r: 2.2 },
    { u: -4,  v: -1.4, r: 2.5 },
    { u: 4,   v: 1.5, r: 2.4 },
    { u: 12,  v: -1.2, r: 2.0 },
    { u: 2,   v: -0.8, r: 1.8 },
  ];
  battleshipBoulders.forEach((bb) => {
    const bx = bb.u * 0.7071 - bb.v * 0.7071;
    const bz = bb.u * 0.7071 + bb.v * 0.7071;
    const bMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(bb.r, 1),
      daciteMat
    );
    bMesh.position.set(bx, 0.4, bz);
    bMesh.scale.set(1.3, 0.7, 1.1);
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    battleshipGroup.add(bMesh);
  });

  // Historic USGS Survey Cairn on Battleship Summit (center of ridge)
  const cairnMat = new THREE.MeshStandardMaterial({ color: 0x5a483a, roughness: 0.92 });
  const cairnMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.8, 1.4, 8), cairnMat);
  cairnMesh.position.set(0, 7.5, 0);
  battleshipGroup.add(cairnMesh);

  scene.add(battleshipGroup);

  // =========================================================================
  // 3. Miners Needle (USGS Elev. 3,680 ft / 1,122m - Pinnacled Twin Spire with Eyelet)
  // Position: (135, terrainY, 180)
  //
  // Geological reality: Iconic volcanic plug with twin pinnacles and the famous
  // natural eyelet perforation through the stone. Anchored deeply into the mountain.
  // =========================================================================
  const minersGroup = new THREE.Group();
  const mnY = getTerrainHeight(135, 180);
  minersGroup.position.set(135, mnY, 180);

  // Twin jagged dacite spires deeply rooted into bedrock
  const minersSpires = [
    { x: -3.0, z: 0, rTop: 1.8, rBottom: 5.5, height: 32, anchor: 14 },
    { x: 3.2,  z: 1.2, rTop: 1.4, rBottom: 4.8, height: 26, anchor: 14 },
  ];

  minersSpires.forEach((sp) => {
    const spGeo = new THREE.CylinderGeometry(
      sp.rTop,
      sp.rBottom,
      sp.height + sp.anchor,
      16,
      12
    );
    const spPos = spGeo.attributes.position;
    for (let k = 0; k < spPos.count; k++) {
      let px = spPos.getX(k);
      let py = spPos.getY(k);
      let pz = spPos.getZ(k);
      // Vertical columnar fluting
      const ang = Math.atan2(pz, px);
      const flute = Math.sin(ang * 8.0) * 0.15;
      px += px * flute;
      pz += pz * flute;
      spPos.setX(k, px);
      spPos.setY(k, py);
      spPos.setZ(k, pz);
    }
    spGeo.computeVertexNormals();

    const spMesh = new THREE.Mesh(spGeo, daciteMat);
    spMesh.position.set(sp.x, (sp.height - sp.anchor) * 0.5, sp.z);
    spMesh.castShadow = true;
    spMesh.receiveShadow = true;
    minersGroup.add(spMesh);
  });

  // Natural Eyelet Window Bridge connecting the spires
  const eyeletRockGeo = new THREE.CylinderGeometry(2.4, 2.8, 7.5, 10);
  const eyeletRock = new THREE.Mesh(eyeletRockGeo, daciteMat);
  eyeletRock.rotation.z = Math.PI * 0.5;
  eyeletRock.position.set(0.1, 14.0, 0.6);
  eyeletRock.castShadow = true;
  eyeletRock.receiveShadow = true;
  minersGroup.add(eyeletRock);

  scene.add(minersGroup);

  // =========================================================================
  // 4. Charlebois Spring (USGS Elev. 2,480 ft / 756m - La Barge Canyon Oasis)
  // Position: (65, terrainY, -75)
  // =========================================================================
  const charleboisGroup = new THREE.Group();
  const csY = getTerrainHeight(65, -75);
  charleboisGroup.position.set(65, csY, -75);

  // Register fresh water refill point for thirst replenishment
  waterRefillPoints.push(new THREE.Vector3(65, csY + 0.5, -75));

  // Natural canyon bedrock tinaja (pool of clear spring water)
  const poolGeo = new THREE.CylinderGeometry(5.8, 5.2, 0.6, 24);
  const poolWaterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.7,
    transparent: true,
    opacity: 0.82,
  });
  const poolMesh = new THREE.Mesh(poolGeo, poolWaterMat);
  poolMesh.position.set(0, 0.15, 0);
  charleboisGroup.add(poolMesh);

  // Mossy riparian boulders surrounding the spring
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2;
    const r = 5.6 + Math.sin(i * 2.3) * 0.8;
    const bx = Math.cos(ang) * r;
    const bz = Math.sin(ang) * r;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.2 + Math.random() * 0.6),
      new THREE.MeshStandardMaterial({
        color: 0x4a5240, // damp green-gray rock with moss
        roughness: 0.95,
      })
    );
    rock.position.set(bx, 0.6, bz);
    rock.scale.set(1.4, 0.9, 1.2);
    charleboisGroup.add(rock);
  }

  // Giant Shady Fremont Cottonwood Trees
  const treeOffsets = [
    { x: -5, z: 4, h: 14, canR: 6 },
    { x: 6, z: -3, h: 16, canR: 7 },
    { x: 2, z: 8, h: 12, canR: 5 },
  ];

  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.9,
  });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x4d7c0f, // lush cottonwood riparian foliage
    roughness: 0.75,
    flatShading: true,
  });

  treeOffsets.forEach((t) => {
    // Tree trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.7, t.h, 7),
      barkMat
    );
    trunk.position.set(t.x, t.h / 2, t.z);
    trunk.castShadow = true;
    charleboisGroup.add(trunk);

    // Tree canopy
    const canopy = new THREE.Mesh(
      new THREE.DodecahedronGeometry(t.canR),
      foliageMat
    );
    canopy.position.set(t.x, t.h + 1.5, t.z);
    canopy.scale.set(1.2, 0.85, 1.1);
    canopy.castShadow = true;
    charleboisGroup.add(canopy);
  });

  // Historic 1870s Martin Charlebois Camp Wooden Marker
  const signPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 1.8, 6),
    weatheredWoodMat
  );
  signPost.position.set(4.5, 0.9, 3.5);
  charleboisGroup.add(signPost);

  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.35, 0.06),
    weatheredWoodMat
  );
  signBoard.position.set(4.5, 1.6, 3.5);
  signBoard.rotation.y = -0.4;
  charleboisGroup.add(signBoard);

  scene.add(charleboisGroup);

  // =========================================================================
  // 5. Four Peaks Massif (USGS Elev. 7,657 ft / 2,334m - Mazatzal Mountains)
  // Real USGS Quadrangle: Four Peaks 7.5' Quad (N3337.5-W11115/7.5)
  // Geology: Proterozoic Mazatzal Quartzite (1.7 Ga) & Hydrothermal Amethyst Lode
  // Lost Dutchman Lore: Four Peaks rises Due North (azimuth 0.0° True North).
  // Gaze north along the central meridian to see all four peaks line up collinear to appear as ONE.
  // When viewed from elsewhere, they fan out into the iconic four-toothed crown.
  // =========================================================================
  const fourPeaksGroup = new THREE.Group();

  // Base massif center in game coordinates (looming Due North across Salt River canyon)
  const massifCenterX = 0.0;
  const massifCenterZ = -606.3;
  const massifBaseY = getTerrainHeight(massifCenterX, massifCenterZ);
  fourPeaksGroup.position.set(massifCenterX, massifBaseY, massifCenterZ);

  // Sightline vectors: Due North strike alignment (Azimuth 0.0° True North)
  const sightDirX = 0.0;
  const sightDirZ = -1.0;
  const sightPerpX = 1.0;
  const sightPerpZ = 0.0;

  // Unified Mazatzal Mountain Range Massif:
  // Continuous photorealistic procedural heightfield oriented along the North-South strike
  // Dimensions: 360m along strike (S: -180 to +180), 260m across strike (T: -130 to +130)
  const gridM = 110; // Along strike resolution
  const gridN = 80;  // Across strike resolution
  const minS = -180.0;
  const maxS = 180.0;
  const minT = -130.0;
  const maxT = 130.0;

  // Keypoints along the 11.5° Mazatzal crest:
  // Four iconic horns and three alpine cols, proportioned with crisp summit definition
  const crestKeypoints = [
    { s: -180, h: 0 },
    { s: -145, h: 32 },
    { s: -112, h: 88 },
    { s: -84,  h: 154 }, // Peak 4: Amethyst Peak (USGS 7,526 ft)
    { s: -56,  h: 104 }, // Amethyst Saddle & historic mine notch
    { s: -28,  h: 164 }, // Peak 3: Sister Peak (USGS 7,574 ft)
    { s: 0,    h: 108 }, // Middle Saddle
    { s: 28,   h: 174 }, // Peak 2: Brother Peak (USGS 7,644 ft)
    { s: 56,   h: 114 }, // North Saddle
    { s: 84,   h: 184 }, // Peak 1: Brown's Peak (USGS 7,657 ft - High Point)
    { s: 116,  h: 106 }, // Browns North Ridge shoulder
    { s: 148,  h: 38 },
    { s: 180,  h: 0 },
  ];

  function getCrestElevation(s: number): number {
    if (s <= -180.0 || s >= 180.0) return 0;
    for (let i = 0; i < crestKeypoints.length - 1; i++) {
      const pA = crestKeypoints[i];
      const pB = crestKeypoints[i + 1];
      if (s >= pA.s && s <= pB.s) {
        const u = (s - pA.s) / (pB.s - pA.s);
        const isPeakA = [-84, -28, 28, 84].includes(pA.s);
        const isPeakB = [-84, -28, 28, 84].includes(pB.s);

        let blend: number;
        if (isPeakA && !isPeakB) {
          blend = Math.pow(u, 0.72);
        } else if (!isPeakA && isPeakB) {
          blend = 1.0 - Math.pow(1.0 - u, 0.72);
        } else {
          blend = 0.5 - 0.5 * Math.cos(u * Math.PI);
        }
        return pA.h + (pB.h - pA.h) * blend;
      }
    }
    return 0;
  }

  function calculateMassifHeight(s: number, t: number): number {
    const crestH = getCrestElevation(s);
    const absT = Math.abs(t);

    // Radiating mountain buttress influences beneath the 4 summits
    const pInf1 = Math.exp(-Math.pow((s - 84) / 14.0, 2));
    const pInf2 = Math.exp(-Math.pow((s - 28) / 14.0, 2));
    const pInf3 = Math.exp(-Math.pow((s - -28) / 14.0, 2));
    const pInf4 = Math.exp(-Math.pow((s - -84) / 14.0, 2));
    const peakInfluence = pInf1 + pInf2 + pInf3 + pInf4;

    // Scree couloirs and chutes dropping from the saddles
    const sInf1 = Math.exp(-Math.pow((s - 56) / 12.0, 2));
    const sInf2 = Math.exp(-Math.pow((s - 0) / 12.0, 2));
    const sInf3 = Math.exp(-Math.pow((s - -56) / 12.0, 2));
    const saddleInfluence = sInf1 + sInf2 + sInf3;

    // Dramatic arête spurs projecting out into eastern & western flanks
    const buttressSpur = peakInfluence * Math.exp(-Math.pow((absT - 34.0) / 20.0, 2)) * 16.5;
    // Deep erosion chutes indenting the saddle slopes
    const couloirGully = saddleInfluence * Math.min(1.0, absT / 20.0) * Math.exp(-Math.pow(absT / 52.0, 2)) * 12.5;

    // Natural concave mountain slope: steep alpine cliffs near crest, flaring out at base
    const slopeRatio = Math.min(1.0, absT / 120.0);
    const flankFactor = Math.pow(1.0 - slopeRatio, 1.35);

    let h = crestH * flankFactor + buttressSpur - couloirGully;

    // Organic Mazatzal quartzite jointing, bedded fracture ledges & cliff stratification
    const rockNoise =
      (Math.sin(s * 0.22 + t * 0.16) * 2.2 +
       Math.cos(s * 0.45 - t * 0.35) * 1.4 +
       Math.sin(s * 0.08 + t * 0.06) * 3.8) * Math.min(1.0, h / 70.0);

    h += rockNoise;

    // Boundary apron fade: smoothly anchors into surrounding northern terrain
    let fadeS = 1.0;
    const absS = Math.abs(s);
    if (absS > 125.0) {
      const u = (absS - 125.0) / 55.0;
      fadeS = Math.cos(Math.min(1.0, u) * Math.PI * 0.5);
    }
    let fadeT = 1.0;
    if (absT > 80.0) {
      const u = (absT - 80.0) / 50.0;
      fadeT = Math.cos(Math.min(1.0, u) * Math.PI * 0.5);
    }

    return Math.max(0, h * fadeS * fadeT);
  }

  const positions = new Float32Array(gridM * gridN * 3);
  const colors = new Float32Array(gridM * gridN * 3);
  const indices: number[] = [];

  let ptr = 0;
  for (let j = 0; j < gridM; j++) {
    const s = minS + (j / (gridM - 1)) * (maxS - minS);
    for (let k = 0; k < gridN; k++) {
      const t = minT + (k / (gridN - 1)) * (maxT - minT);
      const y = calculateMassifHeight(s, t);

      // Transform from (s, t) strike coordinates to world-aligned local group coordinates
      const lx = sightDirX * s + sightPerpX * t;
      const lz = sightDirZ * s + sightPerpZ * t;

      positions[ptr * 3 + 0] = lx;
      positions[ptr * 3 + 1] = y;
      positions[ptr * 3 + 2] = lz;

      // Authentic Mazatzal Proterozoic Quartzite Palette & Aerial Atmospheric Tones:
      // High summits: Sunlit champagne-rose quartzite crests catching alpine desert light
      // Upper cliffs: Soft aerial lavender-slate quartzite faces
      // Amethyst col: Delicate hydrothermal violet mineralized fractures
      // Mid slopes: Pale periwinkle-slate distance talus chutes
      // Lower slopes: Airy desert horizon pediment blending seamlessly with northern distance
      const isAmethystVein = Math.exp(-Math.pow((s - -56) / 10.0, 2)) * Math.exp(-Math.pow(t / 18.0, 2));

      let r = 0.80;
      let g = 0.77;
      let b = 0.82;

      if (y > 130) {
        // High quartzite summit crests & sharp horns (sunlit champagne-rose quartzite)
        const crestBlend = Math.min(1.0, (y - 130) / 54.0);
        r = 0.93 + crestBlend * 0.05;
        g = 0.88 + crestBlend * 0.05;
        b = 0.91 + crestBlend * 0.06;
      } else if (y > 75) {
        // Upper cliff bands and jagged rock faces (luminous aerial lavender-slate)
        const midBlend = (y - 75) / 55.0;
        r = 0.83 + midBlend * 0.10;
        g = 0.80 + midBlend * 0.08;
        b = 0.86 + midBlend * 0.05;
        // Amethyst saddle mineralized fracture zone
        if (isAmethystVein > 0.25) {
          r = THREE.MathUtils.lerp(r, 0.76, isAmethystVein * 0.55);
          g = THREE.MathUtils.lerp(g, 0.62, isAmethystVein * 0.55);
          b = THREE.MathUtils.lerp(b, 0.88, isAmethystVein * 0.55);
        }
      } else if (y > 26) {
        // Scree slopes, talus chutes and boulder gullies (pale periwinkle distance talus)
        const screeBlend = (y - 26) / 49.0;
        r = 0.78 + screeBlend * 0.05;
        g = 0.76 + screeBlend * 0.04;
        b = 0.82 + screeBlend * 0.04;
      } else {
        // Lower pediment & alluvial wash apron blending with desert landscape
        const baseBlend = y / 26.0;
        r = 0.80 + baseBlend * -0.02;
        g = 0.77 + baseBlend * -0.01;
        b = 0.81 + baseBlend * 0.01;
      }

      colors[ptr * 3 + 0] = r;
      colors[ptr * 3 + 1] = g;
      colors[ptr * 3 + 2] = b;

      ptr++;
    }
  }

  // Construct indexed triangle mesh
  for (let j = 0; j < gridM - 1; j++) {
    for (let k = 0; k < gridN - 1; k++) {
      const i00 = j * gridN + k;
      const i10 = (j + 1) * gridN + k;
      const i01 = j * gridN + (k + 1);
      const i11 = (j + 1) * gridN + (k + 1);

      indices.push(i00, i10, i01);
      indices.push(i10, i11, i01);
    }
  }

  const fourPeaksMassifGeo = new THREE.BufferGeometry();
  fourPeaksMassifGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  fourPeaksMassifGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  fourPeaksMassifGeo.setIndex(indices);
  fourPeaksMassifGeo.computeVertexNormals();

  // Natural rock material with atmospheric aerial scattering, soft periwinkle air-light, and clear distance presence
  const fourPeaksMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.68,
    metalness: 0.02,
    emissive: new THREE.Color(0xa2bed8), // Ethereal aerial perspective skylight scatter (soft periwinkle air-light)
    emissiveIntensity: 0.35,
    fog: true, // Enables natural aerial perspective and atmospheric hazing across the horizon
    flatShading: false,
  });

  const fourPeaksMesh = new THREE.Mesh(fourPeaksMassifGeo, fourPeaksMat);
  fourPeaksMesh.castShadow = true;
  fourPeaksMesh.receiveShadow = true;
  fourPeaksGroup.add(fourPeaksMesh);

  // Historic Four Peaks Amethyst Mine Col Notch & Tailings Shelf:
  // A natural prospect notch at Amethyst Col (s = -56, elevation 84m)
  const mineColS = -56;
  const mineColLX = sightDirX * mineColS;
  const mineColLZ = sightDirZ * mineColS;
  const mineColY = calculateMassifHeight(mineColS, 0);

  // Small historic rock tailings bench and prospect adit cut
  const tailingsGeo = new THREE.BoxGeometry(7, 3.5, 9);
  const tailingsMat = new THREE.MeshStandardMaterial({
    color: 0x9b7a9e, // Amethyst-bearing scree tailings
    roughness: 0.85,
    metalness: 0.05,
    emissive: new THREE.Color(0x6e5270),
    emissiveIntensity: 0.22,
    fog: true,
  });
  const tailingsMesh = new THREE.Mesh(tailingsGeo, tailingsMat);
  tailingsMesh.position.set(mineColLX + 2, mineColY + 1.2, mineColLZ - 1);
  tailingsMesh.rotation.y = Math.atan2(sightDirX, -sightDirZ) + 0.3;
  tailingsMesh.castShadow = true;
  fourPeaksGroup.add(tailingsMesh);

  scene.add(fourPeaksGroup);

  // =========================================================================
  // 6. Upper La Barge Box (Central Superstitions Primary Waterway & Tinaja Gorge)
  // Position: (35, lbY, -180) - Deep sheer dacite box canyon gorge and tinaja plunge pool
  // =========================================================================
  const laBargeGroup = new THREE.Group();
  const lbY = getTerrainHeight(35, -180);
  laBargeGroup.position.set(35, lbY, -180);

  // Towering dacite gorge buttresses on either side of the narrows
  const gorgeWallGeo = new THREE.BoxGeometry(8, 22, 28);
  const westWall = new THREE.Mesh(gorgeWallGeo, daciteMat);
  westWall.position.set(-16, 8, 0);
  westWall.castShadow = true;
  westWall.receiveShadow = true;
  laBargeGroup.add(westWall);

  const eastWall = new THREE.Mesh(gorgeWallGeo, daciteMat);
  eastWall.position.set(16, 8, 0);
  eastWall.castShadow = true;
  eastWall.receiveShadow = true;
  laBargeGroup.add(eastWall);

  // Emerald Tinaja Plunge Pool
  const tinajaWaterGeo = new THREE.CylinderGeometry(5.2, 5.0, 0.4, 20);
  const tinajaWaterMat = new THREE.MeshStandardMaterial({
    color: 0x1f7a70,
    roughness: 0.15,
    metalness: 0.85,
    transparent: true,
    opacity: 0.88,
  });
  const tinajaMesh = new THREE.Mesh(tinajaWaterGeo, tinajaWaterMat);
  tinajaMesh.position.set(0, 0.25, 0);
  tinajaMesh.receiveShadow = true;
  laBargeGroup.add(tinajaMesh);

  // Polished river boulders around the tinaja rim
  const riverRockGeo = new THREE.DodecahedronGeometry(1.2, 1);
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2;
    const r = 5.2 + Math.sin(i * 2.3) * 0.8;
    const rock = new THREE.Mesh(riverRockGeo, basaltMat);
    rock.position.set(Math.cos(ang) * r, 0.5, Math.sin(ang) * r);
    rock.scale.set(1.0 + Math.random() * 0.5, 0.7 + Math.random() * 0.4, 1.0 + Math.random() * 0.5);
    rock.castShadow = true;
    rock.receiveShadow = true;
    laBargeGroup.add(rock);
  }

  // Weathered wooden trail marker post
  const lbSignPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 8), weatheredWoodMat);
  lbSignPost.position.set(-4.5, 1.1, -4.5);
  lbSignPost.castShadow = true;
  laBargeGroup.add(lbSignPost);

  const lbSignBoard = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 0.08), weatheredWoodMat);
  lbSignBoard.position.set(-4.5, 1.8, -4.5);
  lbSignBoard.rotation.y = 0.3;
  laBargeGroup.add(lbSignBoard);

  waterRefillPoints.push(new THREE.Vector3(35, lbY + 0.3, -180));
  scene.add(laBargeGroup);

  // =========================================================================
  // 7. Squaw Canyon (Squaw Box Canyon & Crazy Jake's Historic Camp)
  // Position: (60, sqY, -135) - Confluence where Squaw Box opens west into La Barge Canyon
  // =========================================================================
  const squawGroup = new THREE.Group();
  const sqY = getTerrainHeight(60, -135);
  squawGroup.position.set(60, sqY, -135);

  // Flanking dacite box canyon portal gate pillars
  const gateColGeo = new THREE.CylinderGeometry(2.5, 3.5, 16, 7);
  const northGate = new THREE.Mesh(gateColGeo, daciteMat);
  northGate.position.set(0, 7.5, -9);
  northGate.castShadow = true;
  squawGroup.add(northGate);

  const southGate = new THREE.Mesh(gateColGeo, daciteMat);
  southGate.position.set(0, 7.5, 9);
  southGate.castShadow = true;
  squawGroup.add(southGate);

  // 1970s Historic Prospector A-Frame Tent of Robert "Crazy Jake" Jacob
  const tentMat = new THREE.MeshStandardMaterial({
    color: 0xccb997,
    roughness: 0.94,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });

  const tentRidgePole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.0, 6), weatheredWoodMat);
  tentRidgePole.rotation.x = Math.PI / 2;
  tentRidgePole.position.set(4.0, 1.9, 0);
  tentRidgePole.castShadow = true;
  squawGroup.add(tentRidgePole);

  // Front and back tent shear legs
  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 5);
  const legF1 = new THREE.Mesh(legGeo, weatheredWoodMat);
  legF1.position.set(2.8, 0.95, -1.0);
  legF1.rotation.z = 0.55;
  squawGroup.add(legF1);
  const legF2 = new THREE.Mesh(legGeo, weatheredWoodMat);
  legF2.position.set(5.2, 0.95, -1.0);
  legF2.rotation.z = -0.55;
  squawGroup.add(legF2);

  // Canvas tent roof slopes (2 planes)
  const roofPlaneGeo = new THREE.PlaneGeometry(2.3, 4.0);
  const leftRoof = new THREE.Mesh(roofPlaneGeo, tentMat);
  leftRoof.position.set(3.1, 1.0, 0);
  leftRoof.rotation.set(0, Math.PI / 2, 0.9);
  leftRoof.castShadow = true;
  squawGroup.add(leftRoof);

  const rightRoof = new THREE.Mesh(roofPlaneGeo, tentMat);
  rightRoof.position.set(4.9, 1.0, 0);
  rightRoof.rotation.set(0, -Math.PI / 2, 0.9);
  rightRoof.castShadow = true;
  squawGroup.add(rightRoof);

  // Campfire ring with charred wood embers and skillet
  const fireRingSegments = 8;
  for (let i = 0; i < fireRingSegments; i++) {
    const ang = (i / fireRingSegments) * Math.PI * 2;
    const fRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), basaltMat);
    fRock.position.set(4.0 + Math.cos(ang) * 0.9, 0.15, -3.2 + Math.sin(ang) * 0.9);
    squawGroup.add(fRock);
  }
  const skilletMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.8 });
  const skillet = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.06, 12), skilletMat);
  skillet.position.set(4.0, 0.2, -3.2);
  squawGroup.add(skillet);

  // Weathered wooden tool crate
  const crateMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.6), weatheredWoodMat);
  crateMesh.position.set(1.8, 0.3, 0.8);
  crateMesh.castShadow = true;
  squawGroup.add(crateMesh);

  // Squaw Box fresh water seep tinaja
  const squawPoolGeo = new THREE.CylinderGeometry(3.2, 3.0, 0.35, 16);
  const squawPoolMesh = new THREE.Mesh(squawPoolGeo, tinajaWaterMat);
  squawPoolMesh.position.set(-3.5, 0.18, 0);
  squawPoolMesh.receiveShadow = true;
  squawGroup.add(squawPoolMesh);

  // Trail Signpost
  const sqSignPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 8), weatheredWoodMat);
  sqSignPost.position.set(-1.8, 1.1, -4.0);
  sqSignPost.castShadow = true;
  squawGroup.add(sqSignPost);

  const sqSignBoard = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.42, 0.08), weatheredWoodMat);
  sqSignBoard.position.set(-1.8, 1.8, -4.0);
  sqSignBoard.rotation.y = -0.2;
  squawGroup.add(sqSignBoard);

  waterRefillPoints.push(new THREE.Vector3(60, sqY + 0.25, -135));
  scene.add(squawGroup);

  // =========================================================================
  // 8. Peters Canyon & Peters Cave (Historic Dutch Hunter Shelter & Tuff Overhang)
  // Position: (243, pcY, -267) - Centered at Peters Canyon gorge (243X, -267Z)
  // =========================================================================
  const petersCaveGroup = new THREE.Group();
  const pcY = getTerrainHeight(243, -267);
  petersCaveGroup.position.set(243, pcY, -267);

  // Natural arched cave shelter carved into the cliff face
  const caveBluffGeo = new THREE.BoxGeometry(14, 16, 12);
  const caveBluff = new THREE.Mesh(caveBluffGeo, daciteMat);
  caveBluff.position.set(7, 7, 0);
  caveBluff.castShadow = true;
  caveBluff.receiveShadow = true;
  petersCaveGroup.add(caveBluff);

  // Cave interior shadow arch (dark interior cavern hollow)
  const caveHollowMat = new THREE.MeshStandardMaterial({
    color: 0x181412,
    roughness: 0.98,
    metalness: 0.02,
  });
  const caveHollowGeo = new THREE.CylinderGeometry(3.6, 4.0, 5.0, 14, 1, false, 0, Math.PI);
  const caveHollow = new THREE.Mesh(caveHollowGeo, caveHollowMat);
  caveHollow.position.set(1.0, 2.5, 0);
  caveHollow.rotation.z = Math.PI / 2;
  caveHollow.rotation.y = Math.PI / 2;
  petersCaveGroup.add(caveHollow);

  // Dutch Hunter stone cairn with weathered juniper marker stake
  const cairnLevels = [
    { r: 0.7, y: 0.25, n: 6 },
    { r: 0.5, y: 0.65, n: 5 },
    { r: 0.3, y: 0.95, n: 4 },
  ];
  for (const lvl of cairnLevels) {
    for (let i = 0; i < lvl.n; i++) {
      const ang = (i / lvl.n) * Math.PI * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), basaltMat);
      rock.position.set(-2.0 + Math.cos(ang) * lvl.r, lvl.y, -2.0 + Math.sin(ang) * lvl.r);
      petersCaveGroup.add(rock);
    }
  }
  const stakeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 6), weatheredWoodMat);
  stakeMesh.position.set(-2.0, 0.9, -2.0);
  petersCaveGroup.add(stakeMesh);

  // Peters Canyon bedrock tinaja
  const pcTinajaMesh = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.5, 0.35, 16), tinajaWaterMat);
  pcTinajaMesh.position.set(-5.0, 0.18, 2.5);
  pcTinajaMesh.receiveShadow = true;
  petersCaveGroup.add(pcTinajaMesh);

  // Trail Signpost
  const pcSignPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 8), weatheredWoodMat);
  pcSignPost.position.set(-4.0, 1.1, -4.0);
  pcSignPost.castShadow = true;
  petersCaveGroup.add(pcSignPost);

  const pcSignBoard = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.08), weatheredWoodMat);
  pcSignBoard.position.set(-4.0, 1.8, -4.0);
  pcSignBoard.rotation.y = 0.4;
  petersCaveGroup.add(pcSignBoard);

  waterRefillPoints.push(new THREE.Vector3(243, pcY + 0.25, -267));
  scene.add(petersCaveGroup);

  // =========================================================================
  // 9. Peters Mesa Tableland (Henderson Pasture & Panoramic Benchmark)
  // Position: (135, pmY, -125) - High flat basalt tableland
  // =========================================================================
  const petersMesaGroup = new THREE.Group();
  const pmY = getTerrainHeight(135, -125);
  petersMesaGroup.position.set(135, pmY, -125);

  // Perimeter basalt columnar jointing along tableland rim
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    const r = 26 + Math.sin(i * 1.7) * 5;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.2, 10, 6), basaltMat);
    col.position.set(Math.cos(ang) * r, -2.0, Math.sin(ang) * r);
    col.castShadow = true;
    col.receiveShadow = true;
    petersMesaGroup.add(col);
  }

  // Historic 1880s cattle pasture drift fence posts
  for (let i = -3; i <= 3; i++) {
    const fencePost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 6), weatheredWoodMat);
    fencePost.position.set(i * 4.0, 0.8, -12);
    fencePost.castShadow = true;
    petersMesaGroup.add(fencePost);
  }

  // Historic USGS Survey benchmark & panorama signpost
  const pmSignPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.3, 8), weatheredWoodMat);
  pmSignPost.position.set(0, 1.15, 0);
  pmSignPost.castShadow = true;
  petersMesaGroup.add(pmSignPost);

  const pmSignBoard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.08), weatheredWoodMat);
  pmSignBoard.position.set(0, 1.9, 0);
  petersMesaGroup.add(pmSignBoard);

  scene.add(petersMesaGroup);

  return {
    blackTopMesa: blackTopGroup,
    battleshipMountain: battleshipGroup,
    minersNeedle: minersGroup,
    charleboisSpring: charleboisGroup,
    fourPeaks: fourPeaksGroup,
    laBargeUpperBox: laBargeGroup,
    squawBoxCanyon: squawGroup,
    petersCanyonAndCave: petersCaveGroup,
    petersMesa: petersMesaGroup,
  };
}
