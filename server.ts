import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

interface RemotePlayer {
  id: string;
  name: string;
  outfitColor: string;
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
  ping: number;
  lastUpdate: number;
}

interface SharedHole {
  id: string;
  x: number;
  z: number;
  depth: number;
  radius: number;
  stability: number;
  isShored: boolean;
  shoredUntilDepth?: number;
  lastStrataName?: string;
  dugBy?: string;
}

interface SharedMine {
  id: string;
  x: number;
  z: number;
  builderId: string;
  builderName: string;
  blueprintId: string;
  createdAt: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  type: 'chat' | 'system' | 'shout' | 'discovery';
  timestamp: number;
}

const COLOR_PRESETS = [
  { name: 'Desert Khaki', hex: '#c2a649' },
  { name: 'Crimson Ranger', hex: '#b93b2a' },
  { name: 'Turquoise Scout', hex: '#269b91' },
  { name: 'Buckskin Miner', hex: '#8c5932' },
  { name: 'Copper Pioneer', hex: '#c86f3b' },
  { name: 'Sage Drifter', hex: '#4e7a57' },
  { name: 'Indigo Outlaw', hex: '#374b73' },
  { name: 'Charcoal Prospector', hex: '#3c3b3f' },
];

const PROSPECTOR_NAMES = [
  'Dutchman Jacob',
  'Arizona Pete',
  'Canyon Jack',
  'Dusty Miller',
  'Silas Weaver',
  'Calamity Dan',
  'Doc Holliday',
  'Peralta Scout',
  'Rusty Higgins',
  'Apache Junction Jed',
  'Gold Dust Sally',
  'Black Rock Hank',
];

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  wss.on("error", (err) => {
    console.warn("[WSS] Handled WebSocket server error:", err);
  });

  server.on("error", (err) => {
    console.warn("[HTTP] Handled HTTP server error:", err);
  });

  // Authoritative in-memory state
  const players = new Map<string, RemotePlayer>();
  const sockets = new Map<string, WebSocket>();
  const dugHoles = new Map<string, SharedHole>();
  const builtMines = new Map<string, SharedMine>();
  const chatMessages: ChatMessage[] = [];

  // Helper to broadcast to all or except one
  function broadcast(payload: any, exceptId?: string) {
    const data = JSON.stringify(payload);
    for (const [id, client] of sockets.entries()) {
      if (id !== exceptId && client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
        } catch (err) {
          console.warn("[WS Broadcast] Client send failed:", id, err);
        }
      }
    }
  }

  function addChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
    const fullMsg: ChatMessage = {
      ...msg,
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    chatMessages.push(fullMsg);
    if (chatMessages.length > 60) {
      chatMessages.shift();
    }
    broadcast({ type: 'chat:message', message: fullMsg });
    return fullMsg;
  }

  // Health API
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      onlineProspectors: players.size,
      excavations: dugHoles.size,
      minesBuilt: builtMines.size,
      universalWeather,
      universalTimeOfDay,
    });
  });

  // Authoritative Universal Weather & Celestial Sky Simulation
  type WeatherType = 'clear' | 'clouds' | 'sunset' | 'storm' | 'sandstorm' | 'light_rain' | 'night';

  let universalTimeOfDay = 9.5; // Start at 9:30 AM in crisp, bright morning desert sunshine
  let universalWeather: WeatherType = 'clear';
  let currentWeatherDuration = 420; // 7 minutes of initial clear sunshine
  let currentWeatherElapsed = 0;
  let currentWeatherLabel = 'Brilliant Desert Sunlight';
  let lastSandstormTime = -9999; // Cooldown tracker for sandstorms (minimum 15 mins)
  let lastMonsoonTime = -9999;   // Cooldown tracker for monsoons (minimum 15 mins)
  let serverUptimeSeconds = 0;

  // Realistic diurnal clock pacing:
  // - 6:00 to 18:30 -> Daytime: ~14 minutes of bright golden sunlight
  // - 18:30 to 20:30 -> Sunset: ~1.3 minutes of Arizona alpenglow
  // - 20:30 to 5:00 -> Night: ~2.1 minutes of starry night
  // - 5:00 to 6:00 -> Dawn: ~33 seconds
  function advanceDiurnalTime(currentTime: number, deltaSec: number = 1): number {
    let rate: number;
    if (currentTime >= 6.0 && currentTime < 18.5) {
      rate = 0.015;
    } else if (currentTime >= 18.5 && currentTime < 20.5) {
      rate = 0.025;
    } else if (currentTime >= 20.5 || currentTime < 5.0) {
      rate = 0.065;
    } else {
      rate = 0.03;
    }
    return ((currentTime + rate * deltaSec) % 24 + 24) % 24;
  }

  function pickNextWeather(): { weather: WeatherType; durationSec: number; label: string; broadcastMsg: string } {
    const isLateAfternoon = universalTimeOfDay >= 17.5 && universalTimeOfDay < 19.5;
    const isNight = universalTimeOfDay >= 20.5 || universalTimeOfDay < 5.0;

    // During late afternoon, natural golden hour
    if (isLateAfternoon && Math.random() < 0.75) {
      return {
        weather: 'sunset',
        durationSec: 90,
        label: 'Golden Hour (Sunset)',
        broadcastMsg: "⛰️ Golden Hour across the Superstitions: The shadow of Weaver's Needle stretches long.",
      };
    }

    const roll = Math.random();
    const timeSinceSandstorm = serverUptimeSeconds - lastSandstormTime;
    const timeSinceMonsoon = serverUptimeSeconds - lastMonsoonTime;

    // Rare Haboob Dust Squall: Only ~4% chance, minimum 15 mins (900s) cooldown, brief 45-second duration
    if (roll < 0.04 && timeSinceSandstorm > 900 && !isNight) {
      lastSandstormTime = serverUptimeSeconds;
      return {
        weather: 'sandstorm',
        durationSec: 45,
        label: 'Brief Haboob Dust Squall',
        broadcastMsg: '🌪️ Dust Squall: A brief desert dust squall is gusting through the canyon! It will blow over shortly.',
      };
    }

    // Rare Monsoon Storm: Only ~4% chance, minimum 15 mins (900s) cooldown, brief 45-second duration
    if (roll < 0.08 && timeSinceMonsoon > 900) {
      lastMonsoonTime = serverUptimeSeconds;
      return {
        weather: 'storm',
        durationSec: 45,
        label: 'Passing Monsoon Thunderstorm',
        broadcastMsg: "⚡ Desert Monsoon: Distant lightning flashes illuminate Weaver's Needle with rolling thunder!",
      };
    }

    // Rare Light Rain: Only ~5% chance, duration 45 seconds
    if (roll < 0.13) {
      return {
        weather: 'light_rain',
        durationSec: 45,
        label: 'Canyon Mist & Light Rain',
        broadcastMsg: '🌧️ Refreshing desert drizzle dampens the canyon trails.',
      };
    }

    // Desert Cumulus Clouds: ~20% chance, duration 2.5 to 3.5 minutes
    if (roll < 0.33) {
      return {
        weather: 'clouds',
        durationSec: 150 + Math.floor(Math.random() * 60),
        label: isNight ? 'Passing Night Clouds' : 'Desert Cumulus Clouds',
        broadcastMsg: isNight
          ? '☁️ Thin clouds drift across the moonlit desert spires.'
          : '☁️ High desert clouds provide pleasant shade over the canyon.',
      };
    }

    // Dominant weather: Clear Sunny Desert Sky (~67% of transitions, duration 5 to 8 minutes)
    return {
      weather: 'clear',
      durationSec: 320 + Math.floor(Math.random() * 180),
      label: isNight ? 'Clear Starry Night' : 'Brilliant Desert Sunlight',
      broadcastMsg: isNight
        ? '🌌 Clear desert night: The Milky Way glows brightly over the Superstitions.'
        : '☀️ Brilliant desert sunlight illuminates the canyon rock formations.',
    };
  }

  // Run authoritative universal clock & meteorological cycle
  setInterval(() => {
    universalTimeOfDay = advanceDiurnalTime(universalTimeOfDay, 1);
    currentWeatherElapsed += 1;
    serverUptimeSeconds += 1;

    if (currentWeatherElapsed >= currentWeatherDuration) {
      currentWeatherElapsed = 0;
      const nextPhase = pickNextWeather();
      universalWeather = nextPhase.weather;
      currentWeatherDuration = nextPhase.durationSec;
      currentWeatherLabel = nextPhase.label;

      // Broadcast system weather announcement in chat
      addChatMessage({
        senderId: 'system_weather',
        senderName: 'Desert Weather Station',
        senderColor: '#38bdf8',
        text: nextPhase.broadcastMsg,
        type: 'system',
      });

      broadcast({
        type: 'weather:sync',
        weather: universalWeather,
        timeOfDay: universalTimeOfDay,
        label: nextPhase.label,
      });
    } else if (currentWeatherElapsed % 4 === 0) {
      // Periodic synchronization of celestial time every 4 seconds
      broadcast({
        type: 'weather:sync',
        weather: universalWeather,
        timeOfDay: universalTimeOfDay,
        label: currentWeatherLabel,
      });
    }
  }, 1000);

  // WebSocket connection handling
  wss.on("connection", (ws: WebSocket) => {
    const playerId = 'prospector_' + Math.random().toString(36).substring(2, 8);
    const randomPreset = COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)];
    const randomName = PROSPECTOR_NAMES[Math.floor(Math.random() * PROSPECTOR_NAMES.length)];

    const newPlayer: RemotePlayer = {
      id: playerId,
      name: randomName,
      outfitColor: randomPreset.hex,
      x: 0 + (Math.random() - 0.5) * 6,
      y: 7.2,
      z: -246 + (Math.random() - 0.5) * 6,
      yaw: 0,
      pitch: 0,
      action: 'idle',
      activeTool: 'pickaxe',
      goldFound: 2.0,
      rocksGathered: 0,
      health: 100,
      ping: 0,
      lastUpdate: Date.now(),
    };

    players.set(playerId, newPlayer);
    sockets.set(playerId, ws);

    ws.on("error", (err) => {
      console.warn(`[WS Client ${playerId}] Handled socket error:`, err);
    });

    // 1. Send Init payload to the connecting player
    try {
      ws.send(JSON.stringify({
        type: 'init',
        selfId: playerId,
        selfData: newPlayer,
        players: Array.from(players.values()),
        holes: Array.from(dugHoles.values()),
        mines: Array.from(builtMines.values()),
        recentChat: chatMessages.slice(-25),
        colorPresets: COLOR_PRESETS,
        universalWeather,
        universalTimeOfDay,
      }));
    } catch (err) {
      console.warn(`[WS Client ${playerId}] Failed to send init:`, err);
    }

    // 2. Announce join to everyone else
    broadcast({
      type: 'player:joined',
      player: newPlayer,
    }, playerId);

    addChatMessage({
      senderId: 'system',
      senderName: 'Wilderness Telegraph',
      senderColor: '#eab308',
      text: `${newPlayer.name} has arrived at the Superstition Mountains expedition camp!`,
      type: 'system',
    });

    // 3. Message dispatcher
    ws.on("message", (raw: string) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong', clientTime: msg.time, serverTime: Date.now() }));
            break;
          }

          case 'player:update': {
            const p = players.get(playerId);
            if (!p) return;
            p.x = typeof msg.x === 'number' ? msg.x : p.x;
            p.y = typeof msg.y === 'number' ? msg.y : p.y;
            p.z = typeof msg.z === 'number' ? msg.z : p.z;
            p.yaw = typeof msg.yaw === 'number' ? msg.yaw : p.yaw;
            p.pitch = typeof msg.pitch === 'number' ? msg.pitch : p.pitch;
            p.action = msg.action || p.action;
            p.activeTool = msg.activeTool || p.activeTool;
            p.goldFound = typeof msg.goldFound === 'number' ? msg.goldFound : p.goldFound;
            p.rocksGathered = typeof msg.rocksGathered === 'number' ? msg.rocksGathered : p.rocksGathered;
            p.health = typeof msg.health === 'number' ? msg.health : p.health;
            p.ping = typeof msg.ping === 'number' ? msg.ping : p.ping;
            p.lastUpdate = Date.now();

            // Broadcast movement/state to others
            broadcast({
              type: 'player:moved',
              id: playerId,
              x: p.x,
              y: p.y,
              z: p.z,
              yaw: p.yaw,
              pitch: p.pitch,
              action: p.action,
              activeTool: p.activeTool,
              goldFound: p.goldFound,
              rocksGathered: p.rocksGathered,
              health: p.health,
            }, playerId);
            break;
          }

          case 'player:profile': {
            const p = players.get(playerId);
            if (!p) return;
            if (msg.name && typeof msg.name === 'string') {
              p.name = msg.name.trim().substring(0, 24);
            }
            if (msg.outfitColor && typeof msg.outfitColor === 'string') {
              p.outfitColor = msg.outfitColor;
            }
            broadcast({
              type: 'player:profile_updated',
              player: p,
            });
            break;
          }

          case 'player:action': {
            // e.g. swinging pickaxe, digging dirt, firing flare
            broadcast({
              type: 'player:action',
              id: playerId,
              action: msg.action,
              tool: msg.tool,
              target: msg.target,
            }, playerId);
            break;
          }

          case 'terrain:dig': {
            // Player dug a hole or expanded existing trench
            const holeData: SharedHole = {
              id: msg.hole.id || ('hole_' + Math.round(msg.hole.x) + '_' + Math.round(msg.hole.z)),
              x: msg.hole.x,
              z: msg.hole.z,
              depth: msg.hole.depth,
              radius: msg.hole.radius || 1.85,
              stability: msg.hole.stability ?? 100,
              isShored: !!msg.hole.isShored,
              shoredUntilDepth: msg.hole.shoredUntilDepth,
              lastStrataName: msg.hole.lastStrataName,
              dugBy: players.get(playerId)?.name || 'Unknown Miner',
            };

            dugHoles.set(holeData.id, holeData);

            broadcast({
              type: 'terrain:dug',
              hole: holeData,
              dugByPlayerId: playerId,
              tool: msg.tool,
            }, playerId);
            break;
          }

          case 'terrain:shore': {
            const h = dugHoles.get(msg.holeId);
            if (h) {
              h.isShored = true;
              h.stability = msg.stability ?? 100;
              h.shoredUntilDepth = msg.shoredUntilDepth ?? h.depth;
            }
            broadcast({
              type: 'terrain:shored',
              holeId: msg.holeId,
              stability: msg.stability,
              shoredUntilDepth: msg.shoredUntilDepth,
              shoredBy: players.get(playerId)?.name,
            });
            addChatMessage({
              senderId: playerId,
              senderName: players.get(playerId)?.name || 'Prospector',
              senderColor: players.get(playerId)?.outfitColor || '#8c5932',
              text: `Reinforced trench with heavy pine timber cribbing at [${Math.round(msg.x || 0)}, ${Math.round(msg.z || 0)}]!`,
              type: 'chat',
            });
            break;
          }

          case 'terrain:blast': {
            // Dynamite blast event
            broadcast({
              type: 'terrain:blasted',
              x: msg.x,
              y: msg.y,
              z: msg.z,
              radius: msg.radius,
              blastedBy: players.get(playerId)?.name,
            });
            addChatMessage({
              senderId: playerId,
              senderName: players.get(playerId)?.name || 'Prospector',
              senderColor: '#ef4444',
              text: `FIRE IN THE HOLE! Detonated dynamite stick at [${Math.round(msg.x)}, ${Math.round(msg.z)}]!`,
              type: 'shout',
            });
            break;
          }

          case 'mine:build': {
            const mine: SharedMine = {
              id: 'mine_' + Date.now(),
              x: msg.x,
              z: msg.z,
              builderId: playerId,
              builderName: players.get(playerId)?.name || 'Prospector',
              blueprintId: msg.blueprintId,
              createdAt: Date.now(),
            };
            builtMines.set(mine.id, mine);
            broadcast({
              type: 'mine:built',
              mine,
            });
            addChatMessage({
              senderId: playerId,
              senderName: mine.builderName,
              senderColor: '#22c55e',
              text: `Constructed an authentic timber mine portal shaft at [${Math.round(msg.x)}, ${Math.round(msg.z)}]!`,
              type: 'discovery',
            });
            break;
          }

          case 'chat:send': {
            const p = players.get(playerId);
            if (!p || !msg.text) return;
            const text = String(msg.text).trim().substring(0, 160);
            if (!text) return;

            const lower = text.toLowerCase();
            if (lower === '/rain' || lower === '/light_rain') {
              universalWeather = 'light_rain';
              currentWeatherElapsed = 0;
              currentWeatherDuration = 90;
              currentWeatherLabel = 'Canyon Mist & Light Rain';
              broadcast({
                type: 'weather:sync',
                weather: universalWeather,
                timeOfDay: universalTimeOfDay,
                label: currentWeatherLabel,
              });
              addChatMessage({
                senderId: 'system_weather',
                senderName: 'Desert Sky Watch',
                senderColor: '#38bdf8',
                text: '🌧️ Refreshing desert rain gathers across the mountains! Streams and pools begin to fill.',
                type: 'system',
              });
              break;
            } else if (lower === '/storm' || lower === '/monsoon') {
              universalWeather = 'storm';
              currentWeatherElapsed = 0;
              currentWeatherDuration = 90;
              currentWeatherLabel = 'Monsoon Thunderstorm';
              broadcast({
                type: 'weather:sync',
                weather: universalWeather,
                timeOfDay: universalTimeOfDay,
                label: currentWeatherLabel,
              });
              addChatMessage({
                senderId: 'system_weather',
                senderName: 'Desert Sky Watch',
                senderColor: '#38bdf8',
                text: '⚡ Summer monsoon arrives! Torrential rainfall surges down the canyon washes and fills the mountain tinajas!',
                type: 'system',
              });
              break;
            } else if (lower === '/clear' || lower === '/sun') {
              universalWeather = 'clear';
              currentWeatherElapsed = 0;
              currentWeatherDuration = 300;
              currentWeatherLabel = 'Brilliant Desert Sunlight';
              broadcast({
                type: 'weather:sync',
                weather: universalWeather,
                timeOfDay: universalTimeOfDay,
                label: currentWeatherLabel,
              });
              addChatMessage({
                senderId: 'system_weather',
                senderName: 'Desert Sky Watch',
                senderColor: '#38bdf8',
                text: '☀️ The rain clouds clear away. Desert sun shines over the glistening washes and rock pools.',
                type: 'system',
              });
              break;
            }

            addChatMessage({
              senderId: playerId,
              senderName: p.name,
              senderColor: p.outfitColor,
              text,
              type: msg.shout ? 'shout' : 'chat',
            });
            break;
          }

          case 'weather:change': {
            if (msg.weather) {
              universalWeather = msg.weather;
              currentWeatherElapsed = 0;
              currentWeatherDuration = 120;
              currentWeatherLabel = msg.weather === 'storm' ? 'Monsoon Thunderstorm' : (msg.weather === 'light_rain' ? 'Desert Shower' : 'Clear Desert Sky');
              broadcast({
                type: 'weather:sync',
                weather: universalWeather,
                timeOfDay: universalTimeOfDay,
                label: currentWeatherLabel,
              });
            }
            break;
          }

          case 'event:discovery': {
            const p = players.get(playerId);
            addChatMessage({
              senderId: playerId,
              senderName: p?.name || 'Prospector',
              senderColor: '#f59e0b',
              text: `Discovered: ${msg.title}! (${msg.detail})`,
              type: 'discovery',
            });
            break;
          }
        }
      } catch (err) {
        console.error("Error processing WS message:", err);
      }
    });

    ws.on("close", () => {
      const leftPlayer = players.get(playerId);
      players.delete(playerId);
      sockets.delete(playerId);

      if (leftPlayer) {
        broadcast({
          type: 'player:left',
          id: playerId,
          name: leftPlayer.name,
        });

        addChatMessage({
          senderId: 'system',
          senderName: 'Wilderness Telegraph',
          senderColor: '#a8a29e',
          text: `${leftPlayer.name} has rode out of the Superstition Mountains.`,
          type: 'system',
        });
      }
    });
  });

  // Periodic heartbeat cleanup of stale ghost players
  setInterval(() => {
    const now = Date.now();
    for (const [id, p] of players.entries()) {
      if (now - p.lastUpdate > 45000) {
        players.delete(id);
        const ws = sockets.get(id);
        if (ws) {
          try { ws.close(); } catch {}
          sockets.delete(id);
        }
        broadcast({ type: 'player:left', id, name: p.name });
      }
    }
  }, 15000);

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Lost Dutchman Multiplayer Server running on http://localhost:${PORT}`);
  });
}

process.on("uncaughtException", (err) => {
  console.warn("[Process] Handled uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.warn("[Process] Handled unhandled rejection:", reason);
});

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
