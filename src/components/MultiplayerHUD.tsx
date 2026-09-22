import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  MessageSquare,
  Send,
  Radio,
  Compass,
  ShieldAlert,
  Sparkles,
  User,
  Palette,
  Wifi,
  ChevronDown,
  ChevronUp,
  Minus,
  Maximize2,
  Trash2,
  Zap,
  Clock,
  X,
  Megaphone,
  Bell,
  BellOff,
  Handshake,
  Star,
  Check,
  RefreshCw,
  Copy,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { MultiplayerChatMessage, MultiplayerPlayer, MultiplayerColorPreset, Friendship } from '../types';
import { multiplayer } from '../multiplayer/multiplayerService';
import { friendshipService } from '../services/friendshipService';

interface MultiplayerHUDProps {
  onlinePlayers: Record<string, MultiplayerPlayer>;
  chatMessages: MultiplayerChatMessage[];
  ping: number;
  selfId: string | null;
  selfName: string;
  selfColor: string;
  onUpdateProfile: (name: string, color: string) => void;
  onSendChat: (text: string, shout?: boolean) => void;
  onTrackPlayer?: (player: MultiplayerPlayer) => void;
  visible?: boolean;
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
  openRosterTab?: 'roster' | 'pardners' | 'customize' | 'chat' | null;
  onCloseRosterModal?: () => void;
}

const QUICK_SHOUTS = [
  '⛏️ Struck high-grade gold vein!',
  '🪵 Unstable pit walls! Shore with timber!',
  '🧨 Fire in the hole! Dynamite detonating!',
  '🧭 Headed towards Weaver\'s Needle!',
  '⛺ Regroup at the mining expedition camp!',
];

