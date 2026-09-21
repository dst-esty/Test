import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  MessageSquare,
  X,
  Radio,
  User,
  Shield,
  Pickaxe,
  Award,
  Loader2,
  RotateCcw,
  Skull,
} from 'lucide-react';
import { townfolkVoice, NPC_VOICE_PROFILES } from '../services/townfolkVoiceService';
import { ClueItem } from '../types';
import {
  evaluateCurseProgress,
  getCurseQuestionsForNPC,
  CURSE_CLUE_IDS,
} from '../services/curseNarrativeEngine';

export interface DialogueNPCInfo {
  id: string;
  name: string;
  title: string;
  role: string;
  initialGreeting?: string;
}

interface TownfolkDialogueOverlayProps {
  npc: DialogueNPCInfo | null;
  isOpen: boolean;
  onClose: () => void;
  clues?: ClueItem[];
  onShowBanner?: (msg: string) => void;
  onNPCSpoke?: (characterId: string, text: string) => void;
}

const CHARACTER_PRESET_QUESTIONS: Record<string, string[]> = {
  old_dusty_pete: [
    'Where did Jacob Waltz hide his bonanza mine?',
    'How do I spot rich gold ore in Needle Canyon?',
    'What do the Peralta stone cross markers mean?',
    'What dangers prowl the high ridge at dusk?',
  ],
  barkeep_hank: [
    'Can I rent a room for the night to sleep until dawn?',
    'What rumors are prospectors whispering at the tables?',
    'Tell me about Jacob Waltz and his sack of gold.',
    'Who built this settlement out in the desert?',
  ],
  sheriff_wyatt: [
    'Are there claim jumpers or bandits in the mountains?',
    'How does territory claim staking work legally?',
    'What happened to the greenhorn miners who vanished?',
    'Are the mountain trails safe after dark?',
  ],
  hostler_silas: [
    'Should I buy a Spanish burro or a mountain pony?',
    'How much gold ore can a pack burro carry?',
    'How do I keep my animals alive in the desert sun?',
    'Where can my mount graze around Tortilla Flat?',
  ],
  assayer_walker: [
    'What is the official gold standard price per ounce?',
    'How do you tell real electrum from fool’s gold?',
    'What geological layer holds the richest quartz veins?',
    'Can I register a federal mining patent claim?',
  ],
  stage_jedediah: [
    'Where can your stagecoach take me?',
    'How dangerous is the Apache Trail road?',
    'Have you seen strange riders on the mountain passes?',
  ],
  clara_miller: [
    'Where is the nearest fresh spring water trough?',
    'How do folks survive the brutal canyon heat?',
    'Did you ever meet old Jacob Waltz yourself?',
  ],
  gus_blacksmith: [
    'How do I keep my mining pick from breaking on granite?',
    'What timber shoring holds best deep underground?',
    'Have miners brought you any native silver or copper?',
  ],
};

