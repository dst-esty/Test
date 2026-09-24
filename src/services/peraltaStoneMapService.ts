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
  clueRequirements: string[];
  minMapCompletionPercent: number;
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

export interface PeraltaStoneArtifact {
  id: string; // 'artifact_trail_stone' | 'artifact_priest_stone' | 'artifact_heart_key'
  name: string;
  spanishName: string;
  biome: string;
  biomeShort: string;
  biomeDescription: string;
  locationName: string;
  position: { x: number; z: number };
  elevationFt: number;
  spanishInscription: string;
  englishTranslation: string;
  carvedGlyphs: string[];
  dimensions: string;
  historicalLore: string;
  icon: string;
  color: string;
  hint: string;
  unearthingReward: {
    goldOz: number;
    cash: number;
  };
}

export const PERALTA_STONE_ARTIFACTS: PeraltaStoneArtifact[] = [
  // =========================================================================
  // ARTIFACT 1: THE TRAIL MAP TABLET (North Stone / El Mapa de la Vereda)
  // BIOME: Low Sonoran Riparian & Caliche Wash Basin
  // =========================================================================
  {
    id: 'artifact_trail_stone',
    name: 'The Trail Map Tablet (North Stone)',
    spanishName: 'El Mapa de la Vereda • Piedra del Norte',
    biome: 'Low Sonoran Riparian & Caliche Wash Basin',
    biomeShort: 'Low Desert Wash',
    biomeDescription: 'Sandy arroyos, white caliche gravels, paloverde thickets, and low saguaro river washes.',
    locationName: 'Tortilla Wash Caliche Basin (-72X, -228Z)',
    position: { x: -72, z: -228 },
    elevationFt: 1845,
    spanishInscription: 'DON PEDRO PERALTA • 1847 • RIO SALADO Y LA SIERRA DEL ESPÍRITU SANTO',
    englishTranslation: 'Don Pedro Peralta • 1847 • Salt River and the Mountains of the Holy Spirit.',
    carvedGlyphs: [
      'Rio Salado River Meanders',
      'Burro with Pack Saddle',
      'Pointing Compass Hand',
      'Northern Trail Cross',
    ],
    dimensions: '18" × 12" × 2.5" Hand-Carved Caliche Sandstone',
    historicalLore:
      'Chiseled by Pedro Peralta’s surveying expedition in 1847. Depicts the watercourses descending from the Salt River basin and charts the safe pack-train trail through the dry desert washes into the northern mountain foothills.',
    icon: 'Scroll',
    color: '#eab308',
    hint: 'Scour the white caliche gravels and paloverde thickets of Tortilla Wash north of the Apache Trail (-72X, -228Z).',
    unearthingReward: {
      goldOz: 0.85,
      cash: 45.0,
    },
  },

  // =========================================================================
  // ARTIFACT 2: THE PRIEST & DAGGER TABLET (South Stone / El Fraile y la Daga)
  // BIOME: Volcanic Box Canyon & Sheer Dacite Cleft
  // =========================================================================
  {
    id: 'artifact_priest_stone',
    name: 'The Priest & Dagger Tablet (South Stone)',
    spanishName: 'El Fraile y la Daga • Piedra del Sur',
    biome: 'Volcanic Box Canyon & Sheer Dacite Cleft',
    biomeShort: 'Volcanic Box Canyon',
    biomeDescription: 'Towering red dacite cliffs, tight claustrophobic ravines, scree slopes, and deep boulder clefts.',
    locationName: 'Needle Canyon Box Gorge (84X, -60Z)',
    position: { x: 84, z: -60 },
    elevationFt: 2590,
    spanishInscription: 'ESTA VEREDA ES PELIGROSO • YO PASTO AL GANADO • EL COBO',
    englishTranslation: 'This trail is dangerous • I graze the cattle • The mountain bowl cache.',
    carvedGlyphs: [
      'Spanish Jesuit Friar in Hooded Habit',
      'Chiseled Dagger Sightline Pointer',
      'Sombrero Butte Profile',
      'Church Spire Alignment',
    ],
    dimensions: '18" × 12" × 3" Red Volcanic Tuff with Chiseled Bevels',
    historicalLore:
      'The solemn "Priest Stone" bears the famous warning "ESTA VEREDA ES PELIGROSO". The friar’s outstretched dagger creates a precise geometric transit line with the shadow of Weaver’s Needle to navigate the treacherous canyon labyrinth.',
    icon: 'Compass',
    color: '#ef4444',
    hint: 'Search the narrow, shadowed box canyon clefts of Needle Canyon wedged beneath the sheer eastern cliffs (84X, -60Z).',
    unearthingReward: {
      goldOz: 1.15,
      cash: 60.0,
    },
  },

  // =========================================================================
  // ARTIFACT 3: THE HEART STONE KEY (El Corazón de la Sierra)
  // BIOME: High Windswept Basalt Mesa & Summit Caprock
  // =========================================================================
  {
    id: 'artifact_heart_key',
    name: 'The Heart Stone Key (El Corazón)',
    spanishName: 'El Corazón de la Sierra • Llave Maestra',
    biome: 'High Windswept Basalt Mesa & Summit Caprock',
    biomeShort: 'High Basalt Mesa',
    biomeDescription: 'Extrusive black basalt tablelands, sheer precipices, arctic gales, and prehistoric solstice cairns.',
    locationName: 'Black Top Mesa Western Promontory (26X, -42Z)',
    position: { x: 26, z: -42 },
    elevationFt: 3680,
    spanishInscription: 'EL CORAZÓN DE LA SIERRA • BUSCA EL MAPA EN EL CORAZÓN',
    englishTranslation: 'The Heart of the Mountain Range • Seek the map within the heart.',
    carvedGlyphs: [
      'Interlocking Heart Wedge',
      'Spanish Crucifixion Cross',
      'Tumbler Keyway Locking Notches',
      'Solar Rays',
    ],
    dimensions: '8" × 6" × 1.8" Hand-Polished Andesite Heart Fitting the Trail Tablet Cavity',
    historicalLore:
      'The legendary interlocking Heart Stone fits precisely into the depression carved on the Trail Tablet. It functions as a master tumbler key—without inserting this stone into the mine’s locking cipher, the timber portal cannot be opened.',
    icon: 'Heart',
    color: '#ec4899',
    hint: 'Scale the high windswept tableland of Black Top Mesa to find the ancient solstice stone cairn on the rim (26X, -42Z).',
    unearthingReward: {
      goldOz: 1.75,
      cash: 85.0,
    },
  },
];

