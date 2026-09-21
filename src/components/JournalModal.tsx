import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Scroll,
  Award,
  CheckCircle2,
  Lock,
  Skull,
  AlertTriangle,
  FileText,
  Compass,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Volume2,
} from 'lucide-react';
import { ClueItem } from '../types';
import {
  evaluateCurseProgress,
  CURSE_CLUE_IDS,
  isScatteredSkullClue,
} from '../services/curseNarrativeEngine';
import { soundEngine } from '../audio/soundEffects';

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
  const [activeTab, setActiveTab] = useState<'all' | 'gold' | 'curse'>('all');
  const [showForensicDetails, setShowForensicDetails] = useState<boolean>(false);

  if (!isOpen) return null;

  const discoveredCount = clues.filter((c) => c.discovered).length;
  const curseDossier = evaluateCurseProgress(clues);

  // Filter clues based on tab
  const displayedClues = clues.filter((clue) => {
    const isCurse = CURSE_CLUE_IDS.includes(clue.id as any);
    if (activeTab === 'curse') return isCurse;
    if (activeTab === 'gold') return !isCurse;
    return true;
  });

  const discoveredCurseCount = clues.filter(
    (c) => c.discovered && CURSE_CLUE_IDS.includes(c.id as any)
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#f7f1e1] text-stone-900 rounded-xl shadow-2xl border-4 border-[#6b4724] p-5 sm:p-6 overflow-hidden max-h-[92vh] flex flex-col font-serif">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#8c6239]/30 pb-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#5c3e21] text-amber-200 shadow">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-wide text-[#3d2411]">
                  Jacob Waltz&apos;s Field Journal
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#ebdcc2] text-[#6b4724] font-bold border border-[#c5ad88]">
                  Territorial Records
                </span>
              </div>
              <p className="text-xs text-stone-600 italic">
                Deathbed Transcriptions, Peralta Stone Ciphers & The Curse of the Ruth Family
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3 bg-[#ede2c8] p-2.5 rounded-lg border border-[#cbb793] text-xs">
          <div>
            <span className="text-stone-500 uppercase font-mono text-[10px] block">Clues Deciphered</span>
            <span className="text-base sm:text-lg font-bold text-stone-800 font-mono">
              {discoveredCount} / {clues.length}
            </span>
          </div>
          <div>
            <span className="text-stone-500 uppercase font-mono text-[10px] block">Raw Gold Mined</span>
            <span className="text-base sm:text-lg font-bold text-amber-700 font-mono">
              {goldFound} oz
            </span>
          </div>
          <div>
            <span className="text-stone-500 uppercase font-mono text-[10px] block">Curse Progression</span>
            <span className="text-base sm:text-lg font-bold text-red-800 font-mono flex items-center gap-1">
              <Skull className="w-4 h-4 text-red-700 inline" />
              Stage {curseDossier.stage} / 3
            </span>
          </div>
          <div className="flex items-center">
            {discoveredCount === clues.length ? (
              <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> All Secrets Revealed!
              </span>
            ) : (
              <span className="text-stone-600 text-[11px] italic leading-tight">
                Triangulate Weaver&apos;s Needle shadow to locate Waltz&apos;s pit.
              </span>
            )}
          </div>
        </div>

        {/* DYNAMIC CURSE OF THE LOST DUTCHMAN LORE BANNER */}
        <div className="mb-3 rounded-lg border border-red-800/40 bg-gradient-to-r from-[#2c1210] via-[#3d1815] to-[#240e0d] text-amber-100 p-3 shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-md bg-red-950/80 border border-red-700/60 text-red-400 mt-0.5">
                <Skull className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-red-200 tracking-wide font-sans uppercase">
                    The Curse of the Lost Dutchman: {curseDossier.stageName}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-900/60 text-red-200 border border-red-700/50">
                    {curseDossier.discoveredCount} of {CURSE_CLUE_IDS.length} Tragic Relics Found
                  </span>
                </div>
                <p className="text-xs text-stone-300 italic mt-0.5 font-serif">
                  {curseDossier.stageSubtitle}
                </p>
                <p className="text-xs text-amber-200/90 mt-1 leading-relaxed font-sans">
                  {curseDossier.narrativeSummary}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowForensicDetails(!showForensicDetails)}
              className="px-2.5 py-1 text-xs bg-red-900/40 hover:bg-red-800/60 border border-red-700/60 text-red-200 rounded flex items-center gap-1 font-sans shrink-0 cursor-pointer transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {showForensicDetails ? 'Hide' : 'View'} Case Files
              </span>
              {showForensicDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Expandable Forensic Ledger (Ruth Family, Severed Skulls, Cravey) */}
          {showForensicDetails && (
            <div className="mt-3 pt-3 border-t border-red-800/50 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans text-stone-200 animate-in fade-in duration-200">
              <div className="bg-black/40 p-2.5 rounded border border-red-900/50 space-y-1.5">
                <div className="flex items-center gap-1.5 text-red-300 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>The Ruth Family Tragedy (1931)</span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  {curseDossier.forensicReport.ruthFamilyLegacy}
                </p>
                <div className="pt-1 border-t border-red-900/40 text-[11px] text-amber-200/90 font-mono">
                  Status: {curseDossier.forensicReport.ruthStatus}
                </div>
              </div>

              <div className="bg-black/40 p-2.5 rounded border border-red-900/50 space-y-1.5">
                <div className="flex items-center gap-1.5 text-red-300 font-bold">
                  <Skull className="w-3.5 h-3.5" />
                  <span>The Scattered Skulls & Ballistics (Autopsy)</span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  {curseDossier.forensicReport.ballisticsNote}
                </p>
                <p className="text-[11px] text-stone-300 leading-relaxed pt-1 border-t border-red-900/40">
                  {curseDossier.forensicReport.skullDispersalNote}
                </p>
                {curseDossier.hasCraveySite && (
                  <p className="text-[11px] text-amber-200/90 pt-1 font-mono">
                    {curseDossier.forensicReport.craveyNote}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* View Selection Tabs */}
        <div className="flex items-center gap-2 mb-3 border-b border-[#cbb793] pb-2 text-xs font-sans">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-[#5c3e21] text-amber-100 shadow'
                : 'bg-[#ebdcc2] text-stone-700 hover:bg-[#dfceb0]'
            }`}
          >
            <span>All Journal Entries</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/20">
              {clues.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('gold')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'gold'
                ? 'bg-[#5c3e21] text-amber-100 shadow'
                : 'bg-[#ebdcc2] text-stone-700 hover:bg-[#dfceb0]'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-amber-700" />
            <span>Waltz&apos;s Gold Trail</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/20">
              {clues.length - CURSE_CLUE_IDS.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('curse')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'curse'
                ? 'bg-red-900 text-red-100 shadow'
                : 'bg-[#ebdcc2] text-red-900 hover:bg-[#dfceb0]'
            }`}
          >
            <Skull className="w-3.5 h-3.5 text-red-700" />
            <span>Curse & Decapitations</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-950 text-red-200 font-bold">
              {discoveredCurseCount} / {CURSE_CLUE_IDS.length}
            </span>
          </button>
        </div>

        {/* Clue Entries List */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {displayedClues.map((clue, idx) => {
            const isCurse = CURSE_CLUE_IDS.includes(clue.id as any);
            return (
              <div
                key={clue.id}
                className={`p-3.5 rounded-lg border transition-all ${
                  clue.discovered
                    ? isCurse
                      ? 'bg-[#fff5f2] border-red-300 shadow-sm'
                      : 'bg-[#fffcf4] border-[#c0a07c] shadow-sm'
                    : 'bg-[#ede3ce]/50 border-stone-300 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                        isCurse
                          ? 'bg-red-800 text-red-100'
                          : 'bg-[#5c3e21] text-amber-100'
                      }`}
                    >
                      {isCurse ? '💀' : idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-[#3d2411]">
                          {clue.title}
                        </h3>
                        {isCurse && (
                          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-900 border border-red-300 font-bold">
                            Curse of the Lost Dutchman
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {clue.discovered ? (
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded flex items-center gap-1 shrink-0 ${
                        isCurse
                          ? 'text-red-800 bg-red-100 border border-red-200'
                          : 'text-emerald-700 bg-emerald-100'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Discovered
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-stone-500 flex items-center gap-1 shrink-0">
                      <Lock className="w-3.5 h-3.5" /> Undiscovered
                    </span>
                  )}
                </div>

                {clue.discovered ? (
                  <div className="mt-2 text-stone-800 text-sm space-y-2">
                    <blockquote
                      className={`border-l-3 pl-3 italic text-stone-700 py-1 rounded-r ${
                        isCurse
                          ? 'border-red-700 bg-red-50/70 text-stone-900'
                          : 'border-amber-700 bg-amber-50/50'
                      }`}
                    >
                      {clue.lore}
                    </blockquote>
                    <p className="text-xs text-stone-600 flex items-center gap-1">
                      <strong className="text-stone-800">Trail Guidance:</strong>{' '}
                      {clue.hint}
                    </p>
                    {clue.foundAt && (
                      <div className="text-[11px] font-mono text-stone-500">
                        Recorded at: {clue.foundAt}
                      </div>
                    )}
                    {isScatteredSkullClue(clue.id) && (
                      <div className="pt-1">
                        <button
                          onClick={() => soundEngine.playSkullWhisperDiscovery()}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 rounded font-sans cursor-pointer transition shadow-sm"
                          title="Play haunting canyon whispers for this skull discovery"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                          Hear Canyon Whispers
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs italic text-stone-500">
                    {isCurse
                      ? 'Investigate the secluded canyons and tragic historical campsites to uncover this curse relic.'
                      : 'Explore the Superstition canyons and ancient landmarks to uncover this entry.'}
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