export const TownfolkDialogueOverlay: React.FC<TownfolkDialogueOverlayProps> = ({
  npc,
  isOpen,
  onClose,
  clues,
  onShowBanner,
  onNPCSpoke,
}) => {
  const [currentText, setCurrentText] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState<boolean>(false);
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [dialogueHistory, setDialogueHistory] = useState<Array<{ role: 'npc' | 'player'; text: string }>>([]);
  const historyEndRef = useRef<HTMLDivElement | null>(null);

  // Evaluate dynamic curse progression from player's discovered clues
  const curseDossier = evaluateCurseProgress(clues || []);
  const curseQuestions = npc ? getCurseQuestionsForNPC(npc.id, curseDossier) : [];

  // Synchronize voice enabled state with service
  useEffect(() => {
    setVoiceEnabled(townfolkVoice.isVoiceEnabled());
    const unsub = townfolkVoice.subscribeSpeakingChange((speakingId, text) => {
      setIsSpeaking(speakingId !== null);
      if (text && speakingId === npc?.id) {
        setCurrentText(text);
      }
    });
    return () => {
      unsub();
    };
  }, [npc?.id]);

  // When NPC opens, trigger their greeting with voice
  useEffect(() => {
    if (!isOpen || !npc) {
      townfolkVoice.stop();
      return;
    }

    let greeting =
      npc.initialGreeting ||
      `Howdy stranger! Welcome to Tortilla Flat. I'm ${npc.name}, ${npc.title}. What brings you out to the Superstitions?`;

    // If player has uncovered grim curse evidence, NPCs acknowledge the dark discoveries
    if (curseDossier.stage >= 2 && Math.random() < 0.4) {
      if (npc.id === 'old_dusty_pete') {
        greeting = `Howdy, traveler... You've got that look in your eyes. You've seen the bones out in Needle Canyon, haven't you? The curse is real, pardner.`;
      } else if (npc.id === 'sheriff_wyatt') {
        greeting = `Step up to the boardwalk, stranger. I hear you've been tracking Dr. Ruth's trail. Mind yourself—those canyon rocks have taken too many good men's heads.`;
      }
    }

    setCurrentText(greeting);
    setDialogueHistory([{ role: 'npc', text: greeting }]);

    // Trigger spoken voice
    if (townfolkVoice.isVoiceEnabled()) {
      townfolkVoice.speak(
        npc.id,
        greeting,
        () => {
          setIsSpeaking(true);
          if (onNPCSpoke) onNPCSpoke(npc.id, greeting);
        },
        () => setIsSpeaking(false)
      );
    }
  }, [isOpen, npc?.id, curseDossier.stage]);

  // Scroll chat history to bottom
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dialogueHistory, isSpeaking]);

  if (!isOpen || !npc) return null;

  const baseQuestions = CHARACTER_PRESET_QUESTIONS[npc.id] || [
    'Tell me about the Superstition Mountains.',
    'Where can I find gold around here?',
    'What should a greenhorn miner know?',
  ];

  // Dynamic question list merging custom curse inquiries first
  const questions = [...curseQuestions, ...baseQuestions];

  const handleToggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    townfolkVoice.setVoiceEnabled(next);
    if (!next) {
      townfolkVoice.stop();
      setIsSpeaking(false);
    }
  };

  const handleAskQuestion = async (questionText: string) => {
    if (!questionText.trim() || isLoadingAnswer) return;

    const trimmed = questionText.trim();
    setCustomQuestion('');
    setDialogueHistory((prev) => [...prev, { role: 'player', text: trimmed }]);
    setIsLoadingAnswer(true);

    try {
      const curseContext = {
        stage: curseDossier.stage,
        stageName: curseDossier.stageName,
        discoveredCurseClues: (clues || [])
          .filter((c) => c.discovered && CURSE_CLUE_IDS.includes(c.id as any))
          .map((c) => c.title),
        summary: curseDossier.narrativeSummary,
      };

      const response = await townfolkVoice.askQuestion(npc.id, trimmed, curseContext);
      setIsLoadingAnswer(false);
      setCurrentText(response.reply);
      setDialogueHistory((prev) => [...prev, { role: 'npc', text: response.reply }]);

      if (onNPCSpoke) {
        onNPCSpoke(npc.id, response.reply);
      }
      if (onShowBanner) {
        onShowBanner(`🗣️ ${npc.name}: "${response.reply.slice(0, 70)}..."`);
      }
    } catch (err) {
      console.warn('[DialogueOverlay] Error getting response:', err);
      setIsLoadingAnswer(false);
    }
  };

  const handleReplaySpoken = () => {
    if (!currentText || !npc) return;
    townfolkVoice.speak(
      npc.id,
      currentText,
      () => {
        setIsSpeaking(true);
        if (onNPCSpoke) onNPCSpoke(npc.id, currentText);
      },
      () => setIsSpeaking(false)
    );
  };

  const getRoleBadgeIcon = (role: string) => {
    switch (role) {
      case 'sheriff':
        return <Shield className="w-4 h-4 text-amber-300" />;
      case 'prospector':
        return <Pickaxe className="w-4 h-4 text-amber-400" />;
      case 'barkeep':
        return <Radio className="w-4 h-4 text-amber-300" />;
      default:
        return <User className="w-4 h-4 text-amber-300" />;
    }
  };

  if (!isOpen || !npc) {
    return null;
  }

  const voiceProfile = NPC_VOICE_PROFILES[npc.id];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm pointer-events-auto">
      <div
        className="w-full max-w-2xl bg-stone-950/95 border-2 border-amber-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-stone-100 font-serif"
        style={{
          boxShadow: '0 20px 50px rgba(0,0,0,0.9), inset 0 1px 0 rgba(245,158,11,0.2)',
        }}
      >
        {/* HEADER BAR */}
        <div className="bg-gradient-to-r from-amber-950/90 via-stone-900 to-amber-950/90 border-b border-amber-800/60 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-stone-900 border-2 border-amber-600/70 flex items-center justify-center text-amber-400 shadow-inner">
              {getRoleBadgeIcon(npc.role)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-amber-100 tracking-wide">
                  {npc.name}
                </h2>
                {isSpeaking && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-mono border border-amber-500/40 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    Spoken Audio
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-300/80 font-mono flex items-center gap-1">
                <span>{npc.title}</span>
                <span>•</span>
                <span className="text-stone-400">Tortilla Flat Settlement</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Voice Toggle */}
            <button
              onClick={handleToggleVoice}
              title={voiceEnabled ? 'Mute NPC Voice' : 'Unmute NPC Voice'}
              className={`p-2 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-mono ${
                voiceEnabled
                  ? 'bg-amber-900/60 border-amber-600/60 text-amber-200 hover:bg-amber-800/60'
                  : 'bg-stone-900 border-stone-700 text-stone-400 hover:bg-stone-800'
              }`}
            >
              {voiceEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Voice ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-stone-400" />
                  <span className="hidden sm:inline">Voice OFF</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                townfolkVoice.stop();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-amber-200 border border-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DYNAMIC CURSE LORE BANNER */}
        {curseDossier.stage > 0 && (
          <div className="bg-gradient-to-r from-red-950/90 via-stone-900 to-amber-950/90 border-b border-red-900/60 px-4 py-1.5 flex items-center justify-between text-[11px] text-amber-200 font-mono shadow-inner">
            <div className="flex items-center gap-2">
              <Skull className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>
                <strong className="text-red-300">Curse Lore Active:</strong> {curseDossier.stageName}
              </span>
            </div>
            <span className="text-red-200/70 text-[10px] hidden sm:inline">
              {curseDossier.discoveredCount} Relic{curseDossier.discoveredCount === 1 ? '' : 's'} Uncovered
            </span>
          </div>
        )}

        {/* DIALOGUE & CONVERSATION BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-stone-950/80 min-h-[160px] max-h-[380px]">
          {dialogueHistory.map((item, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${item.role === 'player' ? 'items-end' : 'items-start'}`}
            >
              <div className="text-[11px] font-mono text-stone-400 mb-1 px-1">
                {item.role === 'player' ? 'You' : npc.name}
              </div>
              <div
                className={`max-w-[88%] rounded-xl px-4 py-2.5 text-sm leading-relaxed shadow ${
                  item.role === 'player'
                    ? 'bg-amber-900/70 border border-amber-600/60 text-amber-100 rounded-tr-none'
                    : 'bg-stone-900/90 border border-stone-800 text-stone-200 rounded-tl-none font-serif'
                }`}
              >
                {item.text}
              </div>
            </div>
          ))}

          {/* Real-time speaking / equalizer indicator */}
          {isSpeaking && (
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-amber-400 font-mono bg-amber-950/40 rounded-lg border border-amber-800/40 w-fit">
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-1 bg-amber-400 rounded-full animate-[bounce_0.6s_infinite_100ms] h-2" />
                <span className="w-1 bg-amber-400 rounded-full animate-[bounce_0.6s_infinite_200ms] h-3" />
                <span className="w-1 bg-amber-400 rounded-full animate-[bounce_0.6s_infinite_300ms] h-1.5" />
                <span className="w-1 bg-amber-400 rounded-full animate-[bounce_0.6s_infinite_150ms] h-2.5" />
              </div>
              <span>Speaking ({voiceProfile?.geminiVoice || 'Frontier'} Voice)...</span>
              <button
                onClick={handleReplaySpoken}
                title="Replay Voice"
                className="ml-2 hover:text-amber-200"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}

          {isLoadingAnswer && (
            <div className="flex items-center gap-2 text-xs text-amber-300/80 font-mono p-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>{npc.name} is pondering your question...</span>
            </div>
          )}

          <div ref={historyEndRef} />
        </div>

        {/* TOPIC QUESTIONS & INPUT BAR */}
        <div className="p-3 bg-stone-900/95 border-t border-amber-800/50 space-y-2.5">
          {/* Preset question chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] font-mono text-stone-400 self-center mr-1">Ask:</span>
            {questions.map((q, idx) => {
              const isCurseQ = curseQuestions.includes(q);
              return (
                <button
                  key={idx}
                  disabled={isLoadingAnswer}
                  onClick={() => handleAskQuestion(q)}
                  className={`px-2.5 py-1 text-xs font-serif disabled:opacity-50 rounded-lg transition-colors shadow-sm text-left inline-flex items-center gap-1.5 cursor-pointer ${
                    isCurseQ
                      ? 'bg-red-950/70 hover:bg-red-900/90 text-red-200 border border-red-700/80 shadow-red-950/50'
                      : 'bg-stone-950 hover:bg-amber-950/80 text-amber-200/90 hover:text-amber-100 border border-amber-900/60 hover:border-amber-600'
                  }`}
                >
                  {isCurseQ && <Skull className="w-3 h-3 text-red-400 shrink-0" />}
                  <span>&ldquo;{q}&rdquo;</span>
                </button>
              );
            })}
          </div>

          {/* Custom Question Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskQuestion(customQuestion);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder={`Ask ${npc.name} anything about Tortilla Flat, gold, or the mountains...`}
              disabled={isLoadingAnswer}
              className="flex-1 bg-stone-950 border border-stone-800 focus:border-amber-600 rounded-lg px-3 py-2 text-xs sm:text-sm text-stone-100 placeholder-stone-500 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isLoadingAnswer || !customQuestion.trim()}
              className="px-3 py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-stone-800 disabled:text-stone-600 text-amber-100 rounded-lg text-xs sm:text-sm font-serif font-bold transition-colors flex items-center gap-1.5 shadow"
            >
              {isLoadingAnswer ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ask</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono pt-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              AI Voice powered by Gemini 3.1 Flash Speech Synthesis
            </span>
            <span className="hidden sm:inline">Press ESC to exit dialogue</span>
          </div>
        </div>
      </div>
    </div>
  );
};
