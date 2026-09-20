import React, { useState } from 'react';
import {
  X,
  Coins,
  DollarSign,
  TreePine,
  Box,
  Pickaxe,
  Shovel,
  Compass,
  Flame,
  Droplets,
  Heart,
  Layers,
  ArrowRight,
  Shield,
  Sparkles,
  Store,
  UtensilsCrossed,
  Crosshair,
  CheckCircle2,
} from 'lucide-react';
import { PlayerState } from '../types';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  onRedeemAllGold?: () => void;
  onToggleAutoRedeem?: () => void;
  onPurchaseWood?: (amount: number, goldCost: number) => void;
  onOpenRockDepot?: () => void;
  onSelectTool?: (tool: PlayerState['equippedTool']) => void;
  onConsumeFood?: (type: 'venison' | 'bighorn' | 'rabbit' | 'provisions') => void;
  onPurchaseProvisions?: (amount: number, goldCost: number) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  playerState,
  onRedeemAllGold,
  onToggleAutoRedeem,
  onPurchaseWood,
  onOpenRockDepot,
  onSelectTool,
  onConsumeFood,
  onPurchaseProvisions,
}) => {
  const [activeTab, setActiveTab] = useState<'supplies' | 'food' | 'assayer' | 'gear'>('food');

  if (!isOpen) return null;

  const goldAmount = typeof playerState.goldFound === 'number' && !isNaN(playerState.goldFound)
    ? playerState.goldFound
    : 0;
  const cashAmount = playerState.cashDollars || 0;
  const woodAmount = playerState.woodPlanks || 0;
  const rockAmount = playerState.blocksDug || 0;

  const venisonCount = playerState.venisonMeat || 0;
  const rabbitCount = playerState.rabbitMeat || 0;
  const muttonCount = playerState.bighornMutton || 0;
  const provisionsCount = playerState.provisionsRations || 0;
  const totalFoodCount = venisonCount + rabbitCount + muttonCount + provisionsCount;

  const estimatedGoldValue = goldAmount * 20.67; // 1890s historical frontier gold rate ($20.67 / oz)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm select-none pointer-events-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-stone-900/95 border border-amber-600/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800/80 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 font-serif tracking-wide flex items-center gap-2">
                Expedition Supplies & Saddlebag
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Press [I] to toggle
                </span>
              </h2>
              <p className="text-xs text-stone-400">Superstition Wilderness Prospecting Inventory</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 flex items-center justify-center transition-colors border border-stone-700/60"
            title="Close inventory"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Balance Ticker */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 sm:p-4 bg-stone-950/60 border-b border-stone-800/80 text-xs font-mono">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-900/80 border border-amber-700/30">
            <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[9px] text-stone-400">GOLD ORE</div>
              <div className="font-bold text-amber-300">{goldAmount.toFixed(1)} oz</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-900/80 border border-emerald-700/30">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[9px] text-emerald-400/90">CASH</div>
              <div className="font-bold text-emerald-300">${cashAmount.toFixed(2)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-900/80 border border-rose-700/30">
            <UtensilsCrossed className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <div>
              <div className="text-[9px] text-rose-400/90">GAME FOOD</div>
              <div className="font-bold text-rose-300">{totalFoodCount} meals</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-900/80 border border-amber-800/30">
            <TreePine className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <div>
              <div className="text-[9px] text-amber-400/90">TIMBER</div>
              <div className="font-bold text-amber-200">{woodAmount} planks</div>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center gap-2 p-2 rounded-xl bg-stone-900/80 border border-stone-700/30">
            <Layers className="w-3.5 h-3.5 text-stone-300 shrink-0" />
            <div>
              <div className="text-[9px] text-stone-400">STONES</div>
              <div className="font-bold text-stone-200">{rockAmount}</div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-900/40 px-4 sm:px-6 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('food')}
            className={`pb-2.5 px-3 text-xs font-semibold tracking-wide transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'food'
                ? 'text-rose-300 border-rose-400 font-bold'
                : 'text-stone-400 border-transparent hover:text-stone-300'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            Hunted Game & Food ({totalFoodCount})
          </button>
          <button
            onClick={() => setActiveTab('supplies')}
            className={`pb-2.5 px-3 text-xs font-semibold tracking-wide transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'supplies'
                ? 'text-amber-300 border-amber-400 font-bold'
                : 'text-stone-400 border-transparent hover:text-stone-300'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            Mine Supplies
          </button>
          <button
            onClick={() => setActiveTab('assayer')}
            className={`pb-2.5 px-3 text-xs font-semibold tracking-wide transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'assayer'
                ? 'text-amber-300 border-amber-400 font-bold'
                : 'text-stone-400 border-transparent hover:text-stone-300'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Frontier Assayer
          </button>
          <button
            onClick={() => setActiveTab('gear')}
            className={`pb-2.5 px-3 text-xs font-semibold tracking-wide transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'gear'
                ? 'text-amber-300 border-amber-400 font-bold'
                : 'text-stone-400 border-transparent hover:text-stone-300'
            }`}
          >
            <Pickaxe className="w-3.5 h-3.5" />
            Gear & Vitals
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-stone-200">
          {/* --- TAB 1: HUNTED GAME & CAMP PROVISIONS --- */}
          {activeTab === 'food' && (
            <div className="space-y-4">
              {/* Vitals status bar banner */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-stone-300 mb-1.5">
                    <span className="flex items-center gap-1 text-rose-400">
                      <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
                      Prospector Health
                    </span>
                    <span className="font-bold">{Math.round(playerState.health)}%</span>
                  </div>
                  <div className="h-2 bg-stone-850 rounded-full overflow-hidden border border-stone-700/40">
                    <div
                      className={`h-full transition-all duration-300 ${
                        playerState.health < 30 ? 'bg-red-600' : playerState.health < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, playerState.health))}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-stone-300 mb-1.5">
                    <span className="flex items-center gap-1 text-sky-400">
                      <Droplets className="w-3.5 h-3.5 fill-sky-500/20" />
                      Hydration Stamina
                    </span>
                    <span className="font-bold">{Math.round(playerState.hydration)}%</span>
                  </div>
                  <div className="h-2 bg-stone-850 rounded-full overflow-hidden border border-stone-700/40">
                    <div
                      className={`h-full transition-all duration-300 ${
                        playerState.hydration < 30 ? 'bg-red-500' : playerState.hydration < 60 ? 'bg-amber-400' : 'bg-sky-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, playerState.hydration))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Food Item 1: Prime Venison */}
              <div className="bg-stone-850/80 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-900/30 border border-rose-700/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5 text-lg">
                    🦌
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-stone-100 font-mono">Prime Desert Venison</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-semibold">
                        Stock: {venisonCount}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1 max-w-sm">
                      Field-dressed from Sonoran Mule Deer & Coues Whitetail Deer. Rich lean game meat full of wilderness energy.
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-emerald-400">
                      <span>+35% Health</span>
                      <span>•</span>
                      <span className="text-sky-400">+20% Hydration</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    onClick={() => onConsumeFood && onConsumeFood('venison')}
                    disabled={venisonCount <= 0}
                    className={`px-4 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition shadow w-full sm:w-auto justify-center ${
                      venisonCount > 0
                        ? 'bg-rose-600 hover:bg-rose-500 text-stone-100 cursor-pointer shadow-rose-900/30'
                        : 'bg-stone-800 text-stone-500 border border-stone-700/40 cursor-not-allowed'
                    }`}
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>Roast & Eat</span>
                  </button>
                </div>
              </div>

              {/* Food Item 2: Desert Bighorn Mutton */}
              <div className="bg-stone-850/80 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-900/30 border border-amber-700/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 text-lg">
                    🐏
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-stone-100 font-mono">Desert Bighorn Mountain Mutton</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-semibold">
                        Stock: {muttonCount}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1 max-w-sm">
                      Hunted on steep mountain crags. Exceptionally hearty protein that revitalizes exhausted prospectors.
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-emerald-400">
                      <span>+45% Health</span>
                      <span>•</span>
                      <span className="text-sky-400">+25% Hydration</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    onClick={() => onConsumeFood && onConsumeFood('bighorn')}
                    disabled={muttonCount <= 0}
                    className={`px-4 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition shadow w-full sm:w-auto justify-center ${
                      muttonCount > 0
                        ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer shadow-amber-900/30'
                        : 'bg-stone-800 text-stone-500 border border-stone-700/40 cursor-not-allowed'
                    }`}
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>Roast & Eat</span>
                  </button>
                </div>
              </div>

              {/* Food Item 3: Desert Jackrabbit Meat */}
              <div className="bg-stone-850/80 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 shrink-0 mt-0.5 text-lg">
                    🐇
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-stone-100 font-mono">Fresh Desert Jackrabbit Meat</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-stone-700/60 text-stone-200 font-mono font-semibold">
                        Stock: {rabbitCount}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1 max-w-sm">
                      Captured in desert washes and creosote flats. Quick to cook over embers or skillet.
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-emerald-400">
                      <span>+25% Health</span>
                      <span>•</span>
                      <span className="text-sky-400">+15% Hydration</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    onClick={() => onConsumeFood && onConsumeFood('rabbit')}
                    disabled={rabbitCount <= 0}
                    className={`px-4 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition shadow w-full sm:w-auto justify-center ${
                      rabbitCount > 0
                        ? 'bg-stone-700 hover:bg-stone-600 text-stone-100 cursor-pointer'
                        : 'bg-stone-800 text-stone-500 border border-stone-700/40 cursor-not-allowed'
                    }`}
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>Roast & Eat</span>
                  </button>
                </div>
              </div>

              {/* Food Item 4: Trail Hardtack Rations */}
              <div className="bg-stone-850/80 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Box className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-stone-100 font-mono">Trail Hardtack Rations</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-stone-700/60 text-stone-200 font-mono font-semibold">
                        Stock: {provisionsCount}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1 max-w-sm">
                      Dry cured jerky, flour biscuits, and salt pork packaged for long Superstition expeditions.
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-emerald-400">
                      <span>+20% Health</span>
                      <span>•</span>
                      <span className="text-sky-400">+10% Hydration</span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <button
                    onClick={() => onConsumeFood && onConsumeFood('provisions')}
                    disabled={provisionsCount <= 0}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition shadow ${
                      provisionsCount > 0
                        ? 'bg-amber-700 hover:bg-amber-600 text-stone-100 cursor-pointer'
                        : 'bg-stone-800 text-stone-500 border border-stone-700/40 cursor-not-allowed'
                    }`}
                  >
                    <span>Eat Ration</span>
                  </button>
                  {onPurchaseProvisions && (
                    <button
                      onClick={() => onPurchaseProvisions(3, 0.4)}
                      disabled={goldAmount < 0.4}
                      className="text-[10px] font-mono text-amber-400 hover:underline cursor-pointer disabled:text-stone-600 disabled:no-underline"
                    >
                      Buy 3 for 0.4 oz Gold
                    </button>
                  )}
                </div>
              </div>

              {/* Wilderness Hunting Guide Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-800/30 text-xs text-stone-300 flex items-start gap-3">
                <Crosshair className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-amber-300">Frontier Hunting Guide:</strong> Equip your Winchester .44 Rifle [5] or Iron Pickaxe [1]. Look for Mule Deer in open foothill washes, Coues Whitetail Deer in brushy draws, Desert Bighorn Sheep on high rock rims, and Jackrabbits in the desert scrub!
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 2: MINING & BUILDING MATERIALS --- */}
          {activeTab === 'supplies' && (
            <div className="space-y-4">
              {/* Timber Planks Card */}
              <div className="bg-stone-850/80 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-900/30 border border-amber-700/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <TreePine className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-stone-100 font-mono">Pine Timber Shoring Planks</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-semibold">
                        Stock: {woodAmount}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1 max-w-sm">
                      Essential for shoring excavation pits in loose desert dune sand and preventing deadly sidewall slumps.
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-stone-400">Cost: 0.5 oz Gold</span>
                  {onPurchaseWood && (
                    <button
                      onClick={() => onPurchaseWood(3, 0.5)}
                      disabled={goldAmount < 0.5}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition shadow ${
                        goldAmount >= 0.5
                          ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer shadow-amber-900/30'
                          : 'bg-stone-800 text-stone-500 border border-stone-700/40 cursor-not-allowed'
                      }`}
                    >
                      <span>Buy 3 Planks</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quarry Rocks & Stones Card */}
              <div className="bg-stone-850/80 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 shrink-0 mt-0.5">
                    <Box className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-stone-100 font-mono">Quarry Stones & Bedrock Blocks</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-stone-700/60 text-stone-200 font-mono font-semibold">
                        Stock: {rockAmount}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1 max-w-sm">
                      Used to reinforce mountain drift portal arches, construct stone footers, and reinforce bedrock excavations.
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-stone-400">Frontier Depot</span>
                  {onOpenRockDepot && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenRockDepot();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-100 font-mono text-xs font-bold flex items-center gap-1.5 transition shadow border border-stone-600"
                    >
                      <span>Rock Depot</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Geotechnical Mining Advice */}
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-800/30 text-xs text-stone-300 flex items-start gap-3">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-amber-300">Geological Mining Rule:</strong> Loose sand pits lose stability rapidly past 0.5 meters. Always keep at least 2–4 timber planks in your saddlebag when digging deep alluvial trenches.
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 3: FRONTIER ASSAYER & GOLD --- */}
          {activeTab === 'assayer' && (
            <div className="space-y-4">
              {/* Gold Assayer Exchange Card */}
              <div className="bg-gradient-to-br from-amber-950/30 via-stone-850 to-stone-900 border border-amber-700/40 rounded-2xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <div>
                    <span className="text-xs font-mono text-amber-400/90 uppercase tracking-wider">Unrefined Gold Ore</span>
                    <div className="text-2xl font-bold font-mono text-amber-300 mt-0.5">
                      {goldAmount.toFixed(1)} <span className="text-sm text-stone-400 font-normal">troy oz</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-stone-400 uppercase tracking-wider">Assay Market Value</span>
                    <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                      ${estimatedGoldValue.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-stone-400">
                    Frontier Assay Office standard rate: <strong className="text-stone-200 font-mono">$20.67</strong> per troy ounce.
                  </div>

                  {onRedeemAllGold && (
                    <button
                      onClick={onRedeemAllGold}
                      disabled={goldAmount <= 0}
                      className={`px-4 py-2 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 transition shadow ${
                        goldAmount > 0
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 cursor-pointer shadow-amber-900/40'
                          : 'bg-stone-800 text-stone-500 border border-stone-700/40 cursor-not-allowed'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      <span>Redeem for Cash (${estimatedGoldValue.toFixed(2)})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Auto Redeem Toggle */}
              {onToggleAutoRedeem && (
                <div className="p-4 rounded-2xl bg-stone-850/80 border border-stone-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-stone-200">Automatic Gold Conversion</h4>
                    <p className="text-xs text-stone-400 mt-0.5">Instantly convert mined gold ore to frontier cash funds</p>
                  </div>
                  <button
                    onClick={onToggleAutoRedeem}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-1.5 transition ${
                      playerState.autoRedeemGold !== false
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-stone-800 text-stone-400 border border-stone-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{playerState.autoRedeemGold !== false ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* --- TAB 4: GEAR & VITALS --- */}
          {activeTab === 'gear' && (
            <div className="space-y-4">
              {/* Vitals Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-850/80 border border-stone-800 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between text-xs font-mono text-stone-300 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      Prospector Health
                    </span>
                    <span className="font-bold text-stone-200">{Math.round(playerState.health)}%</span>
                  </div>
                  <div className="h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700/50">
                    <div
                      className={`h-full transition-all duration-300 ${
                        playerState.health < 30 ? 'bg-red-600' : playerState.health < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${playerState.health}%` }}
                    />
                  </div>
                </div>

                <div className="bg-stone-850/80 border border-stone-800 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between text-xs font-mono text-stone-300 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-sky-400" />
                      Canteen Hydration
                    </span>
                    <span className="font-bold text-sky-300">{Math.round(playerState.hydration)}%</span>
                  </div>
                  <div className="h-2 bg-stone-850 rounded-full overflow-hidden border border-stone-700/50">
                    <div
                      className={`h-full transition-all duration-300 ${
                        playerState.hydration < 30 ? 'bg-red-500' : playerState.hydration < 60 ? 'bg-amber-400' : 'bg-sky-400'
                      }`}
                      style={{ width: `${playerState.hydration}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Standard Prospecting Gear Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div
                  onClick={() => onSelectTool && onSelectTool('pickaxe')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                    playerState.equippedTool === 'pickaxe'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-stone-850 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <Pickaxe className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-stone-200 font-bold">Iron Pickaxe [1]</div>
                    <div className="text-[10px] text-stone-400">Bedrock & Ore</div>
                  </div>
                </div>

                <div
                  onClick={() => onSelectTool && onSelectTool('shovel')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                    playerState.equippedTool === 'shovel'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-stone-850 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <Shovel className="w-4 h-4 text-stone-300" />
                  <div>
                    <div className="text-stone-200 font-bold">Spade Shovel [2]</div>
                    <div className="text-[10px] text-stone-400">Alluvial Sand</div>
                  </div>
                </div>

                <div
                  onClick={() => onSelectTool && onSelectTool('rifle')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                    playerState.equippedTool === 'rifle'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-stone-850 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <Crosshair className="w-4 h-4 text-rose-400" />
                  <div>
                    <div className="text-stone-200 font-bold">Winchester .44 [5]</div>
                    <div className="text-[10px] text-stone-400">Hunting & Defense</div>
                  </div>
                </div>

                <div
                  onClick={() => onSelectTool && onSelectTool('compass')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                    playerState.equippedTool === 'compass'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-stone-850 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <Compass className="w-4 h-4 text-amber-300" />
                  <div>
                    <div className="text-stone-200 font-bold">Survey Compass [C]</div>
                    <div className="text-[10px] text-stone-400">Navigation & Headings</div>
                  </div>
                </div>

                <div
                  onClick={() => onSelectTool && onSelectTool('dynamite')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                    playerState.equippedTool === 'dynamite'
                      ? 'bg-red-500/15 border-red-500/40 text-red-300'
                      : 'bg-stone-850 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <Flame className="w-4 h-4 text-red-400" />
                  <div>
                    <div className="text-stone-200 font-bold">Dynamite Sticks [4]</div>
                    <div className="text-[10px] text-stone-400">Boulder Blasting</div>
                  </div>
                </div>

                <div
                  onClick={() => onSelectTool && onSelectTool('axe')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                    playerState.equippedTool === 'axe'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-stone-850 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <TreePine className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-stone-200 font-bold">Felling Axe [6]</div>
                    <div className="text-[10px] text-stone-400">Timber Logging</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between text-xs font-mono text-stone-400">
          <span>Close with [Esc] or [I] key</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold transition"
          >
            Return to Exploration
          </button>
        </div>
      </div>
    </div>
  );
};
