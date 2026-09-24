import { ClueItem, Landmark, Vector3D } from '../types';

export type PeraltaSolveId =
  | 'solve_needle_box'
  | 'solve_heart_stone'
  | 'solve_black_top_equinox'
  | 'solve_la_barge_vault';

export interface PeraltaSolveDef {
  id: PeraltaSolveId;
  name: string;
  historicalResearcher: string;
  historicalEra: string;
  theoryTitle: string;
  coordinates: { x: number; z: number };
  targetElevationFt: number;
  locationName: string;
  description: string;
  clueRequirements: string[]; // Clue IDs required
  minMapCompletionPercent: number; // 25, 50, 75, 100
  solveSightline: {
    start: { x: number; z: number };
    end: { x: number; z: number };
    label: string;
  };
  promptAction: string;
  victoryTitle: string;
  victorySubtitle: string;
  victoryEpilogue: string;
  bonusGoldOz: number;
  bonusCash: number;
  icon: string;
  color: string;
}

export interface PeraltaStoneTabletFragment {
  id: string;
  title: string;
  spanishInscription: string;
  englishTranslation: string;
  carvedGlyphs: string[];
  dimensions: string;
  recoverySource: string;
}

export const PERALTA_TABLET_FRAGMENTS: PeraltaStoneTabletFragment[] = [
  {
    id: 'fragment_trail_map',
    title: 'The Trail Map Tablet (North Stone)',
    spanishInscription: 'DON PEDRO PERALTA • 1847 • RIO SALADO Y LA SIERRA DEL ESPÍRITU SANTO',
    englishTranslation: 'Don Pedro Peralta • 1847 • Salt River and the Mountains of the Holy Spirit.',
    carvedGlyphs: ['Horse with Pack', 'Rio Salado Meanders', 'Trail of the Three Crosses', 'Pointing Hand'],
    dimensions: '18" × 12" Hand-Carved Caliche Sandstone',
    recoverySource: 'Found buried in desert wash caliche near Peralta Trailhead.',
  },
  {
    id: 'fragment_priest_dagger',
    title: 'The Priest & Dagger Tablet (South Stone)',
    spanishInscription: 'ESTA VEREDA ES PELIGROSO • YO PASTO AL GANADO • EL COBO',
    englishTranslation: 'This trail is dangerous • I graze the cattle • The mountain bowl/cache.',
    carvedGlyphs: ['Spanish Jesuit Friar', 'Carved Dagger Pointer', 'Sombrero Butte Silhouette', 'Church Spire'],
    dimensions: '18" × 12" Red Tuff Slab with Chiseled Bevels',
    recoverySource: 'Recovered from a hidden rock cleft along Needle Canyon.',
  },
  {
    id: 'fragment_heart_stone',
    title: 'El Corazón (The Heart Stone Key)',
    spanishInscription: 'EL CORAZÓN DE LA SIERRA • BUSCA EL MAPA EN EL CORAZÓN',
    englishTranslation: 'The Heart of the Mountain Range • Seek the map within the heart.',
    carvedGlyphs: ['Interlocking Heart Wedge', 'Crucifixion Cross', 'Secret Keyway Notches'],
    dimensions: '8" × 6" Inlaid Andesite Heart Fitting the Trail Tablet Cavity',
    recoverySource: 'Pryed from under an ancient Spanish mining altar cairn.',
  },
  {
    id: 'fragment_profile_needle',
    title: 'The Topographic Profile Tablet',
    spanishInscription: 'EL SOMBRERO Y LA AGUJA • LA SOMBRA MARCA EL PASO A LAS CUATRO DE LA TARDE',
    englishTranslation: 'The Hat and the Needle • The shadow marks the pass at 4 o’clock in the afternoon.',
    carvedGlyphs: ["Weaver's Needle Silhouette", 'Equinox Solar Dagger', 'Two-Foot Step Funnel Marker'],
    dimensions: '16" × 10" Volcanic Dacite Tablet with Mineral Varnish',
    recoverySource: 'Discovered in a shaded cliffside petroglyph alcove.',
  },
];

