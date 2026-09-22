import { MultiplayerChatMessage, MultiplayerColorPreset, MultiplayerPlayer, WeatherType } from '../types';
import { safeLocalStorage } from '../utils/storage';

export type MultiplayerEventHandler = {
  onConnected?: (selfId: string, selfData: any) => void;
  onDisconnected?: () => void;
  onPlayersSync?: (players: MultiplayerPlayer[]) => void;
  onPlayerJoined?: (player: MultiplayerPlayer) => void;
  onPlayerMoved?: (data: {
    id: string;
    name?: string;
    outfitColor?: string;
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    action: string;
    activeTool: string;
    goldFound: number;
    rocksGathered: number;
    health: number;
    isRiding?: boolean;
    isAiming?: boolean;
    carriedRock?: boolean;
    isHunkered?: boolean;
    currentActivity?: string;
  }) => void;
  onPlayerProfileUpdated?: (player: MultiplayerPlayer) => void;
  onPlayerLeft?: (id: string, name: string) => void;
  onPlayerAction?: (data: {
    id: string;
    action: string;
    tool: string;
    target?: any;
    activity?: string;
    origin?: any;
  }) => void;
  onTerrainDug?: (data: { hole: any; dugByPlayerId: string; tool?: string }) => void;
  onTerrainShored?: (data: { holeId: string; stability?: number; shoredUntilDepth?: number; shoredBy?: string }) => void;
  onTerrainBlasted?: (data: { x: number; y: number; z: number; radius: number; blastedBy?: string }) => void;
  onMineBuilt?: (mine: any) => void;
  onChatMessage?: (msg: MultiplayerChatMessage) => void;
  onPingUpdated?: (ping: number) => void;
  onWeatherSync?: (data: { weather: WeatherType; timeOfDay: number; label?: string }) => void;
};

class MultiplayerService {
  private ws: WebSocket | null = null;
  private selfId: string | null = null;
  private handlers: MultiplayerEventHandler = {};
  private handlerSets = new Set<MultiplayerEventHandler>();
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private isConnecting = false;
  private lastPingSent = 0;
  private currentPing = 0;
  private throttledUpdateTimer: any = null;
  private pendingUpdate: any = null;

  private state: {
    players: Record<string, MultiplayerPlayer>;
    chatMessages: MultiplayerChatMessage[];
    ping: number;
    universalWeather: WeatherType;
    universalTimeOfDay: number;
  } = {
    players: {},
    chatMessages: [],
    ping: 35,
    universalWeather: 'clear',
    universalTimeOfDay: 9.5,
  };
  private subscribers = new Set<() => void>();

  public subscribe(fn: () => void) {
    this.subscribers.add(fn);
  }

  public unsubscribe(fn: () => void) {
    this.subscribers.delete(fn);
  }

