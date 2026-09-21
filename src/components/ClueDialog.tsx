import React from 'react';
import { X, BookMarked, Sparkles, Droplets, Pickaxe, MapPin, Skull, AlertOctagon, Volume2 } from 'lucide-react';
import { ClueItem, Landmark } from '../types';
import { CURSE_CLUE_IDS, isScatteredSkullClue } from '../services/curseNarrativeEngine';
import { soundEngine } from '../audio/soundEffects';

interface ClueDialogProps {
  clue?: ClueItem;
  landmark?: Landmark;
  onClose: () => void;
  onRecord: () => void;
  onRefillWater?: () => void;
  isWaterSource?: boolean;
}

export const ClueDialog: React.FC<ClueDialogProps> = ({
  clue,
  landmark,
  onClose,
  onRecord,
  onRefillWater,
  isWaterSource,
}) => {
  if (!clue && !landmark && !isWaterSource) return null;

  const isCurseClue = clue && CURSE_CLUE_IDS.includes(clue.id as any);

  let curseSpecialForensics = '';
  if (clue?.id === 'clue_ruth_camp') {
    curseSpecialForensics =
      'Adolph Ruth vanished in June 1931 carrying authentic 1848 Peralta maps given to his son Erwin in Sonora. His camp was found months later—his checkbook and the Peralta maps were stolen, leaving behind only his tragic notebook entry: "About 200 feet across from a cave... Veni, Vidi, Vici."';
  } else if (clue?.id === 'clue_ruth_skull') {
    curseSpecialForensics =
      'Recovered in December 1931 by Brownie Holmes’ hound in Needle Canyon wash, 3/4 mile away from his torso. Autopsy by Dr. R.R. Reed and Smithsonian anthropologist Dr. Aleš Hrdlička proved two distinct rifle bullet execution wounds through the temples, refuting rumors of death by thirst or falls.';
  } else if (clue?.id === 'clue_cravey_site') {
    curseSpecialForensics =
      'In 1947, 62-year-old James Cravey chartered a helicopter into the Needle spires. Months later, his headless skeleton was discovered tied inside his sleeping bag in a box ravine; his severed skull was located 300 yards uphill perched upon the canyon rimrock.';
  } else if (clue?.id === 'clue_massacre') {
    curseSpecialForensics =
      'In 1848, the Peralta mining expedition pack train was ambushed while attempting to return to Sonora with hundreds of pounds of refined bullion. Skeletons and scattered pack saddles remain testament to the blood that guards this gold.';
  } else if (clue?.id === 'clue_dick_holmes_manuscript') {
    curseSpecialForensics =
      'Dick Holmes was present at Jacob Waltz’s deathbed in Phoenix in 1891. He took the sack of bonanza ore from under Waltz’s cot and recorded every clue, but warned that a dark curse pursued all who sought the needle pit.';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-lg text-stone-900 rounded-xl shadow-2xl border-4 p-6 font-serif ${
          isCurseClue
            ? 'bg-[#f7ece8] border-[#7d2e24]'
            : 'bg-[#f6efe1] border-[#7a4f27]'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-stone-800/10 text-stone-700 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-3 rounded-lg ${
              isCurseClue
                ? 'bg-[#521c17] text-red-300'
                : 'bg-[#5c3e21] text-amber-200'
            }`}
          >
            {isWaterSource ? (
              <Droplets className="w-6 h-6 text-sky-300" />
            ) : isCurseClue ? (
              <Skull className="w-6 h-6 text-red-300" />
            ) : (
              <Sparkles className="w-6 h-6 text-amber-300" />
            )}
          </div>
          <div>
            <span
              className={`text-[10px] font-mono uppercase tracking-wider font-bold block ${
                isCurseClue ? 'text-red-900' : 'text-amber-900'
              }`}
            >
              {isWaterSource
                ? 'Natural Oasis & Spring'
                : isCurseClue
                ? 'Curse of the Lost Dutchman • Forensic Record'
                : 'Historical Discovery'}
            </span>
            <h3 className="text-xl font-bold text-[#3d2411]">
              {clue ? clue.title : landmark?.name || 'Desert Spring'}
            </h3>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-3 mb-5 text-stone-800">
          {landmark && (
            <p className="text-xs text-stone-600 italic">
              {landmark.shortDesc}
            </p>
          )}

          {clue && (
            <blockquote
              className={`border-l-4 pl-4 py-2 my-3 rounded-r text-stone-800 text-sm leading-relaxed italic ${
                isCurseClue
                  ? 'border-red-700 bg-red-100/60'
                  : 'border-amber-700 bg-amber-50/70'
              }`}
            >
              {clue.lore}
            </blockquote>
          )}

          {curseSpecialForensics && (
            <div className="text-xs bg-black/5 p-3 rounded-lg border border-red-300/80 space-y-1">
              <div className="flex items-center gap-1.5 text-red-900 font-bold font-sans">
                <AlertOctagon className="w-3.5 h-3.5 text-red-700" />
                <span>Forensic Investigation Ledger:</span>
              </div>
              <p className="text-stone-700 font-sans leading-relaxed text-[11px]">
                {curseSpecialForensics}
              </p>
            </div>
          )}

          {clue && (
            <div className="text-xs text-stone-700 bg-stone-100/80 p-2.5 rounded border border-stone-300">
              <strong className="text-stone-900">Prospector Clue:</strong> {clue.hint}
            </div>
          )}

          {isWaterSource && (
            <p className="text-xs text-sky-800 bg-sky-50 p-2.5 rounded border border-sky-200">
              Crystal clear spring water bubbling from the basalt bedrock. Refresh yourself and refill your canteen to survive the desert heat.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[#8c6239]/30">
          {clue && isScatteredSkullClue(clue.id) && (
            <button
              onClick={() => {
                soundEngine.playSkullWhisperDiscovery();
              }}
              className="px-3.5 py-2 bg-stone-900/90 hover:bg-black text-red-300 hover:text-red-200 border border-red-900/60 rounded-lg font-sans text-xs font-bold tracking-wide flex items-center gap-1.5 shadow transition cursor-pointer"
              title="Hear the haunting whispers echoing through the canyon rocks"
            >
              <Volume2 className="w-4 h-4 text-red-400 animate-pulse" /> Listen to Canyon Whispers
            </button>
          )}

          {isWaterSource && onRefillWater && (
            <button
              onClick={() => {
                onRefillWater();
              }}
              className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-sans text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Droplets className="w-4 h-4" /> Drink & Refill Canteen
            </button>
          )}

          {clue && (
            <button
              onClick={() => {
                onRecord();
                onClose();
              }}
              className={`px-4 py-2 text-white rounded-lg font-sans text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-md transition cursor-pointer ${
                isCurseClue
                  ? 'bg-red-900 hover:bg-red-950 text-red-100'
                  : 'bg-[#5c3e21] hover:bg-[#432a13] text-amber-100'
              }`}
            >
              <BookMarked className="w-4 h-4" /> Save to Journal
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-sans text-xs font-semibold transition cursor-pointer"
          >
            Continue Exploring
          </button>
        </div>
      </div>
    </div>
  );
};
