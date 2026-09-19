import React from 'react';
import { X, Navigation, Compass, Sparkles, MapPin, Award, Store } from 'lucide-react';
import { Landmark, Vector3D } from '../types';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPosition: Vector3D;
  playerYaw: number;
  landmarks: Landmark[];
  onFastTravel?: (target: Vector3D) => void;
}

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  playerPosition,
  playerYaw,
  landmarks,
  onFastTravel,
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
