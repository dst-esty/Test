import * as THREE from 'three';
import { getTerrainHeight } from './terrain';

/**
 * Authentic 3D Topographic and Historical Recreation of:
 * THE DICK HOLMES DEATHBED CLUES & THE 1891 CANDLE BOX OF GOLD
 * Location: Needle Canyon Trail Divide & The "Face in the Rock" Pass (78X, -48Z)
 *
 * Grounded in the historical Holmes Manuscript (recorded by Brownie Holmes,
 * published in Dr. Thomas Glover's definitive research, and debated by Dutch Hunters
 * on TreasureNet):
 *
 * 1. The "Face in the Rock" Landmark:
 *    Natural volcanic dacite crag with weathered features resembling a bearded man's profile
 *    staring down into Needle Canyon, marking where Waltz instructed Dick Holmes to leave the trail.
 * 2. The 1891 Star Candle Box & High-Grade Wire Gold:
 *    Faithful recreation of the famous wooden candle box containing ~48 lbs of high-grade
 *    crystalline wire gold in quartz taken from under Waltz's deathbed on October 25, 1891.
 * 3. The Holmes Manuscript Field Folio:
 *    Distressed parchment documents detailing the 7 core deathbed clues:
 *    - Route from First Water -> Second Water -> San Carlos Government Trail
 *    - The Face in the Rock trail marker
 *    - The Line-of-Sight Paradox (Weaver's Needle hidden from pit, visible after short climb)
 *    - The West-facing shelter cave with sunset alignment
 *    - The Two-Foot Step / Funnel descent
 *    - The Ironwood concealed timber shaft
 *    - The Volcanic Hydrothermal paradox
 * 4. Dick & Brownie Holmes Historical Survey Cairn (1892-1935).
 */

export interface DickHolmesSiteMeshes {
  rootGroup: THREE.Group;
  candleBoxGroup: THREE.Group;
  faceInRockGroup: THREE.Group;
}

