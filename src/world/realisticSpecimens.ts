import * as THREE from 'three';
import { DebrisType, MiningOreDrop } from '../types';

/**
 * Procedural Realistic Desert Gold & Mineral Specimen Generator.
 * Replaces generic polyhedral spheres with authentic geological morphologies:
 * - Placer nuggets: Hammered, pitted, flattened "pumpkin seed" & "sponge" alluvial contours
 * - Quartz-gold specimens: Vitreous milky hydrothermal quartz matrix with branching electrum veins
 * - Silver ore: Stepped cubic galena / argentite crystalline habit
 */

// Shared materials cache for high performance
const goldNuggetMaterial = new THREE.MeshStandardMaterial({
  color: 0xf5bf26, // 23K raw natural placer gold tone
  metalness: 0.94,
  roughness: 0.28,
  emissive: 0x8a5800,
  emissiveIntensity: 0.28,
});

const goldVeinMaterial = new THREE.MeshStandardMaterial({
  color: 0xffca28,
  metalness: 0.97,
  roughness: 0.20,
  emissive: 0x9b6600,
  emissiveIntensity: 0.35,
});

const milkyQuartzMaterial = new THREE.MeshStandardMaterial({
  color: 0xf0ece1, // Hydrothermal milky quartz
  metalness: 0.05,
  roughness: 0.78,
});

const silverOreMaterial = new THREE.MeshStandardMaterial({
  color: 0xd0d8e0,
  metalness: 0.92,
  roughness: 0.25,
  emissive: 0x1f2c38,
  emissiveIntensity: 0.25,
});

