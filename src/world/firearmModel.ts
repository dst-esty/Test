import * as THREE from 'three';

/**
 * Period-Correct Frontier Firearm Model (c. 1873 - 1885)
 * Inspired by the legendary Winchester Model 1873 / 1876 Lever-Action Repeater
 * equipped with an authentic William Malcolm (c. 1855-1880s) Long-Tube Telescopic Sight.
 */

export interface RifleModelParts {
  root: THREE.Group;
  muzzlePos: THREE.Vector3;
  barrelMesh: THREE.Mesh;
  scopeMesh: THREE.Group;
  muzzleFlashLight?: THREE.PointLight;
}

export function createPeriodCorrectRifle(options: { isFirstPerson?: boolean } = {}): RifleModelParts {
  const isFP = options.isFirstPerson ?? false;
  const root = new THREE.Group();

  // Scale: authentic ~42-inch overall rifle length (~1.06m)
  // In first-person, scale slightly for crisp screen presence
  const scale = isFP ? 0.95 : 1.0;
  root.scale.setScalar(scale);

  // --- PALETTE & AUTHENTIC MATERIALS ---
  // Gunmetal blued steel (barrel, receiver, lever)
  const bluedSteelMat = new THREE.MeshStandardMaterial({
    color: 0x22262a,
    metalness: 0.88,
    roughness: 0.32,
  });

  // Polished case-hardened receiver / accents
  const caseHardenedMat = new THREE.MeshStandardMaterial({
    color: 0x2c2d30,
    metalness: 0.75,
    roughness: 0.42,
  });

  // American Walnut wood (buttstock and fore-end stock)
  const walnutWoodMat = new THREE.MeshStandardMaterial({
    color: 0x4a2c18,
    metalness: 0.05,
    roughness: 0.72,
  });

  // Period antique yellow brass (Malcolm scope body, barrel bands, buttplate)
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc89838,
    metalness: 0.82,
    roughness: 0.35,
  });

  // Scope lens glass material
  const lensGlassMat = new THREE.MeshStandardMaterial({
    color: 0x77bbaa,
    metalness: 0.2,
    roughness: 0.08,
    transparent: true,
    opacity: 0.65,
  });

  // Dark internal bore material
  const boreMat = new THREE.MeshBasicMaterial({ color: 0x050505 });

  // -----------------------------------------------------------
  // 1. RECEIVER & ACTION (Frame)
  // -----------------------------------------------------------
  const receiverGroup = new THREE.Group();

  // Main steel action body
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.046, 0.088, 0.22),
    caseHardenedMat
  );
  receiver.position.set(0, 0, 0);
  receiverGroup.add(receiver);

  // Upper tang
  const upperTang = new THREE.Mesh(
    new THREE.BoxGeometry(0.024, 0.016, 0.08),
    bluedSteelMat
  );
  upperTang.position.set(0, 0.042, -0.11);
  upperTang.rotation.x = 0.12;
  receiverGroup.add(upperTang);

  // Cocking hammer (at rear tang)
  const hammer = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.04, 0.028),
    bluedSteelMat
  );
  hammer.position.set(0, 0.052, -0.095);
  hammer.rotation.x = -0.38;
  receiverGroup.add(hammer);

  // Ejection port cover / slide on top
  const ejectionPort = new THREE.Mesh(
    new THREE.BoxGeometry(0.026, 0.008, 0.065),
    new THREE.MeshStandardMaterial({ color: 0x16181b, metalness: 0.9, roughness: 0.25 })
  );
  ejectionPort.position.set(0.012, 0.045, 0.02);
  receiverGroup.add(ejectionPort);

  // Brass loading gate spring cover (right side of receiver)
  const loadingGate = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.022, 0.052),
    brassMat
  );
  loadingGate.position.set(0.024, 0.004, -0.01);
  receiverGroup.add(loadingGate);

  // Trigger guard & finger lever loop underneath
  const leverLoop = new THREE.Mesh(
    new THREE.TorusGeometry(0.038, 0.007, 6, 12, Math.PI * 1.35),
    bluedSteelMat
  );
  leverLoop.position.set(0, -0.056, -0.048);
  leverLoop.rotation.y = Math.PI / 2;
  leverLoop.rotation.z = Math.PI * 0.85;
  receiverGroup.add(leverLoop);

  // Curved trigger
  const trigger = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.003, 0.028, 4),
    bluedSteelMat
  );
  trigger.position.set(0, -0.042, -0.022);
  trigger.rotation.x = 0.35;
  receiverGroup.add(trigger);

  root.add(receiverGroup);

  // -----------------------------------------------------------
  // 2. REAL OCTAGONAL RIFLE BARREL & MUZZLE
  // -----------------------------------------------------------
  const barrelGroup = new THREE.Group();
  const barrelLength = 0.68; // ~27 inch barrel
  const barrelRadius = 0.017;

  // Authentic 8-sided (octagonal) blued steel barrel geometry
  const barrelGeo = new THREE.CylinderGeometry(barrelRadius * 0.88, barrelRadius, barrelLength, 8);
  barrelGeo.rotateX(Math.PI / 2); // align along Z
  const barrelMesh = new THREE.Mesh(barrelGeo, bluedSteelMat);
  barrelMesh.position.set(0, 0.025, 0.11 + barrelLength * 0.5);
  barrelGroup.add(barrelMesh);

  // Hollow drilled muzzle bore at the tip
  const muzzleBore = new THREE.Mesh(
    new THREE.CircleGeometry(barrelRadius * 0.62, 8),
    boreMat
  );
  const muzzleZ = 0.11 + barrelLength;
  muzzleBore.position.set(0, 0.025, muzzleZ + 0.001);
  barrelGroup.add(muzzleBore);

  // Flared muzzle crown collar ring
  const muzzleCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(barrelRadius * 0.95, barrelRadius * 0.95, 0.016, 8),
    bluedSteelMat
  );
  muzzleCrown.rotation.x = Math.PI / 2;
  muzzleCrown.position.set(0, 0.025, muzzleZ - 0.008);
  barrelGroup.add(muzzleCrown);

  // Full-length under-barrel tubular magazine (holds ten .44-40 cartridges)
  const magLength = barrelLength * 0.94;
  const magRadius = 0.013;
  const magGeo = new THREE.CylinderGeometry(magRadius, magRadius, magLength, 8);
  magGeo.rotateX(Math.PI / 2);
  const magMesh = new THREE.Mesh(magGeo, bluedSteelMat);
  magMesh.position.set(0, -0.006, 0.11 + magLength * 0.5);
  barrelGroup.add(magMesh);

  // Knurled magazine tube brass end-plug
  const magCap = new THREE.Mesh(
    new THREE.CylinderGeometry(magRadius * 1.05, magRadius * 1.05, 0.015, 8),
    brassMat
  );
  magCap.rotation.x = Math.PI / 2;
  magCap.position.set(0, -0.006, 0.11 + magLength);
  barrelGroup.add(magCap);

  // Dual brass barrel retention bands (clamp barrel and magazine together)
  const band1Z = 0.11 + barrelLength * 0.45;
  const band2Z = 0.11 + barrelLength * 0.88;
  [band1Z, band2Z].forEach((bz) => {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(barrelRadius * 2.4, 0.054, 0.016),
      brassMat
    );
    band.position.set(0, 0.009, bz);
    barrelGroup.add(band);
  });

  // Traditional front blade bead sight
  const frontSight = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.014, 0.018),
    bluedSteelMat
  );
  frontSight.position.set(0, 0.025 + barrelRadius * 0.92 + 0.007, muzzleZ - 0.03);
  barrelGroup.add(frontSight);

  const frontBead = new THREE.Mesh(
    new THREE.SphereGeometry(0.0035, 6, 6),
    brassMat
  );
  frontBead.position.set(0, 0.025 + barrelRadius * 0.92 + 0.014, muzzleZ - 0.03);
  barrelGroup.add(frontBead);

  root.add(barrelGroup);

  // -----------------------------------------------------------
  // 3. WALNUT WOOD FORE-END & BUTTSTOCK
  // -----------------------------------------------------------
  const stockGroup = new THREE.Group();

  // Fore-end wood handguard (wraps beneath barrel and magazine up to first band)
  const foreEndLength = barrelLength * 0.44;
  const foreEnd = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, 0.052, foreEndLength),
    walnutWoodMat
  );
  foreEnd.position.set(0, 0.004, 0.11 + foreEndLength * 0.5);
  stockGroup.add(foreEnd);

  // Rear walnut buttstock with authentic drop at heel
  const buttstockGeo = new THREE.BoxGeometry(0.046, 0.13, 0.36);
  const buttstock = new THREE.Mesh(buttstockGeo, walnutWoodMat);
  buttstock.position.set(0, -0.048, -0.27);
  buttstock.rotation.x = -0.14; // downward slope
  stockGroup.add(buttstock);

  // Curved crescent brass buttplate
  const buttplate = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.136, 0.018),
    brassMat
  );
  buttplate.position.set(0, -0.072, -0.445);
  buttplate.rotation.x = -0.14;
  stockGroup.add(buttplate);

  root.add(stockGroup);

  // -----------------------------------------------------------
  // 4. PERIOD-CORRECT WILLIAM MALCOLM TELESCOPIC RIFLE SIGHT
  // (Full-length 3/4" slender brass optic tube, external ring mounts)
  // -----------------------------------------------------------
  const scopeGroup = new THREE.Group();
  const scopeTubeLength = barrelLength * 0.86; // ~23-inch brass scope tube
  const scopeRadius = 0.012; // 3/4-inch diameter period tube
  const scopeCenterY = 0.025 + barrelRadius + 0.036; // mounted elevated on dovetails above barrel

  // Main brass optical tube
  const tubeGeo = new THREE.CylinderGeometry(scopeRadius, scopeRadius, scopeTubeLength, 12);
  tubeGeo.rotateX(Math.PI / 2);
  const scopeTube = new THREE.Mesh(tubeGeo, brassMat);
  scopeTube.position.set(0, scopeCenterY, 0.06 + scopeTubeLength * 0.5);
  scopeGroup.add(scopeTube);

  // Front Objective Bell (slight enlargement for lens intake)
  const objBellRadius = scopeRadius * 1.35;
  const objBell = new THREE.Mesh(
    new THREE.CylinderGeometry(objBellRadius, scopeRadius, 0.045, 12),
    brassMat
  );
  objBell.rotation.x = Math.PI / 2;
  const objBellZ = 0.06 + scopeTubeLength;
  objBell.position.set(0, scopeCenterY, objBellZ - 0.02);
  scopeGroup.add(objBell);

  // Brass Sunshade / Rain Hood extending forward over barrel
  const sunshade = new THREE.Mesh(
    new THREE.CylinderGeometry(objBellRadius, objBellRadius, 0.05, 12, 1, true),
    brassMat
  );
  sunshade.rotation.x = Math.PI / 2;
  sunshade.position.set(0, scopeCenterY, objBellZ + 0.025);
  scopeGroup.add(sunshade);

  // Objective glass lens element
  const objLens = new THREE.Mesh(
    new THREE.CircleGeometry(objBellRadius * 0.86, 12),
    lensGlassMat
  );
  objLens.position.set(0, scopeCenterY, objBellZ + 0.002);
  scopeGroup.add(objLens);

  // Rear Ocular Eyepiece Bell
  const ocularRadius = scopeRadius * 1.32;
  const ocularBell = new THREE.Mesh(
    new THREE.CylinderGeometry(scopeRadius, ocularRadius, 0.04, 12),
    brassMat
  );
  ocularBell.rotation.x = Math.PI / 2;
  const ocularZ = 0.06;
  ocularBell.position.set(0, scopeCenterY, ocularZ + 0.02);
  scopeGroup.add(ocularBell);

  // Knurled brass focus ring collar
  const focusRing = new THREE.Mesh(
    new THREE.CylinderGeometry(ocularRadius * 1.1, ocularRadius * 1.1, 0.016, 12),
    bluedSteelMat
  );
  focusRing.rotation.x = Math.PI / 2;
  focusRing.position.set(0, scopeCenterY, ocularZ + 0.01);
  scopeGroup.add(focusRing);

  // Ocular rear glass disc (facing the shooter's eye)
  const ocularLens = new THREE.Mesh(
    new THREE.CircleGeometry(ocularRadius * 0.88, 12),
    lensGlassMat
  );
  ocularLens.rotation.y = Math.PI; // faces back toward eye (-Z)
  ocularLens.position.set(0, scopeCenterY, ocularZ - 0.001);
  scopeGroup.add(ocularLens);

  // Dual External Dovetail Mounting Blocks with Knurled Adjustment Thumbscrews
  // Front Mount (over barrel)
  const frontMountZ = 0.06 + scopeTubeLength * 0.72;
  const rearMountZ = 0.06 + scopeTubeLength * 0.16;

  [frontMountZ, rearMountZ].forEach((mz, idx) => {
    const mountBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, 0.034, 0.022),
      bluedSteelMat
    );
    mountBlock.position.set(0, scopeCenterY - 0.018, mz);
    scopeGroup.add(mountBlock);

    // High ring clamp encircling the scope tube
    const ringClamp = new THREE.Mesh(
      new THREE.CylinderGeometry(scopeRadius * 1.25, scopeRadius * 1.25, 0.018, 10),
      brassMat
    );
    ringClamp.rotation.x = Math.PI / 2;
    ringClamp.position.set(0, scopeCenterY, mz);
    scopeGroup.add(ringClamp);

    // Period micrometer adjustment thumbscrews (Elevation on top, Windage on right side)
    const elevScrew = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.014, 8),
      brassMat
    );
    elevScrew.position.set(0, scopeCenterY + scopeRadius * 1.35, mz);
    scopeGroup.add(elevScrew);

    if (idx === 1) {
      // Rear mount has prominent windage click drum
      const windScrew = new THREE.Mesh(
        new THREE.CylinderGeometry(0.007, 0.007, 0.016, 8),
        brassMat
      );
      windScrew.rotation.z = Math.PI / 2;
      windScrew.position.set(scopeRadius * 1.45, scopeCenterY, mz);
      scopeGroup.add(windScrew);
    }
  });

  root.add(scopeGroup);

  // -----------------------------------------------------------
  // 5. MUZZLE FLASH LIGHT & SOCKET
  // -----------------------------------------------------------
  const flashLight = new THREE.PointLight(0xffb844, 0, 14);
  flashLight.position.set(0, 0.025, muzzleZ + 0.1);
  root.add(flashLight);

  return {
    root,
    muzzlePos: new THREE.Vector3(0, 0.025, muzzleZ),
    barrelMesh,
    scopeMesh: scopeGroup,
    muzzleFlashLight: flashLight,
  };
}
