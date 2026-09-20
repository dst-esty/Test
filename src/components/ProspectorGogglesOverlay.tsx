import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Sparkles, Eye, Compass, Mountain, AlertCircle, X, ZoomIn, Layers } from 'lucide-react';
import { SurfaceAnalysisResult } from '../world/prospectingAnalysis';
import { MicroMineralCanvas } from './MicroMineralCanvas';

interface ProspectorGogglesOverlayProps {
  isActive: boolean;
  onToggle: () => void;
  analysis: SurfaceAnalysisResult | null;
  opticalZoom?: number;
  onCycleZoom?: () => void;
}

export const ProspectorGogglesOverlay: React.FC<ProspectorGogglesOverlayProps> = ({
  isActive,
  onToggle,
  analysis,
  opticalZoom = 4,
  onCycleZoom,
}) => {
  if (!isActive) return null;

  const mineralization = analysis?.mineralization ?? 0;
  const isHighGrade = mineralization >= 55;
  const isModerate = mineralization >= 25 && mineralization < 55;

  // Pop-up and auto-disappear state for the central favorable contact / strata card
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const lastContactKeyRef = useRef<string>('');
  const hideTimerRef = useRef<number | null>(null);

  // Monitor analysis changes: pop up when new geological contact or strata is detected, then disappear after 3.8s
  useEffect(() => {
    if (!analysis?.hit || !analysis.strataName) return;

    const currentKey = `${analysis.strataName}_${analysis.primarySign}_${Math.floor(mineralization / 20)}`;
    if (currentKey !== lastContactKeyRef.current) {
      lastContactKeyRef.current = currentKey;
      setShowContactModal(true);

      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = window.setTimeout(() => {
        setShowContactModal(false);
      }, 3800);
    }
  }, [analysis?.strataName, analysis?.primarySign, mineralization, analysis?.hit]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  // Determine meter needle rotation (-60deg to +60deg)
  const needleRotation = useMemo(() => {
    const clamped = Math.min(100, Math.max(0, mineralization));
    return -60 + (clamped / 100) * 120;
  }, [mineralization]);

  // Dual-ocular lens cutout path using SVG evenodd fill rule.
  // The outer box is filled with dark frontier leather (#0c0906),
  // while the two circular lenses (r=175) are 100% HOLLOW and TRANSPARENT,
  // allowing the player to clearly see the 3D desert terrain, rocks, and gold signs!
  const maskPath =
    'M 0 0 H 1000 V 600 H 0 Z ' +
    'M 320 125 A 175 175 0 1 0 320 475 A 175 175 0 1 0 320 125 Z ' +
    'M 680 125 A 175 175 0 1 0 680 475 A 175 175 0 1 0 680 125 Z';

  return (
    <div
      id="prospector-goggles-lens-overlay"
      className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center select-none overflow-hidden"
    >
      {/* 1. Dual-Lens Frontier Leather Mask & Brass Frames (SVG with evenodd cutout) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle warm frontier leather vignette: darkens extreme screen edges while keeping the fuzzy out-of-focus desert terrain clearly visible */}
          <radialGradient id="peripheryGoggleShade" cx="50%" cy="50%" r="68%">
            <stop offset="40%" stopColor="#1a110a" stopOpacity="0.08" />
            <stop offset="78%" stopColor="#120c06" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#080503" stopOpacity="0.60" />
          </radialGradient>

          {/* Circular mask for right ocular mineralogical loupe */}
          <clipPath id="rightLensClip">
            <circle cx="680" cy="300" r="166" />
          </clipPath>
        </defs>

        {/* Soft Translucent Leather Periphery: Allows the fuzzy, out-of-focus 3D terrain and mountains to be accurately seen in the player's peripheral vision */}
        <path
          fillRule="evenodd"
          fill="url(#peripheryGoggleShade)"
          d={maskPath}
        />

        {/* Outer Perimeter Vignette Border */}
        <rect x="0" y="0" width="1000" height="600" fill="none" stroke="#261609" strokeWidth="12" opacity="0.4" />

        {/* Right Ocular Micro-Mineralogical Loupe Canvas (Activated on 10X Field Lens & 24X Micro Loupe) */}
        {opticalZoom >= 10 && Boolean(analysis?.hit) && (
          <foreignObject
            x="514"
            y="134"
            width="332"
            height="332"
            clipPath="url(#rightLensClip)"
            className="pointer-events-none"
          >
            <MicroMineralCanvas
              analysis={analysis}
              opticalZoom={opticalZoom}
              size={332}
            />
          </foreignObject>
        )}

        {/* Left Ocular Outer Brass Rim */}
        <circle cx="320" cy="300" r="175" fill="none" stroke="#96632d" strokeWidth="18" />
        <circle cx="320" cy="300" r="184" fill="none" stroke="#d97706" strokeWidth="2.5" opacity="0.75" />
        <circle cx="320" cy="300" r="166" fill="none" stroke="#45270f" strokeWidth="3" opacity="0.9" />

        {/* Right Ocular Outer Brass Rim */}
        <circle cx="680" cy="300" r="175" fill="none" stroke="#96632d" strokeWidth="18" />
        <circle cx="680" cy="300" r="184" fill="none" stroke="#d97706" strokeWidth="2.5" opacity="0.75" />
        <circle cx="680" cy="300" r="166" fill="none" stroke="#45270f" strokeWidth="3" opacity="0.9" />

        {/* Left Rim Rivets (8 authentic frontier bolts) */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const rx = 320 + Math.cos(rad) * 175;
          const ry = 300 + Math.sin(rad) * 175;
          return (
            <g key={`l-rivet-${deg}`}>
              <circle cx={rx} cy={ry} r="4" fill="#cca055" stroke="#45270f" strokeWidth="1.2" />
              <circle cx={rx - 1} cy={ry - 1} r="1.2" fill="#fef08a" />
            </g>
          );
        })}

        {/* Right Rim Rivets */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const rx = 680 + Math.cos(rad) * 175;
          const ry = 300 + Math.sin(rad) * 175;
          return (
            <g key={`r-rivet-${deg}`}>
              <circle cx={rx} cy={ry} r="4" fill="#cca055" stroke="#45270f" strokeWidth="1.2" />
              <circle cx={rx - 1} cy={ry - 1} r="1.2" fill="#fef08a" />
            </g>
          );
        })}

        {/* Center Connecting Bridge & Knurled Focus Dial */}
        <rect x="475" y="285" width="50" height="30" rx="6" fill="#855325" stroke="#45270f" strokeWidth="2.5" />
        <line x1="487" y1="287" x2="487" y2="313" stroke="#cca055" strokeWidth="2" />
        <line x1="495" y1="287" x2="495" y2="313" stroke="#cca055" strokeWidth="2" />
        <line x1="503" y1="287" x2="503" y2="313" stroke="#cca055" strokeWidth="2" />
        <line x1="511" y1="287" x2="511" y2="313" stroke="#cca055" strokeWidth="2" />
        {/* Center thumb adjustment wheel */}
        <circle cx="500" cy="300" r="12" fill="#cca055" stroke="#45270f" strokeWidth="2" />
        <circle cx="500" cy="300" r="5" fill="#1c1917" />

        {/* Left Lens Subtle Optical Reticle Lines (High transparency, does NOT block view) */}
        <line x1="170" y1="300" x2="470" y2="300" stroke="#f59e0b" strokeWidth="0.8" opacity="0.3" />
        <line x1="320" y1="150" x2="320" y2="450" stroke="#f59e0b" strokeWidth="0.8" opacity="0.3" />
        <circle cx="320" cy="300" r="70" fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.25" />
        <circle cx="320" cy="300" r="120" fill="none" stroke="#f59e0b" strokeWidth="0.6" strokeDasharray="3 6" opacity="0.2" />

        {/* Right Lens Subtle Optical Reticle Lines */}
        <line x1="530" y1="300" x2="830" y2="300" stroke="#f59e0b" strokeWidth="0.8" opacity="0.3" />
        <line x1="680" y1="150" x2="680" y2="450" stroke="#f59e0b" strokeWidth="0.8" opacity="0.3" />
        <circle cx="680" cy="300" r="70" fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.25" />
        <circle cx="680" cy="300" r="120" fill="none" stroke="#f59e0b" strokeWidth="0.6" strokeDasharray="3 6" opacity="0.2" />

        {/* Right Ocular Micro Loupe Ribbon (Shown when inspecting at 10X or 24X Macro) */}
        {opticalZoom >= 10 && (
          <g pointerEvents="none">
            <rect x="520" y="426" width="320" height="26" rx="13" fill="#1c1917" stroke="#b45309" strokeWidth="1.5" opacity="0.94" />
            <text x="680" y="443" textAnchor="middle" fill="#fde68a" fontSize="9.5" fontFamily="monospace" fontWeight="bold" letterSpacing="0.8">
              {analysis?.hit
                ? `🔬 ${opticalZoom === 24 ? '24X MACRO' : '10X LENS'} • ${(analysis.materialCategory || 'SURFACE').toUpperCase()}`
                : '🔭 OPEN SKY / HORIZON • NO SURFACE IN FOCUS'}
            </text>
          </g>
        )}
      </svg>

      {/* 2. Top-Left: STRATA OPTIC Diagnostic Card (Moved out of lens to keep view clear) */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-40 pointer-events-auto">
        <div className="w-52 sm:w-60 text-amber-200/90 font-mono text-[10px] sm:text-[11px] space-y-1 p-2.5 rounded-lg bg-stone-950/85 border border-amber-800/60 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-1.5 font-bold text-amber-300 border-b border-amber-800/40 pb-1">
            <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="tracking-widest">STRATA OPTIC • {opticalZoom}X</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-stone-400">RANGE TO TARGET:</span>
            <span className="font-bold text-amber-300">{analysis?.hit && analysis.distance ? `${analysis.distance}m` : 'INFINITY (SKY)'}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-stone-400">MATERIAL:</span>
            <span className="font-bold text-amber-300 truncate max-w-[140px]">{analysis?.hit ? (analysis.materialType || analysis.materialCategory?.toUpperCase()) : 'ATMOSPHERE / SKY'}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-stone-400">STRATA:</span>
            <span className="font-bold text-amber-300 truncate max-w-[140px]">{analysis?.hit ? analysis.strataName : 'UNCONSTRAINED'}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-stone-400">HYDROLOGY:</span>
            <span className="font-semibold text-amber-400/90">{analysis?.hit ? (analysis.soilMoisture || 'DRY') : 'ATMOSPHERIC'}</span>
          </div>
        </div>
      </div>

      {/* 3. Top-Right: SPECTRUM & Mineralization Assay Meter (Moved out of lens to keep view clear) */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-40 pointer-events-auto">
        <div className="w-48 sm:w-56 text-amber-200/90 font-mono text-[10px] sm:text-[11px] space-y-1 p-2.5 rounded-lg bg-stone-950/85 border border-amber-800/60 backdrop-blur-md shadow-2xl text-right">
          <div className="flex items-center justify-end gap-1.5 font-bold text-amber-300 border-b border-amber-800/40 pb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
            <span className="tracking-widest">SPECTRUM: 589nm Au</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-stone-400">GOLD PROBABILITY:</span>
            <span className="font-bold text-amber-300">{Math.round((analysis?.goldProbability || 0) * 100)}%</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-stone-400">MINERAL INDEX:</span>
            <span className="font-bold text-amber-300">{mineralization.toFixed(1)}%</span>
          </div>

          {/* Compact Analog Mineralization Needle Gauge */}
          <div className="mt-1 bg-stone-900/90 border border-amber-600/50 rounded-lg p-1.5 shadow-inner text-center">
            <div className="text-[7.5px] uppercase tracking-wider text-amber-400 font-bold mb-0.5">
              Auriferous Assay
            </div>
            {/* Arc & Needle Container */}
            <div className="relative w-24 h-8 mx-auto overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-16 rounded-full border-[3px] border-amber-800/40 border-t-amber-400 border-r-amber-500" />
              {/* Gauge Tick Marks */}
              <span className="absolute bottom-0 left-1 text-[6.5px] text-stone-400">0</span>
              <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[6.5px] text-amber-400 font-bold">50</span>
              <span className="absolute bottom-0 right-1 text-[6.5px] text-amber-300 font-bold">100</span>
              {/* Needle */}
              <div
                className="absolute bottom-0 left-1/2 w-0.5 h-7 bg-rose-500 origin-bottom transition-transform duration-300 shadow"
                style={{ transform: `translateX(-50%) rotate(${needleRotation}deg)` }}
              />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 border border-stone-900" />
            </div>
            <div
              className={`text-[8px] font-bold mt-0.5 uppercase ${
                isHighGrade
                  ? 'text-amber-300 animate-pulse font-black'
                  : isModerate
                  ? 'text-amber-400'
                  : 'text-stone-400'
              }`}
            >
              {isHighGrade ? '★ HIGH PAYDIRT ★' : isModerate ? 'MINERALIZED' : 'BARREN BEDROCK'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Center Target Reticle & Favorable Contact Pop-up Modal */}
      <div className="absolute z-20 flex flex-col items-center pointer-events-none">
        {/* Clean Aim Reticle */}
        <div className="relative w-14 h-14 flex items-center justify-center">
          <div
            className={`w-9 h-9 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
              isHighGrade
                ? 'border-amber-400 scale-110 shadow-[0_0_15px_rgba(245,158,11,0.8)]'
                : isModerate
                ? 'border-amber-500/80 scale-105'
                : 'border-amber-500/40'
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                isHighGrade ? 'bg-amber-300 animate-ping' : isModerate ? 'bg-amber-400' : 'bg-amber-500/50'
              }`}
            />
          </div>

          {/* Crosshair Hairlines */}
          <div className="absolute w-5 h-[1px] -left-3 bg-amber-400/60" />
          <div className="absolute w-5 h-[1px] -right-3 bg-amber-400/60" />
          <div className="absolute h-5 w-[1px] -top-3 bg-amber-400/60" />
          <div className="absolute h-5 w-[1px] -bottom-3 bg-amber-400/60" />
        </div>

        {/* Favorable Contact Pop-up Modal (Pops up on surface detection, then disappears after 3.8s) */}
        {showContactModal && analysis?.hit && (
          <div
            className={`mt-2 max-w-sm px-4 py-2.5 rounded-xl border backdrop-blur-md transition-all duration-300 text-center font-mono shadow-2xl animate-in fade-in zoom-in-95 pointer-events-auto relative ${
              isHighGrade
                ? 'bg-amber-950/90 border-amber-400 text-amber-100 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                : isModerate
                ? 'bg-stone-950/90 border-amber-600/70 text-amber-200'
                : 'bg-stone-950/85 border-stone-700/60 text-stone-300'
            }`}
          >
            {/* Quick Dismiss Button */}
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-1.5 right-2 text-stone-400 hover:text-amber-300 text-xs p-1"
              title="Dismiss contact info"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Strata Name */}
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-300 tracking-wide uppercase pr-4">
              <Mountain className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{analysis.strataName}</span>
            </div>

            {/* Prominent Sign of Gold Detected */}
            <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-stone-200">
              {isHighGrade ? (
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin shrink-0" />
              ) : isModerate ? (
                <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <AlertCircle className="w-3 h-3 text-stone-500 shrink-0" />
              )}
              <span className={isHighGrade ? 'text-amber-200 font-bold' : isModerate ? 'text-amber-300' : 'text-stone-400'}>
                {analysis.primarySign}
              </span>
            </div>

            {/* Mineralization Progress Bar */}
            <div className="mt-1.5 w-full bg-stone-900 rounded-full h-1.5 overflow-hidden border border-amber-900/40">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isHighGrade
                    ? 'bg-gradient-to-r from-amber-500 via-amber-300 to-yellow-200 animate-pulse'
                    : isModerate
                    ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                    : 'bg-stone-600'
                }`}
                style={{ width: `${Math.min(100, Math.max(3, mineralization))}%` }}
              />
            </div>

            {/* Recommended Prospector Action Tip */}
            <div className="mt-1.5 text-[10px] text-amber-300/90 font-sans tracking-wide">
              {analysis.recommendedAction}
            </div>
          </div>
        )}
      </div>

      {/* 5. Top Center Vintage Brass Plaque & Control Badges */}
      <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto z-40">
        <div className="bg-gradient-to-r from-[#422612] via-[#613b19] to-[#422612] border-2 border-[#b8863b] rounded-full px-3.5 sm:px-5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-serif font-bold text-amber-200 flex items-center gap-2 shadow-2xl tracking-wider">
          <span className="text-amber-400">🥽</span>
          <span className="hidden sm:inline">PROSPECTOR'S AURIFEROUS GOGGLES</span>
          <span className="sm:hidden">PROSPECTOR GOGGLES</span>
          <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
            ACTIVE
          </span>
        </div>

        {/* Optical Zoom Magnification Cycle Button */}
        {onCycleZoom && (
          <button
            onClick={onCycleZoom}
            className="bg-stone-900/90 hover:bg-amber-950 text-amber-200 border border-amber-500/70 rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-mono transition-all shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Cycle magnification [Z] or mouse scroll wheel"
          >
            <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">
              {opticalZoom === 24 ? '24X MACRO' : opticalZoom === 10 ? '10X LENS' : '4X SURVEY'}
            </span>
            <span className="bg-amber-500/25 px-1 py-0.2 rounded text-amber-300 font-bold">[Z]</span>
          </button>
        )}

        <button
          onClick={onToggle}
          className="bg-stone-900/90 hover:bg-amber-900/80 text-amber-300 border border-amber-600/60 rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-mono transition-colors shadow-lg flex items-center gap-1 cursor-pointer"
          title="Remove goggles [G]"
        >
          <span>Take Off</span>
          <span className="bg-amber-500/20 px-1 rounded text-amber-200 font-bold">[G]</span>
        </button>
      </div>

      {/* 6. Bottom Instructions Bar */}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 bg-stone-950/85 backdrop-blur-sm border border-amber-600/40 rounded-full px-4 py-1 text-[10px] font-mono text-amber-300/90 flex items-center gap-2.5 shadow-lg pointer-events-none">
        <span className="text-amber-200 font-bold">ZOOM: [Z] / Scroll ({opticalZoom}X)</span>
        <span>•</span>
        <span className="hidden sm:inline text-amber-300">Aim Crosshair at Float & Outcrops</span>
        <span className="hidden sm:inline">•</span>
        <span className="text-amber-200 font-bold">SIGNS: Quartz Float • Gossan</span>
        <span>•</span>
        <span>[G] Take Off</span>
      </div>
    </div>
  );
};