export const PERALTA_SOLVES: PeraltaSolveDef[] = [
  // =========================================================================
  // SOLVE I: THE NEEDLE CANYON BOX FISSURE (Waltz & Dick Holmes Theory)
  // =========================================================================
  {
    id: 'solve_needle_box',
    name: 'Solve I: The Needle Canyon Box Fissure',
    historicalResearcher: 'Dick Holmes, Julia Thomas & Dr. Thomas Glover',
    historicalEra: '1891–1935 Dutch Hunter Expeditions',
    theoryTitle: 'The Classic Deathbed Sightline & Concealed Timber Drift',
    coordinates: { x: 160, z: 110 },
    targetElevationFt: 2780,
    locationName: 'Needle Canyon Box Ravine (160X, 110Z)',
    description:
      'Grounded in Jacob Waltz’s deathbed whisper to Dick Holmes on October 25, 1891: "From my mine you can see Weaver’s Needle through a notch, but from the military road you cannot see the mine." Tracing the 4:00 PM spire shadow apex through the natural Eye of the Needle bluff directly into a narrow box canyon cleft masked with dead cedar and stone.',
    clueRequirements: ['clue_trailhead', 'clue_cross', 'clue_needle', 'clue_eye'],
    minMapCompletionPercent: 40,
    solveSightline: {
      start: { x: 0, z: 15 }, // Weaver's Needle
      end: { x: 160, z: 110 }, // Mine Shaft Entrance
      label: '4 PM Needle Shadow Sightline (Bearing 135° SE)',
    },
    promptAction: 'Unmask Waltz’s Concealed Timber Portal [E]',
    victoryTitle: 'The Classic Dutchman Mother Lode Found!',
    victorySubtitle: 'Waltz’s Concealed Timber Portal • Needle Canyon Cleft',
    victoryEpilogue:
      'You pried away the desiccated mesquite and heavy basalt boulders exactly where Jacob Waltz left them in 1891. Behind the ironwood shoring lies the unmined hydrothermal fissure—a glittering 18-inch quartz ribbon threaded with thick crystalline wire gold matching the famous deathbed candle box ore!',
    bonusGoldOz: 120.0,
    bonusCash: 500.0,
    icon: 'Pickaxe',
    color: '#f59e0b',
  },

  // =========================================================================
  // SOLVE II: EL CORAZÓN & SOMBRERO BUTTE (Travis Tumlinson & Barry Storm Theory)
  // =========================================================================
  {
    id: 'solve_heart_stone',
    name: 'Solve II: El Corazón & Sombrero Keyway',
    historicalResearcher: 'Travis Tumlinson & Barry Storm (Thunder Gods’ Gold)',
    historicalEra: '1949–1953 Stone Map Field Surveys',
    theoryTitle: 'The Inset Heart Altar & Ancient Spanish Shaft',
    coordinates: { x: -65, z: 95 },
    targetElevationFt: 2840,
    locationName: 'Bluff Springs High Saddle (-65X, 95Z)',
    description:
      'The Latin Heart Stone fits into the depression of the Trail Map tablet like a precision key. When the priest’s dagger sightline is projected from the high saddle toward the Sombrero Butte formation, it pinpoints an ancient Spanish shaft (La Mina de la Vaca) sealed with mortar and disguised as a natural blowhole.',
    clueRequirements: ['clue_petroglyph', 'clue_cross', 'clue_tortilla_flat'],
    minMapCompletionPercent: 60,
    solveSightline: {
      start: { x: -68, z: 85 }, // Saddle
      end: { x: -65, z: 95 }, // Heart Altar
      label: 'Priest Dagger & Heart Stone Transit (Bearing 198° S)',
    },
    promptAction: 'Insert Heart Stone Key into Altar Fissure [E]',
    victoryTitle: 'El Corazón de la Sierra Unlocked!',
    victorySubtitle: 'Spanish Colonial Vault of Pedro Peralta • Bluff Springs Ridge',
    victoryEpilogue:
      'The andesite Heart Stone slipped with a stone grinding click into the ancient altar crevice. The mortared slab swung aside, exposing an underground stone crypt containing thirty-two refined Spanish silver cobs, stamped King’s Fifth bullion ingots, and the 1848 expedition survey logs of Don Pedro Peralta!',
    bonusGoldOz: 95.0,
    bonusCash: 850.0,
    icon: 'Heart',
    color: '#ef4444',
  },

  // =========================================================================
  // SOLVE III: BLACK TOP MESA EQUINOX FUNNEL (Dr. Adolph Ruth & Father Polici)
  // =========================================================================
  {
    id: 'solve_black_top_equinox',
    name: 'Solve III: The Black Top Sun Dagger & Funnel',
    historicalResearcher: 'Dr. Adolph Ruth & Deputy Jeff Adams',
    historicalEra: '1931 Black Top Mesa Expedition',
    theoryTitle: 'The Astronomical Solar Transit & Two-Foot Step Funnel',
    coordinates: { x: 24, z: -45 },
    targetElevationFt: 3640,
    locationName: 'Black Top Mesa West Rim (24X, -45Z)',
    description:
      'Deciphered from Dr. Adolph Ruth’s bloodstained notebook found in 1931: "About 200 feet across from a cave... Veni, Vidi, Vici." The solar petroglyphs on Black Top Mesa align with equinox sunset daggers. Looking down across the sheer drop into East Boulder chasm, a narrow two-foot rock step descends to a vertical funnel pit leading to a buried telluride vein.',
    clueRequirements: ['clue_dugout', 'clue_malapais'],
    minMapCompletionPercent: 75,
    solveSightline: {
      start: { x: -12, z: -48 }, // Sunset Cave
      end: { x: 24, z: -45 }, // Funnel Rim
      label: 'Equinox Solar Dagger Meridian (Bearing 84° E)',
    },
    promptAction: 'Descend Ruth’s Two-Foot Funnel Pit [E]',
    victoryTitle: 'Dr. Ruth’s Lost "Veni, Vidi, Vici" Shaft Solved!',
    victorySubtitle: 'Two-Foot Step Funnel Shaft • Black Top Mesa Escarpment',
    victoryEpilogue:
      'You anchored your hemp rope and scrambled down the treacherous two-foot rock ledge into the funnel pit. At the base of the chimney sits the lost Peralta telluride vein and an intact cache of mining tools abandoned in the 1880s, solving the 1931 mystery that claimed Dr. Adolph Ruth’s life!',
    bonusGoldOz: 140.0,
    bonusCash: 600.0,
    icon: 'Sun',
    color: '#eab308',
  },

  // =========================================================================
  // SOLVE IV: UPPER LA BARGE JESUIT / PERALTA INGOT VAULT
  // =========================================================================
  {
    id: 'solve_la_barge_vault',
    name: 'Solve IV: Upper La Barge Jesuit Ingot Vault',
    historicalResearcher: 'Father Polici, Jim Bark & Barry Storm',
    historicalEra: '1870s–1910 Frontier Historical Research',
    theoryTitle: 'The Submerged Box Tinaja & Royal Bullion Vault',
    coordinates: { x: 40, z: -175 },
    targetElevationFt: 2350,
    locationName: 'Upper La Barge Tinaja Gorge (40X, -175Z)',
    description:
      'Derived from the Spanish cipher "YO PASTO AL GANADO" and the pastoral cross markers along La Barge Creek. Behind a perennial waterfall plunge pool lies a natural cave sealed with mortared river stones before the 1848 massacre. The Peralta miners diverted creek waters to submerge the entrance to guard their smelted bullion.',
    clueRequirements: ['clue_pistol', 'clue_tortilla_flat'],
    minMapCompletionPercent: 85,
    solveSightline: {
      start: { x: 38, z: -172 }, // Overgrown arrastra
      end: { x: 40, z: -175 }, // Submerged Tinaja
      label: 'Pastoral Fluvial Alignment (Bearing 310° NW)',
    },
    promptAction: 'Unseal Submerged Jesuit Bullion Vault [E]',
    victoryTitle: 'The Royal Peralta Bullion Vault Discovered!',
    victorySubtitle: 'Submerged Tinaja Cavern • Upper La Barge Box Gorge',
    victoryEpilogue:
      'Breaching the mortared river-boulder bulkhead behind the emerald tinaja pool revealed an air-pocket cavern stacked with twenty-four crude rectangular bullion ingots stamped with the royal Spanish seal! You have recovered the legendary Peralta family wealth lost for over a century!',
    bonusGoldOz: 165.0,
    bonusCash: 1200.0,
    icon: 'Sparkles',
    color: '#06b6d4',
  },
];

