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
  // World bounds: x: [-180, 180], z: [-180, 180]
  // Map dimensions: 500 x 500 px
  const toMapCoords = (x: number, z: number) => {
    const mapSize = 460;
    const px = ((x + 180) / 360) * mapSize;
    const py = ((z + 180) / 360) * mapSize;
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
              Superstition Wilderness, Pinal County, Arizona Territory
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
          {/* Faux Topographic Contours / Mountain ridges */}
          <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" viewBox="0 0 460 460">
            <defs>
              <radialGradient id="contourGrad" cx="60%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#8c6239" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8c6239" stopOpacity="0.0" />
              </radialGradient>
            </defs>
            <circle cx="230" cy="230" r="190" fill="none" stroke="#7a5530" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="230" cy="230" r="120" fill="none" stroke="#7a5530" strokeWidth="1.2" />
            <circle cx="230" cy="230" r="60" fill="none" stroke="#7a5530" strokeWidth="1.5" />
            <path d="M 50 150 Q 180 180 320 120 T 430 220" fill="none" stroke="#684728" strokeWidth="1.5" />
            <path d="M 80 350 Q 200 280 360 380" fill="none" stroke="#684728" strokeWidth="1.5" />
            <ellipse cx="320" cy="250" rx="40" ry="25" fill="url(#contourGrad)" />
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

          <div className="text-stone-600 font-mono text-[11px]">
            Coords: {Math.round(playerPosition.x)}E, {Math.round(playerPosition.z)}S
          </div>
        </div>
      </div>
    </div>
  );
};
