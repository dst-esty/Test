import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Compass,
  TreePine,
  Shovel,
  Shield,
  Layers,
  Droplets,
  AlertTriangle,
  Sparkles,
  Mountain,
  ChevronRight,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

interface GuidebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenJournal?: () => void;
  onOpenMap?: () => void;
}

type GuideChapter = 'shoring' | 'strata' | 'wayfinding' | 'mining';

export const GuidebookModal: React.FC<GuidebookModalProps> = ({
  isOpen,
  onClose,
  onOpenJournal,
  onOpenMap,
}) => {
  const [activeChapter, setActiveChapter] = useState<GuideChapter>('shoring');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#f7f1e1] text-stone-900 rounded-2xl shadow-2xl border-4 border-[#6b4724] p-5 sm:p-7 overflow-hidden max-h-[92vh] flex flex-col font-serif">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b-2 border-[#8c6239]/30 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#5c3e21] text-amber-200 shadow-md">
              <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-wide text-[#3d2411]">
                  Prospector&apos;s Field Guidebook
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#ebdcc2] text-[#6b4724] font-bold border border-[#c5ad88]">
                  Expedition Records
                </span>
              </div>
              <p className="text-xs text-stone-600 italic mt-0.5">
                Practical Wisdom on Timber Shoring, Geological Strata, and Desert Wayfinding
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800/10 text-stone-700 transition cursor-pointer"
            title="Close Guidebook [Esc]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Chapter Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 mb-4 border-b border-[#cbb793] scrollbar-thin">
          <button
            onClick={() => setActiveChapter('shoring')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-sans font-bold transition whitespace-nowrap cursor-pointer ${
              activeChapter === 'shoring'
                ? 'bg-[#5c3e21] text-amber-100 shadow'
                : 'bg-[#ebdcc2] text-stone-700 hover:bg-[#ded0b3]'
            }`}
          >
            <TreePine className="w-4 h-4 text-amber-300" />
            <span>Timber Shoring & Sand</span>
          </button>

          <button
            onClick={() => setActiveChapter('strata')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-sans font-bold transition whitespace-nowrap cursor-pointer ${
              activeChapter === 'strata'
                ? 'bg-[#5c3e21] text-amber-100 shadow'
                : 'bg-[#ebdcc2] text-stone-700 hover:bg-[#ded0b3]'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-300" />
            <span>Rock Strata & Stability</span>
          </button>

          <button
            onClick={() => setActiveChapter('wayfinding')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-sans font-bold transition whitespace-nowrap cursor-pointer ${
              activeChapter === 'wayfinding'
                ? 'bg-[#5c3e21] text-amber-100 shadow'
                : 'bg-[#ebdcc2] text-stone-700 hover:bg-[#ded0b3]'
            }`}
          >
            <Compass className="w-4 h-4 text-amber-300" />
            <span>Wayfinding & Water</span>
          </button>

          <button
            onClick={() => setActiveChapter('mining')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-sans font-bold transition whitespace-nowrap cursor-pointer ${
              activeChapter === 'mining'
                ? 'bg-[#5c3e21] text-amber-100 shadow'
                : 'bg-[#ebdcc2] text-stone-700 hover:bg-[#ded0b3]'
            }`}
          >
            <Shovel className="w-4 h-4 text-amber-300" />
            <span>Mining & Staking</span>
          </button>
        </div>

        {/* Chapter Content Body */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-stone-800 text-sm leading-relaxed">
          {activeChapter === 'shoring' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Old Timer's Letter / Gentle Nudge */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#fffdf8] border border-[#cbb793] shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-[#5c3e21] font-bold text-base border-b border-[#e5d4b8] pb-2">
                  <TreePine className="w-5 h-5 text-amber-700" />
                  <span>A Word on Wooden Shoring in the Desert Sand</span>
                </div>

                <blockquote className="border-l-3 border-[#8c6239] pl-3 sm:pl-4 italic text-stone-700 bg-amber-50/60 py-2 rounded-r">
                  &ldquo;A gentle word of advice to any prospector digging into the dry washes of the
                  Superstitions: loose desert sand and gravel have no backbone of their own once you delve past
                  knee-depth. If you keep digging without bracing your trench, the wash bank may slump right back
                  onto your shovel.&rdquo;
                </blockquote>

                <p className="text-stone-700">
                  Old hands on the frontier always keep a couple of seasoned pine planks in their pack.
                  Whenever you open a pit in loose wash sand or alluvial gravel, you can gently brace the
                  sidewalls by installing <strong>wooden timber shoring</strong> (press{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 font-mono text-xs border border-stone-400 font-bold">
                    T
                  </kbd>
                  ).
                </p>

                <p className="text-stone-700">
                  The timber frame and lagging boards lock the loose soil in place, establish a secure shaft
                  collar, and mount sturdy climbing rungs so you can descend underground without worrying about
                  the walls sliding in.
                </p>
              </div>

              {/* Practical Guidance Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#f0e6d2] border border-[#cbb793] space-y-2">
                  <h4 className="font-bold text-[#4a2e14] flex items-center gap-1.5 text-xs uppercase tracking-wider font-sans">
                    <TreePine className="w-4 h-4 text-amber-700" />
                    Gathering Timber Planks
                  </h4>
                  <p className="text-xs text-stone-700">
                    Salvage seasoned wooden planks washed down dry arroyos, or chop tough desert ironwood
                    shrubs with your pickaxe. Planks are stored right in your saddlebag for whenever you
                    choose to frame an excavation pit.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#f0e6d2] border border-[#cbb793] space-y-2">
                  <h4 className="font-bold text-[#4a2e14] flex items-center gap-1.5 text-xs uppercase tracking-wider font-sans">
                    <Shield className="w-4 h-4 text-emerald-700" />
                    Reaching Self-Supporting Rock
                  </h4>
                  <p className="text-xs text-stone-700">
                    Once you sink your pit past the shallow wash gravels into cohesive volcanic tuff, banded
                    gneiss, or massive bedrock granite, the mountain holds itself up. Little to no shoring is
                    needed in solid stone.
                  </p>
                </div>
              </div>

              {/* Shoring Summary Reference */}
              <div className="p-3.5 rounded-xl bg-[#ebdcc2]/60 border border-[#cbb793] text-xs space-y-1.5">
                <div className="font-bold text-stone-800 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-800" />
                  <span>How to Shore a Trench at Your Own Pace:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-stone-600">
                  <li>
                    Stand inside or near any excavated pit and press{' '}
                    <kbd className="px-1 py-0.2 bg-stone-100 rounded border border-stone-300 font-mono font-bold text-[11px] text-stone-800">
                      T
                    </kbd>{' '}
                    to set wooden cribbing and lagging planks.
                  </li>
                  <li>
                    Shoring strengthens the pit against geotechnical soil slumping and gives you safe access
                    ladders.
                  </li>
                  <li>
                    You can also inspect wall stability anytime via the collapsible Trench Telemetry panel on
                    the left side of your screen.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeChapter === 'strata' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <p className="text-stone-700 text-xs italic">
                The Superstition Mountains consist of distinct geological layers laid down by prehistoric
                volcanic calderas and deep crystalline uplift:
              </p>

              <div className="space-y-2.5">
                {/* Layer 1: Sand & Wash */}
                <div className="p-3 rounded-xl bg-[#fffdf8] border border-[#cbb793]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-[#4a2e14] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-mono text-xs font-bold">
                        1
                      </span>
                      <span>Desert Sand, Gravel & Alluvium (0.0m – 1.2m)</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                      High Slump Risk
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1.5">
                    Loose, unconsolidated desert wash soil. Has minimal cohesion and will slide inward if
                    excavated deeply without wooden timber shoring.
                  </p>
                </div>

                {/* Layer 2: Volcanic Tuff */}
                <div className="p-3 rounded-xl bg-[#fffdf8] border border-[#cbb793]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-[#4a2e14] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-stone-300 text-stone-800 flex items-center justify-center font-mono text-xs font-bold">
                        2
                      </span>
                      <span>Volcanic Ash-Flow Tuff (1.2m – 2.5m)</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      Cohesive & Competent
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1.5">
                    Welded volcanic ash from the ancient Superstition calderas. Solid and naturally arched;
                    maintains stable vertical faces with minimal timber support.
                  </p>
                </div>

                {/* Layer 3: Banded Gneiss */}
                <div className="p-3 rounded-xl bg-[#fffdf8] border border-[#cbb793]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-[#4a2e14] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-stone-400 text-stone-900 flex items-center justify-center font-mono text-xs font-bold">
                        3
                      </span>
                      <span>Precambrian Banded Gneiss (2.5m – 4.5m)</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      High Shear Strength
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1.5">
                    Extremely rigid banded quartz-feldspar rock. Resists massive compressive forces and
                    allows deep vertical drift shafts without collapsing.
                  </p>
                </div>

                {/* Layer 4: Massive Granite & Quartz */}
                <div className="p-3 rounded-xl bg-[#fffdf8] border border-[#cbb793]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-[#4a2e14] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-mono text-xs font-bold">
                        4
                      </span>
                      <span>Crystalline Granite & Gold-Bearing Quartz (4.5m+)</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-300">
                      100% Self-Supporting
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1.5">
                    Ancient crystalline basement rock and hydrothermal quartz veins. Rock-solid monolithic
                    vaults requiring zero timber shoring.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeChapter === 'wayfinding' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-[#fffdf8] border border-[#cbb793] space-y-2">
                <h3 className="font-bold text-[#4a2e14] flex items-center gap-2 text-base">
                  <Compass className="w-5 h-5 text-amber-700" />
                  Triangulation & Needle Shadows
                </h3>
                <p className="text-stone-700 text-xs">
                  Weaver&apos;s Needle serves as the central beacon of the range. As the sun journeys across the
                  desert sky, the Needle&apos;s long shadow points toward ancient Peralta trail markers.
                  Equip your <strong>Compass [1]</strong> to align your bearings with the deathbed clues.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#f0e6d2] border border-[#cbb793] space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#4a2e14] text-xs">
                    <Droplets className="w-4 h-4 text-sky-700" />
                    <span>Fresh Water Springs</span>
                  </div>
                  <p className="text-xs text-stone-600">
                    Always maintain water in your canteen. Water can be refilled at Circlestone Spring,
                    Needle Spring, the Hidden Oasis, or the rain barrel at Peralta Base Camp.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#f0e6d2] border border-[#cbb793] space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#4a2e14] text-xs">
                    <Mountain className="w-4 h-4 text-amber-800" />
                    <span>High Ground Vantage</span>
                  </div>
                  <p className="text-xs text-stone-600">
                    Climbing ridges and canyon passes reveals hidden side canyons and saves you from
                    wandering aimlessly in disorienting desert washes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeChapter === 'mining' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-[#fffdf8] border border-[#cbb793] space-y-2">
                <h3 className="font-bold text-[#4a2e14] flex items-center gap-2 text-base">
                  <Shovel className="w-5 h-5 text-amber-700" />
                  Claim Staking & Mine Construction
                </h3>
                <p className="text-stone-700 text-xs">
                  Once you discover rich pay-dirt, equip your <strong>Claim Stake [9]</strong> to establish a
                  legal 20-acre mining claim. Staking territory unlocks the <strong>Mine Builder [B]</strong>,
                  allowing you to erect permanent timber portals, ore headframes, tool sheds, and stamp mills.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#fffdf8] border border-[#cbb793] space-y-2">
                <h4 className="font-bold text-[#4a2e14] text-xs uppercase tracking-wider font-sans">
                  Deep Shaft Exploration
                </h4>
                <p className="text-xs text-stone-600">
                  Excavated trenches reaching past 1.0m establish shaft collars. Descend into underground
                  mining drifts to extract raw bonanza quartz nuggets and high-grade placer deposits.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Cross-Links to Map & Journal */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-4 mt-4 border-t-2 border-[#8c6239]/30 text-xs">
          <span className="text-stone-500 font-mono text-[11px] text-center sm:text-left">
            Jacob Waltz Frontier Archive &bull; Peralta Expedition Records
          </span>

          <div className="flex items-center gap-2 font-sans">
            {onOpenJournal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenJournal();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ebdcc2] hover:bg-[#ded0b3] text-stone-800 font-bold transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-800" />
                <span>Open Journal [J]</span>
              </button>
            )}

            {onOpenMap && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMap();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5c3e21] hover:bg-[#4a2e14] text-amber-100 font-bold transition cursor-pointer shadow-sm"
              >
                <Compass className="w-3.5 h-3.5 text-amber-300" />
                <span>Open Map [M]</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
