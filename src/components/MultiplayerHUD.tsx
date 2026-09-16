import React, { useState, useEffect, useRef } from 'react';
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
  BellOff
} from 'lucide-react';
import { MultiplayerChatMessage, MultiplayerPlayer, MultiplayerColorPreset } from '../types';
import { multiplayer } from '../multiplayer/multiplayerService';

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
}) => {
  const [showRosterModal, setShowRosterModal] = useState(false);
  // Default to collapsed or remember user preference from localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wt_telegraph_collapsed');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });
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
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<MultiplayerChatMessage | null>(null);

  const [chatText, setChatText] = useState('');
  const [editName, setEditName] = useState(selfName);
  const [editColor, setEditColor] = useState(selfColor);
  const [activeTab, setActiveTab] = useState<'roster' | 'customize' | 'chat'>('roster');

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);
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

  // Persist collapsed states
  const toggleCollapse = (newVal?: boolean) => {
    const target = typeof newVal === 'boolean' ? newVal : !isCollapsed;
    setIsCollapsed(target);
    if (!target) {
      setUnreadCount(0);
      setToastMessage(null);
    }
    try {
      localStorage.setItem('wt_telegraph_collapsed', String(target));
    } catch {}
  };

  const toggleQuickShouts = () => {
    const next = !showQuickShouts;
    setShowQuickShouts(next);
    try {
      localStorage.setItem('wt_telegraph_shouts', String(next));
    } catch {}
  };

  // Track new messages for unread badge and transient toast when collapsed
  useEffect(() => {
    if (chatMessages.length > prevMessagesCountRef.current) {
      const latest = chatMessages[chatMessages.length - 1];
      if (isCollapsed) {
        setUnreadCount((prev) => prev + 1);
        setToastMessage(latest);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = window.setTimeout(() => {
          setToastMessage(null);
        }, 5000);
      } else {
        // Auto-scroll when open
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });

        // Reset auto-collapse timer if enabled
        if (autoCollapseEnabled) {
          if (autoCollapseTimeoutRef.current) clearTimeout(autoCollapseTimeoutRef.current);
          autoCollapseTimeoutRef.current = window.setTimeout(() => {
            toggleCollapse(true);
          }, 12000);
        }
      }
    }
    prevMessagesCountRef.current = chatMessages.length;
  }, [chatMessages, isCollapsed, autoCollapseEnabled]);

  // Keyboard shortcut: Press Enter to open or focus chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') {
          return;
        }
        if (isCollapsed) {
          toggleCollapse(false);
        }
        setTimeout(() => inputRef.current?.focus(), 60);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed]);

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
    setToastMessage(null);
    setUnreadCount(0);
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) return;
    onUpdateProfile(editName.trim(), editColor);
    setShowRosterModal(false);
  };

  return (
    <>
      {/* Top Multiplayer Status Pill */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
        <button
          onClick={() => setShowRosterModal(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-900/85 hover:bg-stone-800/95 text-stone-200 border border-amber-500/30 backdrop-blur-md shadow-lg transition-all text-xs font-medium cursor-pointer"
          title="Open Frontier Expedition Roster & Chat"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span>{onlineCount} {onlineCount === 1 ? 'Prospector' : 'Prospectors'} Online</span>
          <span className="text-stone-500">|</span>
          <span className="text-amber-300 font-mono text-[11px]">{ping}ms</span>
        </button>

        <button
          onClick={() => {
            toggleCollapse(false);
            setTimeout(() => inputRef.current?.focus(), 60);
          }}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-stone-900/85 hover:bg-stone-800/95 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-lg transition-all cursor-pointer"
          title="Open Wilderness Telegraph (Press Enter)"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* Wilderness Telegraph Collapsible Floating HUD (Bottom Left)               */}
      {/* ========================================================================= */}
      <div className="fixed bottom-20 left-4 z-30 pointer-events-auto flex flex-col gap-1.5 max-w-sm w-[92vw] sm:w-96 select-none font-sans">
        
        {/* State A: Collapsed Mini Bar */}
        {isCollapsed ? (
          <div className="flex flex-col gap-1.5 items-start">
            {/* Transient Toast Notification when collapsed */}
            {toastMessage && (
              <div
                onClick={() => toggleCollapse(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-950/95 border border-amber-500/60 shadow-xl backdrop-blur-md text-xs text-amber-200 cursor-pointer animate-fade-in hover:bg-amber-900 transition-all max-w-sm"
              >
                <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                <div className="flex-1 truncate">
                  <span className="font-bold text-amber-300 mr-1.5">
                    {toastMessage.senderName}:
                  </span>
                  <span className="text-stone-200">{toastMessage.text}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setToastMessage(null);
                  }}
                  className="text-amber-400/80 hover:text-amber-200 p-0.5 rounded"
                  title="Dismiss alert"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Collapsed Pill Button */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggleCollapse(false)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800/95 text-stone-200 border border-amber-600/40 backdrop-blur-md shadow-lg transition-all text-xs font-mono font-medium group cursor-pointer"
                title="Expand Wilderness Telegraph (Press Enter)"
              >
                <Radio className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-amber-300">Wilderness Telegraph</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-stone-950 font-bold text-[10px] animate-pulse">
                    {unreadCount}
                  </span>
                )}
                <ChevronUp className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-200 transition-transform" />
              </button>

              <button
                onClick={() => {
                  toggleCollapse(false);
                  setTimeout(() => inputRef.current?.focus(), 60);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800/95 text-amber-300 border border-amber-600/40 backdrop-blur-md shadow-lg text-xs font-mono cursor-pointer transition-colors"
                title="Compose telegram (Press Enter)"
              >
                <Send className="w-3 h-3" />
                <span className="text-[11px] font-sans font-semibold">Shout [Enter]</span>
              </button>

              <button
                onClick={() => setShowRosterModal(true)}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-stone-900/90 hover:bg-stone-800/95 text-stone-400 hover:text-amber-300 border border-stone-700/60 backdrop-blur-md shadow-lg transition-colors cursor-pointer"
                title="Open Expedition Roster & Full Telegraph Log"
              >
                <Users className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* State B: Expanded Full Console with Collapsible Sub-Menus */
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
                  onClick={() => toggleCollapse(true)}
                  className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer ml-1"
                  title="Collapse Wilderness Telegraph to Mini Bar"
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
                  if (e.key === 'Enter') handleSend(false);
                  if (e.key === 'Escape') toggleCollapse(true);
                }}
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
        )}
      </div>

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
                onClick={() => setShowRosterModal(false)}
                className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

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
                    Edit
                  </button>
                </div>

                {/* Remote Players */}
                {playersList.length === 0 ? (
                  <div className="p-6 text-center text-stone-500 text-xs">
                    No other prospectors in your immediate sector right now. Share the expedition link with fellow prospectors to explore together!
                  </div>
                ) : (
                  playersList.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-stone-800/60 border border-stone-700/60 hover:border-amber-500/30 transition-all"
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

                      {onTrackPlayer && (
                        <button
                          onClick={() => {
                            onTrackPlayer(player);
                            setShowRosterModal(false);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-amber-900/40 hover:bg-amber-800/60 text-amber-300 border border-amber-600/40 cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5" /> Locate
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Customize Profile */}
            {activeTab === 'customize' && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Prospector Callsign / Handle:
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={20}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                    placeholder="Enter your prospector name..."
                  />
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
                    onClick={() => setShowRosterModal(false)}
                    className="px-4 py-2 text-xs rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 text-xs rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold cursor-pointer"
                  >
                    Save Prospector Identity
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
