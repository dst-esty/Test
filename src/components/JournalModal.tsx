import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Scroll,
  CheckCircle2,
  Lock,
  Compass,
  MapPin,
  Sparkles,
  Sun,
  Eye,
  Layers,
  ChevronRight,
  HelpCircle,
  Footprints,
} from 'lucide-react';
import { ClueItem } from '../types';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  clues: ClueItem[];
  goldFound: number;
  onOpenGuidebook?: () => void;
  onFastTravel?: (target: { x: number; y: number; z: number }, label?: string) => void;
}

type JournalTab = 'entries' | 'stone_maps' | 'deduction';

interface PeraltaStone {
  id: string;
  name: string;
  spanishName: string;
  unlockedAtClues: number;
  carvingDescription: string;
  spanishInscription: string;
  translation: string;
  deductionInsight: string;
  coordsHint: string;
  reliefType: 'trail' | 'priest' | 'heart' | 'shadow';
}

const PERALTA_STONES: PeraltaStone[] = [
  {
    id: 'trail_stone',
    name: 'The Trail Stone',
    spanishName: 'Piedra del Camino (1847)',
    unlockedAtClues: 1,
    carvingDescription: 'Heavy sandstone tablet carved with three Latin crosses, a curved river bank (Salt River), and a jagged peak resembling Sombrero Butte.',
    spanishInscription: '"En este lugar de la cruz, el camino sube al cañón hondo. Mire al pico que parece sombrero."',
    translation: '"At this place of the cross, the trail ascends into the deep canyon. Look toward the peak that resembles a hat."',
    deductionInsight: 'Confirms the Mexican miners ascended south from the Salt River crossing through Hieroglyphic and Needle Canyons rather than the western desert plains.',
    coordsHint: 'Near Peralta Trailhead (x: -120, z: -120)',
    reliefType: 'trail',
  },
  {
    id: 'priest_stone',
    name: 'The Priest Stone',
    spanishName: 'Piedra del Sacerdote',
    unlockedAtClues: 2,
    carvingDescription: 'Weathered red porphyry slab etched with a Franciscan cross, a kneeling padre, and triangulation lines extending south toward a towering needle.',
    spanishInscription: '"Yo, Miguel Peralta de Sonora, en el año del Señor 1847. El oro está en el corazón del cerro del tejedor."',
    translation: '"I, Miguel Peralta of Sonora, in the year of our Lord 1847. The gold lies in the heart of the weaver\'s spire."',
    deductionInsight: 'Direct historical link identifying Weaver\'s Needle as the primary geographical benchmark for triangulating all Peralta diggings.',
    coordsHint: 'Massacre Grounds Ridge (x: -40, z: +90)',
    reliefType: 'priest',
  },
  {
    id: 'heart_stone',
    name: 'The Heart Stone',
    spanishName: 'El Corazón de Piedra',
    unlockedAtClues: 4,
    carvingDescription: 'Famous interlocking two-piece tablet with a removable heart-shaped insert that reveals hidden directional arrows and numerical paces.',
    spanishInscription: '"Busque el corazón dentro del marco de piedra. Treinta varas al oriente de la aguja con ojos."',
    translation: '"Search for the heart within the stone frame. Thirty varas (~83 feet) east of the needle with the aperture."',
    deductionInsight: 'The heart insert indicates the drift portal is not at the base of Weaver\'s Needle itself, but tucked into an eastern box canyon aperture.',
    coordsHint: "Waltz's Dugout & Eye Bluff (x: +30, z: -90)",
    reliefType: 'heart',
  },
  {
    id: 'shadow_cipher',
    name: 'The Sun & Shadow Riddle Stone',
    spanishName: 'La Piedra de la Sombra y el Sol',
    unlockedAtClues: 5,
    carvingDescription: 'A disc inscribed with solar arcs and a sharp gnomon apex. Depicts afternoon shadows cast across a mountain col.',
    spanishInscription: '"A las cuatro de la tarde, la sombra de la gran aguja apunta su punta directamente al ojo del monte."',
    translation: '"At four o\'clock in the afternoon, the shadow of the great spire points its apex directly at the eye of the mountain."',
    deductionInsight: 'At 16:00 (4:00 PM), the long afternoon shadow of Weaver\'s Needle projects northeast, pointing like a pointer finger directly toward the hidden drift aperture at coords (+160, +110).',
    coordsHint: "Weaver's Needle & Eye Ridge (x: +130, z: -40)",
    reliefType: 'shadow',
  },
];

