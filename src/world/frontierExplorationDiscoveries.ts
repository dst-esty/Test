import * as THREE from 'three';
import { getTerrainHeight } from './terrain';

export type FrontierDiscoveryType = 'arrastra' | 'saddlebag' | 'petroglyph' | 'bivouac';

export interface FrontierDiscoveryRewards {
  cashDollars?: number;
  goldOunces?: number;
  ammo?: number;
  dynamite?: number;
  waterOz?: number;
  provisions?: number;
  woodPlanks?: number;
  specialItemName?: string;
  specialItemDescription?: string;
}

export interface FrontierDiscoveryDef {
  id: string;
  type: FrontierDiscoveryType;
  title: string;
  subtitle: string;
  locationName: string;
  position: { x: number; z: number };
  radius: number;
  elevationFt: number;
  description: string;
  lore: string;
  iconName: 'arrastra' | 'saddlebag' | 'petroglyph' | 'bivouac';
  rewards: FrontierDiscoveryRewards;
  promptAction: string;
}

export const FRONTIER_DISCOVERIES: FrontierDiscoveryDef[] = [
  // =========================================================================
  // 1. ABANDONED SPANISH ARRASTRAS (ORE GRINDERS)
  // =========================================================================
  {
    id: 'arrastra_black_top',
    type: 'arrastra',
    title: 'Spanish Arrastra & Bonanza Tailings',
    subtitle: 'Colonial 18th-Century Mule-Drawn Quartz Mill',
    locationName: 'Black Top Mesa Basalt Tableland (22X, -42Z)',
    position: { x: 22, z: -42 },
    radius: 4.5,
    elevationFt: 3650,
    description:
      'A circular stone-paved milling pit with massive granite drag stones (voladoras) chained to a central juniper sweep arm.',
    lore:
      'Constructed by 18th-century Mexican and Spanish miners to pulverize high-grade hydrothermal gold quartz from the Superstition ridges. Chained granite drag stones were pulled around the paved circular pit by a mule, grinding quartz into a fine auriferous flour before panning.',
    iconName: 'arrastra',
    rewards: {
      cashDollars: 35.0,
      goldOunces: 2.25,
      woodPlanks: 4,
      specialItemName: 'Colonial Spanish Silver Reales & Bonanza Flour',
      specialItemDescription: 'A pouch of rare minted Carlos III silver reales and 2.25 oz of ultra-rich crushed gold dust recovered from flagstone crevices.',
    },
    promptAction: 'Search Spanish Arrastra Crevices [E]',
  },
  {
    id: 'arrastra_la_barge',
    type: 'arrastra',
    title: 'Overgrown Canyon Arrastra & Slag Basin',
    subtitle: 'Secluded 1790s Peralta Placer Processing Mill',
    locationName: 'Upper La Barge Canyon Confluence (38X, -172Z)',
    position: { x: 38, z: -172 },
    radius: 4.5,
    elevationFt: 2360,
    description:
      'Hidden beneath Fremont cottonwood roots and catclaw vines, this primitive stone arrastra was used to crush free-milling quartz washed down from the high spires.',
    lore:
      'Before the 1848 ambush, Peralta pack trains crushed rich vein float here along La Barge wash away from prying eyes. Deep crevices between the grinding flagstones still hold rich trapped gold grains.',
    iconName: 'arrastra',
    rewards: {
      cashDollars: 28.0,
      goldOunces: 1.85,
      woodPlanks: 6,
      specialItemName: 'Peralta Quartz Tailings & Silver Cob Coin',
      specialItemDescription: 'Rich gold placer dust and an authentic hand-struck Spanish colonial silver cob coin.',
    },
    promptAction: 'Search Canyon Arrastra Crevices [E]',
  },

  // =========================================================================
  // 2. LOST LEATHER SADDLEBAGS IN ROCK CREVICES
  // =========================================================================
  {
    id: 'saddlebag_needle_crevice',
    type: 'saddlebag',
    title: 'Lost Oiled-Leather Saddlebag',
    subtitle: 'Wedged in Dacite Canyon Rimrock Crevice',
    locationName: 'Needle Canyon Rimrock Cleft (88X, -62Z)',
    position: { x: 88, z: -62 },
    radius: 3.8,
    elevationFt: 2680,
    description:
      'Heavy double-pouched oiled leather saddlebag with tarnished brass roller buckles and silver conchos, wedged tight in a deep rock fissure.',
    lore:
      'In the 1880s, a panicked pack mule slipped along the sheer slickrock ledge and threw its load into the chasm. The heavy oiled saddlebag wedged tight between two jagged boulders, shielding its frontier contents from decades of desert sun and rain.',
    iconName: 'saddlebag',
    rewards: {
      cashDollars: 45.0,
      goldOunces: 1.1,
      ammo: 14,
      waterOz: 32,
      provisions: 3,
      specialItemName: 'Carson City Double Eagles & Sterling Pocket Watch',
      specialItemDescription: 'Three uncirculated $20 Gold Double Eagles, a working silver pocket watch, and fresh preserved provisions.',
    },
    promptAction: 'Search Lost Leather Saddlebag [E]',
  },
  {
    id: 'saddlebag_peters_notch',
    type: 'saddlebag',
    title: "Frontier Courier's Leather Pouch & Saddlebag",
    subtitle: 'Concealed Behind Malapais Basalt Slab',
    locationName: 'Peters Canyon Malapais Notch (102X, -188Z)',
    position: { x: 102, z: -188 },
    radius: 3.8,
    elevationFt: 2950,
    description:
      'A saddlebag and dispatch pouch hidden behind a tilted basalt caprock slab along an ancient high-canyon goat trail.',
    lore:
      'Carried by an 1870s Wells Fargo express rider or illicit gold smuggler who never made it back to the Salt River ford. The leather is weathered but the interior oilcloth kept the contents in remarkable condition.',
    iconName: 'saddlebag',
    rewards: {
      cashDollars: 50.0,
      goldOunces: 2.4,
      ammo: 18,
      waterOz: 32,
      provisions: 4,
      specialItemName: 'Territorial Gold Coin Hoard & High-Grade Nuggets',
      specialItemDescription: 'Frontier gold cash and heavy crystalline placer nuggets recovered from the courier pouch.',
    },
    promptAction: 'Search Courier Saddlebag [E]',
  },
  {
    id: 'saddlebag_geronimo_alcove',
    type: 'saddlebag',
    title: "Prospector's Concealed Trail Saddlebag",
    subtitle: 'Stashed Under Slickrock Granite Shelf',
    locationName: 'Bluff Springs Ridge Crevice (-68X, 85Z)',
    position: { x: -68, z: 85 },
    radius: 3.8,
    elevationFt: 2720,
    description:
      'A trail-worn leather saddlebag carefully covered with red rhyolite scree and dry yucca stalks beneath a shallow natural rock overhang.',
    lore:
      'Cached as an emergency reserve by an early Dutch Hunter. Includes lead cartridges, a flask of pure artesian spring water, and dried Sonoran beef jerky.',
    iconName: 'saddlebag',
    rewards: {
      cashDollars: 32.0,
      goldOunces: 1.35,
      ammo: 12,
      waterOz: 32,
      provisions: 3,
      specialItemName: 'Emergency Frontier Cache & Gold Dust',
      specialItemDescription: 'Essential ammunition, clean water refill, rations, and raw placer gold dust.',
    },
    promptAction: 'Search Concealed Saddlebag [E]',
  },

  // =========================================================================
  // 3. HIDDEN CAVE PETROGLYPHS
  // =========================================================================
  {
    id: 'petroglyph_black_top_sunset',
    type: 'petroglyph',
    title: 'Equinox Sun Dagger & Serpent Petroglyphs',
    subtitle: 'Prehistoric Hohokam & Spanish Solar Alignment Marker',
    locationName: 'Black Top Mesa West Sunset Cave (-12X, -48Z)',
    position: { x: -12, z: -48 },
    radius: 4.2,
    elevationFt: 3580,
    description:
      'Chiseled into the dark desert varnish of a secluded sunset cave: solar whorls, a horned bighorn sheep, and an undulating serpent pointing toward the canyon abyss.',
    lore:
      'On the equinox, a sharp dagger of sunlight penetrates a natural rock fissure and strikes the coiled serpent’s eye, marking the true compass bearing toward the hidden mountain quartz fissure described in Peralta lore.',
    iconName: 'petroglyph',
    rewards: {
      cashDollars: 30.0, // Historical survey bounty value
      goldOunces: 0.9,
      specialItemName: 'Ancient Solar Alignment Rubbing & Sacred Turquoise',
      specialItemDescription: 'Deciphered solar alignment coordinates pointing toward the Dutchman vein, plus ancient ceremonial turquoise beads.',
    },
    promptAction: 'Decipher Sun Dagger Petroglyph [E]',
  },
  {
    id: 'petroglyph_hieroglyphic_grotto',
    type: 'petroglyph',
    title: 'Bighorn Sheep & Water Serpent Glyphs',
    subtitle: 'Basalt Bedrock Shaded Tinaja Grotto',
    locationName: 'Hieroglyphic Canyon Grotto (-142X, 218Z)',
    position: { x: -142, z: 218 },
    radius: 4.2,
    elevationFt: 2580,
    description:
      'Hundreds of prehistoric petroglyphs pecked through dark desert varnish into pink rhyolite, depicting bighorn herds, shamans, and water spirals above natural rock plunge pools.',
    lore:
      'Ancient indigenous travelers marked this perennial aquifer tinaja for millennia. Spanish prospectors later added crude chisel crosses and directional arrows indicating safe water seeps.',
    iconName: 'petroglyph',
    rewards: {
      cashDollars: 25.0,
      waterOz: 32,
      goldOunces: 0.75,
      specialItemName: 'Ancient Oasis Map & Native Quartz Crystal',
      specialItemDescription: 'Deciphered water seep signs that guarantee full hydration recovery, plus a museum-grade clear rock quartz point.',
    },
    promptAction: 'Inspect Water Tinaja Petroglyphs [E]',
  },
  {
    id: 'petroglyph_weavers_sacred_recess',
    type: 'petroglyph',
    title: 'The Three Crosses of the Peralta Trail',
    subtitle: 'Sacred Volcanic Tuff Petroglyph Alcove',
    locationName: "Weaver's Needle North Base Alcove (4X, -8Z)",
    position: { x: 4, z: -8 },
    radius: 4.2,
    elevationFt: 2750,
    description:
      'Three carved Spanish Latin crosses and a serpentine trail symbol deeply incised into the sheer red dacite wall at the base of the great spire.',
    lore:
      'These are the legendary "Three Crosses" referenced in Mexican land-grant maps and Jacob Waltz’s deathbed whisper: "Where the needle’s shadow crosses the three incised markers at dusk, you are within 200 paces of the mine entrance."',
    iconName: 'petroglyph',
    rewards: {
      cashDollars: 40.0,
      goldOunces: 1.6,
      specialItemName: 'The Three Crosses Rubbing & Wire Gold Specimen',
      specialItemDescription: 'The definitive landmark key connecting the Peralta Stone Maps to Weaver’s Needle, plus a 1.6 oz specimen of native wire gold.',
    },
    promptAction: 'Decipher The Three Crosses [E]',
  },

  // =========================================================================
  // 4. ABANDONED MINER BIVOUACS WITH RARE LOOT
  // =========================================================================
  {
    id: 'bivouac_needle_ravine',
    type: 'bivouac',
    title: 'Abandoned Box Canyon Prospector Bivouac',
    subtitle: '1880s Canvas Lean-To & Cold Stone Hearth',
    locationName: 'Needle Canyon Box Ravine (62X, -88Z)',
    position: { x: 62, z: -88 },
    radius: 4.5,
    elevationFt: 2620,
    description:
      'A weathered canvas lean-to braced by juniper poles against a vertical red cliff, an ash-filled stone fire pit, and an iron-strapped wooden powder crate.',
    lore:
      'An ill-fated prospector hastily abandoned this camp decades ago. An iron-strapped Hercules Powder Co. dynamite crate and a miner’s iron kettle remain undisturbed in the shadow of the overhang.',
    iconName: 'bivouac',
    rewards: {
      cashDollars: 25.0,
      dynamite: 4,
      ammo: 16,
      goldOunces: 2.1,
      woodPlanks: 6,
      specialItemName: 'Hercules Dynamite Stash & Roasted Campfire Coffee',
      specialItemDescription: 'Four sealed sticks of high-explosive dynamite, a tin of ground mountain coffee (+100 Vigour), and 2.1 oz gold quartz.',
    },
    promptAction: 'Scavenge Box Canyon Bivouac [E]',
  },
  {
    id: 'bivouac_peters_mesa_rim',
    type: 'bivouac',
    title: "Lost Outpost Bivouac & Miner's Lockbox",
    subtitle: '1890s High-Mesa Camp & Heavy Timber Lockbox',
    locationName: 'Peters Mesa Escarpment Rim (120X, -145Z)',
    position: { x: 120, z: -145 },
    radius: 4.5,
    elevationFt: 3510,
    description:
      'A high-altitude prospector’s camp with a cast-iron stove, rusted kerosene lantern, a steel pick driven into a log, and an iron-strapped lockbox.',
    lore:
      'Perched on the rimrock with an unobstructed view across La Barge Canyon and Weaver’s Needle. The miner left behind a locked pine chest containing his assay returns and mining tools.',
    iconName: 'bivouac',
    rewards: {
      cashDollars: 45.0,
      dynamite: 3,
      ammo: 20,
      goldOunces: 3.1,
      woodPlanks: 8,
      specialItemName: "Assayer's Gold Bullion Receipt & Hardened Pickaxe",
      specialItemDescription: 'A valuable 1880s assayer gold receipt redeemable for cash, three dynamite sticks, and high-grade wire gold nuggets.',
    },
    promptAction: "Search Miner's High Outpost [E]",
  },
  {
    id: 'bivouac_tortilla_wash_cache',
    type: 'bivouac',
    title: "Prospector's Hidden Arroyo Cache & Rocker",
    subtitle: 'Concealed Sluice Camp & Dynamite Crate',
    locationName: 'Tortilla Wash Palo Verde Thicket (-55X, -210Z)',
    position: { x: -55, z: -210 },
    radius: 4.5,
    elevationFt: 1820,
    description:
      'Hidden in a dense thicket of green-barked palo verde trees: an old wooden rocker box, iron shovel, and sealed ammunition cache.',
    lore:
      'Used by wildcat miners to pan placer gravels along Tortilla Creek outside the jurisdiction of territorial revenue agents. The concealed cache contains powder and clean tools.',
    iconName: 'bivouac',
    rewards: {
      cashDollars: 30.0,
      dynamite: 3,
      ammo: 15,
      goldOunces: 1.75,
      woodPlanks: 6,
      specialItemName: 'Wildcatter Placer Gold & Powder Keg',
      specialItemDescription: 'Placer nuggets recovered from the rocker box riffles and sealed dynamite cartridges.',
    },
    promptAction: 'Search Arroyo Cache [E]',
  },
];