  private notify() {
    this.subscribers.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error(err);
      }
    });
  }

  public getState() {
    return this.state;
  }

  public getPlayers(): MultiplayerPlayer[] {
    return Object.values(this.state.players).filter((p) => p.id !== this.selfId);
  }

  public getPlayer(id: string): MultiplayerPlayer | undefined {
    return this.state.players[id];
  }

  public getSelfName(): string {
    let name = safeLocalStorage.getItem('prospector_name');
    if (!name || name.trim() === '' || name.trim() === 'Canyon Jack') {
      const frontierNames = [
        'Dusty Pete', 'Silver Annie', 'Dutchman Jacob',
        'Yukon Dan', 'Apache Scout', 'Sierra Belle', 'Klondike Kate',
        'Mustang Sally', 'Red Rock Slim', 'Trailblazer Cole', 'Grizzly Jake',
        'Wild Bill', 'Calamity Jane', 'Panhandle Slim', 'Sourdough Sam'
      ];
      const pick = frontierNames[Math.floor(Math.random() * frontierNames.length)];
      const num = Math.floor(10 + Math.random() * 90);
      name = `${pick} #${num}`;
      safeLocalStorage.setItem('prospector_name', name);
    }
    return name;
  }

  public getSelfColor(): string {
    return safeLocalStorage.getItem('prospector_color') || '#8c5932';
  }

  public getUniversalWeather(): WeatherType {
    return this.state.universalWeather;
  }

  public getUniversalTimeOfDay(): number {
    return this.state.universalTimeOfDay;
  }

  public colorPresets: MultiplayerColorPreset[] = [
    { name: 'Desert Khaki', hex: '#c2a649' },
    { name: 'Crimson Ranger', hex: '#b93b2a' },
    { name: 'Turquoise Scout', hex: '#269b91' },
    { name: 'Buckskin Miner', hex: '#8c5932' },
    { name: 'Copper Pioneer', hex: '#c86f3b' },
    { name: 'Sage Drifter', hex: '#4e7a57' },
    { name: 'Indigo Outlaw', hex: '#374b73' },
    { name: 'Charcoal Prospector', hex: '#3c3b3f' },
  ];

  public addEventHandler(handlers: MultiplayerEventHandler): () => void {
    this.handlerSets.add(handlers);

    // If players are already synced from server init, immediately deliver to caller
    const currentOthers = this.getPlayers();
    if (currentOthers.length > 0 && handlers.onPlayersSync) {
      try {
        handlers.onPlayersSync(currentOthers);
      } catch (err) {
        console.error('[Multiplayer] Error in initial onPlayersSync:', err);
      }
    }

    return () => {
      this.handlerSets.delete(handlers);
    };
  }

  public setHandlers(handlers: MultiplayerEventHandler) {
    this.handlers = { ...this.handlers, ...handlers };
    this.addEventHandler(handlers);
  }

  private dispatch<K extends keyof MultiplayerEventHandler>(
    event: K,
    ...args: Parameters<NonNullable<MultiplayerEventHandler[K]>>
  ) {
    const invokedFunctions = new Set<Function>();
    const trigger = (target: MultiplayerEventHandler) => {
      const fn = target[event] as any;
      if (typeof fn === 'function' && !invokedFunctions.has(fn)) {
        invokedFunctions.add(fn);
        try {
          fn(...args);
        } catch (err) {
          console.error(`[Multiplayer] Error in handler for ${String(event)}:`, err);
        }
      }
    };

    trigger(this.handlers);
    this.handlerSets.forEach(trigger);
  }

  public getSelfId(): string | null {
    return this.selfId;
  }

  public getPing(): number {
    return this.currentPing;
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      const queryName = encodeURIComponent(this.getSelfName());
      const queryColor = encodeURIComponent(this.getSelfColor());
      const wsUrl = `${wsProtocol}//${window.location.host}/ws?name=${queryName}&color=${queryColor}`;

      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        this.isConnecting = false;
        // Start ping heartbeat
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.isConnected()) {
            this.lastPingSent = performance.now();
            this.sendRaw({ type: 'ping', time: this.lastPingSent });
          }
        }, 4000);

        // Immediately synchronize player profile name and color to server
        this.sendRaw({
          type: 'player:profile',
          name: this.getSelfName(),
          outfitColor: this.getSelfColor(),
        });
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('[Multiplayer] Failed to parse message', e);
        }
      };

      socket.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (this.handlers.onDisconnected) this.handlers.onDisconnected();

        // Auto-reconnect after 3 seconds
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
          }, 3000);
        }
      };

      socket.onerror = (err) => {
        console.warn('[Multiplayer] Socket connection issue', err);
      };
    } catch (err) {
      console.error('[Multiplayer] Error initiating connection', err);
      this.isConnecting = false;
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.selfId = null;
  }

  private handleMessage(msg: any) {
    switch (msg.type) {
      case 'init': {
        this.selfId = msg.selfId;
        if (msg.colorPresets) this.colorPresets = msg.colorPresets;
        if (msg.players) {
          const dict: Record<string, MultiplayerPlayer> = {};
          for (const p of msg.players) {
            if (p.id !== this.selfId) dict[p.id] = p;
          }
          this.state.players = dict;
        }
        if (msg.recentChat) {
          this.state.chatMessages = [...msg.recentChat];
        }

        // Immediately sync our local prospector name and outfit color to the server and all peers
        const localName = this.getSelfName();
        const localColor = this.getSelfColor();
        this.sendRaw({
          type: 'player:profile',
          name: localName,
          outfitColor: localColor,
        });

        this.notify();
        this.dispatch('onConnected', msg.selfId, msg.selfData);
        if (msg.players) {
          this.dispatch('onPlayersSync', msg.players);
        }
        if (msg.recentChat) {
          for (const c of msg.recentChat) {
            this.dispatch('onChatMessage', c);
          }
        }
        if (msg.holes) {
          for (const h of msg.holes) {
            this.dispatch('onTerrainDug', { hole: h, dugByPlayerId: 'server_init' });
          }
        }
        if (msg.universalWeather) {
          this.state.universalWeather = msg.universalWeather;
        }
        if (typeof msg.universalTimeOfDay === 'number') {
          this.state.universalTimeOfDay = msg.universalTimeOfDay;
        }
        if (msg.universalWeather) {
          this.dispatch('onWeatherSync', {
            weather: msg.universalWeather,
            timeOfDay: typeof msg.universalTimeOfDay === 'number' ? msg.universalTimeOfDay : 9.5,
          });
        }
        break;
      }

      case 'pong': {
        const roundTrip = Math.round(performance.now() - this.lastPingSent);
        this.currentPing = roundTrip;
        this.state.ping = roundTrip;
        this.notify();
        this.dispatch('onPingUpdated', roundTrip);
        break;
      }

      case 'player:joined': {
        if (msg.player && msg.player.id !== this.selfId) {
          this.state.players[msg.player.id] = msg.player;
          this.notify();
        }
        this.dispatch('onPlayerJoined', msg.player);
        break;
      }

      case 'player:moved': {
        if (!this.state.players[msg.id]) {
          this.state.players[msg.id] = {
            id: msg.id,
            name: msg.name || 'Prospector',
            outfitColor: msg.outfitColor || '#8c5932',
            x: msg.x,
            y: msg.y,
            z: msg.z,
            yaw: msg.yaw,
            pitch: msg.pitch,
            action: msg.action,
            activeTool: msg.activeTool,
            goldFound: msg.goldFound,
            rocksGathered: msg.rocksGathered,
            health: msg.health,
            isRiding: msg.isRiding,
            isAiming: msg.isAiming,
            carriedRock: msg.carriedRock,
            isHunkered: msg.isHunkered,
            currentActivity: msg.currentActivity,
            ping: 0,
            lastUpdate: Date.now(),
          };
          this.notify();
        } else {
          const prev = this.state.players[msg.id];
          const nameChanged = Boolean(msg.name && msg.name !== prev.name);
          const colorChanged = Boolean(msg.outfitColor && msg.outfitColor !== prev.outfitColor);
          Object.assign(prev, {
            x: msg.x,
            y: msg.y,
            z: msg.z,
            yaw: msg.yaw,
            pitch: msg.pitch,
            action: msg.action,
            activeTool: msg.activeTool,
            goldFound: msg.goldFound,
            rocksGathered: msg.rocksGathered,
            health: msg.health,
            isRiding: msg.isRiding,
            isAiming: msg.isAiming,
            carriedRock: msg.carriedRock,
            isHunkered: msg.isHunkered,
            currentActivity: msg.currentActivity,
            ...(msg.name ? { name: msg.name } : {}),
            ...(msg.outfitColor ? { outfitColor: msg.outfitColor } : {}),
          });
          if (nameChanged || colorChanged) {
            this.notify();
          }
        }
        this.dispatch('onPlayerMoved', msg);
        break;
      }

      case 'player:profile_updated': {
        if (msg.player) {
          if (msg.player.id === this.selfId) {
            safeLocalStorage.setItem('prospector_name', msg.player.name);
            safeLocalStorage.setItem('prospector_color', msg.player.outfitColor);
          } else {
            this.state.players[msg.player.id] = {
              ...(this.state.players[msg.player.id] || {}),
              ...msg.player,
            };
          }
          this.notify();
        }
        this.dispatch('onPlayerProfileUpdated', msg.player);
        break;
      }

      case 'player:action': {
        this.dispatch('onPlayerAction', msg);
        break;
      }

      case 'terrain:dug': {
        this.dispatch('onTerrainDug', msg);
        break;
      }

      case 'terrain:shored': {
        this.dispatch('onTerrainShored', msg);
        break;
      }

      case 'terrain:blasted': {
        this.dispatch('onTerrainBlasted', msg);
        break;
      }

      case 'mine:built': {
        this.dispatch('onMineBuilt', msg.mine);
        break;
      }

      case 'chat:message': {
        if (msg.message) {
          this.state.chatMessages.push(msg.message);
          if (this.state.chatMessages.length > 50) this.state.chatMessages.shift();
          this.notify();
          this.dispatch('onChatMessage', msg.message);
        }
        break;
      }

      case 'weather:sync': {
        if (msg.weather) {
          this.state.universalWeather = msg.weather;
        }
        if (typeof msg.timeOfDay === 'number') {
          this.state.universalTimeOfDay = msg.timeOfDay;
        }
        this.notify();
        this.dispatch('onWeatherSync', {
          weather: msg.weather,
          timeOfDay: msg.timeOfDay,
          label: msg.label,
        });
        break;
      }

      case 'player:left': {
        delete this.state.players[msg.id];
        this.notify();
        this.dispatch('onPlayerLeft', msg.id, msg.name);
        break;
      }
    }
  }

  private sendRaw(data: any) {
    if (this.isConnected()) {
      this.ws?.send(JSON.stringify(data));
    }
  }

  public updateProfile(name: string, outfitColor: string) {
    const cleanName = name ? name.trim().substring(0, 24) : '';
    if (cleanName) {
      safeLocalStorage.setItem('prospector_name', cleanName);
    }
    if (outfitColor) {
      safeLocalStorage.setItem('prospector_color', outfitColor);
    }
    if (this.selfId && this.state.players[this.selfId]) {
      if (cleanName) this.state.players[this.selfId].name = cleanName;
      if (outfitColor) this.state.players[this.selfId].outfitColor = outfitColor;
    }
    this.notify();
    this.sendRaw({
      type: 'player:profile',
      name: cleanName || this.getSelfName(),
      outfitColor: outfitColor || this.getSelfColor(),
    });
  }

  // Throttled position update (send at ~20Hz to keep network clean and responsive)
  public queuePositionUpdate(data: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    action: string;
    activeTool: string;
    goldFound: number;
    rocksGathered: number;
    health: number;
    isRiding?: boolean;
    isAiming?: boolean;
    carriedRock?: boolean;
    isHunkered?: boolean;
    currentActivity?: string;
  }) {
    this.pendingUpdate = data;
    if (!this.throttledUpdateTimer) {
      this.throttledUpdateTimer = setTimeout(() => {
        this.throttledUpdateTimer = null;
        if (this.pendingUpdate) {
          this.sendRaw({
            type: 'player:update',
            ...this.pendingUpdate,
            name: this.getSelfName(),
            outfitColor: this.getSelfColor(),
            ping: this.currentPing,
          });
        }
      }, 50); // 20 updates/sec
    }
  }

  public broadcastAction(action: string, tool: string, extra?: { target?: any; activity?: string; origin?: any; x?: number; y?: number; z?: number }) {
    this.sendRaw({
      type: 'player:action',
      action,
      tool,
      target: extra?.target,
      activity: extra?.activity,
      origin: extra?.origin,
      x: extra?.x,
      y: extra?.y,
      z: extra?.z,
    });
  }

  public broadcastDig(hole: any, tool: string) {
    this.sendRaw({
      type: 'terrain:dig',
      hole: {
        id: hole.id,
        x: hole.x,
        z: hole.z,
        depth: hole.depth,
        radius: hole.radius,
        stability: hole.stability,
        isShored: hole.isShored,
        shoredUntilDepth: hole.shoredUntilDepth,
        lastStrataName: hole.lastStrataName,
      },
      tool,
    });
  }

  public broadcastShore(holeId: string, x: number, z: number, stability: number, shoredUntilDepth: number) {
    this.sendRaw({
      type: 'terrain:shore',
      holeId,
      x,
      z,
      stability,
      shoredUntilDepth,
    });
  }

  public broadcastBlast(x: number, y: number, z: number, radius: number) {
    this.sendRaw({
      type: 'terrain:blast',
      x,
      y,
      z,
      radius,
    });
  }

  public broadcastMineBuild(x: number, z: number, blueprintId: string) {
    this.sendRaw({
      type: 'mine:build',
      x,
      z,
      blueprintId,
    });
  }

  public sendChat(text: string, shout: boolean = false) {
    this.sendRaw({
      type: 'chat:send',
      text,
      shout,
    });
  }

  public broadcastDiscovery(title: string, detail: string) {
    this.sendRaw({
      type: 'event:discovery',
      title,
      detail,
    });
  }

  public changeWeather(weather: WeatherType) {
    this.state.universalWeather = weather;
    this.sendRaw({
      type: 'weather:change',
      weather,
    });
    if (this.handlers.onWeatherSync) {
      this.handlers.onWeatherSync({
        weather,
        timeOfDay: this.state.universalTimeOfDay,
      });
    }
  }
}

export const multiplayer = new MultiplayerService();