export function buildDickHolmesCluesSite(scene: THREE.Scene): DickHolmesSiteMeshes {
  const rootGroup = new THREE.Group();
  const siteX = 78;
  const siteZ = -48;
  const siteY = getTerrainHeight(siteX, siteZ);
  rootGroup.position.set(siteX, siteY, siteZ);

  // -------------------------------------------------------------------------
  // MATERIALS
  // -------------------------------------------------------------------------
  const volcanicDaciteMat = new THREE.MeshStandardMaterial({
    color: 0x6e5c4d,
    roughness: 0.94,
    metalness: 0.05,
  });

  const desertVarnishMat = new THREE.MeshStandardMaterial({
    color: 0x3d3126,
    roughness: 0.88,
    metalness: 0.12,
  });

  const weatheredPineMat = new THREE.MeshStandardMaterial({
    color: 0x6c5740,
    roughness: 0.92,
  });

  const agedParchmentMat = new THREE.MeshStandardMaterial({
    color: 0xdfd4bc,
    roughness: 0.85,
  });

  const whiteQuartzMat = new THREE.MeshStandardMaterial({
    color: 0xedebe4,
    roughness: 0.35,
    metalness: 0.08,
  });

  const wireGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfcc200,
    roughness: 0.22,
    metalness: 0.92,
  });

  const tarnishedBrassMat = new THREE.MeshStandardMaterial({
    color: 0x8a743b,
    roughness: 0.45,
    metalness: 0.85,
  });

  const rustedIronMat = new THREE.MeshStandardMaterial({
    color: 0x4a3729,
    roughness: 0.82,
    metalness: 0.7,
  });

  // -------------------------------------------------------------------------
  // 1. THE "FACE IN THE ROCK" NATURAL MONOLITH (Waltz's Trail Leaving Marker)
  // "Look for a distinctive rock that resembles a man's face looking down upon
  // the canyon... where you see this marker, you leave the trail."
  // -------------------------------------------------------------------------
  const faceInRockGroup = new THREE.Group();
  faceInRockGroup.position.set(-1.5, 0, 1.2);

  // Main crag body (6.5m tall natural dacite crag)
  const cragBody = new THREE.Mesh(
    new THREE.DodecahedronGeometry(3.2, 1),
    volcanicDaciteMat
  );
  cragBody.scale.set(1.1, 2.1, 1.3);
  cragBody.position.set(0, 3.2, 0);
  cragBody.castShadow = true;
  cragBody.receiveShadow = true;
  faceInRockGroup.add(cragBody);

  // Dark desert varnish patina on the weather-exposed upper prow
  const varnishCap = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.8, 1),
    desertVarnishMat
  );
  varnishCap.scale.set(1.15, 1.3, 1.1);
  varnishCap.position.set(0.1, 5.6, -0.2);
  varnishCap.castShadow = true;
  faceInRockGroup.add(varnishCap);

  // Sculpted anatomical facial features formed by natural jointing:
  // A. Heavy furrowed brow ridge (supraorbital ledge)
  const browLedge = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.5, 1.1),
    volcanicDaciteMat
  );
  browLedge.position.set(1.3, 4.4, -0.4);
  browLedge.rotation.y = 0.35;
  browLedge.rotation.z = -0.15;
  browLedge.castShadow = true;
  faceInRockGroup.add(browLedge);

  // B. Prominent natural nose bridge pointing down towards the canyon wash
  const noseSpur = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, 1.5, 4),
    desertVarnishMat
  );
  noseSpur.position.set(1.7, 3.7, -0.3);
  noseSpur.rotation.z = -1.15;
  noseSpur.rotation.y = 0.35;
  noseSpur.castShadow = true;
  faceInRockGroup.add(noseSpur);

  // C. Recessed shadowed eye hollow (natural solution pocket)
  const eyeHollow = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 6, 6),
    desertVarnishMat
  );
  eyeHollow.position.set(1.2, 4.25, -0.25);
  faceInRockGroup.add(eyeHollow);

  // D. Bearded granite jawline jutting forward above the trail
  const jawSpur = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.85, 1.2),
    volcanicDaciteMat
  );
  jawSpur.position.set(1.45, 2.7, -0.2);
  jawSpur.rotation.y = 0.35;
  jawSpur.rotation.z = -0.2;
  jawSpur.castShadow = true;
  faceInRockGroup.add(jawSpur);

  // Talus boulders tumbled at the foot of the Face in the Rock
  for (let b = 0; b < 6; b++) {
    const boulder = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.45 + Math.random() * 0.4, 0),
      volcanicDaciteMat
    );
    const bx = 1.6 + (Math.random() - 0.5) * 1.6;
    const bz = -0.6 + (Math.random() - 0.5) * 1.6;
    boulder.position.set(bx, 0.35, bz);
    boulder.scale.set(1.3, 0.7, 1.1);
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    faceInRockGroup.add(boulder);
  }

  rootGroup.add(faceInRockGroup);

  // -------------------------------------------------------------------------
  // 2. THE 1891 STAR CANDLE BOX & HIGH-GRADE GOLD SPECIMEN
  // Under Jacob Waltz's deathbed on Oct 25, 1891 sat a candle box filled with
  // ~48 pounds of bonanza telluride wire gold in quartz.
  // -------------------------------------------------------------------------
  const candleBoxGroup = new THREE.Group();
  candleBoxGroup.position.set(1.8, 0.45, -0.8);
  candleBoxGroup.rotation.y = -0.35;

  // Resting on a broad, flat resting sandstone shelf
  const displayRock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.85, 1),
    volcanicDaciteMat
  );
  displayRock.scale.set(1.6, 0.55, 1.4);
  displayRock.position.set(0, -0.28, 0);
  displayRock.receiveShadow = true;
  candleBoxGroup.add(displayRock);

  // Wooden Box Base & Walls (0.60m x 0.36m x 0.28m dovetail box)
  const boxBottom = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.38), weatheredPineMat);
  boxBottom.position.y = 0.015;
  boxBottom.receiveShadow = true;
  candleBoxGroup.add(boxBottom);

  // Box walls
  const wallMat = weatheredPineMat;
  // Long sides
  const wallFront = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.025), wallMat);
  wallFront.position.set(0, 0.12, 0.178);
  wallFront.castShadow = true;
  candleBoxGroup.add(wallFront);

  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.025), wallMat);
  wallBack.position.set(0, 0.12, -0.178);
  wallBack.castShadow = true;
  candleBoxGroup.add(wallBack);

  // Short sides
  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.22, 0.33), wallMat);
  wallLeft.position.set(-0.298, 0.12, 0);
  wallLeft.castShadow = true;
  candleBoxGroup.add(wallLeft);

  const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.22, 0.33), wallMat);
  wallRight.position.set(0.298, 0.12, 0);
  wallRight.castShadow = true;
  candleBoxGroup.add(wallRight);

  // The sliding lid pushed back open to reveal the treasure
  const boxLid = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.02, 0.40), weatheredPineMat);
  boxLid.position.set(0.26, 0.24, 0.18);
  boxLid.rotation.y = 0.25;
  boxLid.castShadow = true;
  candleBoxGroup.add(boxLid);

  // Antique stenciled black branding plaque: "STAR CANDLE CO. - 1890 - 48 LBS"
  const stencilPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.08, 0.005),
    new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.9 })
  );
  stencilPlate.position.set(0, 0.12, 0.192);
  candleBoxGroup.add(stencilPlate);

  // High-Grade Bonanza Gold Specimen Ore inside the box
  // Pure dendritic wire gold embedded in white & rose crystalline quartz
  for (let q = 0; q < 14; q++) {
    const qx = (Math.random() - 0.5) * 0.46;
    const qz = (Math.random() - 0.5) * 0.24;
    const qSize = 0.06 + Math.random() * 0.055;
    const quartzChunk = new THREE.Mesh(
      new THREE.DodecahedronGeometry(qSize, 0),
      whiteQuartzMat
    );
    quartzChunk.position.set(qx, 0.10 + Math.random() * 0.04, qz);
    quartzChunk.scale.set(1.2, 0.8, 1.1);
    quartzChunk.castShadow = true;
    candleBoxGroup.add(quartzChunk);

    // Brilliant golden veins and wire wires interlacing the quartz
    for (let w = 0; w < 3; w++) {
      const wire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.008, qSize * 1.3, 5),
        wireGoldMat
      );
      wire.position.set(
        qx + (Math.random() - 0.5) * 0.03,
        quartzChunk.position.y + 0.02,
        qz + (Math.random() - 0.5) * 0.03
      );
      wire.rotation.x = Math.random() * Math.PI;
      wire.rotation.z = Math.random() * Math.PI;
      wire.castShadow = true;
      candleBoxGroup.add(wire);
    }
  }

  // Large showpiece specimen resting on top of the quartz
  const centerpieceChunk = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.085, 1),
    whiteQuartzMat
  );
  centerpieceChunk.position.set(0.04, 0.18, -0.02);
  centerpieceChunk.scale.set(1.3, 0.85, 1.1);
  centerpieceChunk.castShadow = true;
  candleBoxGroup.add(centerpieceChunk);

  // Thick ribbon of dendritic electrum gold running through the centerpiece
  const goldRibbon = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.015, 6, 12, Math.PI * 1.5),
    wireGoldMat
  );
  goldRibbon.position.set(0.04, 0.20, -0.02);
  goldRibbon.rotation.x = 0.6;
  goldRibbon.rotation.y = 0.4;
  goldRibbon.castShadow = true;
  candleBoxGroup.add(goldRibbon);

  // 19th-Century Jeweler's Balance Scale & Brass Weights beside the box
  const scalePillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.022, 0.28, 8),
    tarnishedBrassMat
  );
  scalePillar.position.set(-0.42, 0.14, 0.05);
  scalePillar.castShadow = true;
  candleBoxGroup.add(scalePillar);

  const scaleArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6),
    tarnishedBrassMat
  );
  scaleArm.position.set(-0.42, 0.27, 0.05);
  scaleArm.rotation.z = Math.PI / 2;
  candleBoxGroup.add(scaleArm);

  // Tiny brass pans
  for (let p = -1; p <= 1; p += 2) {
    const pan = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.02, 0.015, 8),
      tarnishedBrassMat
    );
    pan.position.set(-0.42 + p * 0.11, 0.16, 0.05);
    candleBoxGroup.add(pan);
  }

  rootGroup.add(candleBoxGroup);

  // -------------------------------------------------------------------------
  // 3. THE HOLMES MANUSCRIPT FIELD TRANSCRIPT & VINTAGE LEATHER FOLIO
  // Documenting the deathbed notes and 7 core clues of Jacob Waltz to Dick Holmes
  // -------------------------------------------------------------------------
  const manuscriptGroup = new THREE.Group();
  manuscriptGroup.position.set(1.4, 0.38, 0.45);
  manuscriptGroup.rotation.y = 0.45;

  // Leather presentation folio
  const folioCover = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.025, 0.48),
    new THREE.MeshStandardMaterial({ color: 0x3a281c, roughness: 0.9 })
  );
  folioCover.receiveShadow = true;
  manuscriptGroup.add(folioCover);

  // Distressed aged parchment pages
  const folioPages = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.03, 0.44),
    agedParchmentMat
  );
  folioPages.position.set(0, 0.018, 0);
  manuscriptGroup.add(folioPages);

  // Brass magnifying reading loupe
  const loupeHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.007, 0.12, 6),
    weatheredPineMat
  );
  loupeHandle.position.set(0.18, 0.035, 0.10);
  loupeHandle.rotation.z = Math.PI / 2;
  loupeHandle.rotation.y = 0.6;
  manuscriptGroup.add(loupeHandle);

  const loupeRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.038, 0.006, 6, 12),
    tarnishedBrassMat
  );
  loupeRim.position.set(0.24, 0.035, 0.15);
  manuscriptGroup.add(loupeRim);

  rootGroup.add(manuscriptGroup);

  // -------------------------------------------------------------------------
  // 4. HISTORIC PROSPECTOR SURVEY CAIRN & ENGRAVED POST
  // "D. HOLMES - 1892 / B. HOLMES - 1935 / DR. T. GLOVER ARCHIVE"
  // -------------------------------------------------------------------------
  const cairnGroup = new THREE.Group();
  cairnGroup.position.set(0.6, 0, 1.8);

  // Stacked dry-laid field stones
  const cairnLevels = 4;
  for (let lvl = 0; lvl < cairnLevels; lvl++) {
    const stonesInLvl = 5 - lvl;
    const lvlRadius = 0.55 - lvl * 0.11;
    const lvlHeight = lvl * 0.18 + 0.09;
    for (let s = 0; s < stonesInLvl; s++) {
      const ang = (s / stonesInLvl) * Math.PI * 2 + lvl * 0.4;
      const stone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.14 + Math.random() * 0.05, 0),
        volcanicDaciteMat
      );
      stone.position.set(
        Math.cos(ang) * lvlRadius + (Math.random() - 0.5) * 0.06,
        lvlHeight,
        Math.sin(ang) * lvlRadius + (Math.random() - 0.5) * 0.06
      );
      stone.scale.set(1.4, 0.8, 1.2);
      stone.castShadow = true;
      stone.receiveShadow = true;
      cairnGroup.add(stone);
    }
  }

  // Weathered juniper survey post planted into the cairn
  const surveyPost = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 1.45, 0.12),
    weatheredPineMat
  );
  surveyPost.position.set(0, 0.72, 0);
  surveyPost.rotation.y = 0.2;
  surveyPost.rotation.z = -0.05;
  surveyPost.castShadow = true;
  cairnGroup.add(surveyPost);

  // Engraved copper claim plate
  const copperPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 0.18, 0.01),
    tarnishedBrassMat
  );
  copperPlate.position.set(0, 1.15, 0.062);
  cairnGroup.add(copperPlate);

  rootGroup.add(cairnGroup);

  // Add root group to the world scene
  scene.add(rootGroup);

  return {
    rootGroup,
    candleBoxGroup,
    faceInRockGroup,
  };
}
