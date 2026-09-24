import React, { useState, useEffect } from 'react';
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
  Footprints,
  Package,
  Award,
  Navigation,
  Pickaxe,
  Bed,
  Moon,
  Sun,
  Key,
  ShieldCheck,
  Scroll,
} from 'lucide-react';
import { PlayerState, Vector3D, TerritoryClaim, TortillaFlatTab } from '../types';
import { soundEngine } from '../audio/soundEffects';
import { DialogueNPCInfo } from './TownfolkDialogueOverlay';
import { territoryClaims } from '../services/territoryClaimService';
import { DailyBountyBoard } from './DailyBountyBoard';
import { bountyService } from '../services/bountyService';

interface TortillaFlatModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  onUpdatePlayerState: (updater: (prev: PlayerState) => PlayerState) => void;
  onFastTravel?: (target: Vector3D, label?: string) => void;
  onShowBanner?: (msg: string) => void;
  registeredClaims?: TerritoryClaim[];
  initialTab?: TortillaFlatTab;
  onOpenTownfolkDialogue?: (npc: DialogueNPCInfo) => void;
  timeOfDay?: number;
  onSleepInHotel?: (paymentMethod: 'cash' | 'gold') => boolean | void;
}

export const TortillaFlatModal: React.FC<TortillaFlatModalProps> = ({
  isOpen,
  onClose,
  playerState,
  onUpdatePlayerState,
  onFastTravel,
  onShowBanner,
  registeredClaims,
  initialTab = 'mercantile',
  onOpenTownfolkDialogue,
  timeOfDay = 12.0,
  onSleepInHotel,
}) => {
  const [activeTab, setActiveTab] = useState<TortillaFlatTab>(initialTab);
  const [editingMountName, setEditingMountName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');
  const [isRentingRoom, setIsRentingRoom] = useState(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
      setIsRentingRoom(false);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const cash = playerState.cashDollars || 0;
  const gold = playerState.goldFound || 0;
  const health = playerState.health;
  const hydration = playerState.hydration;
  const planks = playerState.woodPlanks || 0;
  const dynamite = playerState.dynamite;
  const ammo = playerState.ammo;
  const storedRations = playerState.provisionsRations || 0;

  const contracts = bountyService.getContracts();
  const readyBountiesCount = contracts.filter((c) => {
    if (c.status === 'claimed' || c.status === 'available') return false;
    return bountyService.canClaim(c.id, playerState).eligible;
  }).length;
  const activeBountiesCount = contracts.filter((c) => c.status === 'active' || c.status === 'completed').length;

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
                  Historic Tortilla Flat on Tortilla Creek
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-amber-900/80 text-amber-200 border border-amber-600/50 rounded-full">
                  Pop. 6 • Tortilla Creek • Apache Trail
                </span>
              </div>
              <p className="text-xs text-amber-300/70 font-serif">
                1880s Saloon, Mercantile Trading Post, Apache Trail Stagecoach Stop on Tortilla Creek
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
            onClick={() => setActiveTab('bounties')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-serif rounded-t-xl transition-all ${
              activeTab === 'bounties'
                ? 'bg-amber-900/50 text-amber-100 border-t-2 border-x border-amber-600 font-bold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Scroll className="w-4 h-4 text-amber-400" />
            <span>Daily Bounty Board</span>
            {readyBountiesCount > 0 ? (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/40 animate-pulse">
                CLAIM ({readyBountiesCount})
              </span>
            ) : activeBountiesCount > 0 ? (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                {activeBountiesCount}
              </span>
            ) : null}
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
            onClick={() => setActiveTab('hotel')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-serif rounded-t-xl transition-all ${
              activeTab === 'hotel'
                ? 'bg-amber-900/50 text-amber-100 border-t-2 border-x border-amber-600 font-bold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Bed className="w-4 h-4 text-amber-400" />
            <span>Superstition Hotel</span>
            {(timeOfDay >= 19.5 || timeOfDay < 5.5) && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40 animate-pulse">
                NIGHT
              </span>
            )}
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
          <button
            onClick={() => setActiveTab('livery')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-serif rounded-t-xl transition-all ${
              activeTab === 'livery'
                ? 'bg-amber-900/50 text-amber-100 border-t-2 border-x border-amber-600 font-bold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Footprints className="w-4 h-4 text-amber-400" />
            Livery & Mounts
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

              {/* Daily Bounty Board Callout Banner */}
              <div className="p-4 bg-gradient-to-r from-amber-950/60 via-stone-900 to-amber-950/60 border border-amber-600/70 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-900/80 border border-amber-500/60 rounded-xl text-amber-300 shadow">
                    <Scroll className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-serif text-amber-100">Mercantile Daily Bounty Board</span>
                      <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-amber-700/60 text-amber-200 border border-amber-500/50 rounded-full">
                        Provisions & Exploration Quests
                      </span>
                    </div>
                    <div className="text-xs text-amber-300/80 font-serif mt-0.5">
                      Accept daily supply contracts, map Superstition landmarks, or deliver rations to earn cash and mining supplies.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('bounties')}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-stone-950 font-serif font-bold text-xs rounded-xl border border-amber-500/50 transition-all shadow shrink-0 flex items-center gap-1.5"
                >
                  <span>Inspect Bounty Board</span>
                  {readyBountiesCount > 0 ? (
                    <span className="px-1.5 py-0.2 bg-emerald-400 text-stone-950 rounded text-[10px] font-mono font-bold">
                      {readyBountiesCount} READY
                    </span>
                  ) : (
                    <span>→</span>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Item: Preserved Trail Rations (Stored for Trail / Bounty Delivery) */}
                <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-950 border border-amber-700/50 rounded-lg text-amber-400">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold font-serif text-stone-100">Preserved Trail Rations (Pack)</div>
                      <div className="text-xs text-stone-400">
                        Cured jerky & hardtack for trail treks or bounty contracts (Stock: {storedRations})
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleBuy('Trail Rations Pack', 1.5, (p) => ({
                        provisionsRations: (p.provisionsRations || 0) + 1,
                      }))
                    }
                    className="px-3 py-1.5 bg-amber-900/70 hover:bg-amber-800 text-amber-100 font-mono text-xs rounded-lg border border-amber-600/50 transition-colors shadow"
                  >
                    $1.50 (+1 Ration)
                  </button>
                </div>
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

          {/* TAB: DAILY BOUNTY BOARD */}
          {activeTab === 'bounties' && (
            <DailyBountyBoard
              playerState={playerState}
              onUpdatePlayerState={onUpdatePlayerState}
              onShowBanner={onShowBanner}
              onSwitchToMercantile={() => setActiveTab('mercantile')}
            />
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
                  Stage Driver's Account: Tortilla Creek & The Apache Trail
                </div>
                <p className="text-xs text-stone-300 leading-relaxed italic">
                  "Tortilla Creek carved this steep canyon oasis, running fresh and clear right past our settlement terrace. Our mule teams and Concord coaches haul passengers and supplies straight up the Apache Trail gorge. Tortilla Flat is the last stop for cold drinks and fresh horseshoeing before the deep narrows."
                </p>
              </div>

              {/* Real Voice Dialogue with Saloon Patrons */}
              {onOpenTownfolkDialogue && (
                <div className="p-4 bg-gradient-to-r from-amber-950/60 via-stone-900 to-amber-950/60 border border-amber-600/50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Frontier Voice Conversations (Gemini Audio)
                    </div>
                    <span className="text-[11px] font-mono text-stone-400">Speak & Listen</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onClose();
                        onOpenTownfolkDialogue({
                          id: 'barkeep_hank',
                          name: "Hank 'Dutch' Miller",
                          title: 'Superstition Saloon Keeper',
                          role: 'barkeep',
                          initialGreeting: "Welcome to the Superstition Saloon! Cold sarsaparilla, warm stew, and hot rumors straight from the diggings. What'll it be?",
                        });
                      }}
                      className="p-2.5 bg-stone-900 hover:bg-stone-800 border border-amber-800/60 hover:border-amber-500 rounded-lg text-left transition-colors flex items-center gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-900/80 border border-amber-500 flex items-center justify-center text-amber-200 text-sm">
                        🍺
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-100">Barkeep Hank Miller</div>
                        <div className="text-[10px] text-stone-400">Ask about miners, gold & whiskey</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenTownfolkDialogue({
                          id: 'old_dusty_pete',
                          name: 'Old Dusty Pete',
                          title: 'Veteran Gold Prospector',
                          role: 'prospector',
                          initialGreeting: "Heh! You got that hungry look in your eyes, greenhorn. Weaver's Needle don't give up its gold easy. Ask me what you want to know.",
                        });
                      }}
                      className="p-2.5 bg-stone-900 hover:bg-stone-800 border border-amber-800/60 hover:border-amber-500 rounded-lg text-left transition-colors flex items-center gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-900/80 border border-amber-500 flex items-center justify-center text-amber-200 text-sm">
                        ⛏️
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-100">Old Dusty Pete</div>
                        <div className="text-[10px] text-stone-400">Lost Dutchman mine lore & clues</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenTownfolkDialogue({
                          id: 'sheriff_wyatt',
                          name: 'Sheriff Wyatt Vance',
                          title: 'Territorial Lawman',
                          role: 'sheriff',
                          initialGreeting: "Keep your iron holstered in town, stranger. Out in Needle Canyon you're on your own, but here in Tortilla Flat, the law stands firm.",
                        });
                      }}
                      className="p-2.5 bg-stone-900 hover:bg-stone-800 border border-amber-800/60 hover:border-amber-500 rounded-lg text-left transition-colors flex items-center gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-900/80 border border-amber-500 flex items-center justify-center text-amber-200 text-sm">
                        ⭐
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-100">Sheriff Wyatt Vance</div>
                        <div className="text-[10px] text-stone-400">Outlaws, claims & mountain perils</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenTownfolkDialogue({
                          id: 'assayer_walker',
                          name: 'Judge Hiram Walker',
                          title: 'U.S. Mineral Assayer',
                          role: 'assayer',
                          initialGreeting: "Standard bullion rate is twenty dollars sixty-seven cents per ounce under the Coinage Act. Have you struck honest bonanza rock?",
                        });
                      }}
                      className="p-2.5 bg-stone-900 hover:bg-stone-800 border border-amber-800/60 hover:border-amber-500 rounded-lg text-left transition-colors flex items-center gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-900/80 border border-amber-500 flex items-center justify-center text-amber-200 text-sm">
                        ⚖️
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-100">Assayer Hiram Walker</div>
                        <div className="text-[10px] text-stone-400">Gold grades, patents & assaying</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Upstairs Hotel Boarding Rooms Promo */}
              <div className="p-3.5 bg-gradient-to-r from-amber-950/60 via-stone-900 to-amber-950/60 border border-amber-600/50 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-900/60 border border-amber-600/60 rounded-lg text-amber-300">
                    <Bed className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-100 flex items-center gap-1.5">
                      Superstition Hotel Boarding Rooms (Upstairs)
                      <span className="text-[10px] text-emerald-400 font-mono font-normal">$2.00 / night</span>
                    </div>
                    <p className="text-[11px] text-stone-300 font-serif">
                      Clean feather ticks, warm wood stove, and peaceful sleep safely until 6:00 AM dawn.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('hotel')}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-amber-950 font-bold text-xs rounded-lg transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Bed className="w-3.5 h-3.5" />
                  <span>Book Room</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB: SUPERSTITION HOTEL & BOARDING ROOMS */}
          {activeTab === 'hotel' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-amber-950/70 via-stone-900 to-amber-950/70 border-2 border-amber-600/70 rounded-xl space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-900/80 border border-amber-500 rounded-lg text-amber-300">
                      <Bed className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold font-serif text-amber-100 text-base">
                        Superstition Hotel & Miner's Boarding House
                      </h3>
                      <p className="text-xs text-amber-300/80 font-serif">
                        Historic Second-Floor Rooms • Feather Beds • Cast-Iron Stove • Tortilla Creek Canyon
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border bg-stone-950/80">
                    {(timeOfDay >= 19.5 || timeOfDay < 5.5) ? (
                      <>
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-indigo-300 font-bold">NIGHTTIME</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-300 font-bold">DAYTIME</span>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed font-serif pt-1">
                  Upstairs above the Superstition Saloon, clean pine boarding rooms offer a comfortable feather tick, heavy wool blankets, a private brass skeleton key, and a washbasin of pure artesian spring water. Sleeping in a hotel room protects you from nighttime desert hypothermia, predator ambushes, and fully replenishes your vital energy until 6:00 AM dawn.
                </p>
              </div>

              {/* Room Rates & Sleep Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Cash Payment Card */}
                <div className="p-4 bg-stone-950 border border-amber-900/60 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-amber-200 text-sm flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        Rent with Legal Tender Cash
                      </span>
                      <span className="text-emerald-400 font-mono font-bold text-sm">$2.00 / night</span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      Pay standard territorial rate with your pocket cash ($2.00).
                    </p>
                    <div className="mt-2 text-[11px] font-mono text-stone-400">
                      Your Cash Balance: <span className="text-emerald-300 font-bold">${cash.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (isRentingRoom) return;
                      setIsRentingRoom(true);
                      if (onSleepInHotel) {
                        const success = onSleepInHotel('cash');
                        if (success !== false) {
                          onClose();
                        } else {
                          setIsRentingRoom(false);
                        }
                      } else {
                        if (cash < 1.99) {
                          if (onShowBanner) onShowBanner("⚠️ Need $2.00 cash to rent a room! Cash in gold at the Assayer counter.");
                          setIsRentingRoom(false);
                          return;
                        }
                        soundEngine.playHotelRest();
                        onUpdatePlayerState((prev) => ({
                          ...prev,
                          cashDollars: Math.max(0, (prev.cashDollars || 0) - 2.0),
                          health: 100,
                          hydration: 100,
                          vigour: 100,
                          isExhausted: false,
                          canteenOunces: 32,
                        }));
                        if (onShowBanner) onShowBanner("🌅 Rested comfortably in the Superstition Hotel until 6:00 AM! Health & Hydration fully restored.");
                        onClose();
                      }
                    }}
                    disabled={cash < 1.99 || isRentingRoom}
                    className={`w-full py-2.5 px-4 rounded-lg font-serif text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                      cash >= 1.99 && !isRentingRoom
                        ? 'bg-emerald-700 hover:bg-emerald-600 text-emerald-50 hover:scale-[1.02]'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <Bed className="w-4 h-4" />
                    <span>{isRentingRoom ? 'Retiring Upstairs...' : 'Rent Room & Sleep until Dawn ($2.00 Cash)'}</span>
                  </button>
                </div>

                {/* Gold Dust Payment Card */}
                <div className="p-4 bg-stone-950 border border-amber-900/60 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-amber-200 text-sm flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-amber-400" />
                        Rent with Raw Gold Ore
                      </span>
                      <span className="text-amber-300 font-mono font-bold text-sm">0.10 oz Gold</span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      Direct barter with placer gold dust or crushed bonanza quartz.
                    </p>
                    <div className="mt-2 text-[11px] font-mono text-stone-400">
                      Your Gold Dust: <span className="text-amber-300 font-bold">{gold.toFixed(2)} oz</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (isRentingRoom) return;
                      setIsRentingRoom(true);
                      if (onSleepInHotel) {
                        const success = onSleepInHotel('gold');
                        if (success !== false) {
                          onClose();
                        } else {
                          setIsRentingRoom(false);
                        }
                      } else {
                        if (gold < 0.099) {
                          if (onShowBanner) onShowBanner("⚠️ Need 0.10 oz gold ore to pay for a hotel room!");
                          setIsRentingRoom(false);
                          return;
                        }
                        soundEngine.playHotelRest();
                        onUpdatePlayerState((prev) => ({
                          ...prev,
                          goldFound: Math.max(0, (prev.goldFound || 0) - 0.1),
                          health: 100,
                          hydration: 100,
                          vigour: 100,
                          isExhausted: false,
                          canteenOunces: 32,
                        }));
                        if (onShowBanner) onShowBanner("🌅 Rested comfortably in the Superstition Hotel until 6:00 AM! Health & Hydration fully restored.");
                        onClose();
                      }
                    }}
                    disabled={gold < 0.099 || isRentingRoom}
                    className={`w-full py-2.5 px-4 rounded-lg font-serif text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                      gold >= 0.099 && !isRentingRoom
                        ? 'bg-amber-700 hover:bg-amber-600 text-stone-950 hover:scale-[1.02]'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>{isRentingRoom ? 'Retiring Upstairs...' : 'Pay with Gold Dust (0.10 oz Gold)'}</span>
                  </button>
                </div>
              </div>

              {/* Room Amenities & Night Safety */}
              <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-xl space-y-2">
                <div className="text-xs font-serif font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Hotel Amenities Included with Every Stay
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-stone-300 font-serif">
                  <div className="p-2 bg-stone-900/60 rounded border border-stone-800 flex items-center gap-2">
                    <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Advances time to 6:00 AM Sunrise</span>
                  </div>
                  <div className="p-2 bg-stone-900/60 rounded border border-stone-800 flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Full 100% Health Recovery</span>
                  </div>
                  <div className="p-2 bg-stone-900/60 rounded border border-stone-800 flex items-center gap-2">
                    <Droplets className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>100% Hydration & Canteen Refill</span>
                  </div>
                </div>
              </div>

              {/* Speak with Miss Clara Miller */}
              {onOpenTownfolkDialogue && (
                <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/40 border border-amber-800/50 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-serif font-bold text-amber-200">
                      Speak with Clara Miller (Hotel Hostess & Boarding House Keeper)
                    </div>
                    <p className="text-[11px] text-stone-400">
                      Ask about clean linen, local stage passengers, and rumors from the upper canyon.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenTownfolkDialogue({
                        id: 'clara_miller',
                        name: 'Clara Miller',
                        title: 'Hotel Hostess & Homesteader',
                        role: 'homesteader',
                        initialGreeting: "Welcome to Tortilla Flat, traveler! If you're staying the night, room 4 upstairs has fresh cedar-shaving pillows and warm wool blankets. How can I help you?",
                      });
                    }}
                    className="px-3 py-1.5 bg-amber-800 hover:bg-amber-700 text-amber-100 rounded-lg text-xs font-serif font-semibold transition-colors shrink-0 cursor-pointer"
                  >
                    Speak with Clara
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: STAGECOACH FAST TRAVEL */}
          {activeTab === 'stagecoach' && (() => {
            const localProspectorId = territoryClaims.getOrCreateProspectorId();
            const allTerritory = registeredClaims && registeredClaims.length > 0
              ? registeredClaims
              : territoryClaims.getAllClaims();

            const ownedClaimsList: { id: string; name: string; x: number; z: number; extractedGold?: number }[] = [];
            if (playerState.activeClaim?.isClaimed && playerState.activeClaim.position) {
              ownedClaimsList.push({
                id: playerState.activeClaim.id || 'player_active_claim',
                name: playerState.activeClaim.name,
                x: playerState.activeClaim.position.x,
                z: playerState.activeClaim.position.z,
                extractedGold: playerState.activeClaim.extractedGold || 0,
              });
            }
            allTerritory.forEach((tc) => {
              if (tc.ownerId === localProspectorId || tc.ownerName === 'You') {
                if (!ownedClaimsList.some((c) => Math.abs(c.x - tc.x) < 2 && Math.abs(c.z - tc.z) < 2)) {
                  ownedClaimsList.push({
                    id: tc.id,
                    name: tc.name,
                    x: tc.x,
                    z: tc.z,
                    extractedGold: tc.extractedGold || 0,
                  });
                }
              }
            });

            return (
              <div className="space-y-4">
                <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-xl text-xs font-serif text-stone-300">
                  The Tortilla Flat stagecoach line provides frontier transport across established wilderness trails and chartered routes to your private mining patents. Select an overland destination:
                </div>

                <div className="space-y-3">
                  {/* Historic Trailhead */}
                  <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold font-serif text-stone-100 flex items-center gap-2">
                        <span>Peralta Trailhead Camp</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300">Historic Trail</span>
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">Coordinates (-120, -120) • South Mountain Pass</div>
                    </div>
                    {onFastTravel && (
                      <button
                        onClick={() => {
                          onFastTravel({ x: -120, y: 0, z: -120 }, "Peralta Trailhead");
                          onClose();
                          if (onShowBanner) onShowBanner("Arrived at Peralta Trailhead via overland stagecoach!");
                        }}
                        className="px-4 py-2 bg-amber-800 hover:bg-amber-700 text-amber-100 font-serif text-xs rounded-lg transition-colors shadow flex items-center gap-1.5 cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" /> Stage Ride (Travel)
                      </button>
                    )}
                  </div>

                  {/* Your Staked Claims & Mining Outposts */}
                  <div className="pt-2">
                    <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                      <Pickaxe className="w-4 h-4 text-amber-500" />
                      Your Staked Mineral Claims ({ownedClaimsList.length})
                    </h4>

                    {ownedClaimsList.length === 0 ? (
                      <div className="p-4 bg-stone-950/60 border border-dashed border-stone-800 rounded-xl text-center">
                        <p className="text-xs font-serif text-stone-400">
                          You do not currently hold any staked mining claims. Stake a claim with your Survey Stake [9] in the crags or purchase a deed from the Assayer to unlock fast stage travel to your sites!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {ownedClaimsList.map((claim) => (
                          <div
                            key={claim.id}
                            className="p-4 bg-stone-950 border border-amber-900/60 hover:border-amber-600/70 rounded-xl flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="font-bold font-serif text-amber-200 flex items-center gap-2">
                                <span>{claim.name}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
                                  Your Claim
                                </span>
                              </div>
                              <div className="text-xs text-stone-400 mt-0.5 font-mono">
                                Coords: ({Math.round(claim.x)}, {Math.round(claim.z)}) • Yield: {claim.extractedGold?.toFixed(1) || '0.0'} oz gold
                              </div>
                            </div>
                            {onFastTravel && (
                              <button
                                onClick={() => {
                                  onFastTravel({ x: claim.x, y: 0, z: claim.z }, claim.name);
                                  onClose();
                                  if (onShowBanner) onShowBanner(`Arrived at your claim: "${claim.name}" via overland stagecoach!`);
                                }}
                                className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-stone-950 font-bold font-serif text-xs rounded-lg transition-all shadow flex items-center gap-1.5 hover:scale-105 cursor-pointer"
                              >
                                <Navigation className="w-3.5 h-3.5 fill-stone-950" /> Stage Ride to Claim
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 5: LIVERY STABLE & MOUNT CORRAL */}
          {activeTab === 'livery' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-200/90 font-serif leading-relaxed">
                Welcome to the Tortilla Flat Livery Stable & Corral! Master Hostler Silas &quot;Red&quot; McCurdy breeds and breaks surefooted Spanish pack burros and spirited mountain mustang ponies. Whether you need a faithful beast of burden to haul heavy gold ore from the crags or a fast mount to ride across the desert, our stock is bred for the harsh Superstition wilderness.
              </div>

              {/* Current Active Mount Status (If player owns one) */}
              {playerState.ownedMount && (
                <div className="p-4 bg-gradient-to-r from-amber-950/60 via-stone-900 to-amber-950/60 border-2 border-amber-600/70 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-900/80 border border-amber-500/60 rounded-xl text-amber-200 text-xl shadow-inner">
                        {playerState.ownedMount === 'burro' ? '🫏' : '🐎'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono uppercase text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/50">
                            Active Companion
                          </span>
                          <h3 className="text-base font-bold font-serif text-amber-100">
                            {playerState.mountName || (playerState.ownedMount === 'burro' ? 'Barnaby' : 'Sundown')}
                          </h3>
                        </div>
                        <p className="text-xs text-stone-300 font-serif mt-0.5">
                          {playerState.ownedMount === 'burro'
                            ? 'Hardy Spanish Pack Burro • Negates heavy ore encumbrance • 32 oz Water'
                            : 'Swift Mountain Mustang • +75% Riding Speed • Sprint Gallop'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          const newRiding = !playerState.isRidingMount;
                          onUpdatePlayerState((prev) => ({
                            ...prev,
                            isRidingMount: newRiding,
                          }));
                          soundEngine.playMountSaddle();
                          if (newRiding) {
                            if (playerState.ownedMount === 'burro') soundEngine.playBurroBray();
                            else soundEngine.playHorseWhinny();
                          }
                          if (onShowBanner) {
                            onShowBanner(
                              newRiding
                                ? `Mounted ${playerState.mountName || 'your steed'}! Press [M] to dismount.`
                                : `Dismounted ${playerState.mountName || 'your steed'}. Mount will follow loyally.`
                            );
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-serif rounded-lg border transition-all shadow ${
                          playerState.isRidingMount
                            ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold border-amber-400'
                            : 'bg-stone-800 hover:bg-stone-700 text-amber-200 border-stone-600'
                        }`}
                      >
                        {playerState.isRidingMount ? 'Dismount [M]' : 'Mount Up [M]'}
                      </button>

                      <button
                        onClick={() => {
                          if (cash < 3.0) {
                            if (onShowBanner) onShowBanner('Need $3.00 Cash for a bag of sweet oats!');
                            return;
                          }
                          soundEngine.playCoins();
                          if (playerState.ownedMount === 'burro') soundEngine.playBurroBray();
                          else soundEngine.playHorseWhinny();
                          onUpdatePlayerState((prev) => ({
                            ...prev,
                            cashDollars: (prev.cashDollars || 0) - 3.0,
                            health: Math.min(100, (prev.health || 0) + 15),
                            hydration: Math.min(100, (prev.hydration || 0) + 20),
                          }));
                          if (onShowBanner) {
                            onShowBanner(
                              `Fed sweet oats to ${playerState.mountName || 'your companion'}! Mount vigor restored (+15 HP).`
                            );
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-xs font-serif rounded-lg border border-amber-700/60 transition-colors"
                      >
                        Feed Sweet Oats ($3.00)
                      </button>

                      <button
                        onClick={() => {
                          const newName = prompt('Enter a name for your mount:', playerState.mountName || '');
                          if (newName && newName.trim()) {
                            onUpdatePlayerState((prev) => ({
                              ...prev,
                              mountName: newName.trim(),
                            }));
                            if (onShowBanner) onShowBanner(`Mount christened as "${newName.trim()}"!`);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-serif rounded-lg border border-stone-600 transition-colors"
                      >
                        Rename
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mount Catalog */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Spanish Pack Burro */}
                <div
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    playerState.ownedMount === 'burro'
                      ? 'bg-amber-950/30 border-amber-500/80 shadow-lg ring-1 ring-amber-500/40'
                      : 'bg-stone-950/80 border-stone-800 hover:border-amber-700/50'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🫏</span>
                        <div>
                          <h4 className="text-base font-bold font-serif text-amber-100">
                            Prospector&apos;s Pack Burro
                          </h4>
                          <span className="text-[11px] font-mono text-amber-400">
                            Equus asinus • Sawbuck Pack Saddle
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-emerald-400">$35.00</div>
                        <div className="text-[11px] font-mono text-amber-300/80">or 1.7 oz Gold</div>
                      </div>
                    </div>

                    <p className="text-xs text-stone-300 font-serif leading-relaxed">
                      The quintessential gold prospector&apos;s companion. Equipped with a wooden sawbuck pack frame, two heavy burlap ore panniers, rope halter, and copper trail bell.
                    </p>

                    <div className="space-y-1 text-[11px] font-serif text-amber-200/80 bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span>
                        <span><strong>Zero Encumbrance:</strong> Haul heavy rocks &amp; gold boulders without slowing down.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span>
                        <span><strong>Emergency Water:</strong> Includes 32 oz reserve canteen for desert hydration.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span>
                        <span><strong>Loyal Companion:</strong> Trots behind you everywhere; alerts to predators.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span>
                        <span><strong>Rideable:</strong> Mount with [M] for steady desert travel.</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-stone-800/80 flex items-center gap-2">
                    {playerState.ownedMount === 'burro' ? (
                      <div className="w-full py-2 text-center text-xs font-mono font-bold text-amber-400 bg-amber-950/80 border border-amber-600/50 rounded-lg">
                        Currently in Your Care
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            if (cash < 35.0) {
                              if (onShowBanner) onShowBanner('Need $35.00 Cash! Cash in ore at the Assayer.');
                              return;
                            }
                            soundEngine.playCoins();
                            soundEngine.playBurroBray();
                            onUpdatePlayerState((prev) => ({
                              ...prev,
                              cashDollars: (prev.cashDollars || 0) - 35.0,
                              ownedMount: 'burro',
                              mountName: prev.mountName || 'Barnaby',
                              isRidingMount: false,
                              hydration: 100,
                            }));
                            if (onShowBanner) {
                              onShowBanner('Bought Pack Burro "Barnaby"! Press [M] to mount or lead as pack mule.');
                            }
                          }}
                          className="flex-1 py-2 bg-emerald-900/70 hover:bg-emerald-800 text-emerald-100 font-serif text-xs font-bold rounded-lg border border-emerald-600/60 transition-colors shadow"
                        >
                          Buy ($35.00)
                        </button>
                        <button
                          onClick={() => {
                            if (gold < 1.7) {
                              if (onShowBanner) onShowBanner('Need 1.7 oz Gold to trade for a pack burro!');
                              return;
                            }
                            soundEngine.playCoins();
                            soundEngine.playBurroBray();
                            onUpdatePlayerState((prev) => ({
                              ...prev,
                              goldFound: Math.max(0, (prev.goldFound || 0) - 1.7),
                              ownedMount: 'burro',
                              mountName: prev.mountName || 'Barnaby',
                              isRidingMount: false,
                              hydration: 100,
                            }));
                            if (onShowBanner) {
                              onShowBanner('Traded 1.7 oz Gold for Pack Burro "Barnaby"! Press [M] to ride.');
                            }
                          }}
                          className="flex-1 py-2 bg-amber-900/70 hover:bg-amber-800 text-amber-100 font-serif text-xs font-bold rounded-lg border border-amber-600/60 transition-colors shadow"
                        >
                          Trade 1.7 oz Ore
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Mountain Mustang Pony */}
                <div
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    playerState.ownedMount === 'pony'
                      ? 'bg-amber-950/30 border-amber-500/80 shadow-lg ring-1 ring-amber-500/40'
                      : 'bg-stone-950/80 border-stone-800 hover:border-amber-700/50'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🐎</span>
                        <div>
                          <h4 className="text-base font-bold font-serif text-amber-100">
                            Mountain Mustang Pony
                          </h4>
                          <span className="text-[11px] font-mono text-amber-400">
                            Equus caballus • Tooled Leather Saddle
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-emerald-400">$65.00</div>
                        <div className="text-[11px] font-mono text-amber-300/80">or 3.2 oz Gold</div>
                      </div>
                    </div>

                    <p className="text-xs text-stone-300 font-serif leading-relaxed">
                      A spirited, surefooted Sonoran trail pony with high stamina. Outfitted with hand-tooled Western leather saddle, Navajo wool saddle blanket, brass stirrups, and bridle.
                    </p>

                    <div className="space-y-1 text-[11px] font-serif text-amber-200/80 bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span>
                        <span><strong>+75% Overland Speed:</strong> Swift riding transport across long distances.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span>
                        <span><strong>Sprint Gallop:</strong> Hold Shift to gallop at blistering speed past hostiles.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span>
                        <span><strong>Saddlebag Storage:</strong> Extra capacity for rifle rounds and provisions.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span>
                        <span><strong>Surefooted:</strong> Climbs mountain foothills and canyon trails effortlessly.</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-stone-800/80 flex items-center gap-2">
                    {playerState.ownedMount === 'pony' ? (
                      <div className="w-full py-2 text-center text-xs font-mono font-bold text-amber-400 bg-amber-950/80 border border-amber-600/50 rounded-lg">
                        Currently in Your Care
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            if (cash < 65.0) {
                              if (onShowBanner) onShowBanner('Need $65.00 Cash! Cash in ore at the Assayer.');
                              return;
                            }
                            soundEngine.playCoins();
                            soundEngine.playHorseWhinny();
                            onUpdatePlayerState((prev) => ({
                              ...prev,
                              cashDollars: (prev.cashDollars || 0) - 65.0,
                              ownedMount: 'pony',
                              mountName: prev.mountName || 'Sundown',
                              isRidingMount: false,
                            }));
                            if (onShowBanner) {
                              onShowBanner('Bought Mountain Pony "Sundown"! Press [M] to ride with +75% speed!');
                            }
                          }}
                          className="flex-1 py-2 bg-emerald-900/70 hover:bg-emerald-800 text-emerald-100 font-serif text-xs font-bold rounded-lg border border-emerald-600/60 transition-colors shadow"
                        >
                          Buy ($65.00)
                        </button>
                        <button
                          onClick={() => {
                            if (gold < 3.2) {
                              if (onShowBanner) onShowBanner('Need 3.2 oz Gold to trade for a mountain pony!');
                              return;
                            }
                            soundEngine.playCoins();
                            soundEngine.playHorseWhinny();
                            onUpdatePlayerState((prev) => ({
                              ...prev,
                              goldFound: Math.max(0, (prev.goldFound || 0) - 3.2),
                              ownedMount: 'pony',
                              mountName: prev.mountName || 'Sundown',
                              isRidingMount: false,
                            }));
                            if (onShowBanner) {
                              onShowBanner('Traded 3.2 oz Gold for Mountain Pony "Sundown"! Press [M] to ride.');
                            }
                          }}
                          className="flex-1 py-2 bg-amber-900/70 hover:bg-amber-800 text-amber-100 font-serif text-xs font-bold rounded-lg border border-amber-600/60 transition-colors shadow"
                        >
                          Trade 3.2 oz Ore
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Extra Livery Tack & Provisions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-950 border border-amber-700/50 rounded-lg text-amber-400">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold font-serif text-xs text-stone-100">Canvas Pack Saddlebags</div>
                      <div className="text-[11px] text-stone-400">Expands water &amp; provisions capacity</div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleBuy('Canvas Pack Saddlebags', 12.0, (p) => ({
                        hydration: 100,
                        canteenOunces: 32,
                      }))
                    }
                    className="px-3 py-1.5 bg-amber-900/70 hover:bg-amber-800 text-amber-100 font-mono text-xs rounded-lg border border-amber-600/50 transition-colors shadow"
                  >
                    $12.00
                  </button>
                </div>

                <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-950 border border-amber-700/50 rounded-lg text-amber-400">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold font-serif text-xs text-stone-100">Bag of Sweet Alfalfa Oats</div>
                      <div className="text-[11px] text-stone-400">Restores +15 Health &amp; feeds companion</div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleBuy('Sweet Alfalfa Oats', 3.0, (p) => {
                        if (p.ownedMount === 'burro') soundEngine.playBurroBray();
                        else if (p.ownedMount === 'pony') soundEngine.playHorseWhinny();
                        return {
                          health: Math.min(100, (p.health || 0) + 15),
                        };
                      })
                    }
                    className="px-3 py-1.5 bg-amber-900/70 hover:bg-amber-800 text-amber-100 font-mono text-xs rounded-lg border border-amber-600/50 transition-colors shadow"
                  >
                    $3.00
                  </button>
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