// Helper to check looted state
const LOOTED_STORAGE_KEY = 'lost_dutchman_looted_discoveries_v1';

export function getLootedDiscoveries(): Set<string> {
  try {
    const raw = localStorage.getItem(LOOTED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markDiscoveryAsLooted(id: string): void {
  try {
    const current = getLootedDiscoveries();
    current.add(id);
    localStorage.setItem(LOOTED_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch (err) {
    console.warn('Failed to save looted discovery to localStorage:', err);
  }
}

// ---------------------------------------------------------------------------
// 3D MESH BUILDERS FOR THE 4 DISCOVERY TYPES
// ---------------------------------------------------------------------------

/**
 * Creates high-detail procedural petroglyph canvas texture
 */
function createPetroglyphTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 1. Dark desert varnish background
  ctx.fillStyle = '#1e1814';
  ctx.fillRect(0, 0, 512, 512);

  // Mottled dark basalt patina
  for (let i = 0; i < 3000; i++) {
    const px = Math.random() * 512;
    const py = Math.random() * 512;
    const rad = 1 + Math.random() * 3;
    const v = Math.random() > 0.5 ? 'rgba(42, 33, 26, 0.4)' : 'rgba(18, 14, 11, 0.5)';
    ctx.fillStyle = v;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Chiseled glyphs (pecked through varnish down to buff/ochre rock)
  ctx.strokeStyle = '#e0be88';
  ctx.fillStyle = '#e0be88';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;

  // A. Hohokam Solar Spiral (Center Left)
  ctx.beginPath();
  let a = 0;
  let r = 8;
  const cx = 160;
  const cy = 180;
  ctx.moveTo(cx, cy);
  while (r < 75) {
    a += 0.25;
    r += 1.4;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  // B. Desert Bighorn Sheep with Sweeping Horns (Center Right)
  ctx.beginPath();
  // Body
  ctx.ellipse(360, 210, 42, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  // Neck & Head
  ctx.beginPath();
  ctx.moveTo(330, 205);
  ctx.lineTo(310, 160);
  ctx.lineTo(295, 168);
  ctx.stroke();
  // Great Curving Horn
  ctx.beginPath();
  ctx.lineWidth = 8;
  ctx.arc(315, 145, 30, Math.PI * 0.2, Math.PI * 1.5, false);
  ctx.stroke();
  ctx.lineWidth = 6;
  // 4 Legs
  const legX = [335, 348, 375, 390];
  legX.forEach((lx) => {
    ctx.beginPath();
    ctx.moveTo(lx, 228);
    ctx.lineTo(lx, 280);
    ctx.stroke();
  });

  // C. Peralta Trail Three Crosses (Lower Center)
  const crossData = [
    { x: 190, y: 380, h: 70, w: 40 },
    { x: 260, y: 360, h: 90, w: 52 }, // Central larger cross
    { x: 330, y: 380, h: 70, w: 40 },
  ];
  crossData.forEach((cd) => {
    // Vertical post
    ctx.beginPath();
    ctx.moveTo(cd.x, cd.y - cd.h * 0.5);
    ctx.lineTo(cd.x, cd.y + cd.h * 0.5);
    ctx.stroke();
    // Crossbeam
    ctx.beginPath();
    ctx.moveTo(cd.x - cd.w * 0.5, cd.y - cd.h * 0.15);
    ctx.lineTo(cd.x + cd.w * 0.5, cd.y - cd.h * 0.15);
    ctx.stroke();
  });

  // D. Serpentine Water Snake (Top Right to Bottom)
  ctx.beginPath();
  ctx.moveTo(460, 80);
  for (let s = 0; s < 10; s++) {
    const sx = 450 + Math.sin(s * 0.8) * 25;
    const sy = 80 + s * 38;
    ctx.lineTo(sx, sy);
  }
  ctx.stroke();

  // E. Ancient Shaman Handprint (Top Left)
  ctx.beginPath();
  ctx.arc(80, 80, 16, 0, Math.PI * 2);
  ctx.fill();
  for (let f = 0; f < 5; f++) {
    const fa = -Math.PI * 0.6 + f * 0.35;
    ctx.beginPath();
    ctx.moveTo(80 + Math.cos(fa) * 16, 80 + Math.sin(fa) * 16);
    ctx.lineTo(80 + Math.cos(fa) * 38, 80 + Math.sin(fa) * 38);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Shared materials for high performance and authentic Sonoran aesthetic
 */
interface DiscoveryMaterials {
  basaltCurbMat: THREE.MeshStandardMaterial;
  flagstoneMat: THREE.MeshStandardMaterial;
  weatheredWoodMat: THREE.MeshStandardMaterial;
  forgedIronMat: THREE.MeshStandardMaterial;
  crushedQuartzMat: THREE.MeshStandardMaterial;
  graniteDragStoneMat: THREE.MeshStandardMaterial;
  oiledLeatherMat: THREE.MeshStandardMaterial;
  tarnishedBrassMat: THREE.MeshStandardMaterial;
  conchoSilverMat: THREE.MeshStandardMaterial;
  canyonBoulderMat: THREE.MeshStandardMaterial;
  petroglyphPanelMat: THREE.MeshStandardMaterial;
  canvasLeanToMat: THREE.MeshStandardMaterial;
  blackenedStoneMat: THREE.MeshStandardMaterial;
  goldGlitterMat: THREE.MeshStandardMaterial;
}

let cachedMaterials: DiscoveryMaterials | null = null;

function getDiscoveryMaterials(): DiscoveryMaterials {
  if (cachedMaterials) return cachedMaterials;

  const petroTex = createPetroglyphTexture();

  cachedMaterials = {
    basaltCurbMat: new THREE.MeshStandardMaterial({
      color: 0x362c26,
      roughness: 0.94,
      metalness: 0.05,
    }),
    flagstoneMat: new THREE.MeshStandardMaterial({
      color: 0x4d3f35,
      roughness: 0.88,
      metalness: 0.08,
    }),
    weatheredWoodMat: new THREE.MeshStandardMaterial({
      color: 0x5a4838,
      roughness: 0.95,
      metalness: 0.02,
    }),
    forgedIronMat: new THREE.MeshStandardMaterial({
      color: 0x2b2b2b,
      roughness: 0.65,
      metalness: 0.85,
    }),
    crushedQuartzMat: new THREE.MeshStandardMaterial({
      color: 0xedebe4,
      roughness: 0.38,
      metalness: 0.15,
    }),
    graniteDragStoneMat: new THREE.MeshStandardMaterial({
      color: 0x54473d,
      roughness: 0.85,
      metalness: 0.1,
    }),
    oiledLeatherMat: new THREE.MeshStandardMaterial({
      color: 0x4a2a16,
      roughness: 0.72,
      metalness: 0.15,
    }),
    tarnishedBrassMat: new THREE.MeshStandardMaterial({
      color: 0xa88732,
      roughness: 0.42,
      metalness: 0.88,
    }),
    conchoSilverMat: new THREE.MeshStandardMaterial({
      color: 0xc4c7cc,
      roughness: 0.3,
      metalness: 0.92,
    }),
    canyonBoulderMat: new THREE.MeshStandardMaterial({
      color: 0x6e5645,
      roughness: 0.92,
      metalness: 0.05,
    }),
    petroglyphPanelMat: new THREE.MeshStandardMaterial({
      map: petroTex,
      roughness: 0.9,
      metalness: 0.06,
    }),
    canvasLeanToMat: new THREE.MeshStandardMaterial({
      color: 0xc4b79b,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide,
    }),
    blackenedStoneMat: new THREE.MeshStandardMaterial({
      color: 0x1f1c1a,
      roughness: 0.98,
      metalness: 0.0,
    }),
    goldGlitterMat: new THREE.MeshStandardMaterial({
      color: 0xfcc200,
      roughness: 0.22,
      metalness: 0.94,
      emissive: 0x664400,
      emissiveIntensity: 0.4,
    }),
  };

  return cachedMaterials;
}

/**
 * 1. Build Spanish Arrastra (Ore Grinder)
 */
function buildSpanishArrastraMesh(def: FrontierDiscoveryDef, mats: DiscoveryMaterials): THREE.Group {
  const group = new THREE.Group();
  const y = getTerrainHeight(def.position.x, def.position.z);
  group.position.set(def.position.x, y, def.position.z);

  const arrastraRadius = 2.4;
  const numCurbs = 18;

  // A. Circular Stone Curb Ring
  for (let i = 0; i < numCurbs; i++) {
    const angle = (i / numCurbs) * Math.PI * 2;
    const curbW = 0.5 + Math.random() * 0.15;
    const curbH = 0.42 + Math.random() * 0.1;
    const curbD = 0.55 + Math.random() * 0.1;
    const curbGeo = new THREE.BoxGeometry(curbW, curbH, curbD);
    const curb = new THREE.Mesh(curbGeo, mats.basaltCurbMat);
    curb.position.set(
      Math.cos(angle) * arrastraRadius,
      curbH * 0.5 - 0.05,
      Math.sin(angle) * arrastraRadius
    );
    curb.rotation.y = -angle;
    curb.castShadow = true;
    curb.receiveShadow = true;
    group.add(curb);
  }

  // B. Circular Flagstone Grinding Floor
  const floorGeo = new THREE.CylinderGeometry(arrastraRadius - 0.2, arrastraRadius - 0.1, 0.12, 24);
  const floorMesh = new THREE.Mesh(floorGeo, mats.flagstoneMat);
  floorMesh.position.y = 0.06;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // C. Crushed Gold Quartz Ore Flour in Floor Cracks
  const tailingsGeo = new THREE.CylinderGeometry(arrastraRadius - 0.35, arrastraRadius - 0.3, 0.04, 16);
  const tailingsMesh = new THREE.Mesh(tailingsGeo, mats.crushedQuartzMat);
  tailingsMesh.position.y = 0.13;
  group.add(tailingsMesh);

  // Sparkling Gold Grains on the tailings
  for (let g = 0; g < 7; g++) {
    const gAngle = Math.random() * Math.PI * 2;
    const gDist = 0.6 + Math.random() * 1.3;
    const gMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.045, 0), mats.goldGlitterMat);
    gMesh.position.set(Math.cos(gAngle) * gDist, 0.16, Math.sin(gAngle) * gDist);
    group.add(gMesh);
  }

  // D. Central Vertical Juniper Pivot Post with Iron Spindle
  const postGeo = new THREE.CylinderGeometry(0.2, 0.24, 1.6, 10);
  const postMesh = new THREE.Mesh(postGeo, mats.weatheredWoodMat);
  postMesh.position.y = 0.8;
  postMesh.castShadow = true;
  group.add(postMesh);

  // Iron Spindle & Collar Ring
  const collarGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.15, 12);
  const collarMesh = new THREE.Mesh(collarGeo, mats.forgedIronMat);
  collarMesh.position.y = 1.35;
  group.add(collarMesh);

  const spindlePin = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), mats.forgedIronMat);
  spindlePin.position.y = 1.65;
  group.add(spindlePin);

  // E. Horizontal Wooden Sweep Beam (Draft Beam for mule/burro)
  const armGeo = new THREE.BoxGeometry(4.2, 0.18, 0.2);
  const armMesh = new THREE.Mesh(armGeo, mats.weatheredWoodMat);
  armMesh.position.set(0.6, 1.35, 0);
  armMesh.rotation.y = 0.45;
  armMesh.castShadow = true;
  group.add(armMesh);

  // F. Two Massive Granite Drag Stones ("Voladoras") with Chains
  const dragStoneAngles = [0.45, 0.45 + Math.PI];
  dragStoneAngles.forEach((aRot, idx) => {
    const dist = 1.25;
    const stoneX = Math.cos(aRot) * dist;
    const stoneZ = Math.sin(aRot) * dist;

    // Flattened massive drag boulder
    const stoneGeo = new THREE.DodecahedronGeometry(0.52, 1);
    stoneGeo.scale(1.2, 0.65, 0.95);
    const stoneMesh = new THREE.Mesh(stoneGeo, mats.graniteDragStoneMat);
    stoneMesh.position.set(stoneX, 0.32, stoneZ);
    stoneMesh.rotation.set(0.1, idx * 1.5, 0.05);
    stoneMesh.castShadow = true;
    group.add(stoneMesh);

    // Iron Eyebolt atop stone
    const eyeBolt = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 8), mats.forgedIronMat);
    eyeBolt.position.set(stoneX, 0.62, stoneZ);
    eyeBolt.rotation.x = Math.PI / 2;
    group.add(eyeBolt);

    // Iron Suspension Chain from sweep beam to stone
    const chainGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.72, 5);
    const chainMesh = new THREE.Mesh(chainGeo, mats.forgedIronMat);
    chainMesh.position.set(stoneX * 0.92, 0.98, stoneZ * 0.92);
    chainMesh.rotation.z = idx === 0 ? -0.15 : 0.15;
    group.add(chainMesh);
  });

  // G. Tailings Mound of Crushed White Quartz on the perimeter
  const moundGeo = new THREE.ConeGeometry(1.2, 0.55, 8);
  const moundMesh = new THREE.Mesh(moundGeo, mats.crushedQuartzMat);
  moundMesh.position.set(2.6, 0.25, -1.2);
  moundMesh.rotation.y = 0.6;
  moundMesh.castShadow = true;
  group.add(moundMesh);

  // Colonial Pickaxe leaning against curb
  const pickHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 6), mats.weatheredWoodMat);
  pickHandle.position.set(-1.9, 0.45, 1.4);
  pickHandle.rotation.set(0.4, 0.2, -0.6);
  group.add(pickHandle);

  const pickHead = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.05), mats.forgedIronMat);
  pickHead.position.set(-1.65, 0.82, 1.52);
  pickHead.rotation.set(0.4, 0.2, -0.6);
  group.add(pickHead);

  return group;
}

