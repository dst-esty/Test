import React from 'react';
import { ShieldAlert, AlertTriangle, Hammer, Flame, Skull, Compass } from 'lucide-react';
import { TerritoryClaim } from '../types';

interface WildcatterPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStakeFirst: () => void;
  onProceedWildcatter: () => void;
  conflictingClaim?: TerritoryClaim | null;
  targetStructureName?: string;
  coordinates: { x: number; z: number };
}

export const WildcatterPromptModal: React.FC<WildcatterPromptModalProps> = ({
  isOpen,
  onClose,
  onStakeFirst,
  onProceedWildcatter,
  conflictingClaim,
  targetStructureName = 'Timber Portal Mineshaft',
  coordinates,
}) => {
  if (!isOpen) return null;

  const isClaimJump = !!conflictingClaim;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-stone-900 border-2 border-amber-800 rounded-2xl shadow-2xl overflow-hidden text-stone-200">
        {/* Parchment-style Header Banner */}
        <div
          className={`px-6 py-5 border-b ${
            isClaimJump
              ? 'bg-gradient-to-r from-red-950 via-stone-900 to-red-950 border-red-800/70'
              : 'bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 border-amber-800/70'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl border ${
                isClaimJump
                  ? 'bg-red-900/40 border-red-500/50 text-red-400'
                  : 'bg-amber-900/40 border-amber-500/50 text-amber-400'
              }`}
            >
              {isClaimJump ? <Skull className="w-7 h-7 animate-pulse" /> : <AlertTriangle className="w-7 h-7" />}
            </div>
            <div>
              <div className="text-[10px] tracking-widest uppercase font-mono font-bold text-amber-400/90">
                1872 General Mining Law • Superstition District
              </div>
              <h2 className="text-xl font-bold tracking-wide text-amber-100">
                {isClaimJump ? 'Territory Infringement: Claim Jumper Risk!' : "Unclaimed Ground: Wildcatter's Risk"}
              </h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs sm:text-sm leading-relaxed">
          {isClaimJump ? (
            <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-red-300 font-semibold">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span>Stepping on Registered Territory!</span>
              </div>
              <p className="text-red-200/90 text-xs">
                This ground is already deeded to{' '}
                <strong className="text-amber-200 font-bold underline">
                  {conflictingClaim.ownerName || 'Another Prospector'}
                </strong>{' '}
                under claim title <em className="text-amber-300">"{conflictingClaim.name}"</em>.
              </p>
              <p className="text-stone-400 text-[11px]">
                Sinking a drift or extracting ore here constitutes active <strong>Claim Jumping</strong>. The owner will
                be dispatched an emergency telegraph alert, and you will be branded a lawless claim jumper across the
                range!
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-950/30 border border-amber-800/50 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <Compass className="w-4 h-4 text-amber-400 shrink-0" />
                <span>No Registered Boundary Deed</span>
              </div>
              <p className="text-stone-300 text-xs">
                You are preparing to sink a <strong>{targetStructureName}</strong> at coordinates{' '}
                <span className="font-mono text-amber-300">
                  [{Math.round(coordinates.x)}, {Math.round(coordinates.z)}]
                </span>{' '}
                without driving legal survey boundary stakes.
              </p>
              <p className="text-stone-400 text-[11px]">
                Operating an unregistered mine makes you a <strong>Wildcatter</strong>. Unregistered shafts lack legal
                protection from rival prospectors, pay higher assayer scrutiny, and invite claim jumpers to steal your
                vein.
              </p>
            </div>
          )}

          <div className="text-xs text-stone-300 italic border-l-2 border-amber-600/60 pl-3 py-1">
            "No man digs a drift in the Apache needle country without title, lest lead settle what the recorder's office
            didn't."
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-5 bg-stone-950/80 border-t border-stone-800/80 flex flex-col sm:flex-row gap-3 items-center justify-end">
          <button
            type="button"
            onClick={onStakeFirst}
            className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl shadow-lg transition transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <Hammer className="w-4 h-4" />
            <span>Stake Legal Claim First [9]</span>
          </button>

          <button
            type="button"
            onClick={onProceedWildcatter}
            className={`w-full sm:w-auto px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 border ${
              isClaimJump
                ? 'bg-red-950/80 hover:bg-red-900 border-red-700 text-red-200'
                : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-amber-300'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>{isClaimJump ? 'Jump Claim & Dig Anyway' : 'Proceed as Wildcatter'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