export const PERALTA_SOLVES: PeraltaSolveDef[] = [
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
    minMapCompletionPercent: 100, // Requires all 3 fragments!
    solveSightline: {
      start: { x: 0, z: 15 },
      end: { x: 160, z: 110 },
      label: '4 PM Needle Shadow Sightline (Bearing 135° SE)',
    },
    promptAction: 'Unmask Waltz’s Concealed Timber Portal [E]',
    victoryTitle: 'The Classic Dutchman Mother Lode Found!',
    victorySubtitle: 'Waltz’s Concealed Timber Portal • Needle Canyon Cleft',
    victoryEpilogue:
      'You fitted all three Peralta Stone Map tablets into the ironwood lock mechanism and pried away the heavy boulders. Behind the unsealed portal lies the unmined hydrothermal fissure—a glittering 18-inch quartz ribbon threaded with thick crystalline wire gold matching the famous deathbed candle box ore!',
    bonusGoldOz: 120.0,
    bonusCash: 500.0,
    icon: 'Pickaxe',
    color: '#f59e0b',
  },
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
    minMapCompletionPercent: 100,
    solveSightline: {
      start: { x: -68, z: 85 },
      end: { x: -65, z: 95 },
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
    minMapCompletionPercent: 100,
    solveSightline: {
      start: { x: -12, z: -48 },
      end: { x: 24, z: -45 },
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
    minMapCompletionPercent: 100,
    solveSightline: {
      start: { x: 38, z: -172 },
      end: { x: 40, z: -175 },
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
const STORAGE_COLLECTED_ARTIFACTS_KEY = 'peralta_stone_collected_artifacts_v1';

class PeraltaStoneMapService {
  private activeSolveId: PeraltaSolveId = 'solve_needle_box';
  private completedSolves: Set<PeraltaSolveId> = new Set();
  private collectedArtifactIds: Set<string> = new Set();
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
      const savedArtifacts = localStorage.getItem(STORAGE_COLLECTED_ARTIFACTS_KEY);
      if (savedArtifacts) {
        const parsed = JSON.parse(savedArtifacts);
        if (Array.isArray(parsed)) {
          this.collectedArtifactIds = new Set(parsed);
        }
      }
    } catch {
      // Safe fallback
    }
  }

  // =========================================================================
  // ARTIFACT PROGRESSION SYSTEM
  // =========================================================================

  public getCollectedArtifactIds(): string[] {
    return Array.from(this.collectedArtifactIds);
  }

  public isArtifactCollected(id: string): boolean {
    return this.collectedArtifactIds.has(id);
  }

  public collectArtifact(id: string): PeraltaStoneArtifact | null {
    const artifact = PERALTA_STONE_ARTIFACTS.find((a) => a.id === id);
    if (!artifact) return null;

    if (!this.collectedArtifactIds.has(id)) {
      this.collectedArtifactIds.add(id);
      try {
        localStorage.setItem(
          STORAGE_COLLECTED_ARTIFACTS_KEY,
          JSON.stringify(Array.from(this.collectedArtifactIds))
        );
      } catch {
        // Ignore
      }
      this.notify();
    }

    return artifact;
  }

  public getCollectedCount(): number {
    return this.collectedArtifactIds.size;
  }

  public getTotalArtifactCount(): number {
    return PERALTA_STONE_ARTIFACTS.length;
  }

  public hasAllFragments(): boolean {
    return this.collectedArtifactIds.size >= PERALTA_STONE_ARTIFACTS.length;
  }

  public getMissingArtifacts(): PeraltaStoneArtifact[] {
    return PERALTA_STONE_ARTIFACTS.filter((a) => !this.collectedArtifactIds.has(a.id));
  }

  public resetArtifacts(): void {
    this.collectedArtifactIds.clear();
    try {
      localStorage.removeItem(STORAGE_COLLECTED_ARTIFACTS_KEY);
    } catch {
      // Ignore
    }
    this.notify();
  }

  // =========================================================================
  // SOLVE & MAP COMPLETION
  // =========================================================================

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
   * based primarily on physical artifacts collected, with supplementary clue & landmark bonuses.
   * 3/3 Artifacts = 100% UNLOCKED.
   */
  public calculateMapCompletionPercent(
    clues: ClueItem[] = [],
    discoveredLandmarkCount: number = 0
  ): {
    percent: number;
    collectedCount: number;
    totalCount: number;
    unlockedFragments: PeraltaStoneArtifact[];
    unlockedSolves: PeraltaSolveDef[];
    isMineUnlocked: boolean;
  } {
    const collectedCount = this.collectedArtifactIds.size;
    const totalCount = PERALTA_STONE_ARTIFACTS.length; // 3

    // Direct physical progression:
    // 0 artifacts: baseline 0% - 15% (from clues)
    // 1 artifact: 33% - 45%
    // 2 artifacts: 67% - 80%
    // 3 artifacts: 100% (Mine Unlocked!)
    let percent = 0;
    if (collectedCount === 0) {
      const clueBonus = Math.min(15, clues.filter((c) => c.discovered).length * 2);
      percent = clueBonus;
    } else if (collectedCount === 1) {
      percent = 33 + Math.min(12, clues.filter((c) => c.discovered).length);
    } else if (collectedCount === 2) {
      percent = 67 + Math.min(15, clues.filter((c) => c.discovered).length);
    } else {
      percent = 100;
    }

    const unlockedFragments = PERALTA_STONE_ARTIFACTS.filter((a) =>
      this.collectedArtifactIds.has(a.id)
    );

    const isMineUnlocked = this.hasAllFragments();
    const unlockedSolves = isMineUnlocked
      ? PERALTA_SOLVES
      : PERALTA_SOLVES.filter((s) => percent >= s.minMapCompletionPercent);

    return {
      percent,
      collectedCount,
      totalCount,
      unlockedFragments,
      unlockedSolves,
      isMineUnlocked,
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