/**
 * 2. Build Lost Leather Saddlebag in Rock Crevice
 */
function buildLeatherSaddlebagMesh(def: FrontierDiscoveryDef, mats: DiscoveryMaterials): THREE.Group {
  const group = new THREE.Group();
  const y = getTerrainHeight(def.position.x, def.position.z);
  group.position.set(def.position.x, y, def.position.z);

  // A. Two Jagged Canyon Boulders Creating the Tight V-Crevice
  const b1Geo = new THREE.DodecahedronGeometry(1.4, 1);
  b1Geo.scale(1.0, 1.6, 0.85);
  const b1 = new THREE.Mesh(b1Geo, mats.canyonBoulderMat);
  b1.position.set(-0.7, 0.9, 0);
  b1.rotation.set(0.2, 0.4, 0.15);
  b1.castShadow = true;
  b1.receiveShadow = true;
  group.add(b1);

  const b2Geo = new THREE.DodecahedronGeometry(1.3, 1);
  b2Geo.scale(0.9, 1.4, 0.8);
  const b2 = new THREE.Mesh(b2Geo, mats.canyonBoulderMat);
  b2.position.set(0.65, 0.8, -0.1);
  b2.rotation.set(-0.15, -0.3, -0.2);
  b2.castShadow = true;
  b2.receiveShadow = true;
  group.add(b2);

  // Supporting Back Wall Boulder
  const b3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 1), mats.canyonBoulderMat);
  b3.position.set(0, 0.7, -0.7);
  group.add(b3);

  // B. The Wedged Leather Saddlebag (Center Crevice)
  const saddlebagGroup = new THREE.Group();
  saddlebagGroup.position.set(0, 0.52, 0.05);
  saddlebagGroup.rotation.set(0.25, 0.12, -0.18); // Tilted naturally into the crevice

  // Main Saddlebag Pouch Body
  const pouchGeo = new THREE.BoxGeometry(0.68, 0.48, 0.32);
  const pouchMesh = new THREE.Mesh(pouchGeo, mats.oiledLeatherMat);
  pouchMesh.castShadow = true;
  saddlebagGroup.add(pouchMesh);

  // Overhanging Leather Flap (Curved Top)
  const flapGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.7, 10, 1, false, 0, Math.PI);
  const flapMesh = new THREE.Mesh(flapGeo, mats.oiledLeatherMat);
  flapMesh.rotation.z = Math.PI / 2;
  flapMesh.position.set(0, 0.24, 0.04);
  flapMesh.castShadow = true;
  saddlebagGroup.add(flapMesh);

  // Flap Straps (2 Vertical Dark Straps)
  const strapGeo = new THREE.BoxGeometry(0.04, 0.52, 0.02);
  [-0.18, 0.18].forEach((sx) => {
    const strap = new THREE.Mesh(strapGeo, mats.oiledLeatherMat);
    strap.position.set(sx, 0.06, 0.17);
    saddlebagGroup.add(strap);

    // Tarnished Brass Roller Buckle
    const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 8), mats.tarnishedBrassMat);
    buckle.position.set(sx, 0.02, 0.19);
    saddlebagGroup.add(buckle);
  });

  // Silver Mexican Concho Medallions on Center Flap
  [-0.18, 0.18].forEach((cx) => {
    const concho = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.015, 8), mats.conchoSilverMat);
    concho.position.set(cx, 0.22, 0.18);
    concho.rotation.x = Math.PI / 2;
    saddlebagGroup.add(concho);
  });

  // Gleam of Gold Coins Peeking from Flap Lip!
  const goldCoinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.015, 8), mats.goldGlitterMat);
  goldCoinMesh.position.set(0.02, 0.16, 0.175);
  goldCoinMesh.rotation.x = 0.8;
  saddlebagGroup.add(goldCoinMesh);

  const coinGleamLight = new THREE.PointLight(0xffc107, 1.2, 2.5);
  coinGleamLight.position.set(0, 0.2, 0.25);
  saddlebagGroup.add(coinGleamLight);

  group.add(saddlebagGroup);

  // C. Natural Scree & Dried Desert Scrub around the crevice
  for (let s = 0; s < 4; s++) {
    const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + s * 0.04, 0), mats.canyonBoulderMat);
    pebble.position.set(-0.3 + s * 0.22, 0.1, 0.45);
    group.add(pebble);
  }

  return group;
}