const STORAGE_ACTIVE_SOLVE_KEY = 'peralta_stone_map_active_solve_v1';
const STORAGE_COMPLETED_SOLVES_KEY = 'peralta_stone_map_completed_solves_v1';

class PeraltaStoneMapService {
  private activeSolveId: PeraltaSolveId = 'solve_needle_box';
  private completedSolves: Set<PeraltaSolveId> = new Set();
  private subscribers: Set<() => void> = new Set();

  constructor() {
    try {
      const savedActive = localStorage.getItem(STORAGE_ACTIVE_SOLVE_KEY) as PeraltaSolveId;
      if (savedActive && PERALTA_SOLVES.some((s) => s.id === savedActive)) {
        this.activeSolveId = savedActive;
      }
      const savedCompleted = localStorage.getItem(STORAGE_COMPLETED_SOLVES_KEY);
      if (savedCompleted) {
        const parsed = JSON.parse(savedCompleted);
        if (Array.isArray(parsed)) {
          this.completedSolves = new Set(parsed);
        }
      }
    } catch {
      // Safe fallback
    }
  }

  public getActiveSolveId(): PeraltaSolveId {
    return this.activeSolveId;
  }

  public getActiveSolve(): PeraltaSolveDef {
    return PERALTA_SOLVES.find((s) => s.id === this.activeSolveId) || PERALTA_SOLVES[0];
  }

