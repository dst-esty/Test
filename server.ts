import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";

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
  isRiding?: boolean;
  isAiming?: boolean;
  carriedRock?: boolean;
  isHunkered?: boolean;
  currentActivity?: string;
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
  app.use(express.json());
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Lazy Gemini AI Client Initialization
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    if (!aiClient) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return aiClient;
  }

  // Townfolk Frontier Personalities for Chat
  const NPC_PROMPTS: Record<string, string> = {
    old_dusty_pete: "You are Old Dusty Pete, an 1880s grizzled veteran gold prospector in Tortilla Flat, Arizona Territory. You have searched the Superstition Mountains for decades. You know about Weaver's Needle, Peralta stone maps, flash floods, and panning for gold. Speak with authentic 1880s frontier miner jargon ('reckon', 'pardner', 'placer', 'color', 'by gum'). Keep your spoken answer under 3 sentences, vivid, and memorable.",
    barkeep_hank: "You are Hank 'Dutch' Miller, the jovial, hearty saloonkeeper of the historic Tortilla Flat Saloon in 1880s Arizona. You serve cold sarsaparilla, beans, canteens, and mining gear while listening to prospectors' tall tales. Keep your spoken answer under 3 sentences in a warm Western barkeep voice.",
    hostler_silas: "You are Silas 'Red' McCurdy, the energetic Irish-American wrangler and hostler at the Tortilla Flat Livery. You know pack burros, mules, trail saddles, and water holes like family. Keep your spoken answer under 3 sentences with hearty horseman charm.",
    sheriff_wyatt: "You are Sheriff Wyatt Vance, steady territorial lawman of Tortilla Flat. You respect registered mining claims, enforce peace without nonsense, and warn miners of canyon ambushers and heat exhaustion. Keep your spoken answer under 3 sentences with quiet, firm authority.",
    assayer_walker: "You are Judge Hiram Walker, U.S. Mineral Assayer in Tortilla Flat. You use precision balances and acid reagents to test gold ore vs fool's gold. You speak eloquently with educated 1880s territorial dignity. Keep your spoken answer under 3 sentences.",
    stage_jedediah: "You are Jedediah 'Whip' Cole, weathered Concord stagecoach driver on the Apache Trail. You know every hairpin curve from Apache Junction to the Salt River. Keep your spoken answer under 3 sentences.",
    clara_miller: "You are Clara Miller, frontier homesteader and desert herbalist in Tortilla Flat. You know agave roasting, desert barrel cactus water, and rattlesnake remedies. Keep your spoken answer under 3 sentences with gentle frontier wisdom.",
    gus_blacksmith: "You are Gus Trombley, the robust town blacksmith and farrier in Tortilla Flat. You forge tempered pickaxes, shoring bolts, and horseshoes with an anvil's roar. Keep your spoken answer under 3 sentences.",
  };

  // Fallback responses if Gemini API key is not configured or network fails
  const NPC_FALLBACKS: Record<string, string[]> = {
    old_dusty_pete: [
      "Keep yer eyes peeled for red hematite float in the dry washes, pardner! Where there's hematite and black magnetic sand, heavy yellow gold is resting right on the bedrock.",
      "Weaver's Needle casts a long shadow when the sun drops low. The old Peralta maps claim that shadow points straight to the sealed shaft, but mind the canyon sidewinders!",
      "Jacob Waltz was a secretive German devil. He'd come into town with coarse high-grade ore wrapped in buckskin, pay his tab in raw nuggets, and disappear before dawn into the needle spires.",
      "By gum... Adolph Ruth thought his Mexican maps would protect him, but those volcanic canyons have eyes. Finding his skull nearly a mile from his camp with two rifle slugs through the bone—that wasn't no panther or thirst, pardner. That was cold execution by someone guarding the Dutchman's secret.",
      "I seen searchers lose their wits, but losing your head? That 1947 fellow Cravey flew in on a flying machine and ended up headless in his own bedroll. The Superstitions don't just kill men who seek Waltz's gold—they take their skulls as warnings.",
    ],
    barkeep_hank: [
      "Welcome into the Saloon, friend! Dust your boots and pull up a cedar stool. Fresh canteens and hot salt-pork beans are on the counter whenever you need replenishment.",
      "I hear all kinds of talk over these floorboards. Just yesterday a team from Phoenix swore they spotted ancient carved stone markers high above Peters Canyon!",
      "Rule number one out here: never head into the Superstition canyons without at least two full canteens and a pack of matches. The desert heat has claimed many a brave prospector.",
      "Old-timers say Jacob Waltz swore on his deathbed that anyone who tracked his drift would lose their head. Folk laughed until Dr. Ruth came with his Mexican parchment, wrote 'Veni, Vidi, Vici' in his diary, and ended up decapitated in Needle Canyon.",
      "Miners drink their whiskey fast when the wind howls off Weaver's Needle. Too many headless skeletons have been hauled out of those box canyons for folks to treat the Dutchman's curse like a fairy tale.",
    ],
    hostler_silas: [
      "Treat yer pack burro kindly and she'll haul two hundred pounds of quartz ore without a whimper! Feed 'em desert oats and check their hooves after rocky scree scrambles.",
      "A good burro can scent a subterranean water seep half a mile off. If she stops and snorts at dry wash gravel, start diggin'—there's water underneath!",
      "Even the burros get skittish near Needle Canyon wash where they found Ruth's skull caught in the mesquite. Animals know when blood has soaked into the canyon sand.",
    ],
    sheriff_wyatt: [
      "Keep your sidearm holstered on the boardwalk, traveler. We keep lawful order here in Tortilla Flat, and every legitimate mining claim deed must be respected under territorial statute.",
      "Watch the high ridges if you venture east toward Needle Canyon. Outlaws and Apache lookouts know those canyons better than any mapmaker.",
      "Dr. Ruth's case is the darkest ledger in territorial history. The autopsy showed two distinct bullet penetrations through the temples—close-range ambush rifle fire. The killer took the Peralta maps from Ruth's vest, but left his gold pocket watch and cash intact. It was an assassination for the mine's coordinates, plain and simple.",
      "Cravey's headless body in the box canyon proved the curse didn't die with Ruth. When a skull is found perched atop a sheer ridge hundreds of feet above the skeleton, that's not wolves—that's human malice.",
    ],
    assayer_walker: [
      "Pure placer gold is malleable and does not tarnish in nitric acid. Pyrite will shatter beneath a prospector's hammer, but genuine 24-karat gold flattens into a rich leaf.",
      "Bring me any mineral specimens you chip from bedrock veins. I can calculate the Troy ounces per ton and verify if your vein is commercially viable.",
      "Dr. Erwin Ruth acquired genuine 1848 Peralta maps from Senor Ramirez in Sonora. When his father Adolph entered the mountains, he wrote he had located the mine drift 200 feet across from a cave. Someone silenced him before he could register a claim, scattering his skull across the divide.",
      "Notice how the victims' gold watches and wallets were left untouched? The murderer was not an ordinary thief. They wanted the Peralta maps and the Dutchman's bonanza.",
    ],
    stage_jedediah: [
      "Stagecoach runs dawn and dusk across the canyon pass. Hang onto yer hat when we whip around Fish Creek Hill—it's a thousand-foot drop to the canyon floor!",
      "I hauled search parties out toward First Water when Dr. Ruth vanished in '31. When Brownie Holmes' hound dragged that bullet-riddled skull out of the catclaw brush, even hardened stage drivers turned pale.",
    ],
    clara_miller: [
      "If you're parched and your canteen runs dry, look for the ribbed barrel cactus. Cut the cap off and mash the pulp for cool liquid that will save your life.",
      "Poor Dr. Ruth... he was an elderly government examiner with a crippled hip and a wooden cane. What kind of monster shoots a helpless old man through the temples for a scrap of paper?",
    ],
    gus_blacksmith: [
      "I temper every pickaxe with cold canyon spring water and high-carbon steel! A dull pick will break your wrist on granite, but my iron will slice through quartz like butter.",
      "A lot of men have carried my picks up toward Weaver's Needle and never came back down. If you venture into the east ravine, watch the cliff edges above you—that's where the snipers waited.",
    ],
  };

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

  // Townfolk Frontier Voice TTS API (powered by gemini-3.1-flash-tts-preview)
  app.post("/api/townfolk/tts", async (req, res) => {
    try {
      const { text, voiceName, characterId } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.json({ status: "fallback", message: "GEMINI_API_KEY not set" });
      }

      const voice = voiceName || "Puck";
      const cleanText = text.replace(/\[.*?\]/g, "").replace(/["“”]/g, "").trim();

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: cleanText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const audioPcmBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioPcmBase64) {
        return res.json({
          status: "ok",
          audioPcmBase64,
          sampleRate: 24000,
        });
      }

      res.json({ status: "fallback", message: "No audio stream returned" });
    } catch (err: any) {
      console.warn("[Townfolk TTS API] Gemini TTS error:", err?.message || err);
      res.json({ status: "fallback", error: err?.message || "TTS error" });
    }
  });

  // Townfolk Frontier Interactive Chat & AI Response API (powered by gemini-3.8-flash + gemini-3.1-flash-tts-preview)
  app.post("/api/townfolk/chat", async (req, res) => {
    try {
      const { characterId, characterName, userQuestion, voiceName, curseContext } = req.body;
      if (!userQuestion || typeof userQuestion !== "string") {
        return res.status(400).json({ error: "userQuestion is required" });
      }

      const charKey = characterId || "old_dusty_pete";
      let systemPrompt = NPC_PROMPTS[charKey] || "You are an 1880s Arizona Territory frontier miner in Tortilla Flat. Answer in 2-3 sentences.";
      const fallbacks = NPC_FALLBACKS[charKey] || NPC_FALLBACKS.old_dusty_pete;

      // Inject Curse of the Lost Dutchman context if player has discovered curse-related relics
      if (curseContext && (curseContext.stage > 0 || (curseContext.discoveredCurseClues && curseContext.discoveredCurseClues.length > 0))) {
        systemPrompt += `\n[HISTORICAL LORE - CURSE OF THE LOST DUTCHMAN & RUTH TRAGEDY]:
The prospector has discovered grim physical evidence of the Superstition Mountains curse:
- Curse Stage: ${curseContext.stageName || "Active Investigation"} (Stage ${curseContext.stage || 1} of 3)
- Clues Discovered: ${curseContext.discoveredCurseClues ? curseContext.discoveredCurseClues.join(", ") : "Ruth Camp, Needle Canyon Skull, Cravey bivouac"}
- Forensic Reality: In June 1931, Dr. Adolph Ruth entered with genuine Mexican Peralta maps. His headless skeleton was later found in East Ravine with the maps stolen, and his severed skull was recovered nearly a mile away in Needle Canyon wash bearing two high-powered rifle bullet execution holes through the temples! In 1947, James Cravey was found headless in his sleeping bag, his skull left on an overlooking cliff.
- The player is asking you about this curse or related canyon deaths. Respond with solemn, authentic 1880s Western dread, reflecting on the Ruth family's fate and the macabre pattern of severed skulls.`;
      }

      const isCurseQuery = /ruth|skull|curse|cravey|head|decapitat|murder|bullet|veni|massacre/i.test(userQuestion);

      const ai = getGeminiClient();
      if (!ai) {
        // Deterministic thematic fallback - prioritize curse-specific fallback lines if user asked a curse query
        let selectedFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        if (isCurseQuery) {
          const curseLines = fallbacks.filter((l) => /ruth|skull|curse|cravey|head|bullet/i.test(l));
          if (curseLines.length > 0) {
            selectedFallback = curseLines[Math.floor(Math.random() * curseLines.length)];
          }
        }
        return res.json({
          status: "ok",
          reply: selectedFallback,
          audioPcmBase64: null,
          note: "Fallback dialogue (API key unset)",
        });
      }

      // 1. Generate in-character response using gemini-3.1-flash-lite
      const chatResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nA prospector traveler approaches you in Tortilla Flat and asks:\n"${userQuestion}"\n\nRespond directly to them in character (maximum 2-3 sentences, 1880s frontier vernacular, no markdown asterisks or formatting):`,
              },
            ],
          },
        ],
      });

      const replyText = chatResponse.text?.trim() || fallbacks[0];

      // 2. Attempt to synthesize speech for the reply using gemini-3.1-flash-tts-preview
      let audioPcmBase64: string | null = null;
      try {
        const cleanSpeech = replyText.replace(/\[.*?\]/g, "").replace(/["“”]/g, "").trim();
        const ttsResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: cleanSpeech }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName || "Puck" },
              },
            },
          },
        });
        audioPcmBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      } catch (ttsErr) {
        console.warn("[Townfolk Chat API] TTS failed for reply:", ttsErr);
      }

      res.json({
        status: "ok",
        reply: replyText,
        audioPcmBase64,
        sampleRate: 24000,
      });
    } catch (err: any) {
      console.warn("[Townfolk Chat API] Error:", err?.message || err);
      const fallbacks = NPC_FALLBACKS[req.body?.characterId] || NPC_FALLBACKS.old_dusty_pete;
      res.json({
        status: "ok",
        reply: fallbacks[Math.floor(Math.random() * fallbacks.length)],
        audioPcmBase64: null,
      });
    }
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
      y: 9.2,
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
      isRiding: false,
      isAiming: false,
      carriedRock: false,
      isHunkered: false,
      currentActivity: 'idle',
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
            if (typeof msg.isRiding === 'boolean') p.isRiding = msg.isRiding;
            if (typeof msg.isAiming === 'boolean') p.isAiming = msg.isAiming;
            if (typeof msg.carriedRock === 'boolean') p.carriedRock = msg.carriedRock;
            if (typeof msg.isHunkered === 'boolean') p.isHunkered = msg.isHunkered;
            if (typeof msg.currentActivity === 'string') p.currentActivity = msg.currentActivity;
            p.lastUpdate = Date.now();

            // Broadcast movement/state to others
            broadcast({
              type: 'player:moved',
              id: playerId,
              name: p.name,
              outfitColor: p.outfitColor,
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
              isRiding: p.isRiding,
              isAiming: p.isAiming,
              carriedRock: p.carriedRock,
              isHunkered: p.isHunkered,
              currentActivity: p.currentActivity,
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
            // e.g. swinging pickaxe, firing rifle, panning gold, digging dirt
            broadcast({
              type: 'player:action',
              id: playerId,
              action: msg.action,
              tool: msg.tool,
              target: msg.target,
              activity: msg.activity,
              origin: msg.origin,
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
