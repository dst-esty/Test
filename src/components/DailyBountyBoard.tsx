import React, { useState, useEffect } from 'react';
import {
  Scroll,
  Coins,
  DollarSign,
  Flame,
  Layers,
  Crosshair,
  Package,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Compass,
  FileText,
  Clock,
  Award,
} from 'lucide-react';
import { PlayerState } from '../types';
import { bountyService, BountyContract } from '../services/bountyService';
import { soundEngine } from '../audio/soundEffects';

interface DailyBountyBoardProps {
  playerState: PlayerState;
  onUpdatePlayerState: (updater: (prev: PlayerState) => PlayerState) => void;
  onShowBanner?: (msg: string) => void;
  onSwitchToMercantile?: () => void;
}

export const DailyBountyBoard: React.FC<DailyBountyBoardProps> = ({
  playerState,
  onUpdatePlayerState,
  onShowBanner,
  onSwitchToMercantile,
}) => {
  const [contracts, setContracts] = useState<BountyContract[]>(bountyService.getContracts());
  const [filter, setFilter] = useState<'all' | 'active' | 'available' | 'claimed'>('all');

  useEffect(() => {
    // Keep bounty service in sync with current player inventory and discovered landmarks
    bountyService.updateProgressFromPlayerState(playerState);
  }, [playerState]);

  useEffect(() => {
    const unsub = bountyService.subscribe(() => {
      setContracts([...bountyService.getContracts()]);
    });
    return unsub;
  }, []);

  const handleAccept = (contract: BountyContract) => {
    const success = bountyService.acceptBounty(contract.id);
    if (success) {
      soundEngine.playPaperRustle?.();
      if (onShowBanner) {
        onShowBanner(`📜 Accepted Contract: "${contract.title}"! Complete objectives to earn cash and mining supplies.`);
      }
    }
  };

  const handleClaim = (contract: BountyContract) => {
    const result = bountyService.claimBounty(contract.id, playerState, onUpdatePlayerState);
    if (result.success) {
      if (onShowBanner) {
        onShowBanner(result.message);
      }
    } else {
      if (onShowBanner) {
        onShowBanner(`⚠️ ${result.message}`);
      }
    }
  };

  const handleRefresh = () => {
    bountyService.refreshDailyBoard();
    if (onShowBanner) {
      onShowBanner('📜 Pulled fresh daily bounty notices from the stagecoach mail pouch!');
    }
  };

  const filteredContracts = contracts.filter((c) => {
    if (filter === 'active') return c.status === 'active' || c.status === 'completed';
    if (filter === 'available') return c.status === 'available';
    if (filter === 'claimed') return c.status === 'claimed';
    return true;
  });

  const activeCount = contracts.filter((c) => c.status === 'active' || c.status === 'completed').length;
  const readyCount = contracts.filter((c) => {
    if (c.status === 'claimed' || c.status === 'available') return false;
    return bountyService.canClaim(c.id, playerState).eligible;
  }).length;

  return (
    <div className="space-y-5">
      {/* Board Header Banner */}
      <div className="relative p-5 rounded-2xl bg-gradient-to-r from-stone-950 via-amber-950/40 to-stone-950 border border-amber-700/60 shadow-xl overflow-hidden">
        {/* Background decorative watermark */}
        <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none text-amber-500">
          <Scroll className="w-48 h-48" />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-[11px] font-mono tracking-widest uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Tortilla Flat Mercantile • Frontier Notice Board</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold font-serif text-amber-100 tracking-wide">
              Daily Wilderness Bounties & Supply Warrants
            </h3>
            <p className="text-xs text-amber-300/80 font-serif max-w-2xl mt-1 leading-relaxed">
              Fulfill local provisioning contracts, chart uncharted landmarks across the Superstitions, or haul heavy mining timbers to earn cash bounties and vital excavation supplies.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-800/80 hover:bg-amber-900/60 text-amber-200 text-xs font-serif rounded-xl border border-amber-600/40 transition-all shadow"
              title="Refresh available notices from the daily stagecoach"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Postings</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-amber-900/30">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-serif transition-colors ${
              filter === 'all'
                ? 'bg-amber-600 text-stone-950 font-bold shadow'
                : 'bg-stone-900/80 text-stone-300 hover:bg-stone-800'
            }`}
          >
            All Postings ({contracts.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-serif transition-colors ${
              filter === 'active'
                ? 'bg-amber-600 text-stone-950 font-bold shadow'
                : 'bg-stone-900/80 text-stone-300 hover:bg-stone-800'
            }`}
          >
            <span>Active Warrants ({activeCount})</span>
            {readyCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-3 py-1.5 rounded-lg text-xs font-serif transition-colors ${
              filter === 'available'
                ? 'bg-amber-600 text-stone-950 font-bold shadow'
                : 'bg-stone-900/80 text-stone-300 hover:bg-stone-800'
            }`}
          >
            Available ({contracts.filter((c) => c.status === 'available').length})
          </button>
          <button
            onClick={() => setFilter('claimed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-serif transition-colors ${
              filter === 'claimed'
                ? 'bg-amber-600 text-stone-950 font-bold shadow'
                : 'bg-stone-900/80 text-stone-300 hover:bg-stone-800'
            }`}
          >
            Completed & Claimed ({contracts.filter((c) => c.status === 'claimed').length})
          </button>
        </div>
      </div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredContracts.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-stone-950/40 border border-stone-800 rounded-2xl text-stone-400 text-sm font-serif">
            No notices match this filter. Check back tomorrow or refresh postings above!
          </div>
        ) : (
          filteredContracts.map((contract) => {
            const isClaimed = contract.status === 'claimed';
            const isAvailable = contract.status === 'available';
            const isActive = contract.status === 'active' || contract.status === 'completed';
            const claimCheck = bountyService.canClaim(contract.id, playerState);
            const canTurnIn = isActive && claimCheck.eligible;

            // Live progress calculation
            let progressRatio = Math.min(1.0, contract.currentAmount / contract.requiredAmount);
            if (contract.type === 'bring_rations') {
              const totalRations =
                (playerState.provisionsRations || 0) +
                (playerState.rabbitMeat || 0) +
                (playerState.venisonMeat || 0) +
                (playerState.bighornMutton || 0);
              progressRatio = Math.min(1.0, totalRations / contract.requiredAmount);
            } else if (contract.type === 'bring_planks') {
              progressRatio = Math.min(1.0, (playerState.woodPlanks || 0) / contract.requiredAmount);
            } else if (contract.type === 'map_landmark') {
              const isDiscovered = playerState.discoveredLandmarks?.includes(
                contract.targetLandmarkId || ''
              );
              progressRatio = isDiscovered ? 1.0 : 0.0;
            }

            return (
              <div
                key={contract.id}
                className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 ${
                  isClaimed
                    ? 'bg-stone-950/40 border-stone-800 opacity-60'
                    : canTurnIn
                    ? 'bg-amber-950/40 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                    : isActive
                    ? 'bg-stone-900/90 border-amber-500/60 shadow-lg'
                    : 'bg-stone-950/80 border-stone-800 hover:border-amber-700/60'
                }`}
              >
                {/* Brass Tack / Pinned Notice Aesthetic */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-md border ${
                      isClaimed
                        ? 'bg-stone-900 text-stone-400 border-stone-700'
                        : canTurnIn
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60 font-bold animate-pulse'
                        : isActive
                        ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                        : 'bg-stone-800/80 text-stone-300 border-stone-600'
                    }`}
                  >
                    {isClaimed
                      ? 'Claimed'
                      : canTurnIn
                      ? '★ Ready to Turn In'
                      : isActive
                      ? 'In Progress'
                      : 'Available'}
                  </span>
                </div>

                <div>
                  {/* Category & Issuer */}
                  <div className="flex items-center gap-2 text-amber-400/90 text-xs font-serif font-bold uppercase tracking-wider mb-1.5">
                    {contract.type === 'map_landmark' ? (
                      <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    ) : contract.type === 'bring_rations' ? (
                      <Package className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Scroll className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{contract.category}</span>
                  </div>

                  <h4 className="text-base font-bold font-serif text-stone-100 leading-snug mb-1">
                    {contract.title}
                  </h4>
                  <p className="text-[11px] text-stone-400 font-mono mb-2.5">
                    Issued by: <span className="text-amber-300/90">{contract.issuer}</span>
                  </p>

                  <p className="text-xs text-stone-300 font-serif leading-relaxed mb-3">
                    {contract.description}
                  </p>

                  {/* Flavor Quote */}
                  <blockquote className="p-2.5 rounded-lg bg-stone-950/60 border-l-2 border-amber-600 text-[11px] text-amber-200/80 font-serif italic mb-4">
                    {contract.flavorQuote}
                  </blockquote>

                  {/* Objective & Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-stone-300">Objective:</span>
                      <span
                        className={`font-bold ${
                          canTurnIn ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {contract.type === 'map_landmark'
                          ? progressRatio >= 1.0
                            ? `Surveyed: ${contract.targetLandmarkName}`
                            : `Unsurveyed: ${contract.targetLandmarkName}`
                          : `${Math.round(progressRatio * contract.requiredAmount)} / ${
                              contract.requiredAmount
                            }`}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          progressRatio >= 1.0
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-amber-600 to-amber-400'
                        }`}
                        style={{ width: `${progressRatio * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Rewards and Action Button */}
                <div className="pt-3 border-t border-stone-800/80 space-y-3">
                  {/* Rewards Breakdown */}
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-stone-400 mb-1.5 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>Compensation & Mining Supplies:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Cash Reward */}
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 font-mono text-xs font-bold shadow-sm">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span>${contract.reward.cashDollars.toFixed(2)} Cash</span>
                      </span>

                      {/* Dynamite Reward */}
                      {contract.reward.dynamite && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-950/60 border border-red-700/50 text-red-300 font-mono text-xs shadow-sm">
                          <Flame className="w-3 h-3 text-red-400" />
                          <span>+{contract.reward.dynamite} Dynamite</span>
                        </span>
                      )}

                      {/* Planks Reward */}
                      {contract.reward.woodPlanks && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-950/60 border border-amber-700/50 text-amber-300 font-mono text-xs shadow-sm">
                          <Layers className="w-3 h-3 text-amber-400" />
                          <span>+{contract.reward.woodPlanks} Planks</span>
                        </span>
                      )}

                      {/* Ammo Reward */}
                      {contract.reward.ammo && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-stone-900 border border-stone-600 text-stone-200 font-mono text-xs shadow-sm">
                          <Crosshair className="w-3 h-3 text-stone-400" />
                          <span>+{contract.reward.ammo} Ammo</span>
                        </span>
                      )}

                      {/* Rations Reward */}
                      {contract.reward.rations && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-950/60 border border-rose-700/50 text-rose-300 font-mono text-xs shadow-sm">
                          <Package className="w-3 h-3 text-rose-400" />
                          <span>+{contract.reward.rations} Rations</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    {isAvailable && (
                      <button
                        onClick={() => handleAccept(contract)}
                        className="w-full py-2.5 bg-amber-700 hover:bg-amber-600 text-stone-950 font-serif font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Accept Contract Warrant</span>
                      </button>
                    )}

                    {canTurnIn && (
                      <button
                        onClick={() => handleClaim(contract)}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-serif font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 animate-bounce-subtle"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Turn In Contract & Claim Bounty!</span>
                      </button>
                    )}

                    {isActive && !canTurnIn && (
                      <div className="flex flex-col gap-1.5">
                        <div className="w-full py-2 bg-stone-800/80 text-stone-400 font-mono text-xs rounded-xl border border-stone-700 text-center flex items-center justify-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>In Progress: {claimCheck.reason || 'Objectives pending'}</span>
                        </div>
                        {contract.type === 'bring_rations' && onSwitchToMercantile && (
                          <button
                            onClick={onSwitchToMercantile}
                            className="text-[11px] text-amber-400 hover:text-amber-300 underline text-center"
                          >
                            Purchase Trail Rations at Mercantile Provisions counter →
                          </button>
                        )}
                      </div>
                    )}

                    {isClaimed && (
                      <div className="w-full py-2 bg-stone-900/50 text-stone-500 font-mono text-xs rounded-xl border border-stone-800 text-center flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-stone-500" />
                        <span>Contract Settled & Paid</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
