import React, { useEffect } from 'react';
import {
  X,
  Sparkles,
  Coins,
  Flame,
  Droplets,
  Package,
  Layers,
  MapPin,
  Check,
  Compass,
  Award,
} from 'lucide-react';
import { FrontierDiscoveryDef } from '../world/frontierExplorationDiscoveries';
import { soundEngine } from '../audio/soundEffects';

interface FrontierDiscoveryModalProps {
  discovery: FrontierDiscoveryDef | null;
  isOpen: boolean;
  onClose: () => void;
  isAlreadyLooted: boolean;
  onClaimLoot: () => void;
}

export const FrontierDiscoveryModal: React.FC<FrontierDiscoveryModalProps> = ({
  discovery,
  isOpen,
  onClose,
  isAlreadyLooted,
  onClaimLoot,
}) => {
  // Listen for Enter / Space / Escape keys
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isAlreadyLooted) {
          onClaimLoot();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAlreadyLooted, onClaimLoot, onClose]);

  if (!isOpen || !discovery) return null;

  const rewards = discovery.rewards;

  const getHeaderIcon = () => {
    switch (discovery.type) {
      case 'arrastra':
        return '⚙️';
      case 'saddlebag':
        return '🎒';
      case 'petroglyph':
        return '☀️';
      case 'bivouac':
        return '⛺';
    }
  };

  const getCategoryTitle = () => {
    switch (discovery.type) {
      case 'arrastra':
        return 'HISTORIC SPANISH ARRASTRA • ORE GRINDING MILL';
      case 'saddlebag':
        return 'LOST LEATHER SADDLEBAG • CANYON CREVICE CACHE';
      case 'petroglyph':
        return 'SACRED CAVE PETROGLYPH • ARCHAIC ROCK ART';
      case 'bivouac':
        return 'ABANDONED MINER BIVOUAC • FRONTIER EXPEDITION CAMP';
    }
  };

  return (
    <div
      id="frontier-discovery-modal-backdrop"
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-[#f7efe3] text-stone-900 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] border-4 border-[#6e4624] p-5 sm:p-7 font-serif overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Weathered Paper Edge Shading */}
        <div className="absolute inset-0 pointer-events-none border border-amber-900/20 rounded-xl shadow-inner" />
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 opacity-70" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full hover:bg-stone-300 text-stone-700 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-3.5 pb-3 border-b-2 border-amber-900/20">
          <div className="w-12 h-12 rounded-xl bg-[#543317] text-amber-200 flex items-center justify-center text-2xl shadow-md shrink-0 border border-amber-500/40">
            {getHeaderIcon()}
          </div>
          <div className="min-w-0 pr-6">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-wider text-amber-900 uppercase block">
              {getCategoryTitle()}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#381e0c] leading-tight truncate">
              {discovery.title}
            </h2>
            <p className="text-xs text-stone-600 font-sans italic">{discovery.subtitle}</p>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="space-y-4 overflow-y-auto pr-1 text-sm leading-relaxed text-stone-800 custom-scrollbar">
          {/* Location & Elevation Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#ecdcc5] rounded-lg border border-amber-800/30 text-xs font-mono text-stone-700">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-800 shrink-0" />
              <span>{discovery.locationName}</span>
            </div>
            <div className="flex items-center gap-1 text-amber-900 font-bold">
              <Compass className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
              <span>Elev. {discovery.elevationFt.toLocaleString()} ft</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-stone-700 font-sans">{discovery.description}</p>

          {/* Historic Lore Section */}
          <div className="p-3.5 bg-[#ebd9bd]/70 rounded-xl border-l-4 border-amber-800 text-xs sm:text-sm italic font-serif text-stone-900 shadow-sm">
            <div className="not-italic font-bold font-mono text-[10px] text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-800" />
              Frontier History & Lore
            </div>
            "{discovery.lore}"
          </div>

          {/* Rewards Grid */}
          <div>
            <div className="font-mono text-xs font-bold text-amber-950 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{isAlreadyLooted ? 'Contents Recovered:' : 'Cache Contents & Rewards:'}</span>
              {isAlreadyLooted && (
                <span className="text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 font-sans font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Already Recovered
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {rewards.cashDollars && (
                <div className="p-2.5 bg-[#dfcbaf] rounded-lg border border-amber-900/30 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <div className="text-[10px] font-mono text-stone-600 uppercase">Currency</div>
                    <div className="font-bold text-amber-950 text-xs sm:text-sm">
                      +${rewards.cashDollars.toFixed(2)} Cash
                    </div>
                  </div>
                </div>
              )}

              {rewards.goldOunces && (
                <div className="p-2.5 bg-[#dfcbaf] rounded-lg border border-amber-900/30 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <div className="text-[10px] font-mono text-stone-600 uppercase">Gold Ore</div>
                    <div className="font-bold text-amber-950 text-xs sm:text-sm">
                      +{rewards.goldOunces.toFixed(2)} oz Gold
                    </div>
                  </div>
                </div>
              )}

              {rewards.dynamite && (
                <div className="p-2.5 bg-[#dfcbaf] rounded-lg border border-amber-900/30 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <div className="text-[10px] font-mono text-stone-600 uppercase">Explosives</div>
                    <div className="font-bold text-stone-900 text-xs sm:text-sm">
                      +{rewards.dynamite} Dynamite
                    </div>
                  </div>
                </div>
              )}

              {rewards.ammo && (
                <div className="p-2.5 bg-[#dfcbaf] rounded-lg border border-amber-900/30 flex items-center gap-2">
                  <Package className="w-5 h-5 text-stone-700 shrink-0" />
                  <div>
                    <div className="text-[10px] font-mono text-stone-600 uppercase">Ammo</div>
                    <div className="font-bold text-stone-900 text-xs sm:text-sm">
                      +{rewards.ammo} Cartridges
                    </div>
                  </div>
                </div>
              )}

              {rewards.waterOz && (
                <div className="p-2.5 bg-[#dfcbaf] rounded-lg border border-amber-900/30 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-sky-700 shrink-0" />
                  <div>
                    <div className="text-[10px] font-mono text-stone-600 uppercase">Spring Water</div>
                    <div className="font-bold text-stone-900 text-xs sm:text-sm">
                      +{rewards.waterOz} oz Canteen
                    </div>
                  </div>
                </div>
              )}

              {rewards.provisions && (
                <div className="p-2.5 bg-[#dfcbaf] rounded-lg border border-amber-900/30 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <div className="text-[10px] font-mono text-stone-600 uppercase">Provisions</div>
                    <div className="font-bold text-stone-900 text-xs sm:text-sm">
                      +{rewards.provisions} Jerky Rations
                    </div>
                  </div>
                </div>
              )}

              {rewards.woodPlanks && (
                <div className="p-2.5 bg-[#dfcbaf] rounded-lg border border-amber-900/30 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-800 shrink-0" />
                  <div>
                    <div className="text-[10px] font-mono text-stone-600 uppercase">Timber</div>
                    <div className="font-bold text-stone-900 text-xs sm:text-sm">
                      +{rewards.woodPlanks} Pine Planks
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Special Artifact Highlight */}
            {rewards.specialItemName && (
              <div className="mt-2.5 p-3 bg-amber-900/10 rounded-xl border border-amber-700/40 flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs text-amber-950 font-serif">
                    {rewards.specialItemName}
                  </div>
                  <div className="text-xs text-stone-700 font-sans mt-0.5">
                    {rewards.specialItemDescription}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="mt-4 pt-3 border-t-2 border-amber-900/20 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-300 hover:bg-stone-400 text-stone-800 rounded-lg text-xs font-mono font-semibold transition cursor-pointer"
          >
            Close [Esc]
          </button>

          {!isAlreadyLooted ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playCoins();
                soundEngine.playDiscovery();
                onClaimLoot();
              }}
              className="flex-1 py-2.5 px-4 bg-amber-800 hover:bg-amber-700 text-amber-100 rounded-lg text-xs sm:text-sm font-serif font-bold shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer border border-amber-600"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Collect Loot & Record in Journal [E / Enter]</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-xs sm:text-sm font-serif font-bold transition cursor-pointer"
            >
              <span>Site Already Mapped [Enter]</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