const sparkleMaterial = new THREE.MeshBasicMaterial({
  color: 0xfffae6,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

/**
 * Creates an organic, authentic raw placer gold nugget with pitted alluvial contours
 */
export function createRealisticGoldNuggetMesh(value: number = 1): THREE.Group {
  const group = new THREE.Group();
  const scaleMult = Math.min(1.7, 0.9 + Math.sqrt(value) * 0.28);

  // Base icosahedron with 2 subdivisions for organic perturbation
  const geom = new THREE.IcosahedronGeometry(0.18 * scaleMult, 2);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const seed = Math.random() * 50;

  // Displace vertices to form hammered alluvial placer morphology:
  // Flat on one axis (hammered by gravel wash), pitted with pockmarks and irregular wire ridges
  const tempV = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    tempV.fromBufferAttribute(pos, i);

    // 1. Flatten into natural river/wash slug profile
    tempV.y *= 0.52;
    tempV.x *= 1.25;

    // 2. Multiscale organic noise: pockmarks and crevices
    const n1 = Math.sin(tempV.x * 18 + seed) * Math.cos(tempV.z * 18 + seed);
    const n2 = Math.cos(tempV.y * 22 + seed * 1.3) * Math.sin(tempV.x * 14);
    const displacement = (n1 * 0.45 + n2 * 0.35) * (0.045 * scaleMult);

    // 3. Occasional dendritic protrusion / crystalline wire ridge
    const isWire = (i + Math.floor(seed)) % 9 === 0;
    const wireOut = isWire ? 0.035 * scaleMult : 0;

    tempV.addScaledVector(tempV.clone().normalize(), displacement + wireOut);
    pos.setXYZ(i, tempV.x, tempV.y, tempV.z);
  }

  geom.computeVertexNormals();

  const nuggetMesh = new THREE.Mesh(geom, goldNuggetMaterial);
  nuggetMesh.castShadow = true;
  group.add(nuggetMesh);

  // Subtle natural iron oxide / caliche crust clinging to one crevice
  const crustGeom = new THREE.DodecahedronGeometry(0.08 * scaleMult, 0);
  const crustMat = new THREE.MeshStandardMaterial({
    color: 0x6e4528,
    roughness: 0.95,
  });
  const crustMesh = new THREE.Mesh(crustGeom, crustMat);
  crustMesh.position.set(0.08 * scaleMult, -0.02 * scaleMult, 0.06 * scaleMult);
  group.add(crustMesh);

  // Add 2 diamond sparkle glints that catch the sun
  for (let s = 0; s < 2; s++) {
    const glintGeom = new THREE.PlaneGeometry(0.06 * scaleMult, 0.06 * scaleMult);
    const glint = new THREE.Mesh(glintGeom, sparkleMaterial);
    glint.position.set(
      (s === 0 ? 0.12 : -0.10) * scaleMult,
      (s === 0 ? 0.08 : -0.05) * scaleMult,
      (s === 0 ? 0.09 : 0.08) * scaleMult
    );
    glint.rotation.z = Math.PI / 4;
    group.add(glint);
  }

  // Golden point light aura
  const light = new THREE.PointLight(0xffb81c, 1.3, 3.2);
  light.position.set(0, 0.1, 0);
  group.add(light);

  return group;
}

/**
 * Creates a spectacular composite hydrothermal quartz specimen with raw gold veins
 */
export function createRealisticQuartzGoldMesh(value: number = 1): THREE.Group {
  const group = new THREE.Group();
  const scaleMult = Math.min(1.8, 1.0 + Math.sqrt(value) * 0.25);

  // 1. Milky quartz host matrix with sharp fracture cleavage
  const quartzGeom = new THREE.DodecahedronGeometry(0.20 * scaleMult, 0);
  const qPos = quartzGeom.attributes.position as THREE.BufferAttribute;
  const qSeed = Math.random() * 40;

  for (let i = 0; i < qPos.count; i++) {
    const vx = qPos.getX(i);
    const vy = qPos.getY(i);
    const vz = qPos.getZ(i);
    // Asymmetric fracture planes
    const fx = vx * (1.1 + Math.sin(vy * 8 + qSeed) * 0.18);
    const fy = vy * (0.85 + Math.cos(vz * 7 + qSeed) * 0.15);
    const fz = vz * (1.0 + Math.sin(vx * 9) * 0.16);
    qPos.setXYZ(i, fx, fy, fz);
  }
  quartzGeom.computeVertexNormals();

  const quartzMesh = new THREE.Mesh(quartzGeom, milkyQuartzMaterial);
  quartzMesh.castShadow = true;
  group.add(quartzMesh);

  // 2. Branching gold ribbons / veins threading through quartz fractures
  const veinCount = 2 + Math.floor(Math.random() * 2);
  for (let v = 0; v < veinCount; v++) {
    const angle = (v / veinCount) * Math.PI * 2 + Math.random() * 0.5;
    const veinGeom = new THREE.CylinderGeometry(
      0.035 * scaleMult,
      0.02 * scaleMult,
      0.24 * scaleMult,
      6
    );
    const veinMesh = new THREE.Mesh(veinGeom, goldVeinMaterial);
    veinMesh.position.set(
      Math.cos(angle) * 0.11 * scaleMult,
      (Math.random() - 0.5) * 0.12 * scaleMult,
      Math.sin(angle) * 0.11 * scaleMult
    );
    veinMesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    veinMesh.castShadow = true;
    group.add(veinMesh);
  }

  // 3. Raw gold wire cluster protruding from the top face
  const wireGeom = new THREE.IcosahedronGeometry(0.08 * scaleMult, 1);
  const wireMesh = new THREE.Mesh(wireGeom, goldVeinMaterial);
  wireMesh.position.set(0.05 * scaleMult, 0.13 * scaleMult, 0.04 * scaleMult);
  wireMesh.scale.set(1.4, 0.6, 1.2);
  group.add(wireMesh);

  // Glowing point light
  const light = new THREE.PointLight(0xffaa00, 1.4, 3.5);
  light.position.set(0, 0.1, 0);
  group.add(light);

  return group;
}

/**
 * Creates an authentic silver ore chunk with stepped cubic galena/argentite crystal facets
 */
export function createRealisticSilverChunkMesh(value: number = 1): THREE.Group {
  const group = new THREE.Group();
  const scaleMult = Math.min(1.8, 1.0 + Math.sqrt(value) * 0.25);

  // Stepped cubic crystalline blocks
  const mainCube = new THREE.Mesh(
    new THREE.BoxGeometry(0.18 * scaleMult, 0.22 * scaleMult, 0.16 * scaleMult),
    silverOreMaterial
  );
  mainCube.rotation.set(0.2, 0.3, 0.1);
  mainCube.castShadow = true;
  group.add(mainCube);

  const subCube = new THREE.Mesh(
    new THREE.BoxGeometry(0.12 * scaleMult, 0.14 * scaleMult, 0.13 * scaleMult),
    silverOreMaterial
  );
  subCube.position.set(0.07 * scaleMult, 0.08 * scaleMult, -0.05 * scaleMult);
  subCube.rotation.set(-0.1, 0.4, 0.2);
  group.add(subCube);

  const light = new THREE.PointLight(0x7090b0, 1.2, 3.0);
  light.position.set(0, 0.1, 0);
  group.add(light);

  return group;
}

/**
 * Dispatcher to build the appropriate realistic geological 3D specimen
 */
export function createRealisticOreSpecimen(type: MiningOreDrop['type'], value: number): THREE.Group {
  switch (type) {
    case 'quartz_gold':
      return createRealisticQuartzGoldMesh(value);
    case 'silver_chunk':
      return createRealisticSilverChunkMesh(value);
    case 'gold_nugget':
    default:
      return createRealisticGoldNuggetMesh(value);
  }
}
