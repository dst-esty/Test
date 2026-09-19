import React, { useState, useEffect } from 'react';
import { Award, Scroll, MapPin, Pickaxe, X, Edit2, Check, Hammer, Building2 } from 'lucide-react';
import { BuiltStructure, ClaimInfo, PlayerState } from '../types';

interface ClaimDeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: ClaimInfo | null;
  playerState?: PlayerState;
  builtStructures?: BuiltStructure[];
  goldCount?: number;
  blocksDug?: number;
  onRenameClaim?: (newName: string) => void;
  onUpdateClaimName?: (newName: string) => void;
  onOpenBuilder?: () => void;
}

export const ClaimDeedModal: React.FC<ClaimDeedModalProps> = ({
  isOpen,
  onClose,
  claim,
  playerState,
  builtStructures = [],
  goldCount,
  blocksDug,
  onRenameClaim,
  onUpdateClaimName,
  onOpenBuilder,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [claimNameInput, setClaimNameInput] = useState(claim?.name || "Jacob Waltz's Discovery Lode");

  useEffect(() => {
    if (claim?.name) {
      setClaimNameInput(claim.name);
    }
  }, [claim?.name]);

  if (!isOpen) return null;

  const currentGold = typeof goldCount === 'number' && !isNaN(goldCount)
    ? goldCount
    : typeof playerState?.goldFound === 'number' && !isNaN(playerState.goldFound)
    ? playerState.goldFound
    : 0;

  const currentBlocksDug = typeof blocksDug === 'number' && !isNaN(blocksDug)
    ? blocksDug
    : typeof playerState?.blocksDug === 'number' && !isNaN(playerState.blocksDug)
    ? playerState.blocksDug
    : 0;

  const handleSave = () => {
    const trimmed = claimNameInput.trim();
    if (trimmed) {
      if (onRenameClaim) onRenameClaim(trimmed);
      else if (onUpdateClaimName) onUpdateClaimName(trimmed);
    }
    setIsEditing(false);
  };

  if (!claim) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md select-none">
        <div className="relative w-full max-w-lg bg-[#f4ebd0] text-[#332211] rounded-2xl p-8 shadow-2xl border-4 border-[#8b6540] overflow-hidden font-serif text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#e2d0a8] text-[#553a20] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="p-3 bg-[#e8d7b3] border-2 border-[#946e45] rounded-full w-14 h-14 mx-auto flex items-center justify-center mb-4">
            <Scroll className="w-7 h-7 text-[#663b15]" />
          </div>
          <h3 className="text-2xl font-bold text-[#3e250f] mb-2">No Mineral Claim Registered</h3>
          <p className="text-sm text-stone-700 mb-6 font-sans leading-relaxed">
            You have not yet staked an official 40-acre lode boundary in the Superstition Mountains. Equip your Survey Claim Stake [9] or open the Construction Depot [B] to drive the corner posts and survey cord!
          </p>
          <div className="flex justify-center gap-3">
            {onOpenBuilder && (
              <button
                onClick={onOpenBuilder}
                className="px-5 py-2.5 bg-[#8b6540] hover:bg-[#6e4e30] text-amber-100 font-bold text-xs uppercase tracking-wider rounded-lg shadow font-sans flex items-center gap-2"
              >
                <Hammer className="w-4 h-4" /> Open Construction Depot
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-[#d8c29d] hover:bg-[#caa880] text-stone-900 font-bold text-xs rounded-lg font-sans"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-2xl bg-[#f4ebd0] text-[#332211] rounded-2xl p-8 shadow-2xl border-4 border-[#8b6540] overflow-hidden font-serif">
        {/* Ornate Vintage Border Inset */}
        <div className="absolute inset-2 border-2 border-[#b8976b] pointer-events-none rounded-xl" />
        <div className="absolute inset-3 border border-[#d2b896] pointer-events-none rounded-lg" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#e2d0a8] text-[#553a20] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-[#e8d7b3] border-2 border-[#946e45] rounded-full shadow-inner">
              <Scroll className="w-8 h-8 text-[#663b15]" />
            </div>
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-[#7a532d] font-sans font-bold">
            Territory of Arizona • Superstition Mining District
          </span>
          <h2 className="text-3xl font-bold text-[#3e250f] mt-1 tracking-tight">
            Official Mineral Patent & Claim Deed
          </h2>
          <div className="w-48 h-0.5 bg-[#8b6540] mx-auto mt-2" />
        </div>

        {/* Claim Name Banner */}
        <div className="bg-[#ede1c2] border border-[#bfa37b] rounded-lg p-4 mb-6 shadow-inner text-center">
          <span className="text-xs uppercase text-[#735332] font-sans font-semibold">Registered Claim Title</span>
          {isEditing ? (
            <div className="flex items-center justify-center gap-2 mt-1">
              <input
                type="text"
                value={claimNameInput}
                onChange={(e) => setClaimNameInput(e.target.value)}
                className="px-3 py-1 bg-[#fbf5e6] border-2 border-[#8b6540] rounded text-lg font-bold text-[#3e250f] focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleSave}
                className="p-1.5 bg-[#8b6540] hover:bg-[#6e4e30] text-amber-100 rounded"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mt-1">
              <h3 className="text-2xl font-bold text-[#361e0b] italic">"{claim.name}"</h3>
              <button
                onClick={() => {
                  setClaimNameInput(claim.name);
                  setIsEditing(true);
                }}
                className="text-[#8b6540] hover:text-[#523519] p-1"
                title="Rename Claim"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Legal Particulars */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="p-3 bg-[#ede1c2]/70 rounded border border-[#caa880]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6d4b29] uppercase font-sans mb-1">
              <MapPin className="w-3.5 h-3.5" />
              Geographic Coordinates
            </div>
            <p className="font-semibold text-[#3b2310]">
              {claim.position.x.toFixed(1)}° E, {claim.position.z.toFixed(1)}° S
            </p>
            <span className="text-[11px] text-[#6d4b29]/80">Elev. {claim.position.y.toFixed(1)}m AGL</span>
          </div>

          <div className="p-3 bg-[#ede1c2]/70 rounded border border-[#caa880]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6d4b29] uppercase font-sans mb-1">
              <Award className="w-3.5 h-3.5" />
              Survey Dimension
            </div>
            <p className="font-semibold text-[#3b2310]">{claim.size} Yards × {claim.size} Yards</p>
            <span className="text-[11px] text-[#6d4b29]/80">4 Corner Boundary Survey Posts</span>
          </div>

          <div className="p-3 bg-[#ede1c2]/70 rounded border border-[#caa880]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6d4b29] uppercase font-sans mb-1">
              <Pickaxe className="w-3.5 h-3.5" />
              Total Extraction
            </div>
            <p className="font-semibold text-[#3b2310]">{currentGold.toFixed(1)} Troy Ounces</p>
            <span className="text-[11px] text-[#6d4b29]/80">{currentBlocksDug} rock blocks excavated</span>
          </div>

          <div className="p-3 bg-[#ede1c2]/70 rounded border border-[#caa880]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6d4b29] uppercase font-sans mb-1">
              <Scroll className="w-3.5 h-3.5" />
              Mineral Rights
            </div>
            <p className="font-semibold text-[#3b2310]">Lode & Placer Exclusive</p>
            <span className="text-[11px] text-[#6d4b29]/80">Protected under 1872 Mining Law</span>
          </div>
        </div>

        {/* Built Structures Section */}
        <div className="mb-6 p-3 bg-[#ede1c2]/60 rounded-lg border border-[#caa880]/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-sans font-bold text-[#6d4b29] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Registered Surface & Shaft Structures ({builtStructures.length})
            </span>
            {onOpenBuilder && (
              <button
                onClick={onOpenBuilder}
                className="text-[11px] font-sans font-bold text-[#8b6540] hover:text-[#523519] underline"
              >
                + Build More [B]
              </button>
            )}
          </div>
          {builtStructures.length === 0 ? (
            <p className="text-xs text-stone-600 italic">
              No surface machinery or timber adits constructed on this patent yet. Open the Construction Depot to build sluices, headframes, or forge offices.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {builtStructures.map((s) => (
                <div
                  key={s.id}
                  className="p-2 bg-[#fbf5e6] rounded border border-[#d2b896] text-xs"
                >
                  <p className="font-bold text-[#3e250f] truncate">{s.name}</p>
                  <span className="text-[10px] text-stone-600 font-mono">
                    X: {Math.round(s.position.x)}, Z: {Math.round(s.position.z)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legal disclaimer text */}
        <p className="text-[11px] text-[#634931] italic text-center mb-6 leading-relaxed">
          "Be it known to all prospectors and territorial authorities that the undersigned claimant hath located,
          marked with corner survey posts and yellow boundary cord, and claimed this lode of gold-bearing quartz and
          all minerals appertaining thereto."
        </p>

        {/* Seal and signature footer */}
        <div className="flex items-center justify-between pt-4 border-t-2 border-[#b5956c] font-sans">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border-4 border-[#946e45] bg-[#dcc499] flex items-center justify-center text-[10px] font-black text-[#573b1e] text-center p-1 uppercase shadow-inner rotate-[-6deg]">
              Official District Seal
            </div>
            <div>
              <div className="text-xs font-bold text-[#442b14]">Arizona Mining Bureau</div>
              <div className="text-[10px] text-[#735332]">Gold Patent #AZ-1889-DUTCH</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenBuilder && (
              <button
                onClick={onOpenBuilder}
                className="px-4 py-2 bg-[#dcc499] hover:bg-[#caa880] text-[#3e250f] font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Hammer className="w-3.5 h-3.5" /> Construction Depot
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#8b6540] hover:bg-[#6c4d2e] text-[#f7eedc] font-bold text-sm rounded-lg shadow-md transition-colors"
            >
              Acknowledge Deed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