export const MultiplayerHUD: React.FC<MultiplayerHUDProps> = ({
  onlinePlayers,
  chatMessages,
  ping,
  selfId,
  selfName,
  selfColor,
  onUpdateProfile,
  onSendChat,
  onTrackPlayer,
  visible = true,
  isOpen,
  onToggleOpen,
  openRosterTab,
  onCloseRosterModal,
}) => {
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'roster' | 'pardners' | 'customize' | 'chat'>('roster');

  useEffect(() => {
    if (openRosterTab) {
      setActiveTab(openRosterTab);
      setShowRosterModal(true);
    }
  }, [openRosterTab]);

  const handleCloseModal = () => {
    setShowRosterModal(false);
    if (onCloseRosterModal) onCloseRosterModal();
  };
  // Default internal state if not controlled externally
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const isTelegraphOpen = typeof isOpen === 'boolean' ? isOpen : internalOpen;

  const [isTopPillCollapsed, setIsTopPillCollapsed] = useState(true);
  const [slotNode, setSlotNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const updateSlot = () => {
      const el = document.getElementById('multiplayer-status-slot');
      if (el) {
        setSlotNode(el);
      }
    };
    updateSlot();
    const interval = setInterval(updateSlot, 300);
    return () => clearInterval(interval);
  }, [visible]);

  // Collapsible Quick Shouts drawer inside the Telegraph
  const [showQuickShouts, setShowQuickShouts] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wt_telegraph_shouts') === 'true';
    } catch {
      return false;
    }
  });
  // Auto-collapse after quiet period
  const [autoCollapseEnabled, setAutoCollapseEnabled] = useState<boolean>(false);
  const [clearedTimestamp, setClearedTimestamp] = useState<number>(0);
  const [telegraphUpdates, setTelegraphUpdates] = useState<Array<{ id: string; message: MultiplayerChatMessage; isFading: boolean }>>([]);
  const updateTimeoutsRef = useRef<Map<string, { fade: number; remove: number }>>(new Map());

  const [chatText, setChatText] = useState('');
  const [editName, setEditName] = useState(selfName);
  const [editColor, setEditColor] = useState(selfColor);
  const [friendships, setFriendships] = useState<Friendship[]>(() => friendshipService.getAllFriendships());
  const [directPardnerName, setDirectPardnerName] = useState('');
  const [pardnerNotice, setPardnerNotice] = useState<string | null>(null);
  const [copiedProspectorId, setCopiedProspectorId] = useState(false);

  useEffect(() => {
    return friendshipService.subscribe(setFriendships);
  }, []);

  const WESTERN_NAMES = [
    'Dutchman Jacob',
    'Canyon Jack',
    'Tombstone Tom',
    'Desert Hawk',
    'Cactus Kate',
    'Sierra Sage',
    'Apache Slim',
    'Goldpan Gus',
    'Silver Strike Sal',
    'Red Rock Dan',
    'Pecos Pete',
    'Gila Jim',
    'Superstition Sam',
    'Quartz Creek Bill',
    'Dusty Trail Hank',
    'Boulder Ridge Ned',
    'Sourdough Pete',
  ];

  const rollRandomNickname = () => {
    const current = editName.trim();
    const pool = WESTERN_NAMES.filter((n) => n !== current);
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setEditName(chosen);
  };

  const handleOfferPardner = async (targetId: string, targetName: string) => {
    const res = await friendshipService.sendPardnerRequest(targetId, targetName);
    setPardnerNotice(res.message);
    setTimeout(() => setPardnerNotice(null), 4500);
  };

  const handleAcceptPardner = async (friendshipId: string, partnerName: string) => {
    const ok = await friendshipService.acceptPardnerRequest(friendshipId);
    if (ok) {
      setPardnerNotice(`🤝 Frontier alliance confirmed! You and ${partnerName} are now official Pardners.`);
      setTimeout(() => setPardnerNotice(null), 4500);
    }
  };

  const handleDissolvePardner = async (friendshipId: string, partnerName: string) => {
    const ok = await friendshipService.dissolvePardnership(friendshipId);
    if (ok) {
      setPardnerNotice(`Pardnership with ${partnerName} dissolved.`);
      setTimeout(() => setPardnerNotice(null), 4000);
    }
  };

  const handleDirectPardnerInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = directPardnerName.trim();
    if (!name) return;
    const res = await friendshipService.sendPardnerRequest(`callsign_${name.toLowerCase()}`, name);
    setPardnerNotice(res.message);
    setDirectPardnerName('');
    setTimeout(() => setPardnerNotice(null), 4500);
  };

  const copyProspectorId = () => {
    const id = friendshipService.getOrCreateProspectorId();
    navigator.clipboard.writeText(id).catch(() => {});
    setCopiedProspectorId(true);
    setTimeout(() => setCopiedProspectorId(false), 2500);
  };

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoCollapseTimeoutRef = useRef<number | null>(null);
  const prevMessagesCountRef = useRef<number>(chatMessages.length);

  const playersList: MultiplayerPlayer[] = Object.values(onlinePlayers);
  const onlineCount = playersList.length + 1; // Including self

  // Filter messages based on user clear timestamp
  const visibleMessages = chatMessages.filter(
    (msg) => !clearedTimestamp || msg.timestamp > clearedTimestamp
  );

  useEffect(() => {
    setEditName(selfName);
    setEditColor(selfColor);
  }, [selfName, selfColor]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      updateTimeoutsRef.current.forEach((t) => {
        clearTimeout(t.fade);
        clearTimeout(t.remove);
      });
      updateTimeoutsRef.current.clear();
    };
  }, []);

  const toggleTelegraph = (targetOpen?: boolean) => {
    const nextVal = typeof targetOpen === 'boolean' ? targetOpen : !isTelegraphOpen;
    if (onToggleOpen) {
      onToggleOpen(nextVal);
    } else {
      setInternalOpen(nextVal);
    }
    if (nextVal) {
      setTelegraphUpdates([]);
    }
  };

  const toggleQuickShouts = () => {
    const next = !showQuickShouts;
    setShowQuickShouts(next);
    try {
      localStorage.setItem('wt_telegraph_shouts', String(next));
    } catch {}
  };

  // Track new messages for transient telegraph toast updates that fade out at bottom center
  useEffect(() => {
    if (chatMessages.length > prevMessagesCountRef.current) {
      const newMessages = chatMessages.slice(prevMessagesCountRef.current);
      if (!isTelegraphOpen) {
        newMessages.forEach((msg) => {
          const updateId = `${msg.id || Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          setTelegraphUpdates((prev) => [...prev.slice(-2), { id: updateId, message: msg, isFading: false }]);

          const fadeTimer = window.setTimeout(() => {
            setTelegraphUpdates((prev) =>
              prev.map((u) => (u.id === updateId ? { ...u, isFading: true } : u))
            );
          }, 4000);

          const removeTimer = window.setTimeout(() => {
            setTelegraphUpdates((prev) => prev.filter((u) => u.id !== updateId));
            updateTimeoutsRef.current.delete(updateId);
          }, 5200);

          updateTimeoutsRef.current.set(updateId, { fade: fadeTimer, remove: removeTimer });
        });
      } else {
        // Auto-scroll when open
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });

        // Reset auto-collapse timer if enabled
        if (autoCollapseEnabled) {
          if (autoCollapseTimeoutRef.current) clearTimeout(autoCollapseTimeoutRef.current);
          autoCollapseTimeoutRef.current = window.setTimeout(() => {
            toggleTelegraph(false);
          }, 12000);
        }
      }
    }
    prevMessagesCountRef.current = chatMessages.length;
  }, [chatMessages, isTelegraphOpen, autoCollapseEnabled]);

  // Keyboard shortcut: Press Enter to open or focus chat, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') {
          return;
        }
        if (!isTelegraphOpen) {
          toggleTelegraph(true);
        }
        setTimeout(() => inputRef.current?.focus(), 60);
      } else if (e.key === 'Escape' && isTelegraphOpen) {
        toggleTelegraph(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTelegraphOpen]);

  const handleSend = (shout = false) => {
    if (!chatText.trim()) return;
    onSendChat(chatText.trim(), shout);
    setChatText('');
  };

  const handleQuickShout = (shout: string) => {
    onSendChat(shout, true);
  };

  const handleClearFeed = () => {
    setClearedTimestamp(Date.now());
    setTelegraphUpdates([]);
    updateTimeoutsRef.current.forEach((t) => {
      clearTimeout(t.fade);
      clearTimeout(t.remove);
    });
    updateTimeoutsRef.current.clear();
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) return;
    const cleanName = editName.trim().substring(0, 24);
    onUpdateProfile(cleanName, editColor);
    friendshipService.setProspectorName(cleanName);
    setPardnerNotice(`🤠 Callsign "${cleanName}" permanently saved & telegraphed to the frontier.`);
    setTimeout(() => setPardnerNotice(null), 3500);
    handleCloseModal();
  };

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* Top Multiplayer Status Pill - Placed Directly Under the Heart Icon */}
      {slotNode ? (
        createPortal(
          <div className="flex items-center gap-1.5 pointer-events-auto w-fit">
            {isTopPillCollapsed ? (
              <button
                onClick={() => setIsTopPillCollapsed(false)}
                className="group flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-stone-900/90 hover:bg-stone-850 text-stone-300 border border-emerald-500/40 hover:border-emerald-400/80 backdrop-blur-md shadow-lg shadow-black/40 transition-all transform hover:scale-105 active:scale-95 cursor-pointer select-none"
                title={`Online: ${onlineCount} ${onlineCount === 1 ? 'Prospector' : 'Prospectors'} (${ping}ms) - Click to expand`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Users className="w-3.5 h-3.5 text-stone-300 group-hover:text-amber-300 transition-colors" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-500/40 shadow-lg text-xs font-medium text-stone-200 animate-fade-in">
                <button
                  onClick={() => setShowRosterModal(true)}
                  className="flex items-center gap-2 hover:text-amber-300 transition-colors cursor-pointer"
                  title="Open Frontier Expedition Roster & Chat Log"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>{onlineCount} {onlineCount === 1 ? 'Prospector' : 'Prospectors'}</span>
                  <span className="text-stone-500">|</span>
                  <span className="text-amber-300 font-mono text-[11px]">{ping}ms</span>
                </button>
                <button
                  onClick={() => {
                    toggleTelegraph(true);
                    setTimeout(() => inputRef.current?.focus(), 60);
                  }}
                  className="p-1 hover:bg-stone-800 rounded-full text-amber-400 hover:text-amber-200 transition cursor-pointer"
                  title="Open Wilderness Telegraph [Enter]"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsTopPillCollapsed(true)}
                  className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-stone-200 transition cursor-pointer ml-0.5"
                  title="Collapse to green dot & human icon"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>,
          slotNode
        )
      ) : (
        <div className="fixed top-[52px] sm:top-[66px] left-3 sm:left-5 z-40 flex items-center gap-1.5 pointer-events-auto">
          {isTopPillCollapsed ? (
            <button
              onClick={() => setIsTopPillCollapsed(false)}
              className="group flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-stone-900/90 hover:bg-stone-850 text-stone-300 border border-emerald-500/40 hover:border-emerald-400/80 backdrop-blur-md shadow-lg shadow-black/40 transition-all transform hover:scale-105 active:scale-95 cursor-pointer select-none"
              title={`Online: ${onlineCount} ${onlineCount === 1 ? 'Prospector' : 'Prospectors'} (${ping}ms) - Click to expand`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Users className="w-3.5 h-3.5 text-stone-300 group-hover:text-amber-300 transition-colors" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-500/40 shadow-lg text-xs font-medium text-stone-200 animate-fade-in">
              <button
                onClick={() => setShowRosterModal(true)}
                className="flex items-center gap-2 hover:text-amber-300 transition-colors cursor-pointer"
                title="Open Frontier Expedition Roster & Chat Log"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>{onlineCount} {onlineCount === 1 ? 'Prospector' : 'Prospectors'}</span>
                <span className="text-stone-500">|</span>
                <span className="text-amber-300 font-mono text-[11px]">{ping}ms</span>
              </button>
              <button
                onClick={() => {
                  toggleTelegraph(true);
                  setTimeout(() => inputRef.current?.focus(), 60);
                }}
                className="p-1 hover:bg-stone-800 rounded-full text-amber-400 hover:text-amber-200 transition cursor-pointer"
                title="Open Wilderness Telegraph [Enter]"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsTopPillCollapsed(true)}
                className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-stone-200 transition cursor-pointer ml-0.5"
                title="Collapse to green dot & human icon"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Wilderness Telegraph Updates (Bottom Center with Smooth Fade-Out)          */}
      {/* ========================================================================= */}
      {!isTelegraphOpen && telegraphUpdates.length > 0 && (
        <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-col items-center gap-2 max-w-md sm:max-w-xl w-[92vw] sm:w-auto select-none font-sans">
          {telegraphUpdates.map((update) => {
            const msg = update.message;
            const isShout = msg.type === 'shout';
            const isDiscovery = msg.type === 'discovery';
            const isSystem = msg.type === 'system';

            return (
              <div
                key={update.id}
                onClick={() => toggleTelegraph(true)}
                onMouseEnter={() => {
                  const t = updateTimeoutsRef.current.get(update.id);
                  if (t) {
                    clearTimeout(t.fade);
                    clearTimeout(t.remove);
                  }
                  setTelegraphUpdates((prev) =>
                    prev.map((u) => (u.id === update.id ? { ...u, isFading: false } : u))
                  );
                }}
                onMouseLeave={() => {
                  const fadeTimer = window.setTimeout(() => {
                    setTelegraphUpdates((prev) =>
                      prev.map((u) => (u.id === update.id ? { ...u, isFading: true } : u))
                    );
                  }, 2500);
                  const removeTimer = window.setTimeout(() => {
                    setTelegraphUpdates((prev) => prev.filter((u) => u.id !== update.id));
                    updateTimeoutsRef.current.delete(update.id);
                  }, 3700);
                  updateTimeoutsRef.current.set(update.id, { fade: fadeTimer, remove: removeTimer });
                }}
                className={`group flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-2xl backdrop-blur-md text-xs cursor-pointer transition-all duration-1000 ease-in-out ${
                  update.isFading
                    ? 'opacity-0 translate-y-3 scale-95 pointer-events-none'
                    : 'opacity-100 translate-y-0 scale-100 animate-fade-in hover:scale-[1.02]'
                } ${
                  isShout
                    ? 'bg-red-950/95 border-red-500/80 text-red-100 shadow-[0_0_25px_rgba(239,68,68,0.4)]'
                    : isDiscovery
                    ? 'bg-emerald-950/95 border-emerald-500/80 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                    : isSystem
                    ? 'bg-amber-950/95 border-amber-500/80 text-amber-100 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                    : 'bg-stone-900/95 border-amber-600/60 text-stone-200 shadow-2xl hover:border-amber-400'
                }`}
                title="Click to open Wilderness Telegraph [Enter]"
              >
                <Radio className={`w-4 h-4 shrink-0 ${isShout ? 'text-red-400 animate-bounce' : 'text-amber-400 animate-pulse'}`} />
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: msg.senderColor || '#eab308' }}
                  />
                  <span className="font-bold text-amber-300 font-mono text-[11px] whitespace-nowrap">
                    {msg.senderName}:
                  </span>
                  <span className="text-stone-100 truncate max-w-[190px] sm:max-w-xs font-medium">
                    {msg.text}
                  </span>
                  {isShout && (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-900/80 text-red-200 font-mono font-bold shrink-0">
                      SHOUT
                    </span>
                  )}
                  {isDiscovery && (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-200 font-mono font-bold shrink-0">
                      DISCOVERY
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTelegraphUpdates((prev) => prev.filter((u) => u.id !== update.id));
                  }}
                  className="text-stone-400 hover:text-white p-1 rounded-full hover:bg-stone-800/80 transition-colors cursor-pointer shrink-0 ml-1"
                  title="Dismiss update"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Wilderness Telegraph Expanded Console (Bottom Center) */}
      {isTelegraphOpen && (
        <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-col gap-1.5 max-w-sm sm:max-w-md w-[92vw] sm:w-[420px] select-none font-sans">
          {/* Expanded Full Console with Collapsible Sub-Menus */}
          <div className="flex flex-col rounded-2xl bg-stone-900/95 border border-amber-500/40 backdrop-blur-md shadow-2xl overflow-hidden animate-fade-in text-xs">
            {/* 1. Header Bar with Collapse & Utility Buttons */}
            <div className="flex items-center justify-between px-3 py-2 bg-stone-950/70 border-b border-stone-800 text-stone-300">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="font-bold text-amber-300 tracking-wide font-mono text-[12px]">
                  Wilderness Telegraph
                </span>
                <span className="text-[10px] text-stone-400 font-mono bg-stone-800/80 px-1.5 py-0.5 rounded border border-stone-700/60">
                  {onlineCount} {onlineCount === 1 ? 'Miner' : 'Miners'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Collapsible Quick Shouts Toggle */}
                <button
                  onClick={toggleQuickShouts}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                    showQuickShouts
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'hover:bg-stone-800 text-stone-400 border border-transparent'
                  }`}
                  title={showQuickShouts ? 'Hide Quick Shouts Menu' : 'Show Quick Shouts Menu'}
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Shouts</span>
                  {showQuickShouts ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>

                {/* Auto-Collapse Quiet Mode Toggle */}
                <button
                  onClick={() => setAutoCollapseEnabled(!autoCollapseEnabled)}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    autoCollapseEnabled
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'hover:bg-stone-800 text-stone-400 border border-transparent'
                  }`}
                  title={
                    autoCollapseEnabled
                      ? 'Auto-collapse enabled (collapses after quiet)'
                      : 'Auto-collapse disabled (stays open)'
                  }
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>

                {/* Clear Screen Feed Button */}
                <button
                  onClick={handleClearFeed}
                  className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-red-400 transition-colors cursor-pointer"
                  title="Clear message feed from screen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Full Roster & History Modal Button */}
                <button
                  onClick={() => setShowRosterModal(true)}
                  className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-amber-300 transition-colors cursor-pointer"
                  title="Open Expedition Roster & Full History"
                >
                  <Users className="w-3.5 h-3.5" />
                </button>

                {/* Main Collapse Button */}
                <button
                  onClick={() => toggleTelegraph(false)}
                  className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer ml-1"
                  title="Collapse Wilderness Telegraph to HUD [Esc]"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Collapsible Sub-Menu: Quick Shouts Drawer */}
            {showQuickShouts && (
              <div className="p-2 bg-stone-950/40 border-b border-stone-800/80 flex flex-wrap gap-1 animate-fade-in">
                {QUICK_SHOUTS.map((shout, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickShout(shout)}
                    className="px-2 py-1 rounded bg-stone-800/80 hover:bg-amber-950/70 hover:border-amber-600/60 text-stone-300 hover:text-amber-200 text-[11px] border border-stone-700/70 cursor-pointer transition-all active:scale-95"
                  >
                    {shout}
                  </button>
                ))}
              </div>
            )}

            {/* 3. Collapsible Message Stream Feed */}
            <div className="max-h-44 sm:max-h-52 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-stone-700">
              {visibleMessages.length === 0 ? (
                <div className="py-4 text-center text-stone-500 text-[11px] italic font-mono">
                  Telegraph feed clear. Send a dispatch or explore the wilderness!
                </div>
              ) : (
                visibleMessages.slice(-8).map((msg) => (
                  <div
                    key={msg.id}
                    className={`px-2.5 py-1.5 rounded-lg border transition-all text-xs ${
                      msg.type === 'system'
                        ? 'bg-amber-950/60 border-amber-600/30 text-amber-200'
                        : msg.type === 'discovery'
                        ? 'bg-emerald-950/65 border-emerald-500/40 text-emerald-200'
                        : msg.type === 'shout'
                        ? 'bg-red-950/65 border-red-500/40 text-red-200 font-semibold'
                        : 'bg-stone-950/50 border-stone-800 text-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5 text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: msg.senderColor || '#eab308' }}
                        />
                        <span className="font-bold text-amber-400 truncate">
                          {msg.senderName}
                        </span>
                        {msg.type === 'shout' && (
                          <span className="text-[9px] uppercase tracking-wider px-1 bg-red-800/60 rounded text-red-300 font-mono">
                            SHOUT
                          </span>
                        )}
                        {msg.type === 'discovery' && (
                          <span className="text-[9px] uppercase tracking-wider px-1 bg-emerald-800/60 rounded text-emerald-300 font-mono">
                            FOUND
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-stone-500 font-mono shrink-0">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="leading-snug text-stone-200 break-words">{msg.text}</p>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* 4. Inline Telegram Composer Bar */}
            <div className="p-2 bg-stone-950/90 border-t border-stone-800 flex items-center gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleSend(false);
                  if (e.key === 'Escape') toggleTelegraph(false);
                }}
                onKeyUp={(e) => e.stopPropagation()}
                placeholder="Telegraph message... [Enter]"
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700/80 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                maxLength={140}
              />
              <button
                onClick={() => handleSend(false)}
                className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                title="Send telegraph dispatch"
              >
                <Send className="w-3 h-3" />
                <span>Send</span>
              </button>
              <button
                onClick={() => handleSend(true)}
                className="px-2 py-1.5 rounded-lg bg-stone-800 hover:bg-red-950 text-stone-300 hover:text-red-300 border border-stone-700 text-[11px] font-mono cursor-pointer transition-colors"
                title="Send high-priority expedition shout"
              >
                Shout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roster & Customizer Modal */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-stone-900 border border-amber-600/40 p-6 text-stone-100 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border shadow"
                  style={{ backgroundColor: selfColor }}
                >
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-amber-300">Expedition Roster & Telegraph</h2>
                  <p className="text-xs text-stone-400">Superstition Wilderness Prospectors ({onlineCount} Active)</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Notice Banner */}
            {pardnerNotice && (
              <div className="mt-3 px-3 py-2 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-200 text-xs flex items-center justify-between animate-fadeIn">
                <span>{pardnerNotice}</span>
                <button
                  onClick={() => setPardnerNotice(null)}
                  className="text-stone-400 hover:text-stone-200 text-xs ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-stone-800 mt-4">
              <button
                onClick={() => setActiveTab('roster')}
                className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'roster'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                Prospectors ({onlineCount})
              </button>
              <button
                onClick={() => setActiveTab('pardners')}
                className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'pardners'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Handshake className="w-3.5 h-3.5" />
                <span>Pardners ({friendshipService.getAcceptedPardners().length})</span>
              </button>
              <button
                onClick={() => setActiveTab('customize')}
                className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'customize'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                Outfit & Name
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'chat'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                Telegraph Log
              </button>
            </div>

            {/* Tab: Roster List */}
            {activeTab === 'roster' && (
              <div className="mt-4 space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {/* Local Player Card */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/30 border border-amber-500/40">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow"
                      style={{ backgroundColor: selfColor }}
                    >
                      YOU
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-stone-100 text-sm">{selfName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono">
                          Local Miner
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 flex items-center gap-2">
                        <span>Ping: {ping}ms</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('customize')}
                    className="px-2.5 py-1 text-xs rounded bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 cursor-pointer"
                  >
                    Edit Moniker
                  </button>
                </div>

                {/* Remote Players */}
                {playersList.length === 0 ? (
                  <div className="p-6 text-center text-stone-500 text-xs">
                    No other prospectors in your immediate sector right now. Invite friends with your callsign to form a pardnership!
                  </div>
                ) : (
                  playersList.map((player) => {
                    const pStatus = friendshipService.getPardnerStatus(player.id, player.name);
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          pStatus.status === 'pardner'
                            ? 'bg-amber-950/20 border-amber-500/50 hover:border-amber-400'
                            : 'bg-stone-800/60 border-stone-700/60 hover:border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow"
                            style={{ backgroundColor: player.outfitColor || '#8c5932' }}
                          >
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-stone-200 text-sm">{player.name}</span>
                              {pStatus.status === 'pardner' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  Pardner
                                </span>
                              )}
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            </div>
                            <p className="text-xs text-stone-400 flex items-center gap-2">
                              <span>Tool: {player.activeTool || 'Pickaxe'}</span>
                              <span>•</span>
                              <span className="text-amber-400 font-mono">{(player.goldFound || 0).toFixed(1)} oz</span>
                              {player.distanceToLocal !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="text-stone-300">{Math.round(player.distanceToLocal)}m</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {pStatus.status === 'pardner' ? (
                            <span className="text-[11px] text-amber-300 font-semibold px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3 text-amber-400" /> Bonded
                            </span>
                          ) : pStatus.status === 'pending_received' && pStatus.friendship ? (
                            <button
                              onClick={() => handleAcceptPardner(pStatus.friendship!.id, player.name)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow"
                            >
                              <Handshake className="w-3.5 h-3.5" /> Handshake
                            </button>
                          ) : pStatus.status === 'pending_sent' ? (
                            <span className="text-[11px] text-stone-400 px-2 py-0.5 rounded bg-stone-800 border border-stone-700">
                              ⏳ Pact Sent
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOfferPardner(player.id, player.name)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-amber-950/50 hover:bg-amber-900 text-amber-300 border border-amber-600/40 cursor-pointer"
                              title="Offer a blood pardnership"
                            >
                              <Handshake className="w-3.5 h-3.5" /> Pardner Pact
                            </button>
                          )}

                          {onTrackPlayer && (
                            <button
                              onClick={() => {
                                onTrackPlayer(player);
                                handleCloseModal();
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 cursor-pointer"
                            >
                              <Compass className="w-3.5 h-3.5" /> Locate
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab: Pardners Alliance Management */}
            {activeTab === 'pardners' && (
              <div className="mt-4 space-y-4 max-h-80 overflow-y-auto pr-1">
                {/* Pardner Lore & Benefits */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/40 to-stone-900/60 border border-amber-500/30 text-xs text-stone-300 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>Frontier Pardner Alliance</span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Pardners display prestigious golden 3D banners, share survival notifications across the canyon, and stand together against claim jumpers.
                  </p>
                </div>

                {/* Incoming Handshake Requests */}
                {(() => {
                  const selfId = friendshipService.getOrCreateProspectorId();
                  const incoming = friendships.filter(
                    (f) =>
                      f.status === 'pending' &&
                      (f.receiverId === selfId || f.receiverName.toLowerCase() === selfName.toLowerCase())
                  );

                  if (incoming.length === 0) return null;

                  return (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Handshake className="w-3.5 h-3.5 text-amber-400" /> Pending Handshakes ({incoming.length})
                      </h3>
                      {incoming.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/50"
                        >
                          <div>
                            <span className="font-bold text-stone-100 text-sm">{f.senderName}</span>
                            <p className="text-[11px] text-amber-300/80">Offered a trail pardnership pact</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAcceptPardner(f.id, f.senderName)}
                              className="px-2.5 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                            >
                              Accept Handshake
                            </button>
                            <button
                              onClick={() => handleDissolvePardner(f.id, f.senderName)}
                              className="px-2 py-1 text-xs rounded bg-stone-800 hover:bg-stone-700 text-stone-400 cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Accepted Pardners List */}
                {(() => {
                  const accepted = friendshipService.getAcceptedPardners();
                  return (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wide flex items-center justify-between">
                        <span>Loyal Pardners ({accepted.length})</span>
                      </h3>

                      {accepted.length === 0 ? (
                        <div className="p-4 text-center rounded-xl bg-stone-950/50 border border-stone-800 text-stone-500 text-xs">
                          You haven't formed any pardnerships yet. Send an invite below or shake hands in the prospector roster!
                        </div>
                      ) : (
                        accepted.map((item) => {
                          const onlinePlayer = playersList.find(
                            (p) =>
                              p.id === item.pardnerId ||
                              p.name.toLowerCase() === item.pardnerName.toLowerCase()
                          );

                          return (
                            <div
                              key={item.friendship.id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-stone-800/80 border border-amber-500/30 hover:border-amber-400/50"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-stone-100 text-sm">{item.pardnerName}</span>
                                    {onlinePlayer ? (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-semibold">
                                        On Trail
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-stone-700/40 text-stone-400">
                                        Off Mountain
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-stone-400">
                                    Alliance bonded {new Date(item.friendship.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {onlinePlayer && onTrackPlayer && (
                                  <button
                                    onClick={() => {
                                      onTrackPlayer(onlinePlayer);
                                      handleCloseModal();
                                    }}
                                    className="px-2 py-1 text-xs rounded bg-amber-900/40 hover:bg-amber-800/60 text-amber-300 border border-amber-600/40 cursor-pointer"
                                  >
                                    Locate
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDissolvePardner(item.friendship.id, item.pardnerName)}
                                  className="px-2 py-1 text-xs rounded bg-stone-800 hover:bg-red-950/60 text-stone-400 hover:text-red-300 border border-stone-700 hover:border-red-800 cursor-pointer"
                                  title="Dissolve Pardnership"
                                >
                                  Dissolve
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })()}

                {/* Direct Invite by Callsign / Name */}
                <form onSubmit={handleDirectPardnerInvite} className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                  <label className="block text-xs font-semibold text-stone-300">
                    Telegraph Pact by Prospector Name:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={directPardnerName}
                      onChange={(e) => setDirectPardnerName(e.target.value)}
                      placeholder="e.g. Dutchman Jacob or Red Rock Dan"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={!directPardnerName.trim()}
                      className="px-3 py-1.5 text-xs rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold cursor-pointer flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Dispatch
                    </button>
                  </div>
                </form>

                {/* Your Callsign Card */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950/40 border border-stone-800 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-stone-500 font-bold block">Your Frontier Callsign</span>
                    <span className="font-mono text-amber-300 text-xs font-bold">{selfName}</span>
                  </div>
                  <button
                    onClick={copyProspectorId}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] cursor-pointer"
                  >
                    {copiedProspectorId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedProspectorId ? 'Copied' : 'Copy Callsign ID'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Customize Profile & Custom Name */}
            {activeTab === 'customize' && (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-300">
                      Prospector Callsign / Custom Moniker:
                    </label>
                    <button
                      type="button"
                      onClick={rollRandomNickname}
                      className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                      title="Roll a famous Old West prospector nickname"
                    >
                      <RefreshCw className="w-3 h-3" /> Roll Western Name
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveProfile();
                        }
                      }}
                      maxLength={24}
                      className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500 font-medium"
                      placeholder="Enter your prospector name..."
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">
                    Press <kbd className="px-1 py-0.5 rounded bg-stone-800 text-amber-300 font-mono text-[9px] border border-stone-700">Enter</kbd> or click Save below to broadcast your moniker to all prospectors in the mountains.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-2">
                    Frontier Outfit Hue & Vest Tone:
                  </label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {multiplayer.colorPresets.map((preset) => (
                      <button
                        key={preset.hex}
                        onClick={() => setEditColor(preset.hex)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          editColor === preset.hex
                            ? 'border-amber-400 bg-stone-800 scale-105 shadow-md'
                            : 'border-stone-800 bg-stone-950/60 hover:border-stone-700'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full shadow border border-white/20"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <span className="text-[10px] text-stone-300 font-medium text-center truncate w-full">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-800 flex justify-end gap-2">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-xs rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 text-xs rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Save Prospector Identity
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Telegraph Message History */}
            {activeTab === 'chat' && (
              <div className="mt-4 flex flex-col h-72">
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
                  {chatMessages.length === 0 ? (
                    <div className="p-6 text-center text-stone-500 text-xs">
                      No telegraph telegrams recorded yet. Send a shout below!
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-2.5 rounded-lg bg-stone-950/60 border border-stone-800 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold" style={{ color: msg.senderColor || '#f59e0b' }}>
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-stone-200">{msg.text}</p>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend(false);
                    }}
                    placeholder="Type telegraph message..."
                    className="flex-1 px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => handleSend(false)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs cursor-pointer"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
