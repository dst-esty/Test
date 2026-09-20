import React from 'react';
import { X, Navigation, Compass, Sparkles, MapPin, Award, Store, Mountain, Crosshair, Pickaxe, Shield } from 'lucide-react';
import { Landmark, Vector3D, ClaimInfo } from '../types';
import { TerritoryClaim } from '../services/territoryClaimService';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPosition: Vector3D;
  playerYaw: number;
  landmarks: Landmark[];
  onFastTravel?: (target: Vector3D) => void;
  activeClaim?: ClaimInfo | null;
  territoryClaims?: TerritoryClaim[];
}

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  playerPosition,
  playerYaw,
  landmarks,
  onFastTravel,
  activeClaim,
  territoryClaims = [],
}) => {
  if (!isOpen) return null;

  // Coordinate mapping:
  // World bounds: x: [-180, 180], z: [-270, 180] (including the northern Salt River basin)
  // Map dimensions: 460 x 460 px
  const toMapCoords = (x: number, z: number) => {
    const mapSize = 460;
    const px = Math.max(18, Math.min(442, ((x + 180) / 360) * mapSize));
    const py = Math.max(28, Math.min(436, ((z - (-270)) / (180 - (-270))) * (436 - 28) + 28));
    return { px, py };
  };

  const playerMapPos = toMapCoords(playerPosition.x, playerPosition.z);
  const playerDeg = ((-playerYaw * 180) / Math.PI + 360) % 360;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#f4ebd0] text-stone-900 rounded-xl shadow-2xl border-4 border-[#8c6239] p-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Vintage Parchment Texture Header */}
        <div className="flex items-center justify-between border-b-2 border-[#8c6239]/40 pb-3 mb-4">
          <div>
            <h2 className="text-2xl font-serif font-bold tracking-wide text-[#4a2e18]">
              Peralta Stone Map & Expedition Chart
            </h2>
            <p className="text-xs font-serif italic text-stone-600">
              Superstition Wilderness & Salt River Canyon, Arizona Territory
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800/10 text-stone-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Map Canvas Area */}
        <div className="relative flex-1 min-h-[380px] bg-[#e8dbbe] border-2 border-[#a67c52] rounded-lg overflow-hidden shadow-inner flex items-center justify-center p-2">
          {/* Faux Topographic Contours / Mountain ridges / Salt River */}
          <svg className="absolute inset-0 w-full h-full opacity-45 pointer-events-none" viewBox="0 0 460 460">
            <defs>
              <radialGradient id="contourGrad" cx="60%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#8c6239" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8c6239" stopOpacity="0.0" />
              </radialGradient>
            </defs>

            {/* The Salt River (Northern Canyon River) */}
            <path d="M 0 36 Q 110 52 230 38 T 460 34" fill="none" stroke="#2563eb" strokeWidth="6" strokeOpacity="0.7" />
            <path d="M 0 36 Q 110 52 230 38 T 460 34" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeOpacity="0.9" />
            <text x="230" y="24" fill="#1e3a8a" fontSize="10" fontFamily="serif" fontWeight="bold" textAnchor="middle" letterSpacing="2">
              ~ THE SALT RIVER CANYON ~
            </text>

            {/* Historic Apache Trail Stagecoach Route cutting north to Tortilla Flat */}
            <path d="M 230 400 L 230 260 Q 230 160 230 90 L 230 44" fill="none" stroke="#78350f" strokeWidth="2" strokeDasharray="4 3" />
            <text x="236" y="115" fill="#78350f" fontSize="8" fontFamily="serif" fontStyle="italic">
              Apache Trail Pass
            </text>

            {/* Mountain Rings & Ridges */}
            <circle cx="230" cy="280" r="150" fill="none" stroke="#7a5530" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="230" cy="280" r="95" fill="none" stroke="#7a5530" strokeWidth="1.2" />
            <circle cx="230" cy="280" r="50" fill="none" stroke="#7a5530" strokeWidth="1.5" />
            <path d="M 50 200 Q 180 230 320 180 T 430 260" fill="none" stroke="#684728" strokeWidth="1.5" />
            <path d="M 80 390 Q 200 320 360 410" fill="none" stroke="#684728" strokeWidth="1.5" />
            <ellipse cx="320" cy="290" rx="40" ry="25" fill="url(#contourGrad)" />

            {/* Canyons & Mountain Topography Labels */}
            {/* Peters Mesa (Northwest Tableland) */}
            <rect x="70" y="90" width="70" height="40" rx="6" fill="#8c6239" fillOpacity="0.12" stroke="#7a5530" strokeWidth="1" strokeDasharray="2 2" />
            <text x="105" y="112" fill="#5c3a21" fontSize="7.5" fontFamily="serif" fontWeight="bold" textAnchor="middle">
              PETERS MESA
            </text>
            <text x="105" y="122" fill="#78350f" fontSize="6" fontFamily="serif" fontStyle="italic" textAnchor="middle">
              (Basalt Caprock Tableland)
            </text>

            {/* Pistol Canyon Box Gorge (between Peters Mesa and Malapais Mountain) */}
            <path d="M 140 115 Q 165 145 178 185" fill="none" stroke="#9a3412" strokeWidth="2.2" strokeDasharray="3 2" />
            <text x="175" y="142" fill="#9a3412" fontSize="6.5" fontFamily="serif" fontStyle="italic" transform="rotate(50 175 142)">
              Pistol Canyon
            </text>

            {/* Malapais Mountain (USGS Elev. 4,229 ft - Black Mountain) */}
            <ellipse cx="351" cy="132" rx="36" ry="24" fill="#5c4028" fillOpacity="0.18" stroke="#5c3a21" strokeWidth="1.2" />
            <ellipse cx="351" cy="132" rx="24" ry="16" fill="#4a2e18" fillOpacity="0.22" stroke="#5c3a21" strokeWidth="1.2" />
            <ellipse cx="351" cy="132" rx="12" ry="8" fill="#3a1e08" fillOpacity="0.28" stroke="#5c3a21" strokeWidth="1.4" />
            <text x="351" y="128" fill="#3a1e08" fontSize="7.5" fontFamily="serif" fontWeight="bold" textAnchor="middle">
              MALAPAIS MT
            </text>
            <text x="351" y="138" fill="#78350f" fontSize="6" fontFamily="serif" fontStyle="italic" textAnchor="middle">
              (4,229 ft Basalt Massif)
            </text>

            {/* Needle Canyon Gorge (East) */}
            <path d="M 330 220 Q 345 285 365 340" fill="none" stroke="#b45309" strokeWidth="1.5" strokeDasharray="3 2" />
            <text x="360" y="275" fill="#78350f" fontSize="7" fontFamily="serif" fontStyle="italic" transform="rotate(45 360 275)">
              Needle Canyon Gorge
            </text>

            {/* Peralta Canyon (Southwest) */}
            <path d="M 120 220 Q 140 280 170 360" fill="none" stroke="#b45309" strokeWidth="1.5" strokeDasharray="3 2" />
            <text x="135" y="295" fill="#78350f" fontSize="7" fontFamily="serif" fontStyle="italic" transform="rotate(-65 135 295)">
              Peralta Canyon Wash
            </text>

            {/* Southern Sawtooth Arêtes */}
            <text x="230" y="420" fill="#5c3a21" fontSize="7" fontFamily="serif" fontWeight="bold" textAnchor="middle" letterSpacing="1">
              ~ VOLCANIC KNIFE-EDGE ARÊTES ~
            </text>

            {/* Fremont Saddle (South Pass) */}
            <text x="250" y="385" fill="#78350f" fontSize="6.5" fontFamily="serif" fontStyle="italic">
              Fremont Saddle
            </text>

            {/* Out-Of-Bounds Perimeter Cloud Bank & Mountain Shroud */}
            <g opacity="0.65">
              {/* North / Northwest Clouds */}
              <path d="M 0 0 C 40 15, 80 8, 120 18 C 160 8, 200 20, 240 12 C 280 22, 330 10, 380 18 C 420 12, 440 22, 460 0 L 460 0 L 0 0 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
              {/* South / Southeast Clouds */}
              <path d="M 0 460 C 45 440, 95 448, 140 438 C 190 448, 240 435, 290 445 C 340 438, 390 446, 460 460 L 460 460 L 0 460 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
              {/* West Ridge Clouds */}
              <path d="M 0 0 C 18 60, 8 130, 22 190 C 8 260, 20 330, 0 460 L 0 460 L 0 0 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
              {/* East Ridge Clouds */}
              <path d="M 460 0 C 442 70, 452 140, 438 210 C 454 280, 440 360, 460 460 L 460 460 L 460 0 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />

              <text x="230" y="452" fill="#475569" fontSize="6.5" fontFamily="serif" fontStyle="italic" textAnchor="middle" letterSpacing="1">
                ☁️ PERIMETER CLOUD SHROUD • UNCHARTED WILDERNESS BEYOND BOUNDS ☁️
              </text>
            </g>
          </svg>

          {/* Compass Rose in Corner */}
          <div className="absolute top-4 right-4 flex flex-col items-center opacity-85 pointer-events-none">
            <Compass className="w-12 h-12 text-[#6e4624]" />
            <span className="text-[10px] font-serif font-bold text-[#6e4624] tracking-widest mt-0.5">NORTH</span>
          </div>

          {/* Map Grid Container */}
          <div className="relative w-[460px] h-[460px]">
            {/* Landmark Pins */}
            {landmarks.map((lm) => {
              const { px, py } = toMapCoords(lm.position.x, lm.position.z);
              const isDiscovered = lm.discovered;

              return (
                <div
                  key={lm.id}
                  style={{ left: `${px}px`, top: `${py}px` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  onClick={() => {
                    if (onFastTravel && isDiscovered) {
                      onFastTravel(lm.position);
                    }
                  }}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-125 ${
                      isDiscovered
                        ? lm.type === 'mine'
                          ? 'bg-amber-600 text-amber-100 ring-2 ring-amber-300 animate-bounce'
                          : lm.type === 'town'
                          ? 'bg-amber-800 text-amber-200 ring-2 ring-amber-400'
                          : 'bg-[#5c3e21] text-amber-100 ring-1 ring-amber-200'
                        : 'bg-stone-500/70 text-stone-300 ring-1 ring-stone-400'
                    }`}
                  >
                    {lm.type === 'mine' ? (
                      <Award className="w-4 h-4" />
                    ) : lm.type === 'town' ? (
                      <Store className="w-4 h-4" />
                    ) : lm.type === 'spring' ? (
                      <Sparkles className="w-4 h-4" />
                    ) : lm.type === 'mountain' ? (
                      <Mountain className="w-4 h-4" />
                    ) : lm.type === 'canyon' ? (
                      <Crosshair className="w-4 h-4" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                  </div>

                  {/* Label tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-stone-900 text-stone-100 text-[11px] font-serif px-2 py-1 rounded shadow-lg whitespace-nowrap z-30">
                    <span className="font-bold">{isDiscovered ? lm.name : 'Unexplored Landmark'}</span>
                    {isDiscovered && onFastTravel && (
                      <span className="block text-[9px] text-amber-400 font-mono">Click to Travel</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Territory Claims Boundary Circles & Staked Markers */}
            {(() => {
              const displayList: {
                id: string;
                name: string;
                x: number;
                z: number;
                radius: number;
                ownerName: string;
                extractedGold?: number;
                isPlayer: boolean;
              }[] = [];

              if (activeClaim?.isClaimed && activeClaim.position) {
                displayList.push({
                  id: 'player_active_claim',
                  name: activeClaim.name,
                  x: activeClaim.position.x,
                  z: activeClaim.position.z,
                  radius: activeClaim.size || 40,
                  ownerName: activeClaim.ownerName || 'You',
                  extractedGold: activeClaim.extractedGold || 0,
                  isPlayer: true,
                });
              }

              territoryClaims.forEach((tc) => {
                const isAlreadyAdded = displayList.some(
                  (d) => Math.abs(d.x - tc.x) < 2 && Math.abs(d.z - tc.z) < 2
                );
                if (!isAlreadyAdded) {
                  displayList.push({
                    id: tc.id,
                    name: tc.name,
                    x: tc.x,
                    z: tc.z,
                    radius: tc.radius || 40,
                    ownerName: tc.ownerName,
                    extractedGold: tc.extractedGold || 0,
                    isPlayer: false,
                  });
                }
              });

              return displayList.map((claim) => {
                const { px, py } = toMapCoords(claim.x, claim.z);
                const visualRadiusPx = Math.max(16, Math.min(60, (claim.radius / 360) * 460));

                return (
                  <React.Fragment key={claim.id}>
                    {/* Survey Boundary Circle */}
                    <div
                      style={{
                        left: `${px}px`,
                        top: `${py}px`,
                        width: `${visualRadiusPx * 2}px`,
                        height: `${visualRadiusPx * 2}px`,
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed pointer-events-none z-10 transition-all ${
                        claim.isPlayer
                          ? 'border-amber-600 bg-amber-500/15 shadow-[0_0_15px_rgba(217,119,6,0.3)]'
                          : 'border-stone-600/60 bg-stone-700/10'
                      }`}
                    />

                    {/* Claim Center Post Pin */}
                    <div
                      style={{ left: `${px}px`, top: `${py}px` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20"
                      onClick={() => {
                        if (onFastTravel && claim.isPlayer) {
                          onFastTravel({ x: claim.x, y: playerPosition.y, z: claim.z });
                        }
                      }}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-125 ${
                          claim.isPlayer
                            ? 'bg-amber-600 text-stone-950 ring-2 ring-amber-300 font-bold'
                            : 'bg-[#7c5332] text-amber-100 ring-1 ring-amber-900/60'
                        }`}
                      >
                        <Pickaxe className="w-3.5 h-3.5" />
                      </div>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-stone-900/95 text-stone-100 text-[11px] font-serif px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-30 border border-amber-600/40">
                        <div className="font-bold text-amber-300 flex items-center gap-1.5">
                          <Pickaxe className="w-3 h-3 text-amber-400" />
                          <span>{claim.name}</span>
                          {claim.isPlayer && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              YOUR CLAIM
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                          Owner: {claim.ownerName} • Yield: {claim.extractedGold?.toFixed(1) || '0.0'} oz gold
                        </div>
                        {claim.isPlayer && onFastTravel && (
                          <div className="text-[9px] text-amber-400 font-mono mt-0.5">Click to Travel to Claim</div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              });
            })()}

            {/* Player Position Pin */}
            <div
              style={{ left: `${playerMapPos.px}px`, top: `${playerMapPos.py}px` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
            >
              <div
                className="w-8 h-8 flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${playerDeg}deg)` }}
              >
                <Navigation className="w-6 h-6 text-red-700 fill-red-600 drop-shadow-md" />
              </div>
              <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-red-950/80 text-white font-mono text-[9px] px-1.5 py-0.5 rounded">
                YOU
              </div>
            </div>
          </div>
        </div>

        {/* Legend / Footer */}
        <div className="mt-4 pt-3 border-t border-[#8c6239]/40 flex flex-wrap items-center justify-between gap-3 text-xs font-serif">
          <div className="flex items-center gap-4 text-stone-700">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#5c3e21]" /> Discovered Landmark
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-600" /> Lost Dutchman Mine
            </span>
            <span className="flex items-center gap-1.5">
              <Pickaxe className="w-3.5 h-3.5 text-amber-700" /> Staked Claim
            </span>
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-red-600 fill-red-600" /> Current Position
            </span>
          </div>

          <div className="text-stone-600 font-mono text-[11px] flex items-center gap-2">
            <span>
              Coords: {Math.round(playerPosition.x)}E, {playerPosition.z < 0 ? `${Math.abs(Math.round(playerPosition.z))}N` : `${Math.round(playerPosition.z)}S`}
              {playerPosition.z < -210 && playerPosition.z >= -285 ? ' (Salt River Canyon)' : ''}
            </span>
            {Math.hypot(playerPosition.x, playerPosition.z) > 340 && (
              <span className="px-1.5 py-0.2 rounded bg-amber-800/20 text-amber-900 border border-amber-800/40 text-[10px] font-sans font-semibold uppercase tracking-wider">
                Endless Frontier
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