/**
 * 3. Build Hidden Cave Petroglyphs
 */
function buildCavePetroglyphMesh(def: FrontierDiscoveryDef, mats: DiscoveryMaterials): THREE.Group {
  const group = new THREE.Group();
  const y = getTerrainHeight(def.position.x, def.position.z);
  group.position.set(def.position.x, y, def.position.z);

  // A. Deep Natural Shaded Rock Alcove / Overhang Cave Slab
  const archGeo = new THREE.DodecahedronGeometry(2.8, 1);
  archGeo.scale(1.4, 1.6, 1.0);
  const alcoveBack = new THREE.Mesh(archGeo, mats.canyonBoulderMat);
  alcoveBack.position.set(0, 2.1, -1.2);
  alcoveBack.castShadow = true;
  group.add(alcoveBack);

  // Overhanging Roof Brow
  const roofBrow = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 2.4), mats.canyonBoulderMat);
  roofBrow.position.set(0, 3.4, -0.3);
  roofBrow.rotation.x = 0.2;
  roofBrow.castShadow = true;
  group.add(roofBrow);

  // Side Shading Buttress Walls
  const leftWall = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), mats.canyonBoulderMat);
  leftWall.position.set(-2.2, 1.6, -0.4);
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.DodecahedronGeometry(1.7, 1), mats.canyonBoulderMat);
  rightWall.position.set(2.2, 1.5, -0.4);
  group.add(rightWall);

  // B. Vertical Chiseled Desert Varnish Petroglyph Rock Panel
  const panelGeo = new THREE.PlaneGeometry(2.4, 2.4);
  const panelMesh = new THREE.Mesh(panelGeo, mats.petroglyphPanelMat);
  panelMesh.position.set(0, 1.75, -0.42);
  group.add(panelMesh);

  // Subtle ambient warmth on the carved symbols
  const glyphGlow = new THREE.PointLight(0xe8b87a, 1.5, 4.0);
  glyphGlow.position.set(0, 1.8, 0.2);
  group.add(glyphGlow);

  // C. Ancient Offering Stone Cairn on Floor
  for (let c = 0; c < 5; c++) {
    const cairnStone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.24 - c * 0.035, 1),
      mats.canyonBoulderMat
    );
    cairnStone.position.set(-0.8, 0.14 + c * 0.18, 0.2);
    group.add(cairnStone);
  }

  // Raw Quartz Crystal cluster on offering cairn
  const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), mats.crushedQuartzMat);
  crystal.position.set(-0.8, 1.05, 0.2);
  crystal.rotation.set(0.1, 0.3, -0.15);
  group.add(crystal);

  return group;
}

