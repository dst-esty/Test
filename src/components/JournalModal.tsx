import React, { useState, useEffect } from 'react';
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
  MapPin,
  ShieldAlert,
  RotateCcw,
  Trash2,
  Mountain,
  Sun,
  Crosshair,
  Droplets,
  Flame,
  History,
} from 'lucide-react';
import { ClueItem, CoronersLogEntry } from '../types';
import {
  evaluateCurseProgress,
  CURSE_CLUE_IDS,
  isScatteredSkullClue,
} from '../services/curseNarrativeEngine';
import { soundEngine } from '../audio/soundEffects';
import { getCoronersLog, clearPlayerCoronersLog } from '../services/coronersLogService';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  clues: ClueItem[];
  goldFound: number;
  onOpenGuidebook?: () => void;
  onOpenMap?: () => void;
  initialTab?: 'all' | 'gold' | 'curse' | 'coroner';
}

export const JournalModal: React.FC<JournalModalProps> = ({
  isOpen,
  onClose,
  clues,
  goldFound,
  onOpenGuidebook,
  onOpenMap,
  initialTab = 'all',
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'gold' | 'curse' | 'coroner'>(initialTab);
  const [showForensicDetails, setShowForensicDetails] = useState<boolean>(false);
  const [coronersEntries, setCoronersEntries] = useState<CoronersLogEntry[]>([]);
  const [coronerFilter, setCoronerFilter] = useState<'all' | 'player' | 'archive' | 'fall' | 'cave_in' | 'dehydration' | 'bandit'>('all');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Synchronize initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      setCoronersEntries(getCoronersLog());
    }
  }, [isOpen, initialTab]);

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

  const playerDeathsCount = coronersEntries.filter((e) => !e.isHistoricalArchive).length;
  const totalGoldLost = coronersEntries
    .filter((e) => !e.isHistoricalArchive)
    .reduce((sum, e) => sum + (e.goldLost || 0), 0);

  // Filtered coroner entries
  const displayedCoronerEntries = coronersEntries.filter((entry) => {
    if (coronerFilter === 'player') return !entry.isHistoricalArchive;
    if (coronerFilter === 'archive') return entry.isHistoricalArchive;
    if (coronerFilter === 'fall') return entry.reason === 'fall';
    if (coronerFilter === 'cave_in') return entry.reason === 'cave_in';
    if (coronerFilter === 'dehydration') return entry.reason === 'dehydration';
    if (coronerFilter === 'bandit') return entry.reason === 'bandit' || entry.reason === 'apache_raid';
    return true;
  });

  const formatSurvivedTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  const getReasonBadge = (reason: CoronersLogEntry['reason']) => {
    switch (reason) {
      case 'fall':
        return {
          label: 'Precipice Fall',
          icon: <Mountain className="w-3.5 h-3.5 text-indigo-700" />,
          classes: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        };
      case 'cave_in':
        return {
          label: 'Trench Collapse',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-800" />,
          classes: 'bg-amber-100 text-amber-950 border-amber-300',
        };
      case 'dehydration':
        return {
          label: 'Sunstroke / Heat',
          icon: <Sun className="w-3.5 h-3.5 text-orange-700" />,
          classes: 'bg-orange-100 text-orange-950 border-orange-300',
        };
      case 'bandit':
        return {
          label: 'Claim Jumpers',
          icon: <Crosshair className="w-3.5 h-3.5 text-red-700" />,
          classes: 'bg-red-100 text-red-950 border-red-300',
        };
      case 'apache_raid':
        return {
          label: 'Native Guardians',
          icon: <Flame className="w-3.5 h-3.5 text-rose-700" />,
          classes: 'bg-rose-100 text-rose-950 border-rose-300',
        };
      case 'drowning':
        return {
          label: 'Flooded Stope',
          icon: <Droplets className="w-3.5 h-3.5 text-blue-700" />,
          classes: 'bg-blue-100 text-blue-950 border-blue-300',
        };
      case 'venom':
        return {
          label: 'Desert Envenomation',
          icon: <Skull className="w-3.5 h-3.5 text-emerald-800" />,
          classes: 'bg-emerald-100 text-emerald-950 border-emerald-300',
        };
      case 'dynamite':
        return {
          label: 'Blasting Powder',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />,
          classes: 'bg-yellow-100 text-yellow-950 border-yellow-300',
        };
      default:
        return {
          label: 'Fatal Demise',
          icon: <Skull className="w-3.5 h-3.5 text-stone-700" />,
          classes: 'bg-stone-100 text-stone-900 border-stone-300',
        };
    }
  };

  const handleClearPlayerRecords = () => {
    clearPlayerCoronersLog();
    setCoronersEntries(getCoronersLog());
    setShowClearConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#f7f1e1] text-stone-900 rounded-xl shadow-2xl border-4 border-[#6b4724] p-5 sm:p-6 overflow-hidden max-h-[92vh] flex flex-col font-serif">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#8c6239]/30 pb-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#5c3e21] text-amber-200 shadow">
              {activeTab === 'coroner' ? (
                <Skull className="w-7 h-7 text-red-300" />
              ) : (
                <BookOpen className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-wide text-[#3d2411]">
                  {activeTab === 'coroner'
                    ? "Territorial Coroner's Inquest Log"
                    : "Jacob Waltz's Field Journal"}
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#ebdcc2] text-[#6b4724] font-bold border border-[#c5ad88]">
                  {activeTab === 'coroner' ? 'Pinal County Inquests' : 'Territorial Records'}
                </span>
              </div>
              <p className="text-xs text-stone-600 italic">
                {activeTab === 'coroner'
                  ? 'Forensic Inquests, Cause & Coordinates of Demise, and Frontier Survival Mandates'
                  : 'Deathbed Transcriptions, Peralta Stone Ciphers & The Curse of the Ruth Family'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenMap && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMap();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ebdcc2] hover:bg-[#ded0b3] text-[#4a2e14] text-xs font-sans font-bold transition cursor-pointer border border-[#cbb793]"
                title="Open Peralta Stone Map"
              >
                <Compass className="w-3.5 h-3.5 text-amber-800" />
                <span>Stone Map</span>
              </button>
            )}
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
          <div>
            <button
              onClick={() => setActiveTab('coroner')}
              className={`w-full text-left p-1 -m-1 rounded transition cursor-pointer ${
                activeTab === 'coroner' ? 'bg-[#dfceb0]' : 'hover:bg-[#dfceb0]/60'
              }`}
              title="Inspect Coroner's Inquest Dossiers"
            >
              <span className="text-stone-500 uppercase font-mono text-[10px] block flex items-center gap-1">
                Coroner's Dossiers
              </span>
              <span className="text-xs sm:text-sm font-bold text-rose-900 font-mono flex items-center gap-1">
                <Skull className="w-3.5 h-3.5 text-rose-700 inline" />
                {coronersEntries.length} Case Files Filed
              </span>
            </button>
          </div>
        </div>

        {/* DYNAMIC CURSE OF THE LOST DUTCHMAN LORE BANNER (Shown on Journal & Curse tabs) */}
        {activeTab !== 'coroner' && (
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
        )}

        {/* View Selection Tabs */}
        <div className="flex items-center gap-2 mb-3 border-b border-[#cbb793] pb-2 text-xs font-sans flex-wrap">
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

          {/* New Tab: Expedition Coroner's Log */}
          <button
            onClick={() => setActiveTab('coroner')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'coroner'
                ? 'bg-[#4a1c17] text-amber-100 shadow ring-2 ring-red-700/50'
                : 'bg-[#ebdcc2] text-rose-950 hover:bg-[#dfceb0]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Expedition Coroner&apos;s Log</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                playerDeathsCount > 0 ? 'bg-red-800 text-red-100 animate-pulse' : 'bg-black/20 text-stone-800'
              }`}
            >
              {coronersEntries.length}
            </span>
          </button>
        </div>

        {/* TAB 1, 2, 3: Clue Entries List */}
        {activeTab !== 'coroner' && (
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
        )}

        {/* TAB 4: EXPEDITION CORONER'S INQUEST LOG */}
        {activeTab === 'coroner' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Coroner's Inquest Overview Banner */}
            <div className="mb-3 p-3 bg-gradient-to-r from-[#2c1310] via-[#3a1815] to-[#250d0b] text-amber-100 rounded-lg border border-red-800/60 shadow">
              <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded bg-black/40 border border-red-800/80 text-red-300 mt-0.5">
                    <Skull className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm tracking-wide text-red-200 uppercase font-sans">
                        Pinal County Territorial Morgue & Inquest Ledger
                      </h3>
                      <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                        OFFICIAL DOSSIERS
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/90 font-serif italic mt-0.5">
                      Documenting fatal casualties in the Superstition Mountains to guide future prospectors away from the same catastrophic missteps.
                    </p>
                  </div>
                </div>

                {playerDeathsCount > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowClearConfirm(!showClearConfirm)}
                      className="px-2.5 py-1 text-xs bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-200 rounded flex items-center gap-1 font-sans cursor-pointer transition"
                      title="Clear player fallen expedition records"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Expunge Records</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Clear Confirmation Prompt */}
              {showClearConfirm && (
                <div className="mt-2.5 pt-2.5 border-t border-red-800/50 flex items-center justify-between gap-2 text-xs font-sans bg-black/30 p-2 rounded">
                  <span className="text-stone-300">
                    Expunge your {playerDeathsCount} fallen prospector logs? (Historical archive cases remain).
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleClearPlayerRecords}
                      className="px-2 py-0.5 bg-red-700 hover:bg-red-600 text-white font-bold rounded cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2 py-0.5 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Metrics Bar */}
              <div className="mt-2.5 pt-2 border-t border-red-900/50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-black/30 px-2 py-1 rounded border border-red-900/40">
                  <span className="text-[10px] text-stone-400 block uppercase">Inquests Filed</span>
                  <span className="font-bold text-amber-200">{coronersEntries.length} Records</span>
                </div>
                <div className="bg-black/30 px-2 py-1 rounded border border-red-900/40">
                  <span className="text-[10px] text-stone-400 block uppercase">Your Fatalities</span>
                  <span className="font-bold text-rose-300">{playerDeathsCount} Expeditions</span>
                </div>
                <div className="bg-black/30 px-2 py-1 rounded border border-red-900/40">
                  <span className="text-[10px] text-stone-400 block uppercase">Gold Lost in Field</span>
                  <span className="font-bold text-amber-400">{totalGoldLost} oz Raw Gold</span>
                </div>
                <div className="bg-black/30 px-2 py-1 rounded border border-red-900/40">
                  <span className="text-[10px] text-stone-400 block uppercase">Historic Precedents</span>
                  <span className="font-bold text-stone-300">{coronersEntries.filter((e) => e.isHistoricalArchive).length} Documented</span>
                </div>
              </div>
            </div>

            {/* Inquest Filter Chips */}
            <div className="flex items-center gap-1.5 mb-2.5 pb-1 overflow-x-auto text-[11px] font-sans no-scrollbar">
              <button
                onClick={() => setCoronerFilter('all')}
                className={`px-2.5 py-1 rounded-full font-semibold transition cursor-pointer whitespace-nowrap ${
                  coronerFilter === 'all'
                    ? 'bg-[#5c3e21] text-amber-100 shadow'
                    : 'bg-[#ebdcc2] text-stone-700 hover:bg-[#dfceb0]'
                }`}
              >
                All Inquests ({coronersEntries.length})
              </button>
              <button
                onClick={() => setCoronerFilter('player')}
                className={`px-2.5 py-1 rounded-full font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  coronerFilter === 'player'
                    ? 'bg-rose-900 text-rose-100 shadow'
                    : 'bg-[#ebdcc2] text-rose-950 hover:bg-[#dfceb0]'
                }`}
              >
                <Skull className="w-3 h-3 text-rose-700" />
                <span>Your Fallen Expeditions ({playerDeathsCount})</span>
              </button>
              <button
                onClick={() => setCoronerFilter('archive')}
                className={`px-2.5 py-1 rounded-full font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  coronerFilter === 'archive'
                    ? 'bg-[#5c3e21] text-amber-100 shadow'
                    : 'bg-[#ebdcc2] text-stone-700 hover:bg-[#dfceb0]'
                }`}
              >
                <History className="w-3 h-3 text-stone-600" />
                <span>Territorial Archive</span>
              </button>
              <button
                onClick={() => setCoronerFilter('fall')}
                className={`px-2.5 py-1 rounded-full font-semibold transition cursor-pointer whitespace-nowrap ${
                  coronerFilter === 'fall'
                    ? 'bg-indigo-900 text-indigo-100 shadow'
                    : 'bg-[#ebdcc2] text-stone-700 hover:bg-[#dfceb0]'
                }`}
              >
                Ledge Falls
              </button>
              <button
                onClick={() => setCoronerFilter('cave_in')}
                className={`px-2.5 py-1 rounded-full font-semibold transition cursor-pointer whitespace-nowrap ${
                  coronerFilter === 'cave_in'
                    ? 'bg-amber-900 text-amber-100 shadow'
                    : 'bg-[#ebdcc2] text-stone-700 hover:bg-[#dfceb0]'
                }`}
              >
                Trench Collapses
              </button>
              <button
                onClick={() => setCoronerFilter('dehydration')}
                className={`px-2.5 py-1 rounded-full font-semibold transition cursor-pointer whitespace-nowrap ${
                  coronerFilter === 'dehydration'
                    ? 'bg-orange-900 text-orange-100 shadow'
                    : 'bg-[#ebdcc2] text-stone-700 hover:bg-[#dfceb0]'
                }`}
              >
                Dehydration / Heat
              </button>
              <button
                onClick={() => setCoronerFilter('bandit')}
                className={`px-2.5 py-1 rounded-full font-semibold transition cursor-pointer whitespace-nowrap ${
                  coronerFilter === 'bandit'
                    ? 'bg-red-900 text-red-100 shadow'
                    : 'bg-[#ebdcc2] text-stone-700 hover:bg-[#dfceb0]'
                }`}
              >
                Hostiles & Ambush
              </button>
            </div>

            {/* List of Coroner Dossiers */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-3.5">
              {displayedCoronerEntries.length === 0 ? (
                <div className="p-8 text-center bg-[#ede3ce]/40 rounded-xl border border-stone-300">
                  <ShieldAlert className="w-10 h-10 text-stone-400 mx-auto mb-2 opacity-60" />
                  <h4 className="text-base font-bold text-stone-700 mb-1">
                    No Recorded Demises in This Category
                  </h4>
                  <p className="text-xs text-stone-500 max-w-md mx-auto italic">
                    Your prospectors have successfully steered clear of this hazard. Maintain vigilance, keep your canteen full, and brace deep excavations with timber cribbing!
                  </p>
                </div>
              ) : (
                displayedCoronerEntries.map((entry) => {
                  const badge = getReasonBadge(entry.reason);
                  const isExpanded = expandedEntryId === entry.id;

                  return (
                    <div
                      key={entry.id}
                      className={`rounded-xl border shadow-sm transition-all overflow-hidden ${
                        entry.isHistoricalArchive
                          ? 'bg-[#fffdf7] border-[#c5ad88]'
                          : 'bg-[#fff5f2] border-red-300 ring-1 ring-red-400/20'
                      }`}
                    >
                      {/* Inquest Card Header */}
                      <div className="p-3.5 sm:p-4 bg-gradient-to-b from-stone-50/60 to-transparent border-b border-stone-200/80">
                        <div className="flex items-start justify-between gap-2.5 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${badge.classes}`}
                              >
                                {badge.icon}
                                <span>{badge.label}</span>
                              </span>

                              <span
                                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded font-bold ${
                                  entry.isHistoricalArchive
                                    ? 'bg-stone-200/80 text-stone-700 border border-stone-300'
                                    : 'bg-red-800 text-red-100 border border-red-700 animate-pulse'
                                }`}
                              >
                                {entry.isHistoricalArchive
                                  ? 'Historical Territorial Archive'
                                  : `Active Expedition #${entry.expeditionNumber}`}
                              </span>

                              <span className="text-[11px] font-mono text-stone-500">
                                {entry.formattedDate}
                              </span>
                            </div>

                            <h3 className="text-base sm:text-lg font-bold text-[#351e0e] tracking-tight">
                              {entry.title}
                            </h3>
                            <p className="text-xs text-stone-600 italic">
                              Subject: <strong className="text-stone-800">{entry.prospectorName}</strong> — {entry.subtitle}
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              setExpandedEntryId(isExpanded ? null : entry.id)
                            }
                            className="px-2.5 py-1 text-xs bg-[#ebdcc2] hover:bg-[#ded0b3] text-[#4a2e14] border border-[#cbb793] rounded-lg flex items-center gap-1 font-sans cursor-pointer transition shrink-0 self-start"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-800" />
                            <span>{isExpanded ? 'Collapse' : 'Full Inquest'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Location Reference Banner */}
                        <div className="mt-2.5 p-2 bg-[#f0e7d5] rounded-lg border border-[#d6c4a5] text-xs font-sans flex items-start gap-2 text-stone-800">
                          <MapPin className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-bold text-stone-900">
                                {entry.locationName}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/10 text-stone-700">
                                {entry.sectorQuad}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-stone-600 mt-0.5 flex items-center gap-3 flex-wrap">
                              <span>
                                Coordinates: X: <strong>{entry.coordinates.x}</strong>, Y:{' '}
                                <strong>{entry.coordinates.y}</strong>, Z:{' '}
                                <strong>{entry.coordinates.z}</strong>
                              </span>
                              <span>
                                Elevation: <strong>{entry.elevationFt} ft</strong>
                              </span>
                              {entry.depthMeters !== undefined && (
                                <span className="text-amber-800 font-bold">
                                  Depth: {entry.depthMeters.toFixed(1)}m ({entry.strata || 'Bedrock'})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Inquest Cause & Prevention Mandate */}
                      <div className="p-3.5 sm:p-4 space-y-3 text-xs">
                        {/* Official Coroner Finding */}
                        <div>
                          <span className="text-[10px] font-mono uppercase text-stone-500 tracking-wider font-bold block mb-1">
                            Coroner Autopsy & Inquest Narrative
                          </span>
                          <p className="text-stone-800 leading-relaxed font-serif text-[13px] bg-white/70 p-2.5 rounded-lg border border-stone-200">
                            {entry.cause}
                          </p>
                        </div>

                        {/* CORONER'S PREVENTION MANDATE (Crucial for user request: helping prospectors avoid repeating fatal errors) */}
                        <div className="p-3 rounded-lg bg-gradient-to-r from-amber-50 to-[#fff8ea] border-2 border-amber-600/60 shadow-xs">
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-md bg-amber-600 text-white shrink-0 mt-0.5 shadow-xs">
                              <ShieldAlert className="w-4 h-4" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-amber-950 text-xs uppercase font-sans tracking-wide">
                                  Coroner&apos;s Advisory: {entry.preventionAdvisory.heading}
                                </h4>
                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 font-bold">
                                  SURVIVAL PROTOCOL
                                </span>
                              </div>
                              <p className="text-stone-800 text-xs leading-relaxed font-sans font-medium">
                                {entry.preventionAdvisory.actionRule}
                              </p>
                              <div className="text-[11px] font-mono text-amber-900 pt-0.5">
                                <span className="font-bold">Required Provisions:</span>{' '}
                                {entry.preventionAdvisory.equipmentRecommended}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Inquest Ledger (when user clicks Full Inquest) */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-stone-200 space-y-2 text-stone-700 animate-in fade-in duration-150">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] bg-stone-100/80 p-2.5 rounded-lg border border-stone-200">
                              <div>
                                <span className="text-stone-500 block text-[9px] uppercase">Gold Carried</span>
                                <span className="font-bold text-amber-800">{entry.goldLost} oz Lost</span>
                              </div>
                              <div>
                                <span className="text-stone-500 block text-[9px] uppercase">Excavation Done</span>
                                <span className="font-bold text-stone-800">{entry.blocksDug} rock blocks</span>
                              </div>
                              <div>
                                <span className="text-stone-500 block text-[9px] uppercase">Mapped Sites</span>
                                <span className="font-bold text-emerald-800">{entry.landmarksDiscovered} landmarks</span>
                              </div>
                              <div>
                                <span className="text-stone-500 block text-[9px] uppercase">Time Survived</span>
                                <span className="font-bold text-stone-800">{formatSurvivedTime(entry.timeSurvivedSeconds)}</span>
                              </div>
                            </div>
                            <div className="text-[11px] font-serif italic text-stone-500 px-1">
                              Verdict: &ldquo;{entry.coronerVerdict}&rdquo; — Filed in Pinal County Territorial Record Book Vol. IV.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
