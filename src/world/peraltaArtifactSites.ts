import * as THREE from 'three';
import { getTerrainHeight } from './terrain';
import { PERALTA_STONE_ARTIFACTS, PeraltaStoneArtifact, peraltaStoneMapService } from '../services/peraltaStoneMapService';

export interface PeraltaArtifactSitesMeshes {
  rootGroup: THREE.Group;
  artifactGroups: Map<string, THREE.Group>;
  stoneMeshes: Map<string, THREE.Mesh>;
  updateVisibility: () => void;
}

export function buildPeraltaArtifactSites(scene: THREE.Scene): PeraltaArtifactSitesMeshes {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'peralta_physical_artifacts_root';

  const artifactGroups = new Map<string, THREE.Group>();
  const stoneMeshes = new Map<string, THREE.Mesh>();

  // Materials
  const calicheSandstoneMat = new THREE.MeshStandardMaterial({
    color: 0xdec18f,
    roughness: 0.95,
    metalness: 0.05,
  });

  const redTuffMat = new THREE.MeshStandardMaterial({
    color: 0x9e4331,
    roughness: 0.9,
    metalness: 0.1,
  });

  const andesiteHeartMat = new THREE.MeshStandardMaterial({
    color: 0x6e2820,
    roughness: 0.6,
    metalness: 0.35,
  });

  const engravedGlyphMat = new THREE.MeshStandardMaterial({
    color: 0x2e180d,
    roughness: 0.85,
  });

  const cairnBasaltMat = new THREE.MeshStandardMaterial({
    color: 0x3d352e,
    roughness: 0.95,
  });

  // =========================================================================
  // ARTIFACT 1: THE TRAIL MAP TABLET (Low Sonoran Riparian Wash: -72X, -228Z)
  // =========================================================================
  const trailArtifact = PERALTA_STONE_ARTIFACTS.find((a) => a.id === 'artifact_trail_stone')!;
  const trailGroup = new THREE.Group();
  const trailY = getTerrainHeight(trailArtifact.position.x, trailArtifact.position.z);
  trailGroup.position.set(trailArtifact.position.x, trailY, trailArtifact.position.z);

  // Riverbed gravel mound
  const gravelMound = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 2.0, 0.25, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a7052, roughness: 1.0 })
  );
  gravelMound.position.y = 0.1;
  gravelMound.receiveShadow = true;
  trailGroup.add(gravelMound);

  // The Rectangular Carved Stone Slab (tilted in caliche sand)
  const trailStone = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.1, 0.52),
    calicheSandstoneMat
  );
  trailStone.position.set(0, 0.22, 0);
  trailStone.rotation.set(0.15, 0.35, 0.12);
  trailStone.castShadow = true;
  trailGroup.add(trailStone);
  stoneMeshes.set(trailArtifact.id, trailStone);

  // Carved glyph relief lines on stone
  const glyphLine1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.04), engravedGlyphMat);
  glyphLine1.position.set(0, 0.06, -0.12);
  trailStone.add(glyphLine1);

  const glyphCross = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.12), engravedGlyphMat);
  glyphCross.position.set(0.15, 0.06, 0.1);
  trailStone.add(glyphCross);

  // Surrounding river stones
  for (let i = 0; i < 5; i++) {
    const rStone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.2 + (i % 3) * 0.08, 0),
      calicheSandstoneMat
    );
    const ang = (i * Math.PI * 2) / 5;
    rStone.position.set(Math.cos(ang) * 0.9, 0.15, Math.sin(ang) * 0.9);
    rStone.rotation.set(i, i * 2, 0);
    trailGroup.add(rStone);
  }

  // Golden shimmer aura light
  const trailLight = new THREE.PointLight(0xf59e0b, 1.4, 4.5);
  trailLight.position.set(0, 0.6, 0);
  trailGroup.add(trailLight);

  rootGroup.add(trailGroup);
  artifactGroups.set(trailArtifact.id, trailGroup);

  // =========================================================================
  // ARTIFACT 2: THE PRIEST & DAGGER TABLET (Volcanic Box Canyon: 84X, -60Z)
  // =========================================================================
  const priestArtifact = PERALTA_STONE_ARTIFACTS.find((a) => a.id === 'artifact_priest_stone')!;
  const priestGroup = new THREE.Group();
  const priestY = getTerrainHeight(priestArtifact.position.x, priestArtifact.position.z);
  priestGroup.position.set(priestArtifact.position.x, priestY, priestArtifact.position.z);

  // Angular Canyon Backdrop Boulders
  const cliffBoulderL = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 1), cairnBasaltMat);
  cliffBoulderL.position.set(-0.8, 0.8, -0.4);
  cliffBoulderL.scale.set(1.0, 1.6, 0.8);
  priestGroup.add(cliffBoulderL);

  const cliffBoulderR = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 1), cairnBasaltMat);
  cliffBoulderR.position.set(0.8, 0.7, -0.3);
  cliffBoulderR.scale.set(0.9, 1.5, 0.9);
  priestGroup.add(cliffBoulderR);

  // The Red Tuff Priest Stone propped upright in cleft
  const priestStone = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.8, 0.12),
    redTuffMat
  );
  priestStone.position.set(0, 0.45, 0);
  priestStone.rotation.set(-0.25, 0.08, -0.05);
  priestStone.castShadow = true;
  priestGroup.add(priestStone);
  stoneMeshes.set(priestArtifact.id, priestStone);

  // Carved Priest silhouette & Dagger pointer relief
  const priestHood = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.22, 6), engravedGlyphMat);
  priestHood.position.set(0, 0.18, 0.07);
  priestStone.add(priestHood);

  const daggerPointer = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.02), engravedGlyphMat);
  daggerPointer.position.set(0.12, -0.05, 0.07);
  daggerPointer.rotation.z = -0.3;
  priestStone.add(daggerPointer);

  // Mysterious crimson-gold glyph glow
  const priestLight = new THREE.PointLight(0xef4444, 1.5, 4.0);
  priestLight.position.set(0, 0.6, 0.3);
  priestGroup.add(priestLight);

  rootGroup.add(priestGroup);
  artifactGroups.set(priestArtifact.id, priestGroup);

  // =========================================================================
  // ARTIFACT 3: THE HEART STONE KEY (High Basalt Mesa: 26X, -42Z)
  // =========================================================================
  const heartArtifact = PERALTA_STONE_ARTIFACTS.find((a) => a.id === 'artifact_heart_key')!;
  const heartGroup = new THREE.Group();
  const heartY = getTerrainHeight(heartArtifact.position.x, heartArtifact.position.z);
  heartGroup.position.set(heartArtifact.position.x, heartY, heartArtifact.position.z);

  // Stacked Basalt Solstice Cairn (3 tiers of flat stones)
  const cairnTier1 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.28, 7), cairnBasaltMat);
  cairnTier1.position.y = 0.14;
  cairnTier1.castShadow = true;
  heartGroup.add(cairnTier1);

  const cairnTier2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.25, 7), cairnBasaltMat);
  cairnTier2.position.y = 0.4;
  cairnTier2.castShadow = true;
  heartGroup.add(cairnTier2);

  const cairnTier3 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.2, 6), cairnBasaltMat);
  cairnTier3.position.y = 0.62;
  cairnTier3.castShadow = true;
  heartGroup.add(cairnTier3);

  // The Heart-Shaped Andesite Stone resting flat atop cairn
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, 0.18);
  heartShape.bezierCurveTo(-0.2, 0.38, -0.38, 0.18, -0.38, -0.05);
  heartShape.bezierCurveTo(-0.38, -0.28, -0.15, -0.45, 0, -0.62);
  heartShape.bezierCurveTo(0.15, -0.45, 0.38, -0.28, 0.38, -0.05);
  heartShape.bezierCurveTo(0.38, 0.18, 0.2, 0.38, 0, 0.18);

  const heartGeo = new THREE.ExtrudeGeometry(heartShape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  });
  heartGeo.scale(0.55, 0.55, 0.55);
  heartGeo.rotateX(-Math.PI / 2);

  const heartStone = new THREE.Mesh(heartGeo, andesiteHeartMat);
  heartStone.position.set(0, 0.74, 0);
  heartStone.castShadow = true;
  heartGroup.add(heartStone);
  stoneMeshes.set(heartArtifact.id, heartStone);

  // Carved cross on heart
  const crossMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.22), engravedGlyphMat);
  crossMesh.position.set(0, 0.81, 0.02);
  heartGroup.add(crossMesh);

  // Brilliant Solar Amber Flare
  const heartLight = new THREE.PointLight(0xffb703, 1.8, 5.5);
  heartLight.position.set(0, 1.1, 0);
  heartGroup.add(heartLight);

  rootGroup.add(heartGroup);
  artifactGroups.set(heartArtifact.id, heartGroup);

  // Function to update visual visibility when artifacts are collected
  const updateVisibility = () => {
    for (const artifact of PERALTA_STONE_ARTIFACTS) {
      const isCollected = peraltaStoneMapService.isArtifactCollected(artifact.id);
      const grp = artifactGroups.get(artifact.id);
      const mesh = stoneMeshes.get(artifact.id);
      if (grp) {
        // If collected, dim the light and remove the physical stone
        if (mesh) {
          mesh.visible = !isCollected;
        }
        const pLight = grp.children.find((c) => c instanceof THREE.PointLight) as THREE.PointLight | undefined;
        if (pLight) {
          pLight.intensity = isCollected ? 0 : (artifact.id === 'artifact_heart_key' ? 1.8 : 1.4);
        }
      }
    }
  };

  // Initial update
  updateVisibility();

  scene.add(rootGroup);

  return {
    rootGroup,
    artifactGroups,
    stoneMeshes,
    updateVisibility,
  };
}
