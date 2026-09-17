import React from 'react';
import { X, BookOpen, Scroll, Award, CheckCircle2, Lock } from 'lucide-react';
import { ClueItem } from '../types';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  clues: ClueItem[];
  goldFound: number;
  onOpenGuidebook?: () => void;
}

export const JournalModal: React.FC<JournalModalProps> = ({
  isOpen,
  onClose,
  clues,
  goldFound,
  onOpenGuidebook,
}) => {
  if (!isOpen) return null;

  const discoveredCount = clues.filter((c) => c.discovered).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#f7f1e1] text-stone-900 rounded-xl shadow-2xl border-4 border-[#6b4724] p-6 overflow-hidden max-h-[90vh] flex flex-col font-serif">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#8c6239]/30 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#5c3e21] text-amber-200">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-wide text-[#3d2411]">
                  Jacob Waltz&apos;s Field Journal
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#ebdcc2] text-[#6b4724] font-bold border border-[#c5ad88]">
                  Records
                </span>
              </div>
              <p className="text-xs text-stone-600 italic">
                Deathbed Transcriptions & Peralta Stone Cipher Entries
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
                <span>Guidebook</span>
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

        {/* Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 bg-[#ede2c8] p-3 rounded-lg border border-[#cbb793] text-xs">
          <div>
            <span className="text-stone-500 uppercase font-mono text-[10px] block">Clues Deciphered</span>
            <span className="text-lg font-bold text-stone-800 font-mono">
              {discoveredCount} / {clues.length}
            </span>
          </div>
          <div>
            <span className="text-stone-500 uppercase font-mono text-[10px] block">Raw Gold Mined</span>
            <span className="text-lg font-bold text-amber-700 font-mono">
              {goldFound} oz
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 flex items-center">
            {discoveredCount === clues.length ? (
              <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> All Secrets Revealed!
              </span>
            ) : (
              <span className="text-stone-600 text-[11px] italic">
                Triangulate Weaver&apos;s Needle shadow to pinpoint the drift.
              </span>
            )}
          </div>
        </div>

        {/* Clue Entries List */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {clues.map((clue, idx) => {
            return (
              <div
                key={clue.id}
                className={`p-4 rounded-lg border transition-all ${
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
                    <blockquote className="border-l-2 border-amber-700 pl-3 italic text-stone-700 bg-amber-50/50 py-1 rounded-r">
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
      </div>
    </div>
  );
};
