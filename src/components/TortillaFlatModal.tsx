import React, { useState } from 'react';
import {
  Store,
  Coins,
  DollarSign,
  Droplets,
  Heart,
  Crosshair,
  Sparkles,
  Flame,
  Shield,
  MessageSquare,
  MapPin,
  X,
  CheckCircle2,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { PlayerState, Vector3D } from '../types';
import { soundEngine } from '../audio/soundEffects';

interface TortillaFlatModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  onUpdatePlayerState: (updater: (prev: PlayerState) => PlayerState) => void;
  onFastTravel?: (target: Vector3D) => void;
  onShowBanner?: (msg: string) => void;
}

export const TortillaFlatModal: React.FC<TortillaFlatModalProps> = ({
  isOpen,
  onClose,
  playerState,
  onUpdatePlayerState,
  onFastTravel,
  onShowBanner,
}) => {
  const [activeTab, setActiveTab] = useState<'mercantile' | 'assayer' | 'saloon' | 'stagecoach'>('mercantile');

  if (!isOpen) return null;

  const cash = playerState.cashDollars || 0;
  const gold = playerState.goldFound || 0;
  const health = playerState.health;
  const hydration = playerState.hydration;
  const planks = playerState.woodPlanks || 0;
  const dynamite = playerState.dynamite;
  const ammo = playerState.ammo;

  // Assayer Exchange Handler ($20.67 per Troy Ounce 1880s Gold Standard)
  const handleCashInGold = (amount: number) => {
    if (gold < amount) {
      if (onShowBanner) onShowBanner("Not enough raw gold ore to cash in!");
      return;
    }
    const payout = amount * 20.67;
    soundEngine.playCoins();
    onUpdatePlayerState((prev) => ({
      ...prev,
      goldFound: Math.max(0, (prev.goldFound || 0) - amount),
      cashDollars: (prev.cashDollars || 0) + payout,
    }));
    if (onShowBanner) {
      onShowBanner(`🪙 Assayer weighed ${amount.toFixed(1)} oz Gold! Paid out +$${payout.toFixed(2)} Cash.`);
    }
  };

  // Buy Provisions
  const handleBuy = (
    name: string,
    costDollars: number,
    action: (prev: PlayerState) => Partial<PlayerState>
  ) => {
    if (cash < costDollars) {
      if (onShowBanner) onShowBanner(`Need $${costDollars.toFixed(2)} Cash! Cash in gold at the Assayer counter.`);
      return;
    }
    soundEngine.playCoins();
    onUpdatePlayerState((prev) => ({
      ...prev,
      cashDollars: (prev.cashDollars || 0) - costDollars,
      ...action(prev),
    }));
    if (onShowBanner) {
      onShowBanner(`Purchased ${name} for $${costDollars.toFixed(2)}!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-stone-900 border-2 border-amber-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-stone-900 via-amber-950/50 to-stone-900 border-b border-amber-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-900/60 border border-amber-600/60 rounded-xl shadow-inner text-amber-300">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-serif text-amber-100 tracking-wide">
                  Historic Tortilla Flat & Salt River Canyon
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-amber-900/80 text-amber-200 border border-amber-600/50 rounded-full">
                  Pop. 6 • Salt River • Apache Trail
                </span>
              </div>
              <p className="text-xs text-amber-300/70 font-serif">
                1880s Saloon, Mercantile Trading Post, Roosevelt Dam Salt River Freight Camp & Stagecoach Stop
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-amber-200 hover:bg-stone-800/80 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency & Vitals Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-6 py-3 bg-stone-950/60 border-b border-stone-800/80 text-xs font-mono">
          <div className="flex items-center gap-2 text-emerald-400 bg-stone-900/80 px-3 py-1.5 rounded-lg border border-emerald-900/40">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span>Cash:</span>
            <span className="font-bold text-sm text-emerald-300">${cash.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 text-amber-300 bg-stone-900/80 px-3 py-1.5 rounded-lg border border-amber-900/40">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Gold Ore:</span>
            <span className="font-bold text-sm text-amber-200">{gold.toFixed(1)} oz</span>
          </div>
          <div className="flex items-center gap-2 text-rose-300 bg-stone-900/80 px-3 py-1.5 rounded-lg border border-rose-900/40">
            <Heart className="w-4 h-4 text-rose-500" />
            <span>Health:</span>
            <span className="font-bold text-sm">{Math.round(health)}%</span>
          </div>
          <div className="flex items-center gap-2 text-cyan-300 bg-stone-900/80 px-3 py-1.5 rounded-lg border border-cyan-900/40">
            <Droplets className="w-4 h-4 text-cyan-400" />
            <span>Hydration:</span>
            <span className="font-bold text-sm">{Math.round(hydration)}%</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-stone-900/90 border-b border-stone-800">
          <button
            onClick={() => setActiveTab('mercantile')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-serif rounded-t-xl transition-all ${
              activeTab === 'mercantile'
                ? 'bg-amber-900/50 text-amber-100 border-t-2 border-x border-amber-600 font-bold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Store className="w-4 h-4 text-amber-400" />
            Mercantile Provisions
          </button>
          <button
            onClick={() => setActiveTab('assayer')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-serif rounded-t-xl transition-all ${
              activeTab === 'assayer'
                ? 'bg-amber-900/50 text-amber-100 border-t-2 border-x border-amber-600 font-bold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-400" />
            Gold Assayer Counter
          </button>
          <button
            onClick={() => setActiveTab('saloon')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-serif rounded-t-xl transition-all ${
              activeTab === 'saloon'
                ? 'bg-amber-900/50 text-amber-100 border-t-2 border-x border-amber-600 font-bold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-400" />
            Saloon Lore & Rumors
          </button>
          <button
            onClick={() => setActiveTab('stagecoach')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-serif rounded-t-xl transition-all ${
              activeTab === 'stagecoach'
                ? 'bg-amber-900/50 text-amber-100 border-t-2 border-x border-amber-600 font-bold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <MapPin className="w-4 h-4 text-amber-400" />
            Stagecoach Travel
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: MERCANTILE PROVISIONS */}
          {activeTab === 'mercantile' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-200/90 font-serif leading-relaxed">
                Welcome to the Tortilla Flat Trading Post! Stock up on expedition trail rations, dynamite for hard rock blasting, timber planks for shoring deep trenches, and rifle ammunition before heading deeper into the Superstition Mountains.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Item: Spring Water Canteen Refill */}
                <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-cyan-950 border border-cyan-700/50 rounded-lg text-cyan-400">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold font-serif text-stone-100">Ice-Cellar Spring Water</div>
                      <div className="text-xs text-stone-400">Refills canteen to 100% hydration</div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleBuy('Cold Spring Water', 0.5, () => ({ hydration: 100 }))
                    }
                    className="px-3 py-1.5 bg-cyan-900/70 hover:bg-cyan-800 text-cyan-100 font-mono text-xs rounded-lg border border-cyan-600/50 transition-colors shadow"
                  >
                    $0.50 (Fill)
                  </button>
                </div>

                {/* Item: Salt Pork & Trail Rations */}
                <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-950 border border-rose-700/50 rounded-lg text-rose-400">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold font-serif text-stone-100">Salt Pork & Trail Jerky</div>
                      <div className="text-xs text-stone-400">Restores +50 Health immediately</div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleBuy('Salt Pork & Jerky', 2.0, (p) => ({
                        health: Math.min(100, (p.health || 0) + 50),
                      }))
                    }
                    className="px-3 py-1.5 bg-rose-900/70 hover:bg-rose-800 text-rose-100 font-mono text-xs rounded-lg border border-rose-600/50 transition-colors shadow"
                  >
                    $2.00 (+50 HP)
                  </button>
                </div>

                {/* Item: Heavy Timber Shoring Planks */}
                <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-950 border border-amber-700/50 rounded-lg text-amber-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold font-serif text-stone-100">Timber Shoring Planks (5x)</div>
                      <div className="text-xs text-stone-400">
                        Supports pits & mine shafts (Current: {planks})
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleBuy('Timber Planks (5x)', 3.0, (p) => ({
                        woodPlanks: (p.woodPlanks || 0) + 5,
                      }))
                    }
                    className="px-3 py-1.5 bg-amber-900/70 hover:bg-amber-800 text-amber-100 font-mono text-xs rounded-lg border border-amber-600/50 transition-colors shadow"
                  >
                    $3.00 (+5 Planks)
                  </button>
                </div>

                {/* Item: Hercules Dynamite Sticks */}
                <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-950 border border-red-700/50 rounded-lg text-red-400">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold font-serif text-stone-100">Hercules Dynamite (3x)</div>
                      <div className="text-xs text-stone-400">
                        High explosive excavation sticks (Current: {dynamite})
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleBuy('Dynamite (3x)', 5.0, (p) => ({
                        dynamite: (p.dynamite || 0) + 3,
                      }))
                    }
                    className="px-3 py-1.5 bg-red-900/70 hover:bg-red-800 text-red-100 font-mono text-xs rounded-lg border border-red-600/50 transition-colors shadow"
                  >
                    $5.00 (+3 Dynamite)
                  </button>
                </div>

                {/* Item: Winchester .44-40 Ammunition */}
                <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-stone-800 border border-stone-600 rounded-lg text-amber-200">
                      <Crosshair className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold font-serif text-stone-100">Winchester .44-40 Ammo (10x)</div>
                      <div className="text-xs text-stone-400">
                        Lead cartridges for frontier defense (Current: {ammo})
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleBuy('Winchester Ammo (10x)', 4.0, (p) => ({
                        ammo: (p.ammo || 0) + 10,
                      }))
                    }
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-200 font-mono text-xs rounded-lg border border-stone-600 transition-colors shadow"
                  >
                    $4.00 (+10 Ammo)
                  </button>
                </div>

                {/* Item: Brass Survey Claim Stake */}
                <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-yellow-950 border border-yellow-700/50 rounded-lg text-yellow-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold font-serif text-stone-100">Brass Claim Stake & Patent</div>
                      <div className="text-xs text-stone-400">
                        Legally stakes a 40-acre mining patent claim
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (cash < 6.0) {
                        if (onShowBanner) onShowBanner("Need $6.00 Cash to purchase a Claim Stake!");
                        return;
                      }
                      soundEngine.playCoins();
                      onUpdatePlayerState((p) => ({
                        ...p,
                        cashDollars: (p.cashDollars || 0) - 6.0,
                        equippedTool: 'stake',
                      }));
                      if (onShowBanner) onShowBanner("Equipped Survey Claim Stake! Aim at terrain to stake your claim.");
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-yellow-900/70 hover:bg-yellow-800 text-yellow-100 font-mono text-xs rounded-lg border border-yellow-600/50 transition-colors shadow"
                  >
                    $6.00 (Equip)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOLD ASSAYER COUNTER */}
          {activeTab === 'assayer' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/40 border border-amber-800/60 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold font-serif text-amber-200 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    Official U.S. Mint Gold Standard (1880)
                  </div>
                  <div className="px-2.5 py-1 bg-amber-900/80 text-amber-200 border border-amber-600/60 rounded font-mono text-xs">
                    $20.67 Cash / Troy Oz
                  </div>
                </div>
                <p className="text-xs text-stone-300 font-serif leading-relaxed">
                  The Tortilla Flat Assayer uses brass counter-weighted scales and nitric acid testing to certify raw placer gold and high-grade quartz vein ore into official United States legal tender dollars.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-xl text-center flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-stone-400 font-mono">CASH IN 1.0 OZ</div>
                    <div className="text-xl font-bold font-serif text-amber-300 my-1">+$20.67</div>
                    <div className="text-[11px] text-stone-400">1 Troy Ounce Gold</div>
                  </div>
                  <button
                    disabled={gold < 1.0}
                    onClick={() => handleCashInGold(1.0)}
                    className="mt-3 w-full py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-stone-800 disabled:text-stone-600 text-amber-100 font-mono text-xs rounded-lg transition-colors shadow"
                  >
                    Cash In 1 oz
                  </button>
                </div>

                <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-xl text-center flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-stone-400 font-mono">CASH IN 5.0 OZ</div>
                    <div className="text-xl font-bold font-serif text-amber-300 my-1">+$103.35</div>
                    <div className="text-[11px] text-stone-400">Rich Pocket Yield</div>
                  </div>
                  <button
                    disabled={gold < 5.0}
                    onClick={() => handleCashInGold(5.0)}
                    className="mt-3 w-full py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-stone-800 disabled:text-stone-600 text-amber-100 font-mono text-xs rounded-lg transition-colors shadow"
                  >
                    Cash In 5 oz
                  </button>
                </div>

                <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-xl text-center flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-stone-400 font-mono">CASH IN ALL GOLD</div>
                    <div className="text-xl font-bold font-serif text-emerald-400 my-1">
                      +${(gold * 20.67).toFixed(2)}
                    </div>
                    <div className="text-[11px] text-stone-400">Total: {gold.toFixed(1)} oz</div>
                  </div>
                  <button
                    disabled={gold <= 0}
                    onClick={() => handleCashInGold(gold)}
                    className="mt-3 w-full py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-stone-800 disabled:text-stone-600 text-emerald-100 font-mono text-xs rounded-lg transition-colors shadow"
                  >
                    Cash In All Gold
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SALOON LORE & RUMORS */}
          {activeTab === 'saloon' && (
            <div className="space-y-3 font-serif">
              <div className="p-4 bg-stone-950/80 border border-amber-900/40 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  Bartender's Tale: The German Prospector
                </div>
                <p className="text-xs text-stone-300 leading-relaxed italic">
                  "Old Jacob Waltz sat right at that cedar corner table back in '84. He'd pay for his tobacco and whiskey in pure wiry electrum nuggets—never raw river dust, mind you, but pure crystalline bonanza quartz chunks. He said the Apache guarded the needle's eye, and that if you find where the midday shadow strikes the canyon wall, you'll see the sealed timber drift."
                </p>
              </div>

              <div className="p-4 bg-stone-950/80 border border-amber-900/40 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  River Pilot's Account: The Salt River & Roosevelt Dam
                </div>
                <p className="text-xs text-stone-300 leading-relaxed italic">
                  "Before the big dam was finished upriver, the Salt River ran wild and cold right past this terrace. Our freight boats and mule wagons hauled tons of timber and machinery straight through the canyon gorge. Tortilla Flat was the last stop for cold beer and fresh horseshoeing before the deep narrows."
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: STAGECOACH FAST TRAVEL */}
          {activeTab === 'stagecoach' && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-xl text-xs font-serif text-stone-300">
                The Tortilla Flat stagecoach line provides frontier transport across the established trails. Select an overland destination:
              </div>

              <div className="space-y-2">
                <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold font-serif text-stone-100">Peralta Trailhead Camp</div>
                    <div className="text-xs text-stone-400">Coordinates (-120, -120) • South Mountain Pass</div>
                  </div>
                  {onFastTravel && (
                    <button
                      onClick={() => {
                        onFastTravel({ x: -120, y: 0, z: -120 });
                        onClose();
                        if (onShowBanner) onShowBanner("Arrived at Peralta Trailhead via overland stagecoach!");
                      }}
                      className="px-4 py-2 bg-amber-800 hover:bg-amber-700 text-amber-100 font-serif text-xs rounded-lg transition-colors shadow"
                    >
                      Stage Ride (Travel)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span className="font-serif">Territory of Arizona • Superstition Wilderness Exploration</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-serif rounded-lg transition-colors"
          >
            Leave Town
          </button>
        </div>
      </div>
    </div>
  );
};
