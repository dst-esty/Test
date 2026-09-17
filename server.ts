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
        client.send(data);
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

  const WEATHER_CYCLE: { weather: WeatherType; durationSec: number; label: string; broadcastMsg: string }[] = [
    {
      weather: 'sunset',
      durationSec: 180,
      label: 'Golden Hour (4:00 PM)',
      broadcastMsg: "⛰️ Golden Hour in Superstition Mountains: The shadow of Weaver's Needle points the way.",
    },
    {
      weather: 'clear',
      durationSec: 160,
      label: 'Clear Desert Sky',
      broadcastMsg: '☀️ Brilliant desert sunlight warms the canyon rock formations.',
    },
    {
      weather: 'sandstorm',
      durationSec: 150,
      label: 'Haboob Dust Storm',
      broadcastMsg: '🌪️ Haboob Alert: A violent desert sandstorm is sweeping across the canyon! Keep your claims secured.',
    },
    {
      weather: 'clouds',
      durationSec: 140,
      label: 'Desert Cumulus Clouds',
      broadcastMsg: '☁️ Desert cumulus clouds roll over the spires, providing brief respite from the sun.',
    },
    {
      weather: 'light_rain',
      durationSec: 130,
      label: 'Canyon Mist & Rain',
      broadcastMsg: '🌧️ Refreshing rain begins falling across the Superstitions, moistening the dry dirt.',
    },
    {
      weather: 'storm',
      durationSec: 150,
      label: 'Monsoon Thunderstorm',
      broadcastMsg: '⚡ Desert Monsoon: Lightning flashes illuminate Weaver\'s Needle with roaring thunder!',
    },
    {
      weather: 'night',
      durationSec: 160,
      label: 'Starry Desert Night',
      broadcastMsg: '🌌 Deep desert night settles in. The Milky Way stretches from horizon to horizon.',
    },
  ];

  let weatherCycleIndex = 0;
  let weatherElapsed = 0;
  let universalTimeOfDay = 16.0; // 4:00 PM iconic alignment
  let universalWeather: WeatherType = WEATHER_CYCLE[0].weather;

  // Run authoritative universal clock & meteorological cycle
  setInterval(() => {
    // Universal time advances: 1 real second = ~0.04 game hours (1 day = 10 minutes)
    universalTimeOfDay = (universalTimeOfDay + 0.04) % 24;
    weatherElapsed += 1;

    const currentPhase = WEATHER_CYCLE[weatherCycleIndex];
    if (weatherElapsed >= currentPhase.durationSec) {
      weatherElapsed = 0;
      weatherCycleIndex = (weatherCycleIndex + 1) % WEATHER_CYCLE.length;
      const nextPhase = WEATHER_CYCLE[weatherCycleIndex];
      universalWeather = nextPhase.weather;

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
    } else if (weatherElapsed % 4 === 0) {
      // Periodic synchronization of celestial time every 4 seconds
      broadcast({
        type: 'weather:sync',
        weather: universalWeather,
        timeOfDay: universalTimeOfDay,
        label: currentPhase.label,
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
      x: 0 + (Math.random() - 0.5) * 8,
      y: 1.6,
      z: 15 + (Math.random() - 0.5) * 8,
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

    // 1. Send Init payload to the connecting player
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

            addChatMessage({
              senderId: playerId,
              senderName: p.name,
              senderColor: p.outfitColor,
              text,
              type: msg.shout ? 'shout' : 'chat',
            });
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

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
