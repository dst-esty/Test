import React, { useEffect, useState } from 'react';
import { townWantedService, WantedRecord } from '../services/townWantedService';
import { soundEngine } from '../audio/soundEffects';

interface TownWantedOverlayProps {
  onOpenJournalOutlawTab?: () => void;
}

export const TownWantedOverlay: React.FC<TownWantedOverlayProps> = ({ onOpenJournalOutlawTab }) => {
  const [record, setRecord] = useState<WantedRecord>(townWantedService.getRecord());
  const [showPosterModal, setShowPosterModal] = useState<boolean>(false);
  const [showCrimesDrawer, setShowCrimesDrawer] = useState<boolean>(false);

  useEffect(() => {
    const unsub = townWantedService.subscribe((rec) => {
      setRecord(rec);
      // If newly unlocked Most Wanted badge, show big wanted poster
      if (rec.hasMostWantedBadge && rec.mostWantedUnlockedAt && Date.now() - rec.mostWantedUnlockedAt < 5000) {
        setShowPosterModal(true);
      }
    });
    return unsub;
  }, []);

  if (record.wantedLevel === 0 && !showPosterModal) {
    return null;
  }

  const levelTitles: Record<number, string> = {
    1: 'TOWN TROUBLEMAKER',
    2: 'VIOLENT OUTLAW',
    3: 'TERRITORIAL MOST WANTED',
  };

  const levelBadges: Record<number, string> = {
    1: '★☆☆',
    2: '★★☆',
    3: '★★★',
  };

  return (
    <>
      {/* Top-Right Persistent Wanted Badge HUD */}
      <div
        id="town-wanted-hud-badge"
        className="fixed top-16 right-4 z-40 flex flex-col items-end pointer-events-auto select-none"
      >
        <div
          onClick={() => setShowCrimesDrawer(!showCrimesDrawer)}
          className={`cursor-pointer transition-all duration-300 shadow-2xl rounded-lg p-3 border-2 flex items-center gap-3 backdrop-blur-md ${
            record.wantedLevel === 3
              ? 'bg-amber-950/90 border-red-600 text-amber-100 shadow-red-950/80 animate-pulse'
              : record.wantedLevel === 2
              ? 'bg-stone-900/90 border-amber-600 text-amber-200 shadow-amber-950/60'
              : 'bg-stone-900/85 border-amber-700/80 text-amber-300'
          }`}
          style={{ minWidth: '220px' }}
        >
          {/* Outlaw Star Icon / Skull */}
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xl border-2 shrink-0 ${
              record.wantedLevel === 3
                ? 'bg-red-900 border-amber-300 text-amber-300 shadow-inner'
                : record.wantedLevel === 2
                ? 'bg-amber-900/90 border-amber-400 text-amber-300'
                : 'bg-stone-800 border-amber-600 text-amber-400'
            }`}
          >
            {record.wantedLevel === 3 ? '☠️' : '★'}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-widest font-black uppercase text-red-400">
                {record.wantedLevel === 3 ? 'WANTED DEAD OR ALIVE' : 'WANTED'}
              </span>
              <span className="text-xs font-mono font-bold tracking-wider text-amber-400">
                {levelBadges[record.wantedLevel]}
              </span>
            </div>
            <div className="text-sm font-serif font-black tracking-wide text-amber-100">
              {levelTitles[record.wantedLevel]}
            </div>
            <div className="flex items-center justify-between text-xs mt-0.5">
              <span className="text-amber-300/80 font-mono font-bold">
                REWARD: <span className="text-green-400 font-extrabold">${record.bounty}</span>
              </span>
              {record.isMobilized && (
                <span className="text-[10px] px-1.5 py-0.2 bg-red-700 text-white font-bold rounded animate-bounce">
                  MOBILIZED
                </span>
              )}
            </div>

            {/* Dynamic Outlaw Heat & Cool-Off Status Bar */}
            {record.wantedLevel > 0 && (
              <div className="mt-1.5 pt-1 border-t border-amber-900/40">
                <div className="flex items-center justify-between text-[10px] font-mono mb-0.5">
                  <span className="flex items-center gap-1 font-semibold">
                    {record.isSpottedByLaw ? (
                      <span className="text-red-400">⚠️ In Law Sights</span>
                    ) : record.isCoolingOff ? (
                      <span className="text-sky-300">⏳ Cooling Off</span>
                    ) : (
                      <span className="text-amber-400/90">🔥 Active Heat</span>
                    )}
                  </span>
                  <span className="text-stone-300 font-bold">
                    {record.isCoolingOff
                      ? `${Math.ceil(record.coolOffRemainingSec)}s`
                      : record.isSpottedByLaw
                      ? 'PAUSED'
                      : '8s grace'}
                  </span>
                </div>

                {/* Progress bar towards next lower tier */}
                <div className="w-full h-1.5 bg-stone-950/80 rounded-full overflow-hidden border border-amber-900/50">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      record.isSpottedByLaw
                        ? 'bg-red-500 animate-pulse'
                        : record.isCoolingOff
                        ? 'bg-gradient-to-r from-sky-500 to-emerald-400'
                        : 'bg-amber-600'
                    }`}
                    style={{
                      width: `${
                        record.coolOffTotalSec > 0
                          ? Math.max(0, Math.min(100, (1 - record.coolOffRemainingSec / record.coolOffTotalSec) * 100))
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Crimes Dropdown Drawer */}
        {showCrimesDrawer && (
          <div
            id="town-wanted-crimes-drawer"
            className="mt-2 w-72 bg-stone-950/95 border-2 border-amber-800 rounded-lg shadow-2xl p-3 text-xs text-amber-100 font-serif"
          >
            <div className="flex items-center justify-between border-b border-amber-900/60 pb-1 mb-2">
              <span className="font-bold tracking-wider uppercase text-amber-300">
                Territorial Criminal Record
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCrimesDrawer(false);
                }}
                className="text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Cool-Off Status Explanation Card */}
            <div className="mb-2 p-2 rounded bg-stone-900/90 border border-amber-900/40 text-[10px]">
              <div className="flex items-center justify-between font-bold text-amber-300 mb-1">
                <span>⭐ Outlaw Heat Dissipation</span>
                <span className={record.isCoolingOff ? 'text-sky-300' : 'text-amber-400'}>
                  {record.isCoolingOff ? 'Trail Growing Cold' : 'Search Active'}
                </span>
              </div>
              <p className="text-stone-300 text-[10px] leading-relaxed">
                Stay out of trouble and keep distance from Tortilla Flat to let your wanted level cool down gradually.
              </p>
              <div className="mt-1 flex items-center justify-between text-[9px] text-stone-400 font-mono">
                <span>⛰️ Wilderness: 1.5x Speed</span>
                <span>🌙 Camp Rest: -1 Star</span>
              </div>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {record.crimes.length === 0 ? (
                <div className="text-stone-400 italic">No offenses recorded.</div>
              ) : (
                record.crimes.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="p-1.5 rounded bg-stone-900/80 border border-stone-800 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="text-[11px] font-bold text-amber-200">{c.description}</div>
                      <div className="text-[9px] text-stone-400 font-mono">
                        {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                    <span className="text-green-400 font-mono font-bold text-[10px] shrink-0">
                      +${c.bountyAdded}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-amber-900/60 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowPosterModal(true);
                  setShowCrimesDrawer(false);
                }}
                className="px-2 py-1 bg-amber-800 hover:bg-amber-700 text-amber-100 text-[11px] font-bold rounded"
              >
                📜 View Wanted Poster
              </button>
              {onOpenJournalOutlawTab && (
                <button
                  onClick={() => {
                    onOpenJournalOutlawTab();
                    setShowCrimesDrawer(false);
                  }}
                  className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] rounded"
                >
                  Journal Log
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dramatic Full Wanted Poster Modal (Stamped on screen when earning Territorial Most Wanted) */}
      {showPosterModal && (
        <div
          id="town-wanted-poster-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200"
          onClick={() => setShowPosterModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-[#e8d5b7] text-stone-900 border-8 border-stone-900 rounded-sm shadow-2xl p-6 select-none font-serif text-center"
            style={{
              backgroundImage: 'radial-gradient(circle, #f4e8cf 0%, #d8be96 100%)',
              boxShadow: '0 0 50px rgba(0,0,0,0.8), inset 0 0 40px rgba(78,48,24,0.4)',
            }}
          >
            {/* Top Ornamental Header */}
            <div className="border-b-4 border-stone-900 pb-2 mb-3">
              <div className="text-xs font-bold tracking-[0.25em] text-stone-700 uppercase">
                Territory of Arizona • Pinal County Sheriff's Dept
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-widest text-red-950 uppercase mt-1">
                WANTED
              </h1>
              <div className="text-sm font-bold tracking-widest text-stone-800 uppercase mt-0.5">
                DEAD OR ALIVE
              </div>
            </div>

            {/* Silhouette Mugshot Frame */}
            <div className="mx-auto my-3 w-40 h-44 border-4 border-dashed border-stone-900 bg-[#3a281a] flex flex-col items-center justify-center text-amber-100 shadow-inner relative overflow-hidden">
              <div className="text-6xl mb-1 filter drop-shadow">🤠</div>
              <div className="text-xs font-black tracking-widest uppercase text-amber-300">
                PROSPECTOR OUTLAW
              </div>
              <div className="text-[10px] font-mono text-amber-200/80">
                Tortilla Flat Fugitive
              </div>
              {/* Blood Red "MOST WANTED" Stamp */}
              <div
                className="absolute inset-x-0 bottom-2 bg-red-800/90 text-amber-100 text-xs font-black py-0.5 tracking-wider uppercase transform -rotate-6 border-y border-amber-300 shadow"
              >
                ★ MOST WANTED ★
              </div>
            </div>

            {/* Reward Box */}
            <div className="border-4 border-double border-red-950 bg-red-950/10 py-2 px-4 my-3 rounded">
              <div className="text-xs font-bold tracking-widest uppercase text-red-900">
                Reward for Capture or Proof of Demise
              </div>
              <div className="text-4xl font-black text-red-950 font-mono tracking-tight">
                ${record.bounty} GOLD COIN
              </div>
            </div>

            {/* Crime Notice */}
            <div className="text-xs text-stone-800 leading-relaxed font-semibold my-2 px-2 text-justify">
              The individual pictured stands charged with reckless gunfire, armed assault upon peaceful citizens of Tortilla Flat, and armed treason against Sheriff Wyatt Vance. Armed, extremely dangerous, and resisting arrest.
            </div>

            {/* Decree Signature */}
            <div className="mt-4 pt-2 border-t-2 border-stone-900 flex items-center justify-between text-[11px] text-stone-700">
              <div className="text-left font-serif">
                <span className="italic">By Order of</span><br />
                <strong>Sheriff Wyatt Vance</strong>
              </div>
              <div className="text-right font-serif">
                <span>Pinal County, A.T.</span><br />
                <span className="font-mono text-[10px]">Posse In Active Pursuit</span>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowPosterModal(false)}
              className="mt-5 w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-100 font-bold uppercase tracking-widest text-xs rounded transition shadow-lg"
            >
              Close Notice [Esc]
            </button>
          </div>
        </div>
      )}
    </>
  );
};