/**
 * 4. Build Abandoned Miner Bivouac with Rare Loot
 */
function buildMinerBivouacMesh(def: FrontierDiscoveryDef, mats: DiscoveryMaterials): THREE.Group {
  const group = new THREE.Group();
  const y = getTerrainHeight(def.position.x, def.position.z);
  group.position.set(def.position.x, y, def.position.z);

  // A. Canvas Lean-To Shelter on Weathered Pine Poles
  const poleGeo = new THREE.CylinderGeometry(0.045, 0.05, 2.4, 8);
  const leftPole = new THREE.Mesh(poleGeo, mats.weatheredWoodMat);
  leftPole.position.set(-1.4, 1.1, 0);
  leftPole.rotation.z = -0.18;
  leftPole.castShadow = true;
  group.add(leftPole);

  const rightPole = new THREE.Mesh(poleGeo, mats.weatheredWoodMat);
  rightPole.position.set(1.4, 1.1, 0);
  rightPole.rotation.z = 0.18;
  rightPole.castShadow = true;
  group.add(rightPole);

  // Horizontal Cross Ridge Beam
  const ridgeGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.2, 8);
  const ridgeBeam = new THREE.Mesh(ridgeGeo, mats.weatheredWoodMat);
  ridgeBeam.rotation.z = Math.PI / 2;
  ridgeBeam.position.set(0, 2.15, 0);
  group.add(ridgeBeam);

  // Draped Slanted Canvas Tarp (angled down to ground at back)
  const tarpGeo = new THREE.PlaneGeometry(3.0, 2.5);
  const tarpMesh = new THREE.Mesh(tarpGeo, mats.canvasLeanToMat);
  tarpMesh.position.set(0, 1.25, -0.9);
  tarpMesh.rotation.x = Math.PI * 0.35;
  tarpMesh.castShadow = true;
  tarpMesh.receiveShadow = true;
  group.add(tarpMesh);

  // B. Cold Stone Campfire Hearth Circle with Charred Embers
  const numHearth = 10;
  for (let h = 0; h < numHearth; h++) {
    const ha = (h / numHearth) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), mats.blackenedStoneMat);
    stone.position.set(Math.cos(ha) * 0.75, 0.12, 1.4 + Math.sin(ha) * 0.75);
    group.add(stone);
  }

  // Blackened Ash Bed & Charred Cedar Log
  const ashGeo = new THREE.CylinderGeometry(0.65, 0.7, 0.06, 12);
  const ashMesh = new THREE.Mesh(ashGeo, mats.blackenedStoneMat);
  ashMesh.position.set(0, 0.04, 1.4);
  group.add(ashMesh);

  const charLog = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.8, 6), mats.blackenedStoneMat);
  charLog.position.set(0.1, 0.14, 1.4);
  charLog.rotation.set(0.2, 0.8, 0);
  group.add(charLog);

  // Blackened Tin Coffee Pot
  const potGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.28, 8);
  const potMesh = new THREE.Mesh(potGeo, mats.forgedIronMat);
  potMesh.position.set(-0.25, 0.2, 1.35);
  potMesh.rotation.z = 0.2;
  group.add(potMesh);

  // C. Heavy Wood Miner's Lockbox / Supply Chest
  const chestGroup = new THREE.Group();
  chestGroup.position.set(0.65, 0.25, -0.3);
  chestGroup.rotation.y = -0.35;

  const chestBody = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 0.55), mats.weatheredWoodMat);
  chestBody.castShadow = true;
  chestGroup.add(chestBody);

  // Iron Banding on Chest
  const ironBand1 = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.47, 0.05), mats.forgedIronMat);
  ironBand1.position.z = -0.16;
  chestGroup.add(ironBand1);

  const ironBand2 = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.47, 0.05), mats.forgedIronMat);
  ironBand2.position.z = 0.16;
  chestGroup.add(ironBand2);

  // Brass Padlock Hasp
  const hasp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), mats.tarnishedBrassMat);
  hasp.position.set(0, 0.05, 0.29);
  chestGroup.add(hasp);

  group.add(chestGroup);

  // D. Stenciled Wooden Dynamite Crate ("HERCULES POWDER CO.")
  const crateGeo = new THREE.BoxGeometry(0.65, 0.38, 0.42);
  const crateMesh = new THREE.Mesh(crateGeo, mats.weatheredWoodMat);
  crateMesh.position.set(-0.7, 0.2, -0.4);
  crateMesh.rotation.y = 0.25;
  crateMesh.castShadow = true;
  group.add(crateMesh);

  // Red Dynamite Sticks peeking from crate
  const stickGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.24, 6);
  const dynMat = new THREE.MeshStandardMaterial({ color: 0xaa2211, roughness: 0.7 });
  for (let d = 0; d < 3; d++) {
    const stick = new THREE.Mesh(stickGeo, dynMat);
    stick.position.set(-0.72 + d * 0.06, 0.42, -0.4 + (d % 2) * 0.04);
    stick.rotation.z = Math.PI / 2;
    group.add(stick);
  }

  // E. Miner's Hardened Steel Pickaxe Driven Vertically into Tree Stump
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.55, 8), mats.weatheredWoodMat);
  stump.position.set(-1.3, 0.28, 0.8);
  group.add(stump);

  const pickHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), mats.weatheredWoodMat);
  pickHandle.position.set(-1.3, 0.95, 0.8);
  pickHandle.rotation.z = 0.08;
  group.add(pickHandle);

  const pickHead = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.06), mats.forgedIronMat);
  pickHead.position.set(-1.3, 0.55, 0.8);
  group.add(pickHead);

  // F. Weathered Kerosene Lantern
  const lanternBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.25, 8), mats.forgedIronMat);
  lanternBase.position.set(0.15, 0.14, 0.5);
  group.add(lanternBase);

  const lanternGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe8b0, transparent: true, opacity: 0.65 })
  );
  lanternGlass.position.set(0.15, 0.3, 0.5);
  group.add(lanternGlass);

  return group;
}

/**
 * Builds all frontier exploration discoveries into the Three.js scene
 */
export function buildFrontierExplorationDiscoveries(scene: THREE.Scene): {
  groups: Map<string, THREE.Group>;
  cleanup: () => void;
} {
  const mats = getDiscoveryMaterials();
  const groups = new Map<string, THREE.Group>();

  FRONTIER_DISCOVERIES.forEach((def) => {
    let meshGroup: THREE.Group;
    switch (def.type) {
      case 'arrastra':
        meshGroup = buildSpanishArrastraMesh(def, mats);
        break;
      case 'saddlebag':
        meshGroup = buildLeatherSaddlebagMesh(def, mats);
        break;
      case 'petroglyph':
        meshGroup = buildCavePetroglyphMesh(def, mats);
        break;
      case 'bivouac':
        meshGroup = buildMinerBivouacMesh(def, mats);
        break;
    }

    meshGroup.name = `frontier_discovery_${def.id}`;
    scene.add(meshGroup);
    groups.set(def.id, meshGroup);
  });

  return {
    groups,
    cleanup: () => {
      groups.forEach((g) => {
        scene.remove(g);
      });
      groups.clear();
    },
  };
}
