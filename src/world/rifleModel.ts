import * as THREE from 'three';

export interface RifleModelOptions {
  withScope?: boolean;
  scale?: number;
  brassFrame?: boolean;
}

/**
 * Creates an authentic 1870s Winchester/Henry Lever-Action Repeater Rifle
 * with an octagonal blued steel barrel, tubular magazine, walnut stock,
 * and a period Malcolm-style brass telescopic sniper scope.
 */
export function createRifleModel(options: RifleModelOptions = {}): THREE.Group {
  const { withScope = true, scale = 1.0, brassFrame = false } = options;
  const rifle = new THREE.Group();

  // Materials
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x22262a,
    metalness: 0.88,
    roughness: 0.28,
  });

  const receiverMat = brassFrame
    ? new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.85,
        roughness: 0.35,
      })
    : new THREE.MeshStandardMaterial({
        color: 0x1a1d20,
        metalness: 0.9,
        roughness: 0.25,
      });

  const walnutMat = new THREE.MeshStandardMaterial({
    color: 0x4a2a16,
    roughness: 0.75,
    metalness: 0.08,
  });

  const brassScopeMat = new THREE.MeshStandardMaterial({
    color: 0xc89d38,
    metalness: 0.86,
    roughness: 0.28,
  });

  const lensGlassMat = new THREE.MeshStandardMaterial({
    color: 0xa8d5e5,
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.75,
  });

  // --- 1. RECEIVER (Frame & Action) ---
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.26), receiverMat);
  receiver.position.set(0, 0, 0);
  receiver.castShadow = true;
  rifle.add(receiver);

  // Ejection Port cutout top
  const ejectionPort = new THREE.Mesh(
    new THREE.BoxGeometry(0.026, 0.02, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x0f1113, roughness: 0.9 })
  );
  ejectionPort.position.set(0, 0.038, 0.04);
  rifle.add(ejectionPort);

  // Loading Gate on right side
  const loadingGate = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.025, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.6 })
  );
  loadingGate.position.set(0.024, -0.005, 0.02);
  rifle.add(loadingGate);

  // Cocked Hammer
  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.025), steelMat);
  hammer.position.set(0, 0.045, -0.11);
  hammer.rotation.x = -0.35;
  rifle.add(hammer);

  // Lever Loop & Trigger
  const leverLoop = new THREE.Mesh(
    new THREE.TorusGeometry(0.035, 0.006, 6, 12, Math.PI * 1.4),
    steelMat
  );
  leverLoop.position.set(0, -0.065, -0.04);
  leverLoop.rotation.y = Math.PI / 2;
  rifle.add(leverLoop);

  const trigger = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.025, 4), steelMat);
  trigger.position.set(0, -0.048, -0.02);
  trigger.rotation.x = 0.3;
  rifle.add(trigger);

  // --- 2. RIFLE BARREL (Octagonal Blued Steel) ---
  // 8-sided cylinder = authentic frontier octagonal barrel
  const barrelLength = 0.72;
  const barrelGeo = new THREE.CylinderGeometry(0.016, 0.018, barrelLength, 8);
  barrelGeo.rotateX(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, steelMat);
  barrel.position.set(0, 0.02, 0.13 + barrelLength / 2);
  barrel.castShadow = true;
  rifle.add(barrel);

  // Hollow Muzzle Bore
  const muzzleBore = new THREE.Mesh(
    new THREE.CircleGeometry(0.009, 8),
    new THREE.MeshBasicMaterial({ color: 0x050505 })
  );
  muzzleBore.position.set(0, 0.02, 0.13 + barrelLength + 0.001);
  rifle.add(muzzleBore);

  // Under-barrel Tubular Magazine
  const magLength = 0.68;
  const magGeo = new THREE.CylinderGeometry(0.012, 0.012, magLength, 10);
  magGeo.rotateX(Math.PI / 2);
  const magazineTube = new THREE.Mesh(magGeo, steelMat);
  magazineTube.position.set(0, -0.008, 0.13 + magLength / 2);
  rifle.add(magazineTube);

  // Brass End Cap for Magazine Tube
  const magCap = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.015, 8), brassScopeMat);
  magCap.rotation.x = Math.PI / 2;
  magCap.position.set(0, -0.008, 0.13 + magLength + 0.008);
  rifle.add(magCap);

  // Steel Barrel Retention Bands (Clamping barrel & mag together)
  const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.055, 0.016), steelMat);
  band1.position.set(0, 0.006, 0.46);
  rifle.add(band1);

  const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.052, 0.014), steelMat);
  band2.position.set(0, 0.006, 0.78);
  rifle.add(band2);

  // Front Blade Sight
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.016, 0.012), steelMat);
  frontSight.position.set(0, 0.038, 0.82);
  rifle.add(frontSight);

  // Rear Buckhorn Sight
  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.012, 0.02), steelMat);
  rearSight.position.set(0, 0.036, 0.28);
  rifle.add(rearSight);

  // --- 3. WOODEN STOCKS (American Walnut) ---
  // Fore-end stock (grasping wood below barrel)
  const foreEnd = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.048, 0.32), walnutMat);
  foreEnd.position.set(0, -0.006, 0.29);
  foreEnd.castShadow = true;
  rifle.add(foreEnd);

  // Buttstock (carved ergonomic walnut with drop)
  const buttstockGroup = new THREE.Group();
  const buttMain = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.125, 0.34), walnutMat);
  buttMain.position.set(0, -0.045, -0.27);
  buttMain.rotation.x = 0.14;
  buttMain.castShadow = true;
  buttstockGroup.add(buttMain);

  // Curved Crescent Buttplate (Brass/Steel)
  const buttplate = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.13, 0.014),
    brassFrame ? brassScopeMat : steelMat
  );
  buttplate.position.set(0, -0.068, -0.44);
  buttplate.rotation.x = 0.14;
  buttstockGroup.add(buttplate);
  rifle.add(buttstockGroup);

  // --- 4. VINTAGE MALCOLM-STYLE BRASS TELESCOPIC SCOPE ---
  if (withScope) {
    const scopeGroup = new THREE.Group();
    const scopeLength = 0.58;

    // Scope Main Brass Tube
    const tubeGeo = new THREE.CylinderGeometry(0.013, 0.013, scopeLength, 12);
    tubeGeo.rotateX(Math.PI / 2);
    const scopeTube = new THREE.Mesh(tubeGeo, brassScopeMat);
    scopeTube.position.set(0, 0.068, 0.28);
    scopeTube.castShadow = true;
    scopeGroup.add(scopeTube);

    // Front Objective Bell (wider flared brass front)
    const objBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.014, 0.06, 12),
      brassScopeMat
    );
    objBell.rotation.x = Math.PI / 2;
    objBell.position.set(0, 0.068, 0.28 + scopeLength / 2 + 0.025);
    scopeGroup.add(objBell);

    // Front Objective Lens (optical glass)
    const frontLens = new THREE.Mesh(new THREE.CircleGeometry(0.015, 12), lensGlassMat);
    frontLens.position.set(0, 0.068, 0.28 + scopeLength / 2 + 0.054);
    scopeGroup.add(frontLens);

    // Rear Ocular Eyepiece (with knurled focus ring)
    const ocularBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.017, 0.014, 0.05, 12),
      brassScopeMat
    );
    ocularBell.rotation.x = -Math.PI / 2;
    ocularBell.position.set(0, 0.068, 0.28 - scopeLength / 2 - 0.02);
    scopeGroup.add(ocularBell);

    // Rear Ocular Lens (optical glass)
    const rearLens = new THREE.Mesh(new THREE.CircleGeometry(0.014, 12), lensGlassMat);
    rearLens.rotation.y = Math.PI;
    rearLens.position.set(0, 0.068, 0.28 - scopeLength / 2 - 0.044);
    scopeGroup.add(rearLens);

    // Vintage Brass Mounting Rings (Dovetailed to receiver and barrel)
    const ring1 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.048, 0.018), brassScopeMat);
    ring1.position.set(0, 0.048, 0.08);
    scopeGroup.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.048, 0.018), brassScopeMat);
    ring2.position.set(0, 0.048, 0.44);
    scopeGroup.add(ring2);

    // Elevation Turret Knob on top of scope
    const elevTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.014, 10), brassScopeMat);
    elevTurret.position.set(0, 0.086, 0.22);
    scopeGroup.add(elevTurret);

    // Windage Turret Knob on right side of scope
    const windTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.014, 10), brassScopeMat);
    windTurret.rotation.z = Math.PI / 2;
    windTurret.position.set(0.018, 0.068, 0.22);
    scopeGroup.add(windTurret);

    rifle.add(scopeGroup);
  }

  // --- 5. RIFLE BARRIER / GUN REST MOUNT LUG ---
  // Folding frontier barrel rest / barrier notch mount under fore-end stock
  const restLug = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.024, 0.03), steelMat);
  restLug.position.set(0, -0.035, 0.38);
  rifle.add(restLug);

  // Apply overall scale
  if (scale !== 1.0) {
    rifle.scale.set(scale, scale, scale);
  }

  return rifle;
}
