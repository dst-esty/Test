import React, { useState } from 'react';
import {
  X,
  Navigation,
  Compass,
  Sparkles,
  MapPin,
  Award,
  Store,
  Mountain,
  Crosshair,
  Pickaxe,
  Maximize2,
  Minimize2,
  Layers,
  ZoomIn,
} from 'lucide-react';
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

type MapSurveyMode = 'wilderness' | 'local';

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
  const [surveyMode, setSurveyMode] = useState<MapSurveyMode>('wilderness');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!isOpen) return null;

  // Coordinate configurations for both scales:
  // 'wilderness': Full Superstition Mountain Wilderness Quadrangle (~5,000m x 5,000m)
  // 'local': Central Expedition Basin (~700m x 700m around Weaver's Needle & Tortilla Flat)
  const bounds = surveyMode === 'wilderness'
    ? { minX: -2500, maxX: 2500, minZ: -2500, maxZ: 2500 }
    : { minX: -220, maxX: 220, minZ: -320, maxZ: 220 };

  const svgSize = 600;

  const toMapCoords = (x: number, z: number) => {
    const spanX = bounds.maxX - bounds.minX;
    const spanZ = bounds.maxZ - bounds.minZ;
    const px = ((x - bounds.minX) / spanX) * svgSize;
    const py = ((z - bounds.minZ) / spanZ) * svgSize;
    return {
      px: Math.max(12, Math.min(svgSize - 12, px)),
      py: Math.max(12, Math.min(svgSize - 12, py)),
      isInside: x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ,
    };
  };

  const playerMapPos = toMapCoords(playerPosition.x, playerPosition.z);
  const playerDeg = ((-playerYaw * 180) / Math.PI + 360) % 360;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full ${
          isExpanded ? 'max-w-6xl h-[94vh]' : 'max-w-3xl max-h-[90vh]'
        } bg-[#f4ebd0] text-stone-900 rounded-xl shadow-2xl border-4 border-[#8c6239] p-4 sm:p-6 overflow-hidden flex flex-col transition-all duration-300`}
      >
        {/* Vintage USGS / Peralta Map Header */}
        <div className="flex items-center justify-between border-b-2 border-[#8c6239]/40 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#8c6239]/20 border border-[#8c6239]/60 flex items-center justify-center text-[#5c3a21]">
              <Mountain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-wide text-[#4a2e18]">
                  Peralta Stone Map & USGS Topographical Quadrangle
                </h2>
                <span className="hidden md:inline px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#8c6239]/20 text-[#4a2e18] border border-[#8c6239]/40">
                  {surveyMode === 'wilderness' ? '5,000M REGIONAL SURVEY' : '700M LOCAL BASIN'}
                </span>
              </div>
              <p className="text-xs font-serif italic text-stone-600">
                Superstition Wilderness & Salt River Canyon, Arizona Territory • 33°25′N, 111°20′W
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Survey Scale Mode Toggle */}
            <div className="flex rounded-lg border border-[#8c6239]/60 bg-[#e8dbbe] p-0.5">
              <button
                type="button"
                onClick={() => setSurveyMode('wilderness')}
                className={`px-2.5 py-1 rounded text-xs font-serif font-bold transition flex items-center gap-1.5 ${
                  surveyMode === 'wilderness'
                    ? 'bg-[#6e4624] text-[#f4ebd0] shadow-sm'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
                title="View Full 5km x 5km Superstition Wilderness Range"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Full Wilderness (5 km)</span>
                <span className="sm:hidden">5 km</span>
              </button>
              <button
                type="button"
                onClick={() => setSurveyMode('local')}
                className={`px-2.5 py-1 rounded text-xs font-serif font-bold transition flex items-center gap-1.5 ${
                  surveyMode === 'local'
                    ? 'bg-[#6e4624] text-[#f4ebd0] shadow-sm'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
                title="Zoom to Central Weaver's Needle & Tortilla Flat Basin"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Local Basin (700 m)</span>
                <span className="sm:hidden">700 m</span>
              </button>
            </div>

            {/* Maximize / Minimize Toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg border border-[#8c6239]/50 hover:bg-stone-800/10 text-stone-700 transition"
              title={isExpanded ? 'Standard view' : 'Maximize chart'}
            >
              {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[#8c6239]/50 hover:bg-stone-800/10 text-stone-700 transition"
              title="Close map"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Map Canvas Area */}
        <div className="relative flex-1 min-h-[360px] bg-[#e6d8b8] border-2 border-[#a67c52] rounded-lg overflow-hidden shadow-inner flex items-center justify-center p-2 select-none">
          {/* Authentic Topographic Contours / Rivers / Mountain Ridges SVG */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 600 600"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#78350f" strokeWidth="0.4" strokeOpacity="0.2" />
              </pattern>
              <radialGradient id="highPeakGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#451a03" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#78350f" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#78350f" stopOpacity="0.0" />
              </radialGradient>
              <radialGradient id="saltRiverGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </radialGradient>
            </defs>

            {/* Latitude/Longitude Survey Grid */}
            <rect width="600" height="600" fill="url(#grid)" />

            {/* USGS Outer Neatline Borders */}
            <rect x="12" y="12" width="576" height="576" fill="none" stroke="#5c3a21" strokeWidth="2.5" />
            <rect x="16" y="16" width="568" height="568" fill="none" stroke="#5c3a21" strokeWidth="0.8" strokeDasharray="6 3" />

            {/* Latitude / Longitude Edge Ticks */}
            <text x="30" y="10" fill="#78350f" fontSize="7.5" fontFamily="monospace">111°30′W</text>
            <text x="280" y="10" fill="#78350f" fontSize="7.5" fontFamily="monospace">111°20′W</text>
            <text x="530" y="10" fill="#78350f" fontSize="7.5" fontFamily="monospace">111°10′W</text>
            <text x="4" y="30" fill="#78350f" fontSize="7.5" fontFamily="monospace" transform="rotate(-90 4 30)">33°35′N</text>
            <text x="4" y="300" fill="#78350f" fontSize="7.5" fontFamily="monospace" transform="rotate(-90 4 300)">33°25′N</text>
            <text x="4" y="570" fill="#78350f" fontSize="7.5" fontFamily="monospace" transform="rotate(-90 4 570)">33°18′N</text>

            {surveyMode === 'wilderness' ? (
              /* ================= FULL 5,000M SUPERSTITION WILDERNESS CARTOGRAPHY ================= */
              <g>
                {/* 1. The Salt River & Canyon Lake Gorge (Far North) */}
                <path
                  d="M 16 110 Q 140 135 250 105 T 460 85 T 584 75"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="8"
                  strokeOpacity="0.65"
                  strokeLinecap="round"
                />
                <path
                  d="M 16 110 Q 140 135 250 105 T 460 85 T 584 75"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeOpacity="0.9"
                />
                <text x="285" y="88" fill="#0369a1" fontSize="10" fontFamily="serif" fontWeight="bold" textAnchor="middle" letterSpacing="2">
                  ~ SALT RIVER GORGE & CANYON LAKE (1,660 FT) ~
                </text>

                {/* 2. Historic Apache Trail Stagecoach Route */}
                <path
                  d="M 295 580 Q 285 450 290 320 Q 295 240 298 135 L 298 105"
                  fill="none"
                  stroke="#854d0e"
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                />
                <text x="306" y="210" fill="#78350f" fontSize="8" fontFamily="serif" fontStyle="italic" transform="rotate(85 306 210)">
                  Historic Apache Trail (Stagecoach Highway)
                </text>

                {/* 3. Real-World Peralta Trail #102 & Dutchman Trail #104 */}
                <path
                  d="M 230 570 Q 250 480 270 420 Q 290 360 302 335"
                  fill="none"
                  stroke="#b45309"
                  strokeWidth="1.8"
                  strokeDasharray="4 2"
                />
                <text x="248" y="470" fill="#92400e" fontSize="7" fontFamily="serif" fontStyle="italic" transform="rotate(-65 248 470)">
                  Peralta Trail #102
                </text>

                <path
                  d="M 302 335 Q 350 310 420 330 Q 480 345 540 320"
                  fill="none"
                  stroke="#b45309"
                  strokeWidth="1.8"
                  strokeDasharray="4 2"
                />
                <text x="390" y="318" fill="#92400e" fontSize="7" fontFamily="serif" fontStyle="italic">
                  Dutchman Trail #104
                </text>

                {/* 4. Superstition Mountain Massive Volcanic Formations */}
                {/* Superstition Peak 5,057 ft (Dominant South High Point) */}
                <ellipse cx="235" cy="445" rx="55" ry="36" fill="url(#highPeakGrad)" stroke="#5c3a21" strokeWidth="1.5" />
                <ellipse cx="235" cy="445" rx="35" ry="22" fill="none" stroke="#78350f" strokeWidth="1.2" />
                <ellipse cx="235" cy="445" rx="18" ry="11" fill="none" stroke="#78350f" strokeWidth="1" />
                <text x="235" y="442" fill="#3a1e08" fontSize="9" fontFamily="serif" fontWeight="bold" textAnchor="middle">
                  SUPERSTITION PEAK
                </text>
                <text x="235" y="454" fill="#78350f" fontSize="7" fontFamily="serif" fontStyle="italic" textAnchor="middle">
                  (USGS Elev. 5,057 ft Caldera Apex)
                </text>

                {/* The Flatiron 4,861 ft & Siphon Draw (Massive Western Prow) */}
                <path d="M 120 320 L 155 350 L 120 380 Z" fill="#78350f" fillOpacity="0.22" stroke="#5c3a21" strokeWidth="1.6" />
                <ellipse cx="132" cy="350" rx="42" ry="26" fill="none" stroke="#78350f" strokeWidth="1.2" strokeDasharray="3 2" />
                <text x="132" y="347" fill="#3a1e08" fontSize="8.5" fontFamily="serif" fontWeight="bold" textAnchor="middle">
                  THE FLATIRON
                </text>
                <text x="132" y="358" fill="#78350f" fontSize="6.8" fontFamily="serif" fontStyle="italic" textAnchor="middle">
                  (4,861 ft Western Prow)
                </text>

                {/* Weaver's Needle 4,553 ft (Heart of the Wilderness) */}
                <circle cx="304" cy="336" r="22" fill="url(#highPeakGrad)" stroke="#b45309" strokeWidth="1.8" />
                <circle cx="304" cy="336" r="12" fill="none" stroke="#b45309" strokeWidth="1.2" />
                <text x="304" y="333" fill="#451a03" fontSize="8.5" fontFamily="serif" fontWeight="bold" textAnchor="middle">
                  WEAVER'S NEEDLE
                </text>
                <text x="304" y="343" fill="#9a3412" fontSize="6.8" fontFamily="serif" fontStyle="italic" textAnchor="middle">
                  (4,553 ft Dacite Core)
                </text>

                {/* Malapais Mountain 4,229 ft (North Massif) */}
                <ellipse cx="340" cy="245" rx="38" ry="24" fill="#5c4028" fillOpacity="0.22" stroke="#5c3a21" strokeWidth="1.4" />
                <text x="340" y="242" fill="#3a1e08" fontSize="8" fontFamily="serif" fontWeight="bold" textAnchor="middle">
                  MALAPAIS MT
                </text>
                <text x="340" y="252" fill="#78350f" fontSize="6.5" fontFamily="serif" fontStyle="italic" textAnchor="middle">
                  (4,229 ft Basalt Dome)
                </text>

                {/* Black Top Mesa 3,650 ft */}
                <rect x="290" cy="360" y="355" width="40" height="24" rx="4" fill="#5c4028" fillOpacity="0.2" stroke="#5c3a21" strokeWidth="1.2" />
                <text x="310" y="370" fill="#3a1e08" fontSize="7" fontFamily="serif" fontWeight="bold" textAnchor="middle">
                  BLACK TOP MESA
                </text>

                {/* Battleship Mountain 3,240 ft */}
                <path d="M 255 285 L 275 305 L 255 325 Z" fill="#78350f" fillOpacity="0.2" stroke="#5c3a21" strokeWidth="1.2" />
                <text x="245" y="307" fill="#5c3a21" fontSize="7" fontFamily="serif" fontWeight="bold" textAnchor="end">
                  BATTLESHIP MT
                </text>

                {/* Miners Needle 3,680 ft (Southeast Eyelet Crags) */}
                <circle cx="340" cy="410" r="16" fill="#78350f" fillOpacity="0.18" stroke="#78350f" strokeWidth="1.2" />
                <text x="340" y="408" fill="#5c3a21" fontSize="7.5" fontFamily="serif" fontWeight="bold" textAnchor="middle">
                  MINERS NEEDLE
                </text>

                {/* Reavis Ranch & Apple Valley (East, 3,840 ft) */}
                <circle cx="480" cy="260" r="28" fill="#15803d" fillOpacity="0.15" stroke="#15803d" strokeWidth="1.2" strokeDasharray="3 2" />
                <text x="480" y="258" fill="#14532d" fontSize="8" fontFamily="serif" fontWeight="bold" textAnchor="middle">
                  REAVIS RANCH
                </text>
                <text x="480" y="268" fill="#166534" fontSize="6.5" fontFamily="serif" fontStyle="italic" textAnchor="middle">
                  (3,840 ft Apple Orchards)
                </text>

                {/* Hieroglyphic Spring (Southwest, 2,560 ft) */}
                <circle cx="160" cy="485" r="14" fill="#0284c7" fillOpacity="0.2" stroke="#0284c7" strokeWidth="1" />
                <text x="160" y="505" fill="#0369a1" fontSize="6.5" fontFamily="serif" fontStyle="italic" textAnchor="middle">
                  Hieroglyphic Petroglyphs
                </text>

                {/* Garden Valley (Northwest Terrace, 2,240 ft) */}
                <rect x="220" y="210" width="45" height="28" rx="4" fill="#8c6239" fillOpacity="0.15" stroke="#7a5530" strokeWidth="1" />
                <text x="242" y="227" fill="#5c3a21" fontSize="7" fontFamily="serif" fontWeight="bold" textAnchor="middle">
                  GARDEN VALLEY
                </text>

                {/* Southern Caldera Sawtooth Arêtes */}
                <path d="M 170 470 Q 280 490 420 460" fill="none" stroke="#5c3a21" strokeWidth="2" strokeDasharray="3 3" />
                <text x="300" y="510" fill="#5c3a21" fontSize="8" fontFamily="serif" fontWeight="bold" textAnchor="middle" letterSpacing="1.5">
                  ~ SOUTHERN CALDERA SAWTOOTH RIM & ARETES ~
                </text>

                {/* Fremont Saddle (3,780 ft) */}
                <text x="280" y="415" fill="#78350f" fontSize="6.8" fontFamily="serif" fontStyle="italic">
                  Fremont Saddle (3,780 ft)
                </text>

                {/* Eastern Superstition Wilderness Frontier Range */}
                <text x="510" y="420" fill="#78350f" fontSize="8" fontFamily="serif" fontWeight="bold" textAnchor="middle" letterSpacing="1">
                  IRON MOUNTAIN & CAMPAIGN CREEK
                </text>
              </g>
            ) : (
              /* ================= LOCAL 700M EXPEDITION BASIN CARTOGRAPHY ================= */
              <g>
                {/* The Salt River (Northern edge of local basin) */}
                <path d="M 16 52 Q 150 68 300 52 T 584 48" fill="none" stroke="#0284c7" strokeWidth="7" strokeOpacity="0.65" />
                <path d="M 16 52 Q 150 68 300 52 T 584 48" fill="none" stroke="#38bdf8" strokeWidth="3" strokeOpacity="0.9" />
                <text x="300" y="40" fill="#0369a1" fontSize="11" fontFamily="serif" fontWeight="bold" textAnchor="middle" letterSpacing="2">
                  ~ SALT RIVER CANYON BASIN ~
                </text>

                {/* Apache Trail Highway cutting through Tortilla Flat */}
                <path d="M 300 580 L 300 360 Q 300 240 300 120 L 300 60" fill="none" stroke="#854d0e" strokeWidth="3" strokeDasharray="5 3" />
                <text x="308" y="160" fill="#78350f" fontSize="9" fontFamily="serif" fontStyle="italic">
                  Apache Trail Pass
                </text>

                {/* Topographic Rings centered on Weaver's Needle */}
                <circle cx="300" cy="380" r="180" fill="none" stroke="#7a5530" strokeWidth="1" strokeDasharray="4 3" />
                <circle cx="300" cy="380" r="120" fill="none" stroke="#7a5530" strokeWidth="1.2" />
                <circle cx="300" cy="380" r="65" fill="none" stroke="#7a5530" strokeWidth="1.6" />
                <circle cx="300" cy="380" r="28" fill="url(#highPeakGrad)" stroke="#b45309" strokeWidth="2" />

                {/* Weaver's Needle Prominence */}
                <text x="300" y="377" fill="#78350f" fontSize="10" fontFamily="serif" fontWeight="bold" textAnchor="middle">
                  WEAVER'S NEEDLE
                </text>
                <text x="300" y="390" fill="#9a3412" fontSize="7.5" fontFamily="serif" fontStyle="italic" textAnchor="middle">
                  (4,553 ft Dacite Monolith)
                </text>

                {/* Tortilla Flat Settlement Town Limits */}
                <circle cx="300" cy="95" r="50" fill="#78350f" fillOpacity="0.12" stroke="#78350f" strokeWidth="1.5" strokeDasharray="4 2" />
                <text x="300" y="92" fill="#451a03" fontSize="9" fontFamily="serif" fontWeight="bold" textAnchor="middle">
                  TORTILLA FLAT SETTLEMENT
                </text>
                <text x="300" y="104" fill="#78350f" fontSize="7" fontFamily="serif" fontStyle="italic" textAnchor="middle">
                  (Historic Settlement Townsite • Elev. 1,780 ft)
                </text>

                {/* Battleship Mountain */}
                <path d="M 180 230 L 210 260 L 180 290 Z" fill="#78350f" fillOpacity="0.18" stroke="#5c3a21" strokeWidth="1.5" />
                <text x="218" y="260" fill="#5c3a21" fontSize="8" fontFamily="serif" fontWeight="bold">
                  BATTLESHIP MT
                </text>

                {/* Black Top Mesa */}
                <rect x="330" y="350" width="60" height="42" rx="4" fill="#5c4028" fillOpacity="0.2" stroke="#5c3a21" strokeWidth="1.4" />
                <text x="360" y="372" fill="#3a1e08" fontSize="8" fontFamily="serif" fontWeight="bold" textAnchor="middle">
                  BLACK TOP MESA
                </text>
                <text x="360" y="383" fill="#78350f" fontSize="6.5" fontFamily="serif" fontStyle="italic" textAnchor="middle">
                  (3,650 ft Arrastra)
                </text>

                {/* Charlebois Spring Oasis */}
                <circle cx="380" cy="240" r="14" fill="#0284c7" fillOpacity="0.25" stroke="#0284c7" strokeWidth="1.2" />
                <text x="400" y="244" fill="#0369a1" fontSize="8" fontFamily="serif" fontStyle="italic">
                  Charlebois Spring (2,480 ft)
                </text>

                {/* Malapais Mountain */}
                <ellipse cx="430" cy="180" rx="45" ry="30" fill="#5c4028" fillOpacity="0.2" stroke="#5c3a21" strokeWidth="1.4" />
                <text x="430" y="178" fill="#3a1e08" fontSize="9" fontFamily="serif" fontWeight="bold" textAnchor="middle">
                  MALAPAIS MT
                </text>
                <text x="430" y="190" fill="#78350f" fontSize="7" fontFamily="serif" fontStyle="italic" textAnchor="middle">
                  (4,229 ft Basalt Massif)
                </text>

                {/* Needle Canyon Gorge */}
                <path d="M 430 310 Q 450 390 480 470" fill="none" stroke="#b45309" strokeWidth="2" strokeDasharray="4 2" />
                <text x="465" y="380" fill="#78350f" fontSize="8" fontFamily="serif" fontStyle="italic" transform="rotate(55 465 380)">
                  Needle Canyon Gorge
                </text>
              </g>
            )}

            {/* Cartographic Scale Bar (Miles & Kilometers) */}
            <g transform="translate(24, 555)">
              <rect x="0" y="0" width="130" height="24" fill="#f4ebd0" fillOpacity="0.85" stroke="#8c6239" strokeWidth="1" rx="3" />
              {surveyMode === 'wilderness' ? (
                <>
                  <line x1="12" y1="12" x2="118" y2="12" stroke="#3a1e08" strokeWidth="2" />
                  <line x1="12" y1="8" x2="12" y2="16" stroke="#3a1e08" strokeWidth="2" />
                  <line x1="65" y1="9" x2="65" y2="15" stroke="#3a1e08" strokeWidth="1.5" />
                  <line x1="118" y1="8" x2="118" y2="16" stroke="#3a1e08" strokeWidth="2" />
                  <text x="12" y="21" fill="#3a1e08" fontSize="6" fontFamily="monospace">0</text>
                  <text x="65" y="21" fill="#3a1e08" fontSize="6" fontFamily="monospace" textAnchor="middle">1.5 mi</text>
                  <text x="118" y="21" fill="#3a1e08" fontSize="6" fontFamily="monospace" textAnchor="end">3.1 mi (5 km)</text>
                </>
              ) : (
                <>
                  <line x1="12" y1="12" x2="118" y2="12" stroke="#3a1e08" strokeWidth="2" />
                  <line x1="12" y1="8" x2="12" y2="16" stroke="#3a1e08" strokeWidth="2" />
                  <line x1="65" y1="9" x2="65" y2="15" stroke="#3a1e08" strokeWidth="1.5" />
                  <line x1="118" y1="8" x2="118" y2="16" stroke="#3a1e08" strokeWidth="2" />
                  <text x="12" y="21" fill="#3a1e08" fontSize="6" fontFamily="monospace">0</text>
                  <text x="65" y="21" fill="#3a1e08" fontSize="6" fontFamily="monospace" textAnchor="middle">350 m</text>
                  <text x="118" y="21" fill="#3a1e08" fontSize="6" fontFamily="monospace" textAnchor="end">700 m</text>
                </>
              )}
            </g>
          </svg>

          {/* Compass Rose in Corner */}
          <div className="absolute top-4 right-4 flex flex-col items-center opacity-85 pointer-events-none">
            <Compass className="w-10 h-10 sm:w-12 sm:h-12 text-[#6e4624]" />
            <span className="text-[10px] font-serif font-bold text-[#6e4624] tracking-widest mt-0.5">NORTH</span>
          </div>

          {/* Dynamic Interactive HTML Map Overlay Container */}
          <div className="relative w-[600px] h-[600px] pointer-events-auto">
            {/* Landmark Pins */}
            {landmarks.map((lm) => {
              const { px, py, isInside } = toMapCoords(lm.position.x, lm.position.z);
              if (!isInside && surveyMode === 'local') return null;

              const isDiscovered = lm.discovered;
              const distToPlayer = Math.round(
                Math.hypot(playerPosition.x - lm.position.x, playerPosition.z - lm.position.z)
              );

              return (
                <div
                  key={lm.id}
                  style={{ left: `${px}px`, top: `${py}px` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20"
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
                    ) : lm.type === 'mountain' || lm.type === 'mesa' ? (
                      <Mountain className="w-4 h-4" />
                    ) : lm.type === 'needle' || lm.type === 'spire' ? (
                      <Compass className="w-4 h-4" />
                    ) : lm.type === 'canyon' ? (
                      <Crosshair className="w-4 h-4" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                  </div>

                  {/* High-Fidelity Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-stone-900 text-stone-100 text-[11px] font-serif px-3 py-2 rounded-lg shadow-2xl whitespace-nowrap z-40 border border-amber-800/80 pointer-events-none min-w-[180px]">
                    <span className="font-bold text-amber-200 block text-xs">
                      {isDiscovered ? lm.name : 'Unexplored Geographic Landmark'}
                    </span>
                    {lm.elevationFt && (
                      <span className="block text-[10px] text-amber-400 font-mono mt-0.5">
                        USGS Elev: {lm.elevationFt.toLocaleString()} ft ({Math.round(lm.elevationFt * 0.3048).toLocaleString()} m)
                      </span>
                    )}
                    <span className="block text-[10px] text-stone-400 font-mono">
                      Distance: {distToPlayer > 1000 ? `${(distToPlayer / 1000).toFixed(1)} km` : `${distToPlayer} m`}
                    </span>
                    {isDiscovered && lm.geology && (
                      <span className="block text-[9px] text-stone-300 max-w-[220px] whitespace-normal italic mt-1 leading-tight">
                        {lm.geology}
                      </span>
                    )}
                    {isDiscovered && onFastTravel && (
                      <span className="block text-[9px] text-amber-300 font-mono mt-1 font-semibold">
                        ⚡ Click to Fast-Travel
                      </span>
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
                const { px, py, isInside } = toMapCoords(claim.x, claim.z);
                if (!isInside && surveyMode === 'local') return null;

                const spanX = bounds.maxX - bounds.minX;
                const visualRadiusPx = Math.max(12, (claim.radius / spanX) * svgSize);

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
                      className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-25"
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
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
            >
              <div
                className="w-8 h-8 flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${playerDeg}deg)` }}
              >
                <Navigation className="w-6 h-6 text-red-700 fill-red-600 drop-shadow-md" />
              </div>
              <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-red-950/90 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md border border-red-500/40 whitespace-nowrap">
                YOU
              </div>
            </div>
          </div>
        </div>

        {/* Legend / Footer */}
        <div className="mt-3 pt-3 border-t border-[#8c6239]/40 flex flex-wrap items-center justify-between gap-3 text-xs font-serif">
          <div className="flex items-center flex-wrap gap-4 text-stone-700">
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

          <div className="text-stone-700 font-mono text-[11px] flex items-center gap-2">
            <span>
              Coords: {Math.round(playerPosition.x)}E,{' '}
              {playerPosition.z < 0
                ? `${Math.abs(Math.round(playerPosition.z))}N`
                : `${Math.round(playerPosition.z)}S`}
            </span>
            {Math.hypot(playerPosition.x, playerPosition.z) > 340 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-800/20 text-amber-900 border border-amber-800/40 text-[10px] font-sans font-semibold uppercase tracking-wider">
                Wilderness Frontier ({((Math.hypot(playerPosition.x, playerPosition.z + 250)) / 1000).toFixed(1)} km)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
