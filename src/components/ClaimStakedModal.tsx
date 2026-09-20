import React, { useState, useEffect } from 'react';
import { Flag, Hammer, Compass, X, Edit3, Check, Sparkles } from 'lucide-react';
import { Vector3D } from '../types';

interface ClaimStakedModalProps {
  isOpen: boolean;
  claimId?: string;
  claimName: string;
  position: Vector3D;
  onClose: () => void;
  onOpenBuilder: () => void;
  onRenameClaim?: (newName: string) => void;
}

export const ClaimStakedModal: React.FC<ClaimStakedModalProps> = ({
  isOpen,
  claimName,
  position,
  onClose,
  onOpenBuilder,
  onRenameClaim,
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [currentName, setCurrentName] = useState(claimName);

  useEffect(() => {
    setCurrentName(claimName);
  }, [claimName]);

  if (!isOpen) return null;

  const handleSaveTitle = () => {
    const trimmed = currentName.trim().substring(0, 64);
    if (trimmed && trimmed !== claimName && onRenameClaim) {
      onRenameClaim(trimmed);
    }
    setEditingTitle(false);
  };

  const handleApplyPreset = (preset: string) => {
    setCurrentName(preset);
    if (onRenameClaim) {
      onRenameClaim(preset);
    }
    setEditingTitle(false);
  };

  const presets = [
    'Lucky Strike No. 1',
    'Golden Saguaro Lode',
    'Apache Pass Bonanza',
    'Peralta Mother Lode',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md select-none animate-fade-in">
      <div className="relative w-full max-w-md bg-stone-900/95 border-2 border-amber-600/80 rounded-2xl p-6 shadow-2xl text-stone-100 font-serif">
        <button
          onClick={() => {
            handleSaveTitle();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Flag className="w-7 h-7" />
          </div>
          <span className="text-[11px] uppercase tracking-widest text-amber-400 font-mono font-bold">
            Territorial Mining Act of 1872
          </span>
          <h2 className="text-2xl font-bold text-amber-200 mt-1">
            Mining Claim Staked!
          </h2>
        </div>

        {/* Claim Details Card */}
        <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-4 mb-4 text-xs font-mono space-y-2.5">
          <div>
            <div className="flex justify-between items-center text-stone-400 mb-1">
              <span>Deed Title:</span>
              {!editingTitle && onRenameClaim && (
                <button
                  onClick={() => setEditingTitle(true)}
                  className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-mono underline cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit Title
                </button>
              )}
            </div>

            {editingTitle ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={currentName}
                  onChange={(e) => setCurrentName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                  }}
                  maxLength={64}
                  className="flex-1 px-2.5 py-1.5 bg-stone-900 border border-amber-500/80 rounded-lg text-amber-200 font-serif text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            ) : (
              <div className="font-bold text-amber-300 text-base font-serif tracking-wide break-words">
                {currentName}
              </div>
            )}

            {/* Quick naming suggestions */}
            {editingTitle && (
              <div className="mt-2 pt-2 border-t border-stone-800/80">
                <span className="text-[10px] text-stone-400 flex items-center gap-1 mb-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleApplyPreset(p)}
                      className="px-2 py-0.5 text-[10px] bg-stone-800/90 hover:bg-stone-700 text-stone-300 rounded border border-stone-700 transition-colors cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-stone-300 pt-1 border-t border-stone-800/60">
            <span className="text-stone-400">Survey Perimeter:</span>
            <span className="text-stone-200">40 Acres (Survey Cord Active)</span>
          </div>

          <div className="flex justify-between items-center text-stone-300">
            <span className="text-stone-400">Survey Coordinates:</span>
            <span className="text-amber-400/90 flex items-center gap-1 font-mono">
              <Compass className="w-3.5 h-3.5" />
              X: {Math.round(position.x)}, Z: {Math.round(position.z)}
            </span>
          </div>
        </div>

        {/* Question text */}
        <p className="text-sm font-sans text-stone-300 text-center mb-5 leading-relaxed">
          You hold exclusive mineral and excavation rights for this territory.
          Would you like to open the <strong className="text-amber-300">Mine Builder</strong> to lay down your mine portal, timber shoring, and headframe?
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              handleSaveTitle();
              onClose();
              onOpenBuilder();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold font-mono text-xs rounded-xl shadow-lg border border-amber-300 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Hammer className="w-4 h-4 fill-stone-950" />
            <span>Open Mine Builder</span>
          </button>
          <button
            onClick={() => {
              handleSaveTitle();
              onClose();
            }}
            className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-mono text-xs rounded-xl border border-stone-700 transition cursor-pointer"
          >
            Explore First
          </button>
        </div>

        <p className="text-[11px] font-sans text-stone-400 text-center mt-4">
          💡 You can always open the Mine Builder later with <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-amber-300 font-mono text-[10px] border border-stone-700">[B]</kbd> now that you hold a valid claim.
        </p>
      </div>
    </div>
  );
};
