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
}

export function buildSuperstitionPeaksAndSprings(
  scene: THREE.Scene,
  waterRefillPoints: THREE.Vector3[]
): SuperstitionPeakMeshes {
  // Shared materials
  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x3d352e,
    roughness: 0.92,
    metalness: 0.1,
    flatShading: true,
  });

  const daciteMat = new THREE.MeshStandardMaterial({
    color: 0x965a36,
    roughness: 0.88,
    metalness: 0.08,
    flatShading: true,
  });

  const weatheredWoodMat = new THREE.MeshStandardMaterial({
    color: 0x6e5238,
    roughness: 0.95,
  });

  // =========================================================================
  // 1. Black Top Mesa (USGS Elev. 3,650 ft / 1,113m - Spanish Arrastra Tableland)
  // Position: (35, terrainY, 75)
  // =========================================================================
  const blackTopGroup = new THREE.Group();
  const btmY = getTerrainHeight(35, 75);
  blackTopGroup.position.set(35, btmY, 75);

  // Stepped basalt rim columns along perimeter
  const rimAngleCount = 10;
  for (let i = 0; i < rimAngleCount; i++) {
    const angle = (i / rimAngleCount) * Math.PI * 2;
    const r = 24 + Math.sin(i * 1.8) * 4;
    const colX = Math.cos(angle) * r;
    const colZ = Math.sin(angle) * r;
    const colHeight = 5 + Math.random() * 4;
    const colGeo = new THREE.CylinderGeometry(1.2, 1.8, colHeight, 5);
    const colMesh = new THREE.Mesh(colGeo, basaltMat);
    colMesh.position.set(colX, colHeight / 2 - 1.2, colZ);
    colMesh.rotation.y = angle + Math.random() * 0.4;
    colMesh.castShadow = true;
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
  // 2. Battleship Mountain (USGS Elev. 3,240 ft / 988m - Knife-Edge Dacite Prow)
  // Position: (-85, terrainY, -80)
  // =========================================================================
  const battleshipGroup = new THREE.Group();
  const bmY = getTerrainHeight(-85, -80);
  battleshipGroup.position.set(-85, bmY, -80);

  // Iconic knife-edge vertical prow jutting forward
  const prowHeight = 28;
  const prowGeo = new THREE.ConeGeometry(7.5, prowHeight, 4);
  const prowMesh = new THREE.Mesh(prowGeo, daciteMat);
  prowMesh.position.set(0, prowHeight / 2 - 2, 0);
  prowMesh.scale.set(0.45, 1.0, 2.4); // extremely compressed across X, elongated along Z (prow)
  prowMesh.rotation.y = Math.PI / 4; // 45-degree angle along NW-SE canyon axis
  prowMesh.castShadow = true;
  battleshipGroup.add(prowMesh);

  // Sheer stepped keel buttresses flanking the prow
  for (let s = -1; s <= 1; s += 2) {
    const buttressGeo = new THREE.BoxGeometry(1.8, 16, 12);
    const buttress = new THREE.Mesh(buttressGeo, daciteMat);
    buttress.position.set(s * 4.2, 7, -4);
    buttress.rotation.y = Math.PI / 4;
    battleshipGroup.add(buttress);
  }

  scene.add(battleshipGroup);

  // =========================================================================
  // 3. Miners Needle (USGS Elev. 3,680 ft / 1,122m - Pinnacled Twin Spire with Eyelet)
  // Position: (135, terrainY, 180)
  // =========================================================================
  const minersGroup = new THREE.Group();
  const mnY = getTerrainHeight(135, 180);
  minersGroup.position.set(135, mnY, 180);

  // Twin jagged dacite spires
  const spire1 = new THREE.Mesh(
    new THREE.ConeGeometry(5.2, 34, 7),
    daciteMat
  );
  spire1.position.set(-2.5, 16, 0);
  spire1.scale.set(0.85, 1.0, 1.25);
  spire1.castShadow = true;
  minersGroup.add(spire1);

  const spire2 = new THREE.Mesh(
    new THREE.ConeGeometry(4.2, 28, 6),
    daciteMat
  );
  spire2.position.set(3.2, 13, 1.5);
  spire2.scale.set(0.9, 1.0, 1.1);
  spire2.castShadow = true;
  minersGroup.add(spire2);

  // Natural Eyelet Window Bridge connecting the spires
  const bridgeGeo = new THREE.BoxGeometry(6.5, 3.2, 2.4);
  const bridge = new THREE.Mesh(bridgeGeo, daciteMat);
  bridge.position.set(0.5, 17.5, 0.6);
  minersGroup.add(bridge);

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

  return {
    blackTopMesa: blackTopGroup,
    battleshipMountain: battleshipGroup,
    minersNeedle: minersGroup,
    charleboisSpring: charleboisGroup,
  };
}
