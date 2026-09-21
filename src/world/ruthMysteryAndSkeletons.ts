import * as THREE from 'three';
import { getTerrainHeight } from './terrain';

/**
 * Authentic 3D Topographic and Forensic Recreation of:
 * 1. The Adolph Ruth Mystery (June 1931 - January 1932):
 *    - Dr. Adolph Ruth's Last Camp & Headless Skeleton (East slope of Black Top Mesa: 48X, -42Z)
 *    - The Severed Skull with Two Execution Bullet Holes (Needle Canyon Wash: 108X, -28Z)
 *    - "Veni, Vidi, Vici" Leather Field Notebook & Walking Cane with Surgical Pin Femur
 * 2. The James Cravey 1947 Helicopter Mystery (95X, -115Z):
 *    - Headless skeleton bundled inside sleeping bag & severed skull on overlooking sniper ridge
 * 3. 1848 Peralta Massacre Grounds Skeletons (-40X, 90Z)
 */

export interface RuthMysteryMeshes {
  ruthCamp: THREE.Group;
  ruthSkull: THREE.Group;
  craveySite: THREE.Group;
  massacreSkeletons: THREE.Group;
}

export function buildRuthMysteryAndSkeletons(scene: THREE.Scene): RuthMysteryMeshes {
  // Shared materials for bones, relics, and vintage campsite gear
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xdfd9ce,
    roughness: 0.92,
    metalness: 0.02,
  });

  const boneAgedMat = new THREE.MeshStandardMaterial({
    color: 0xc8bea8,
    roughness: 0.95,
    metalness: 0.01,
  });

  const surgicalPinMat = new THREE.MeshStandardMaterial({
    color: 0x4a4a50,
    roughness: 0.5,
    metalness: 0.85,
  });

  const canvasMat = new THREE.MeshStandardMaterial({
    color: 0x7c7361,
    roughness: 0.96,
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x3d2b1f,
    roughness: 0.88,
  });

  const rustedIronMat = new THREE.MeshStandardMaterial({
    color: 0x5a3e2e,
    roughness: 0.82,
    metalness: 0.65,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0x8a7238,
    roughness: 0.45,
    metalness: 0.8,
  });

  const weatheredWoodMat = new THREE.MeshStandardMaterial({
    color: 0x584737,
    roughness: 0.95,
  });

  const mesquiteWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3a2c20,
    roughness: 0.98,
  });

  const parchmentPaperMat = new THREE.MeshStandardMaterial({
    color: 0xded2b8,
    roughness: 0.9,
  });

  // =========================================================================
  // 1. DR. ADOLPH RUTH'S LAST CAMP & HEADLESS SKELETON (48X, -42Z)
  // USGS Elev. 3,180 ft - East Ravine of Black Top Mesa
  // Where Deputy Sheriff Jeff Adams & Jack Bark found Ruth's remains on Jan 8, 1932
  // =========================================================================
  const ruthCampGroup = new THREE.Group();
  const campY = getTerrainHeight(48, -42);
  ruthCampGroup.position.set(48, campY, -42);

  // A. Collapsed 1931 Canvas Pup Tent
  const tentGroup = new THREE.Group();
  tentGroup.position.set(-1.2, 0, -0.6);
  tentGroup.rotation.y = 0.35;

  // Ridge pole fallen askew
  const ridgePole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 2.8, 6),
    weatheredWoodMat
  );
  ridgePole.position.set(0, 0.4, 0);
  ridgePole.rotation.x = Math.PI / 2 + 0.15;
  ridgePole.rotation.z = 0.2;
  tentGroup.add(ridgePole);

  // Collapsed triangular canvas drape
  const canvasGeo = new THREE.BufferGeometry();
  // Triangular folded A-frame tent fabric lying half-collapsed
  const canvasVertices = new Float32Array([
    // Side 1
    0, 0.7, -1.2,   -0.9, 0.05, -1.1,   0, 0.45, 1.2,
    -0.9, 0.05, -1.1,  -1.0, 0.05, 1.1,   0, 0.45, 1.2,
    // Side 2 (collapsed flat)
    0, 0.7, -1.2,   0, 0.45, 1.2,   0.8, 0.05, -1.1,
    0, 0.45, 1.2,   0.9, 0.05, 1.1,   0.8, 0.05, -1.1,
  ]);
  canvasGeo.setAttribute('position', new THREE.BufferAttribute(canvasVertices, 3));
  canvasGeo.computeVertexNormals();
  const canvasMesh = new THREE.Mesh(canvasGeo, canvasMat);
  canvasMesh.castShadow = true;
  canvasMesh.receiveShadow = true;
  tentGroup.add(canvasMesh);

  // Rusted iron tent stakes
  for (let s = 0; s < 4; s++) {
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), rustedIronMat);
    const sx = (s % 2 === 0 ? -1.1 : 1.0) + (Math.random() - 0.5) * 0.1;
    const sz = (s < 2 ? -1.1 : 1.1) + (Math.random() - 0.5) * 0.1;
    stake.position.set(sx, 0.12, sz);
    stake.rotation.x = (Math.random() - 0.5) * 0.3;
    tentGroup.add(stake);
  }
  ruthCampGroup.add(tentGroup);

  // B. Faded wool bedroll
  const bedroll = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.08, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x4f5450, roughness: 0.95 })
  );
  bedroll.position.set(0.6, 0.05, 0.1);
  bedroll.rotation.y = -0.15;
  bedroll.receiveShadow = true;
  ruthCampGroup.add(bedroll);

  // C. The Headless Skeleton of Dr. Adolph Ruth (with Iron Surgical Pin!)
  const ruthSkeleton = createAnatomicalHumanSkeleton({
    headless: true,
    hasSurgicalPin: true,
    boneMat,
    surgicalPinMat,
  });
  ruthSkeleton.position.set(0.6, 0.12, 0.15);
  ruthSkeleton.rotation.y = -0.15;
  ruthCampGroup.add(ruthSkeleton);

  // D. Unlaced Leather High-Top Boots (found standing by his bedroll in 1932!)
  const bootsGroup = new THREE.Group();
  bootsGroup.position.set(0.3, 0.02, 1.25);
  bootsGroup.rotation.y = 0.4;
  for (let b = 0; b < 2; b++) {
    const boot = new THREE.Group();
    boot.position.x = (b - 0.5) * 0.22;
    // Sole
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.28), leatherMat);
    sole.position.set(0, 0.015, 0);
    boot.add(sole);
    // Shaft (open/unlaced)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.22, 6), leatherMat);
    shaft.position.set(0, 0.12, -0.04);
    boot.add(shaft);
    // Tongue flopped forward
    const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.02), leatherMat);
    tongue.position.set(0, 0.14, 0.04);
    tongue.rotation.x = -0.3;
    boot.add(tongue);
    bootsGroup.add(boot);
  }
  ruthCampGroup.add(bootsGroup);

  // E. Dr. Ruth's Distinct Heavy Walking Cane with Brass Ferrule
  // (Ruth was crippled from a 1919 fall and walked with a cane)
  const caneGroup = new THREE.Group();
  caneGroup.position.set(-0.3, 0.45, 0.6);
  caneGroup.rotation.z = 0.75;
  caneGroup.rotation.y = -0.2;
  // Hickory shaft
  const caneShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.015, 0.92, 8),
    weatheredWoodMat
  );
  caneShaft.castShadow = true;
  caneGroup.add(caneShaft);
  // Curved handle
  const caneHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.016, 6, 12, Math.PI),
    weatheredWoodMat
  );
  caneHandle.position.set(0.05, 0.45, 0);
  caneHandle.rotation.z = Math.PI / 2;
  caneGroup.add(caneHandle);
  // Polished brass ferrule tip
  const brassTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.012, 0.08, 8),
    brassMat
  );
  brassTip.position.set(0, -0.44, 0);
  caneGroup.add(brassTip);
  ruthCampGroup.add(caneGroup);

  // F. Dr. Ruth's Leather Field Notebook ("Veni, Vidi, Vici")
  const notebookGroup = new THREE.Group();
  notebookGroup.position.set(1.2, 0.42, -0.4);
  // Resting on a flat rock
  const deskRock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.55, 1),
    new THREE.MeshStandardMaterial({ color: 0x584435, roughness: 0.94 })
  );
  deskRock.scale.set(1.4, 0.7, 1.2);
  deskRock.position.set(0, -0.22, 0);
  notebookGroup.add(deskRock);

  // Open leather binder
  const bookCover = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.32), leatherMat);
  bookCover.rotation.y = 0.2;
  notebookGroup.add(bookCover);

  const bookPages = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.025, 0.29), parchmentPaperMat);
  bookPages.position.set(0, 0.012, 0);
  bookPages.rotation.y = 0.2;
  notebookGroup.add(bookPages);

  // Vintage black and gold fountain pen beside the notebook
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.14, 6), brassMat);
  pen.position.set(0.18, 0.02, 0.05);
  pen.rotation.z = Math.PI / 2;
  pen.rotation.y = 0.5;
  notebookGroup.add(pen);

  ruthCampGroup.add(notebookGroup);

  // G. Camp Relics: Tin Canteen, Evaporated Coffee Pot, Canned Goods
  const canteen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12),
    rustedIronMat
  );
  canteen.position.set(-0.8, 0.04, 0.8);
  canteen.rotation.x = Math.PI / 2;
  canteen.rotation.z = 0.4;
  ruthCampGroup.add(canteen);

  const coffeePot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.10, 0.22, 8),
    rustedIronMat
  );
  coffeePot.position.set(-1.0, 0.11, 0.3);
  ruthCampGroup.add(coffeePot);

  scene.add(ruthCampGroup);

  // =========================================================================
  // 2. THE SEVERED SKULL OF DR. ADOLPH RUTH (108X, -28Z)
  // USGS Elev. 2,490 ft - Needle Canyon Wash Thicket
  // Where Brownie Holmes' hound uncovered the skull in December 1931,
  // 3/4 mile away from his torso, pierced by two execution rifle bullet holes!
  // =========================================================================
  const ruthSkullGroup = new THREE.Group();
  const skullY = getTerrainHeight(108, -28);
  ruthSkullGroup.position.set(108, skullY, -28);

  // A. Alluvial gravel wash bed
  for (let g = 0; g < 12; g++) {
    const pebble = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.16, 0),
      boneAgedMat
    );
    const px = (Math.random() - 0.5) * 2.4;
    const pz = (Math.random() - 0.5) * 2.4;
    pebble.position.set(px, 0.06, pz);
    pebble.scale.set(1.4, 0.6, 1.2);
    pebble.receiveShadow = true;
    ruthSkullGroup.add(pebble);
  }

  // B. Thorny Mesquite & Catclaw Thicket
  const thicketGroup = new THREE.Group();
  for (let m = 0; m < 5; m++) {
    const ang = (m / 5) * Math.PI * 2;
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.04, 1.2 + Math.random() * 0.5, 5),
      mesquiteWoodMat
    );
    branch.position.set(Math.cos(ang) * 0.6, 0.5, Math.sin(ang) * 0.6);
    branch.rotation.z = (Math.random() - 0.5) * 0.7;
    branch.rotation.y = ang + (Math.random() - 0.5) * 0.4;
    branch.castShadow = true;
    thicketGroup.add(branch);
  }
  ruthSkullGroup.add(thicketGroup);

  // C. Dr. Adolph Ruth's Sun-Bleached Skull (with Two Execution Bullet Holes!)
  const skullMesh = createAnatomicalHumanSkull({
    bulletHoles: true,
    jawSeparated: true,
    mat: boneMat,
  });
  skullMesh.position.set(0.08, 0.18, 0.12);
  skullMesh.rotation.set(-0.25, 0.6, 0.1);
  skullMesh.castShadow = true;
  ruthSkullGroup.add(skullMesh);

  // D. 1931 Maricopa County Sheriff Crime Scene Surveyor Stake
  const stakeGroup = new THREE.Group();
  stakeGroup.position.set(0.55, 0, -0.45);
  const woodStake = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.95, 0.05),
    weatheredWoodMat
  );
  woodStake.position.y = 0.42;
  woodStake.rotation.z = -0.08;
  woodStake.castShadow = true;
  stakeGroup.add(woodStake);

  // Weathered red fabric crime scene ribbon
  const ribbon = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.28, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x9e2a2b, roughness: 0.9 })
  );
  ribbon.position.set(0.02, 0.78, 0.04);
  ribbon.rotation.z = 0.25;
  stakeGroup.add(ribbon);
  ruthSkullGroup.add(stakeGroup);

  scene.add(ruthSkullGroup);

  // =========================================================================
  // 3. JAMES CRAVEY'S 1947 HELICOPTER BIVOUAC & HEADLESS SKELETON (95X, -115Z)
  // USGS Elev. 2,890 ft - Box Canyon between Weaver's Needle and Peters Mesa
  // In 1947, 62-year-old James Cravey chartered a helicopter to be dropped in.
  // Months later, his headless skeleton was found in his sleeping bag;
  // his skull was located 300 yards away atop an overlooking ridge!
  // =========================================================================
  const craveyGroup = new THREE.Group();
  const craveyY = getTerrainHeight(95, -115);
  craveyGroup.position.set(95, craveyY, -115);

  // Surplus WWII Canvas Pack & Ration Tins
  const armyPack = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.32, 0.36),
    new THREE.MeshStandardMaterial({ color: 0x484b39, roughness: 0.92 })
  );
  armyPack.position.set(-0.9, 0.18, -0.4);
  armyPack.rotation.y = 0.6;
  armyPack.castShadow = true;
  craveyGroup.add(armyPack);

  for (let r = 0; r < 3; r++) {
    const rationTin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.09, 8),
      rustedIronMat
    );
    rationTin.position.set(-0.6 + r * 0.14, 0.05, -0.5);
    rationTin.rotation.z = Math.PI / 2;
    craveyGroup.add(rationTin);
  }

  // Canvas sleeping bag with headless skeleton bundled inside
  const sleepingBag = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.16, 1.85),
    new THREE.MeshStandardMaterial({ color: 0x42463e, roughness: 0.95 })
  );
  sleepingBag.position.set(0.2, 0.08, 0.1);
  sleepingBag.rotation.y = -0.3;
  craveyGroup.add(sleepingBag);

  const craveySkeleton = createAnatomicalHumanSkeleton({
    headless: true,
    hasSurgicalPin: false,
    boneMat: boneAgedMat,
  });
  craveySkeleton.position.set(0.2, 0.16, 0.1);
  craveySkeleton.rotation.y = -0.3;
  craveyGroup.add(craveySkeleton);

  // James Cravey's Bleached Skull perched on nearby sniper rimrock ledge (104X, -105Z)
  const craveySkullY = getTerrainHeight(104, -105);
  const craveySkullGroup = new THREE.Group();
  craveySkullGroup.position.set(104, craveySkullY + 0.15, -105);
  const craveySkull = createAnatomicalHumanSkull({
    bulletHoles: false,
    jawSeparated: false,
    mat: boneMat,
  });
  craveySkull.position.set(0, 0, 0);
  craveySkull.rotation.y = 1.2;
  craveySkull.castShadow = true;
  scene.add(craveySkullGroup);

  scene.add(craveyGroup);

  // =========================================================================
  // 4. 1848 PERALTA MASSACRE GROUNDS SKELETAL REMAINS (-40X, 90Z)
  // Historic Sonoran pack train battleground where Apache warriors wiped out
  // the Mexican expedition, scattering skeletons across the alluvium.
  // =========================================================================
  const massacreSkeletonsGroup = new THREE.Group();
  const massacreY = getTerrainHeight(-40, 90);
  massacreSkeletonsGroup.position.set(-40, massacreY, 90);

  // Weathered human skull half-submerged in wash gravel
  const spanishSkull = createAnatomicalHumanSkull({
    bulletHoles: false,
    jawSeparated: true,
    mat: boneAgedMat,
  });
  spanishSkull.position.set(-1.8, 0.1, 1.4);
  spanishSkull.rotation.set(0.4, -0.8, -0.3);
  massacreSkeletonsGroup.add(spanishSkull);

  // Partially buried rib cage and arm bone
  const halfBuriedSkeleton = createAnatomicalHumanSkeleton({
    headless: true,
    hasSurgicalPin: false,
    boneMat: boneAgedMat,
  });
  halfBuriedSkeleton.position.set(1.5, -0.05, -1.2);
  halfBuriedSkeleton.rotation.set(-0.1, 0.4, 0.15);
  massacreSkeletonsGroup.add(halfBuriedSkeleton);

  // Broken 1840s Spanish wooden mule pack-saddle frame
  const saddleTree = new THREE.Group();
  saddleTree.position.set(-0.8, 0.15, -0.6);
  saddleTree.rotation.z = 0.4;
  const saddleBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.6), weatheredWoodMat);
  saddleBar1.position.x = -0.15;
  saddleTree.add(saddleBar1);
  const saddleBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.6), weatheredWoodMat);
  saddleBar2.position.x = 0.15;
  saddleTree.add(saddleBar2);
  const saddleArch = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 5, 8, Math.PI), weatheredWoodMat);
  saddleArch.rotation.z = Math.PI / 2;
  saddleArch.position.z = 0.25;
  saddleTree.add(saddleArch);
  massacreSkeletonsGroup.add(saddleTree);

  scene.add(massacreSkeletonsGroup);

  return {
    ruthCamp: ruthCampGroup,
    ruthSkull: ruthSkullGroup,
    craveySite: craveyGroup,
    massacreSkeletons: massacreSkeletonsGroup,
  };
}