export const JournalModal: React.FC<JournalModalProps> = ({
  isOpen,
  onClose,
  clues,
  goldFound,
  onOpenGuidebook,
  onFastTravel,
}) => {
  const [activeTab, setActiveTab] = useState<JournalTab>('entries');
  const [selectedStoneId, setSelectedStoneId] = useState<string>('trail_stone');

  if (!isOpen) return null;

  const discoveredCount = clues.filter((c) => c.discovered).length;
  const selectedStone = PERALTA_STONES.find((s) => s.id === selectedStoneId) || PERALTA_STONES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#f7f1e1] text-stone-900 rounded-xl shadow-2xl border-4 border-[#6b4724] p-4 sm:p-6 overflow-hidden max-h-[92vh] flex flex-col font-serif">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#8c6239]/30 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#5c3e21] text-amber-200 shadow-md">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-wide text-[#3d2411]">
                  Jacob Waltz&apos;s Prospector Journal & Peralta Stones
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#ebdcc2] text-[#6b4724] font-bold border border-[#c5ad88]">
                  Historical Dossier
                </span>
              </div>
              <p className="text-xs text-stone-600 italic">
                Deathbed Transcriptions • Peralta Stone Tablets • Sun & Shadow Riddle Ciphers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenGuidebook && (
              <button
                onClick={() => {
                  onClose();
                  onOpenGuidebook();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ebdcc2] hover:bg-[#ded0b3] text-[#4a2e14] text-xs font-sans font-bold transition cursor-pointer border border-[#cbb793]"
                title="Open Prospector's Field Guidebook"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-800" />
                <span>Field Guide</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-stone-800/10 text-stone-700 transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 border-b border-[#cbb793] pb-2 mb-3">
          <button
            onClick={() => setActiveTab('entries')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-serif font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'entries'
                ? 'bg-[#5c3e21] text-amber-100 shadow-md border border-[#3d2411]'
                : 'bg-[#ebdcc2] text-[#5c3e21] hover:bg-[#e2d0b0]'
            }`}
          >
            <Scroll className="w-3.5 h-3.5" />
            <span>Field Journal ({discoveredCount}/{clues.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stone_maps')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-serif font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'stone_maps'
                ? 'bg-[#5c3e21] text-amber-100 shadow-md border border-[#3d2411]'
                : 'bg-[#ebdcc2] text-[#5c3e21] hover:bg-[#e2d0b0]'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-amber-700" />
            <span>Peralta Stone Maps</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#ebdcc2] text-[#5c3e21] border border-[#cbb793]">
              4 Tablets
            </span>
          </button>

          <button
            onClick={() => setActiveTab('deduction')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-serif font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'deduction'
                ? 'bg-[#5c3e21] text-amber-100 shadow-md border border-[#3d2411]'
                : 'bg-[#ebdcc2] text-[#5c3e21] hover:bg-[#e2d0b0]'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-700" />
            <span>Clue Deduction Matrix</span>
          </button>
        </div>

        {/* Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3 bg-[#ede2c8] p-2.5 rounded-lg border border-[#cbb793] text-xs">
          <div>
            <span className="text-stone-500 uppercase font-mono text-[10px] block">Discovered Landmarks</span>
            <span className="text-base font-bold text-stone-800 font-mono">
              {discoveredCount} / {clues.length}
            </span>
          </div>
          <div>
            <span className="text-stone-500 uppercase font-mono text-[10px] block">Raw Gold Mined</span>
            <span className="text-base font-bold text-amber-700 font-mono">
              {goldFound.toFixed(1)} oz
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 flex items-center">
            {discoveredCount >= 5 ? (
              <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Lost Dutchman Drift Triangulated!
              </span>
            ) : (
              <span className="text-stone-600 text-[11px] italic">
                Gather landmarks & Peralta stones to align the 4:00 PM shadow sightline.
              </span>
            )}
          </div>
        </div>

        {/* TAB 1: FIELD JOURNAL ENTRIES */}
        {activeTab === 'entries' && (
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {clues.map((clue, idx) => {
              return (
                <div
                  key={clue.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    clue.discovered
                      ? 'bg-[#fffcf4] border-[#c0a07c] shadow-sm'
                      : 'bg-[#ede3ce]/50 border-stone-300 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#5c3e21] text-amber-100 flex items-center justify-center font-mono text-xs font-bold">
                        {idx + 1}
                      </span>
                      <h3 className="font-bold text-base text-[#3d2411]">
                        {clue.title}
                      </h3>
                    </div>
                    {clue.discovered ? (
                      <span className="text-xs font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Discovered
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-stone-500 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Undiscovered
                      </span>
                    )}
                  </div>

                  {clue.discovered ? (
                    <div className="mt-2 text-stone-800 text-sm space-y-2">
                      <blockquote className="border-l-2 border-amber-700 pl-3 italic text-stone-700 bg-amber-50/60 py-1 rounded-r">
                        {clue.lore}
                      </blockquote>
                      <p className="text-xs text-stone-600 flex items-center gap-1">
                        <strong className="text-stone-800">Trail Guidance:</strong> {clue.hint}
                      </p>
                      {clue.foundAt && (
                        <div className="text-[11px] font-mono text-stone-500">
                          Recorded at: {clue.foundAt}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs italic text-stone-500">
                      Explore the Superstition canyons and ancient landmarks to uncover this entry.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: PERALTA STONE MAPS */}
        {activeTab === 'stone_maps' && (
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Stone Selector List */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-stone-500 block font-bold">
                Carved Stone Tablets
              </span>
              {PERALTA_STONES.map((stone) => {
                const isUnlocked = discoveredCount >= stone.unlockedAtClues;
                const isSelected = stone.id === selectedStoneId;

                return (
                  <button
                    key={stone.id}
                    onClick={() => setSelectedStoneId(stone.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-[#ebdcc2] border-[#5c3e21] ring-2 ring-[#8c6239]/40 shadow-sm'
                        : 'bg-[#fffcf4] border-[#c0a07c] hover:bg-[#f3ebd7]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#3d2411]">
                        {stone.name}
                      </span>
                      {isUnlocked ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-stone-400" />
                      )}
                    </div>
                    <span className="text-[11px] font-mono italic text-stone-500">
                      {stone.spanishName}
                    </span>
                    <span className="text-[10px] text-amber-800 font-mono">
                      {isUnlocked ? 'Deciphered' : `Requires ${stone.unlockedAtClues} Clues`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Stone Tablet Relief Viewer & Translation */}
            <div className="md:col-span-2 bg-[#fffcf4] p-4 rounded-xl border border-[#c0a07c] shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-[#cbb793] pb-2 mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-[#3d2411] flex items-center gap-2">
                      {selectedStone.name}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ede2c8] text-[#5c3e21] border border-[#cbb793]">
                        {selectedStone.spanishName}
                      </span>
                    </h3>
                    <p className="text-xs text-stone-600 italic">
                      {selectedStone.coordsHint}
                    </p>
                  </div>
                  {discoveredCount >= selectedStone.unlockedAtClues ? (
                    <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold">
                      Deciphered
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded bg-stone-200 text-stone-600 font-mono text-[11px]">
                      Locked ({discoveredCount}/{selectedStone.unlockedAtClues} clues)
                    </span>
                  )}
                </div>

                {/* Stone Carving Visual Representation */}
                <div className="p-3.5 bg-stone-900 text-amber-100 rounded-lg border-2 border-amber-950 font-mono text-xs leading-relaxed shadow-inner relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-stone-700 opacity-20">
                    <Compass className="w-20 h-20" />
                  </div>
                  <div className="text-amber-300 font-bold mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Carved Stone Relief & Markings:
                  </div>
                  <p className="text-stone-300 font-sans text-xs italic mb-2">
                    {selectedStone.carvingDescription}
                  </p>

                  <div className="p-2.5 bg-stone-950/80 rounded border border-stone-700 space-y-1">
                    <div className="text-[11px] text-amber-400 font-serif italic">
                      Spanish Inscription:
                    </div>
                    <div className="text-xs text-amber-200 font-serif">
                      {selectedStone.spanishInscription}
                    </div>
                  </div>
                </div>

                {/* Historical Deduction & Insights */}
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-bold text-stone-800 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-amber-800" />
                    English Translation & Field Translation:
                  </div>
                  <blockquote className="text-xs text-stone-700 italic border-l-2 border-amber-700 pl-3 bg-amber-50/50 py-1 rounded-r">
                    {selectedStone.translation}
                  </blockquote>

                  <div className="p-2.5 bg-[#ede2c8] rounded border border-[#cbb793] text-xs space-y-1 mt-2">
                    <span className="font-bold text-[#5c3e21] block">
                      Prospector Insight & Deduction:
                    </span>
                    <p className="text-stone-700 text-xs leading-relaxed">
                      {selectedStone.deductionInsight}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {onFastTravel && discoveredCount >= selectedStone.unlockedAtClues && (
                <div className="pt-2 border-t border-[#cbb793] flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-mono text-[11px]">
                    Reference target marked in prospector notes.
                  </span>
                  <button
                    onClick={() => {
                      if (selectedStone.id === 'trail_stone') {
                        onFastTravel({ x: -120, y: 0, z: -120 }, 'Peralta Trailhead');
                      } else if (selectedStone.id === 'priest_stone') {
                        onFastTravel({ x: -40, y: 0, z: 90 }, 'Massacre Grounds');
                      } else if (selectedStone.id === 'heart_stone') {
                        onFastTravel({ x: 30, y: 0, z: -90 }, "Waltz's Dugout");
                      } else {
                        onFastTravel({ x: 80, y: 0, z: 15 }, "Weaver's Needle");
                      }
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded bg-[#5c3e21] hover:bg-[#4a2e14] text-amber-100 font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3 h-3 text-amber-300" />
                    <span>Travel Near Stone Marker</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CLUE DEDUCTION MATRIX */}
        {activeTab === 'deduction' && (
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            <div className="p-3 bg-gradient-to-r from-[#ebdcc2] to-[#fffcf4] border border-[#cbb793] rounded-xl space-y-1.5">
              <h3 className="font-bold text-sm text-[#3d2411] flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-800" />
                The Peralta Triangulation & Sun Shadow Deduction
              </h3>
              <p className="text-xs text-stone-700 leading-relaxed">
                Jacob Waltz recorded in his dying breath: &quot;From the mine you can see the military road through the pass, but from the road you cannot see the mine.&quot; By chaining the historic trail landmarks, you can reconstruct the exact sightlines to the sealed entrance.
              </p>
            </div>

            {/* Deduction Steps Progress Chain */}
            <div className="space-y-2">
              {[
                {
                  step: 1,
                  title: 'Step 1: Peralta Mule Route Entry',
                  landmark: 'Peralta Trailhead & Hieroglyphic Spring',
                  insight: 'Carved crosses in volcanic tuff point north-northeast through the basalt canyon toward the needle.',
                  completed: discoveredCount >= 1,
                },
                {
                  step: 2,
                  title: 'Step 2: 1848 Sonoran Expedition Ambush Site',
                  landmark: 'Massacre Grounds & Peralta Crosses',
                  insight: 'The surviving Peralta pack train scattered gold ore along the ridge scree heading directly toward Weaver\'s Needle.',
                  completed: discoveredCount >= 2,
                },
                {
                  step: 3,
                  title: 'Step 3: Jacob Waltz\'s Mountain Dugout',
                  landmark: "Jacob Waltz's Abandoned Shelter",
                  insight: 'Waltz stored bonanza specimens here and concealed the trail with mesquite logs. Gaze northeast toward the high spire.',
                  completed: discoveredCount >= 3,
                },
                {
                  step: 4,
                  title: 'Step 4: The 4:00 PM Weaver\'s Needle Shadow Riddle',
                  landmark: "Weaver's Needle Lookout (Elev. 4,553 ft)",
                  insight: 'At 16:00, the 1,000-ft dacite monolithic needle casts a long, sharp shadow pointing 045° Northeast toward Eye of the Needle Bluff.',
                  completed: discoveredCount >= 4,
                },
                {
                  step: 5,
                  title: 'Step 5: The Aperture Ray & Lost Dutchman Mine Drift',
                  landmark: 'Eye of the Needle Bluff -> Secret Drift (+160, +110)',
                  insight: 'Looking through the natural stone window when the afternoon sun sinks low, the golden beam illuminates the hidden drift entrance across the secluded box canyon!',
                  completed: discoveredCount >= 5,
                },
              ].map((step) => {
                return (
                  <div
                    key={step.step}
                    className={`p-3 rounded-lg border transition-all ${
                      step.completed
                        ? 'bg-[#fffcf4] border-[#c0a07c] shadow-sm'
                        : 'bg-[#ede3ce]/40 border-stone-300 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                            step.completed
                              ? 'bg-emerald-700 text-emerald-50'
                              : 'bg-stone-400 text-stone-100'
                          }`}
                        >
                          {step.step}
                        </div>
                        <span className="font-bold text-sm text-[#3d2411]">
                          {step.title}
                        </span>
                      </div>
                      {step.completed ? (
                        <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Solved
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-stone-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Unsolved
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 pl-8 text-xs text-stone-700 space-y-1">
                      <div className="font-medium text-stone-900 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-700" />
                        Target: {step.landmark}
                      </div>
                      <p className="italic text-stone-600">
                        {step.insight}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