  public setActiveSolve(id: PeraltaSolveId): void {
    if (!PERALTA_SOLVES.some((s) => s.id === id)) return;
    this.activeSolveId = id;
    try {
      localStorage.setItem(STORAGE_ACTIVE_SOLVE_KEY, id);
    } catch {
      // Ignore
    }
    this.notify();
  }

  public isSolveCompleted(id: PeraltaSolveId): boolean {
    return this.completedSolves.has(id);
  }

  public markSolveCompleted(id: PeraltaSolveId): void {
    this.completedSolves.add(id);
    try {
      localStorage.setItem(STORAGE_COMPLETED_SOLVES_KEY, JSON.stringify(Array.from(this.completedSolves)));
    } catch {
      // Ignore
    }
    this.notify();
  }

  public getCompletedSolvesCount(): number {
    return this.completedSolves.size;
  }

  /**
   * Calculates overall Peralta Stone Map completion percentage (0 - 100%)
   * based on discovered clues, discovered landmarks, and frontier exploration sites.
   */
  public calculateMapCompletionPercent(
    clues: ClueItem[],
    discoveredLandmarkCount: number,
    lootedDiscoveriesCount: number = 0
  ): {
    percent: number;
    unlockedFragments: PeraltaStoneTabletFragment[];
    unlockedSolves: PeraltaSolveDef[];
  } {
    const discoveredClues = clues.filter((c) => c.discovered).length;
    const totalClues = Math.max(1, clues.length);

    // Weighted formula:
    // 55% from Clues discovered (each clue adds real translation)
    // 25% from Landmarks surveyed
    // 20% from Frontier discoveries explored (Arrastras, Saddlebags, Petroglyphs, Bivouacs)
    const clueWeight = (discoveredClues / totalClues) * 55;
    const landmarkWeight = Math.min(25, (discoveredLandmarkCount / 14) * 25);
    const discoveryWeight = Math.min(20, (lootedDiscoveriesCount / 8) * 20);

    const rawPercent = Math.round(clueWeight + landmarkWeight + discoveryWeight);
    const percent = Math.min(100, Math.max(8, rawPercent)); // Base 8% start with Trail Register

    // Unlocked Fragments (1 per 25%)
    const unlockedFragments: PeraltaStoneTabletFragment[] = [];
    if (percent >= 15) unlockedFragments.push(PERALTA_TABLET_FRAGMENTS[0]);
    if (percent >= 40) unlockedFragments.push(PERALTA_TABLET_FRAGMENTS[1]);
    if (percent >= 65) unlockedFragments.push(PERALTA_TABLET_FRAGMENTS[2]);
    if (percent >= 85) unlockedFragments.push(PERALTA_TABLET_FRAGMENTS[3]);

    // Unlocked Solves
    const unlockedSolves = PERALTA_SOLVES.filter((s) => percent >= s.minMapCompletionPercent);

    return {
      percent,
      unlockedFragments,
      unlockedSolves,
    };
  }

  public subscribe(fn: () => void): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  private notify(): void {
    this.subscribers.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('PeraltaStoneMapService subscriber error:', err);
      }
    });
  }
}

export const peraltaStoneMapService = new PeraltaStoneMapService();