/**
 * Procedurally sculpts an authentic, anatomically recognizable human skull in Three.js
 * featuring cranium vault, brow ridge, eye orbits, nasal aperture, maxilla with teeth,
 * and optional execution bullet hole perforations through the left and right temples.
 */
export function createAnatomicalHumanSkull(options: {
  bulletHoles?: boolean;
  jawSeparated?: boolean;
  mat?: THREE.Material;
}): THREE.Group {
  const skullGroup = new THREE.Group();
  const skullMat =
    options.mat ||
    new THREE.MeshStandardMaterial({
      color: 0xded7cc,
      roughness: 0.94,
      metalness: 0.02,
    });

  const cavityMat = new THREE.MeshBasicMaterial({ color: 0x120f0c });

  // 1. Cranium Vault (Elongated dome with flattened temples)
  const craniumGeo = new THREE.SphereGeometry(0.14, 14, 12);
  const cPos = craniumGeo.attributes.position;
  for (let i = 0; i < cPos.count; i++) {
    let x = cPos.getX(i);
    let y = cPos.getY(i);
    let z = cPos.getZ(i);
    // Narrow across temples
    x *= 0.82;
    // Taper slightly toward back
    if (z < 0) {
      z *= 1.15;
      y *= 0.92;
    } else {
      // Frontal bone (forehead)
      y *= 1.05;
    }
    cPos.setXYZ(i, x, y, z);
  }
  craniumGeo.computeVertexNormals();
  const cranium = new THREE.Mesh(craniumGeo, skullMat);
  cranium.position.set(0, 0.12, 0);
  cranium.castShadow = true;
  skullGroup.add(cranium);

  // 2. Facial Splanchnocranium (Maxilla & Cheekbones)
  const faceGroup = new THREE.Group();
  faceGroup.position.set(0, 0.04, 0.09);

  // Brow ridge (supraorbital tori)
  const browRidge = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.035, 0.05),
    skullMat
  );
  browRidge.position.set(0, 0.06, 0.03);
  faceGroup.add(browRidge);

  // Left & Right Eye Orbits (sunken dark cavities)
  for (let eye = -1; eye <= 1; eye += 2) {
    const orbitRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.032, 0.010, 6, 10),
      skullMat
    );
    orbitRim.position.set(eye * 0.048, 0.025, 0.035);
    faceGroup.add(orbitRim);

    const orbitCavity = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 8, 8),
      cavityMat
    );
    orbitCavity.position.set(eye * 0.048, 0.025, 0.02);
    faceGroup.add(orbitCavity);

    // Zygomatic Cheekbone Arch
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.08), skullMat);
    cheek.position.set(eye * 0.085, 0.01, -0.01);
    cheek.rotation.y = eye * 0.3;
    faceGroup.add(cheek);
  }

  // Nasal Aperture (Pyriform cavity)
  const nasalCavity = new THREE.Mesh(
    new THREE.ConeGeometry(0.018, 0.04, 4),
    cavityMat
  );
  nasalCavity.position.set(0, -0.015, 0.04);
  nasalCavity.rotation.x = Math.PI;
  faceGroup.add(nasalCavity);

  // Upper Maxilla & Dental Arcade
  const maxilla = new THREE.Mesh(
    new THREE.BoxGeometry(0.095, 0.04, 0.05),
    skullMat
  );
  maxilla.position.set(0, -0.04, 0.025);
  faceGroup.add(maxilla);

  // Upper teeth row
  const upperTeeth = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.018, 0.018),
    new THREE.MeshStandardMaterial({ color: 0xedeae0, roughness: 0.6 })
  );
  upperTeeth.position.set(0, -0.065, 0.035);
  faceGroup.add(upperTeeth);

  skullGroup.add(faceGroup);

  // 3. Mandible (Jawbone)
  const mandibleGroup = new THREE.Group();
  if (options.jawSeparated) {
    // Displaced slightly beside the skull
    mandibleGroup.position.set(0.14, 0.02, 0.08);
    mandibleGroup.rotation.set(0.2, 0.8, -0.3);
  } else {
    mandibleGroup.position.set(0, 0.01, 0.09);
  }

  // Chin & dental row
  const chin = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.035, 0.06), skullMat);
  chin.position.set(0, -0.045, 0.02);
  mandibleGroup.add(chin);

  const lowerTeeth = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.016, 0.016),
    new THREE.MeshStandardMaterial({ color: 0xedeae0, roughness: 0.6 })
  );
  lowerTeeth.position.set(0, -0.024, 0.03);
  mandibleGroup.add(lowerTeeth);

  // Ascending rami
  for (let r = -1; r <= 1; r += 2) {
    const ramus = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.055, 0.04), skullMat);
    ramus.position.set(r * 0.048, -0.02, -0.02);
    mandibleGroup.add(ramus);
  }
  skullGroup.add(mandibleGroup);

  // 4. Two Forensic Bullet Holes (Left Entrance, Right Parietal Exit!)
  if (options.bulletHoles) {
    // Left temple bullet hole (Entrance wound - clean puncture)
    const bulletHoleLeft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.04, 8),
      cavityMat
    );
    bulletHoleLeft.position.set(-0.115, 0.12, 0.02);
    bulletHoleLeft.rotation.z = Math.PI / 2;
    skullGroup.add(bulletHoleLeft);

    // Dark fractured perimeter ring
    const leftRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.020, 0.005, 5, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.95 })
    );
    leftRing.position.set(-0.12, 0.12, 0.02);
    leftRing.rotation.y = Math.PI / 2;
    skullGroup.add(leftRing);

    // Right parietal bone bullet hole (Exit wound - slightly larger beveled shatter)
    const bulletHoleRight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.04, 8),
      cavityMat
    );
    bulletHoleRight.position.set(0.115, 0.15, -0.04);
    bulletHoleRight.rotation.z = Math.PI / 2;
    skullGroup.add(bulletHoleRight);

    const rightRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.026, 0.007, 5, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.95 })
    );
    rightRing.position.set(0.12, 0.15, -0.04);
    rightRing.rotation.y = Math.PI / 2;
    skullGroup.add(rightRing);
  }

  return skullGroup;
}

