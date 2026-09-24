import * as THREE from 'three';
import { getTerrainHeight } from './terrain';
import { PERALTA_SOLVES, PeraltaSolveDef } from '../services/peraltaStoneMapService';

export interface PeraltaSolveSitesMeshes {
  rootGroup: THREE.Group;
  solveGroups: Map<string, THREE.Group>;
}

export function buildPeraltaSolveSites(scene: THREE.Scene): PeraltaSolveSitesMeshes {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'peralta_solve_sites_root';
  const solveGroups = new Map<string, THREE.Group>();

  // Materials
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x5a4636,
    roughness: 0.9,
    metalness: 0.05,
  });

  const altarHeartMat = new THREE.MeshStandardMaterial({
    color: 0x8a2e24,
    roughness: 0.65,
    metalness: 0.25,
  });

  const agedTimberMat = new THREE.MeshStandardMaterial({
    color: 0x483624,
    roughness: 0.95,
  });

  const goldOreVeinMat = new THREE.MeshStandardMaterial({
    color: 0xfcc200,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x664400,
    emissiveIntensity: 0.5,
  });

  const forgedIronMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.6,
    metalness: 0.85,
  });

  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0x967d5e,
    roughness: 0.95,
  });

  // =========================================================================
  // SOLVE II: EL CORAZÓN & SOMBRERO KEYWAY ALTAR (-65X, 95Z)
  // =========================================================================
  const solveHeart = PERALTA_SOLVES.find((s) => s.id === 'solve_heart_stone')!;
  const heartGroup = new THREE.Group();
  const heartY = getTerrainHeight(solveHeart.coordinates.x, solveHeart.coordinates.z);
  heartGroup.position.set(solveHeart.coordinates.x, heartY, solveHeart.coordinates.z);

  // Stepped Stone Altar Base
  const altarBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 2.0), stoneMat);
  altarBase.position.y = 0.3;
  altarBase.castShadow = true;
  heartGroup.add(altarBase);

  const altarTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 1.5), stoneMat);
  altarTop.position.y = 0.8;
  altarTop.castShadow = true;
  heartGroup.add(altarTop);

  // Heart-shaped Inset Keyway on top of altar
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, 0.2);
  heartShape.bezierCurveTo(-0.25, 0.45, -0.45, 0.2, -0.45, -0.05);
  heartShape.bezierCurveTo(-0.45, -0.3, -0.2, -0.5, 0, -0.7);
  heartShape.bezierCurveTo(0.2, -0.5, 0.45, -0.3, 0.45, -0.05);
  heartShape.bezierCurveTo(0.45, 0.2, 0.25, 0.45, 0, 0.2);

  const heartGeo = new THREE.ExtrudeGeometry(heartShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  });
  heartGeo.scale(0.5, 0.5, 0.5);
  heartGeo.rotateX(-Math.PI / 2);

  const heartKeyMesh = new THREE.Mesh(heartGeo, altarHeartMat);
  heartKeyMesh.position.set(0, 1.06, 0.1);
  heartGroup.add(heartKeyMesh);

  // Spanish Inscription Stone Pillar behind altar
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.4), stoneMat);
  pillar.position.set(0, 1.1, -0.7);
  pillar.castShadow = true;
  heartGroup.add(pillar);

  // Spanish Latin Cross atop pillar
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), forgedIronMat);
  crossV.position.set(0, 2.2, -0.7);
  heartGroup.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), forgedIronMat);
  crossH.position.set(0, 2.35, -0.7);
  heartGroup.add(crossH);

  // Secret Iron-Banded Trapdoor in ground beside altar
  const trapdoor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.4), agedTimberMat);
  trapdoor.position.set(1.5, 0.08, 0);
  heartGroup.add(trapdoor);

  const ironStrap1 = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.12, 0.08), forgedIronMat);
  ironStrap1.position.set(1.5, 0.09, -0.4);
  heartGroup.add(ironStrap1);

  const ironStrap2 = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.12, 0.08), forgedIronMat);
  ironStrap2.position.set(1.5, 0.09, 0.4);
  heartGroup.add(ironStrap2);

  const ringHasp = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 10), forgedIronMat);
  ringHasp.position.set(1.5, 0.16, 0);
  ringHasp.rotation.x = Math.PI / 2;
  heartGroup.add(ringHasp);

  // Mysterious Red / Gold Glow from trapdoor seam
  const heartGlow = new THREE.PointLight(0xff5533, 1.4, 4.0);
  heartGlow.position.set(1.5, 0.4, 0);
  heartGroup.add(heartGlow);

  rootGroup.add(heartGroup);
  solveGroups.set('solve_heart_stone', heartGroup);

  // =========================================================================
  // SOLVE III: BLACK TOP MESA EQUINOX FUNNEL PIT (24X, -45Z)
  // =========================================================================
  const solveRuth = PERALTA_SOLVES.find((s) => s.id === 'solve_black_top_equinox')!;
  const ruthGroup = new THREE.Group();
  const ruthY = getTerrainHeight(solveRuth.coordinates.x, solveRuth.coordinates.z);
  ruthGroup.position.set(solveRuth.coordinates.x, ruthY, solveRuth.coordinates.z);

  // Vertical Stone-Rimmed Funnel Well
  const funnelRim = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.5, 0.6, 12, 1, true),
    stoneMat
  );
  funnelRim.position.y = 0.3;
  funnelRim.castShadow = true;
  ruthGroup.add(funnelRim);

  // Interior Darkness / Deep Shaft
  const shaftHole = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.1, 3.0, 12),
    new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0 })
  );
  shaftHole.position.y = -1.2;
  ruthGroup.add(shaftHole);

  // Dr. Ruth's 1931 Surveying Tripod on Rim
  const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.6, 6);
  for (let l = 0; l < 3; l++) {
    const lAng = (l * Math.PI * 2) / 3;
    const leg = new THREE.Mesh(legGeo, agedTimberMat);
    leg.position.set(Math.cos(lAng) * 0.4 - 1.8, 0.75, Math.sin(lAng) * 0.4);
    leg.rotation.z = Math.cos(lAng) * 0.25;
    leg.rotation.x = Math.sin(lAng) * 0.25;
    ruthGroup.add(leg);
  }

  // Brass Theodolite Head atop tripod
  const theodolite = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: 0xb58b32, metalness: 0.85, roughness: 0.35 })
  );
  theodolite.position.set(-1.8, 1.55, 0);
  ruthGroup.add(theodolite);

  // Heavy Hemp Climbing Rope anchored to nearby boulder and hanging into pit
  const anchorBoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 1), stoneMat);
  anchorBoulder.position.set(1.9, 0.5, 0.8);
  anchorBoulder.castShadow = true;
  ruthGroup.add(anchorBoulder);

  const ropeCoil = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 12), ropeMat);
  ropeCoil.position.set(1.7, 0.9, 0.6);
  ropeCoil.rotation.x = Math.PI / 2;
  ruthGroup.add(ropeCoil);

  const hangingRope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 6), ropeMat);
  hangingRope.position.set(0.6, -0.6, 0.2);
  ruthGroup.add(hangingRope);

  // Golden Vein Specimen Peeking from Shaft Lip
  const goldSpecimen = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 1), goldOreVeinMat);
  goldSpecimen.position.set(0.9, 0.5, -0.8);
  ruthGroup.add(goldSpecimen);

  const ruthLight = new THREE.PointLight(0xffb703, 1.5, 4.0);
  ruthLight.position.set(0, 0.2, 0);
  ruthGroup.add(ruthLight);

  rootGroup.add(ruthGroup);
  solveGroups.set('solve_black_top_equinox', ruthGroup);

  // =========================================================================
  // SOLVE IV: UPPER LA BARGE JESUIT INGOT VAULT (40X, -175Z)
  // =========================================================================
  const solveLaBarge = PERALTA_SOLVES.find((s) => s.id === 'solve_la_barge_vault')!;
  const bargeGroup = new THREE.Group();
  const bargeY = getTerrainHeight(solveLaBarge.coordinates.x, solveLaBarge.coordinates.z);
  bargeGroup.position.set(solveLaBarge.coordinates.x, bargeY, solveLaBarge.coordinates.z);

  // Fluvial Canyon Overhang Arch
  const caveArch = new THREE.Mesh(
    new THREE.DodecahedronGeometry(2.6, 1),
    stoneMat
  );
  caveArch.scale.set(1.5, 1.2, 1.0);
  caveArch.position.set(0, 2.0, -1.0);
  caveArch.castShadow = true;
  bargeGroup.add(caveArch);

  // Mortared Basalt Seal Bulkhead
  const sealWall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 0.6), stoneMat);
  sealWall.position.set(0, 1.2, -0.3);
  bargeGroup.add(sealWall);

  // Heavy Iron Straps and Padlocked Royal Spanish Cross Crest
  const ironCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 0.1), forgedIronMat);
  ironCrossV.position.set(0, 1.2, -0.02);
  bargeGroup.add(ironCrossV);

  const ironCrossH = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.1), forgedIronMat);
  ironCrossH.position.set(0, 1.5, -0.02);
  bargeGroup.add(ironCrossH);

  // Royal Ingot Seal Medallion (Center of Cross)
  const sealMedallion = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12),
    new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.3 })
  );
  sealMedallion.position.set(0, 1.5, 0.05);
  sealMedallion.rotation.x = Math.PI / 2;
  bargeGroup.add(sealMedallion);

  // Discarded Dynamite & Miner's Prybar at entrance
  const prybar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), forgedIronMat);
  prybar.position.set(-0.9, 0.5, 0.6);
  prybar.rotation.set(0.3, 0.2, 0.7);
  bargeGroup.add(prybar);

  // Emerald Water Reflections
  const tinajaReflectionLight = new THREE.PointLight(0x06b6d4, 1.8, 5.0);
  tinajaReflectionLight.position.set(0, 0.6, 0.5);
  bargeGroup.add(tinajaReflectionLight);

  rootGroup.add(bargeGroup);
  solveGroups.set('solve_la_barge_vault', bargeGroup);

  scene.add(rootGroup);

  return {
    rootGroup,
    solveGroups,
  };
}