/**
 * Procedurally sculpts an authentic, articulated human skeleton in Three.js
 * featuring vertebral column, ribcage, pelvic girdle, clavicles, and limbs.
 * Supports headless corpses and Dr. Ruth's historic orthopedic surgical pin.
 */
export function createAnatomicalHumanSkeleton(options: {
  headless?: boolean;
  hasSurgicalPin?: boolean;
  boneMat?: THREE.Material;
  surgicalPinMat?: THREE.Material;
}): THREE.Group {
  const skelGroup = new THREE.Group();
  const boneMat =
    options.boneMat ||
    new THREE.MeshStandardMaterial({
      color: 0xdfd9ce,
      roughness: 0.92,
    });

  const pinMat =
    options.surgicalPinMat ||
    new THREE.MeshStandardMaterial({
      color: 0x4a4a50,
      roughness: 0.5,
      metalness: 0.85,
    });

  // 1. Vertebral Column & Spine
  const spineGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.65, 6);
  const spineMesh = new THREE.Mesh(spineGeo, boneMat);
  spineMesh.rotation.x = Math.PI / 2;
  spineMesh.position.set(0, 0.06, 0);
  skelGroup.add(spineMesh);

  // Severed neck vertebra if headless
  if (options.headless) {
    const severedCervical = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.06, 6),
      new THREE.MeshStandardMaterial({ color: 0x443026, roughness: 0.95 })
    );
    severedCervical.position.set(0, 0.06, -0.34);
    severedCervical.rotation.x = Math.PI / 2;
    skelGroup.add(severedCervical);
  }

  // 2. Rib Cage (Thorax with curved costal ribs)
  const ribCount = 8;
  for (let r = 0; r < ribCount; r++) {
    const rProgress = r / ribCount;
    const rRadiusX = 0.16 * Math.sin(rProgress * Math.PI);
    const rRadiusY = 0.12 * Math.sin(rProgress * Math.PI);
    const ribGeo = new THREE.TorusGeometry(rRadiusX, 0.012, 5, 12, Math.PI * 1.8);
    const ribMesh = new THREE.Mesh(ribGeo, boneMat);
    ribMesh.position.set(0, 0.07, -0.28 + r * 0.045);
    ribMesh.rotation.x = Math.PI / 2;
    ribMesh.scale.set(1.0, rRadiusY / (rRadiusX || 1), 1.0);
    skelGroup.add(ribMesh);
  }

  // Sternum / Breastbone
  const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.28), boneMat);
  sternum.position.set(0, 0.15, -0.15);
  skelGroup.add(sternum);

  // Clavicles / Collarbones
  for (let c = -1; c <= 1; c += 2) {
    const clavicle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 5), boneMat);
    clavicle.position.set(c * 0.11, 0.13, -0.29);
    clavicle.rotation.z = c * (Math.PI / 2 - 0.2);
    skelGroup.add(clavicle);
  }

  // 3. Pelvic Girdle
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.set(0, 0.06, 0.32);
  for (let p = -1; p <= 1; p += 2) {
    const ilium = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), boneMat);
    ilium.position.set(p * 0.10, 0.03, 0);
    ilium.rotation.y = p * 0.3;
    pelvisGroup.add(ilium);
  }
  const sacrum = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.10, 4), boneMat);
  sacrum.position.set(0, 0, 0.04);
  sacrum.rotation.x = -Math.PI / 2;
  pelvisGroup.add(sacrum);
  skelGroup.add(pelvisGroup);

  // 4. Arm Bones (Humerus, Radius & Ulna, Hand)
  for (let arm = -1; arm <= 1; arm += 2) {
    // Upper arm (Humerus)
    const humerus = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.28, 6), boneMat);
    humerus.position.set(arm * 0.24, 0.06, -0.15);
    humerus.rotation.z = arm * 0.4;
    humerus.rotation.x = 0.2;
    skelGroup.add(humerus);

    // Forearm (Radius & Ulna)
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.26, 6), boneMat);
    forearm.position.set(arm * 0.31, 0.04, 0.08);
    forearm.rotation.z = arm * 0.2;
    forearm.rotation.x = 0.1;
    skelGroup.add(forearm);
  }

  // 5. Leg Bones (Femur, Tibia & Fibula)
  for (let leg = -1; leg <= 1; leg += 2) {
    const isLeftLeg = leg === -1;
    const legGroup = new THREE.Group();
    legGroup.position.set(leg * 0.12, 0.05, 0.42);

    // Femur (Thigh bone)
    const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.022, 0.42, 6), boneMat);
    femur.position.set(leg * 0.04, 0, 0.19);
    femur.rotation.x = Math.PI / 2 + 0.1;
    femur.rotation.y = leg * 0.12;
    legGroup.add(femur);

    // DR. ADOLPH RUTH'S CRUCIAL FORENSIC IDENTIFIER:
    // Iron orthopedic surgical pin and wire wrapping around mid-shaft fracture of left femur!
    if (isLeftLeg && options.hasSurgicalPin) {
      const pinBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.09, 8),
        pinMat
      );
      pinBand.position.set(leg * 0.04, 0.005, 0.19);
      pinBand.rotation.x = Math.PI / 2 + 0.1;
      legGroup.add(pinBand);

      // Surgical iron wire loops
      for (let w = 0; w < 3; w++) {
        const wireLoop = new THREE.Mesh(
          new THREE.TorusGeometry(0.030, 0.004, 4, 10),
          pinMat
        );
        wireLoop.position.set(leg * 0.04, 0.005, 0.16 + w * 0.03);
        wireLoop.rotation.y = Math.PI / 2;
        legGroup.add(wireLoop);
      }
    }

    // Lower Leg (Tibia & Fibula)
    const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.38, 6), boneMat);
    tibia.position.set(leg * 0.06, -0.01, 0.58);
    tibia.rotation.x = Math.PI / 2 + 0.05;
    legGroup.add(tibia);

    skelGroup.add(legGroup);
  }

  return skelGroup;
}
