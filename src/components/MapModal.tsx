import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  ZoomOut,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  Move,
  Scroll,
  Globe,
} from 'lucide-react';
import { Landmark, Vector3D, ClaimInfo } from '../types';
import { TerritoryClaim, territoryClaims as territoryClaimsService } from '../services/territoryClaimService';
import {
  formatUsgsDistance,
  WorldScaleMode,
  USGS_1TO1_HORIZONTAL_SCALE,
} from '../world/superstitionTopography';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPosition: Vector3D;
  playerYaw: number;
  landmarks: Landmark[];
  onFastTravel?: (target: Vector3D, label?: string) => void;
  activeClaim?: ClaimInfo | null;
  territoryClaims?: TerritoryClaim[];
  onClearAllClaims?: () => void;
  worldScaleMode?: WorldScaleMode;
  onToggleWorldScaleMode?: () => void;
}

export type MapArchetype = 'peralta_stone' | 'usgs_quadrangle';

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  playerPosition,
  playerYaw,
  landmarks,
  onFastTravel,
  activeClaim,
  territoryClaims = [],
  onClearAllClaims,
  worldScaleMode = '1:1',
  onToggleWorldScaleMode,
}) => {
  // Map Archetype: Authentic Peralta Stone Map or USGS Topo Quadrangle
  const [mapArchetype, setMapArchetype] = useState<MapArchetype>('peralta_stone');

  // Multi-level zoom state (scale multiplier):
  // 0.5x = Regional Wilderness (1,040m span)
  // 1.0x = Quadrangle Survey (520m span - all landmarks comfortably spread across viewport)
  // 1.75x = Basin Expedition Detail (300m span - extra spacious, zero crowding)
  // 3.0x = Tactical Prospecting Sector (170m span - huge scale, trench & claim precision)
  // 4.5x = Close-Up Claim & Site Focus (115m span - ultra-large scale)
  const [zoomLevel, setZoomLevel] = useState<number>(1.25);

  // Pan offset in world meters from natural territory center (X: 15, Z: -60)
  const [panOffset, setPanOffset] = useState<{ x: number; z: number }>({ x: 0, z: 0 });

  // Modal expand toggle (wide full-viewport experience)
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Layer toggles for clean decluttering
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [showClaims, setShowClaims] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showContourTrails, setShowContourTrails] = useState<boolean>(true);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  // Drag-to-pan tracking
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startPanX: number; startPanZ: number }>({
    clientX: 0,
    clientY: 0,
    startPanX: 0,
    startPanZ: 0,
  });

  const mapViewportRef = useRef<HTMLDivElement>(null);

  const localProspectorId = territoryClaimsService.getOrCreateProspectorId();

  // Unified display list of claims
  const displayClaims = useMemo(() => {
    const list: {
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
      list.push({
        id: activeClaim.id || 'player_active_claim',
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
      const isAlreadyAdded = list.some(
        (d) => Math.abs(d.x - tc.x) < 2 && Math.abs(d.z - tc.z) < 2
      );
      if (!isAlreadyAdded) {
        const isOwnedByPlayer = tc.ownerId === localProspectorId || tc.ownerName === 'You';
        list.push({
          id: tc.id,
          name: tc.name,
          x: tc.x,
          z: tc.z,
          radius: tc.radius || 40,
          ownerName: tc.ownerName,
          extractedGold: tc.extractedGold || 0,
          isPlayer: isOwnedByPlayer,
        });
      }
    });

    return list;
  }, [activeClaim, territoryClaims, localProspectorId]);

  const playerOwnedClaims = displayClaims.filter((c) => c.isPlayer);

  // Natural geographical center of the expedition world (between Weaver's Needle and Tortilla Flat)
  const baseCenterX = 15;
  const baseCenterZ = -60;

  // Viewport bounds in world coordinates based on zoom & pan
  // At 1.0x, halfSpan is 260m (full span = 520m, perfectly framing the whole active territory)
  const halfSpan = 260 / zoomLevel;
  const currentCenterX = baseCenterX + panOffset.x;
  const currentCenterZ = baseCenterZ + panOffset.z;

  const minX = currentCenterX - halfSpan;
  const maxX = currentCenterX + halfSpan;
  const minZ = currentCenterZ - halfSpan;
  const maxZ = currentCenterZ + halfSpan;
  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;

  // Coordinate projections:
  // SVG space (0..1000)
  const toSvgX = useCallback(
    (wx: number) => ((wx - minX) / spanX) * 1000,
    [minX, spanX]
  );
  const toSvgY = useCallback(
    (wz: number) => ((wz - minZ) / spanZ) * 1000,
    [minZ, spanZ]
  );
  const toSvgDist = useCallback(
    (distMeters: number) => (distMeters / spanX) * 1000,
    [spanX]
  );

  // Percentage space (0..100%) for responsive HTML overlay
  const toPctCoords = useCallback(
    (wx: number, wz: number) => {
      const pctX = ((wx - minX) / spanX) * 100;
      const pctY = ((wz - minZ) / spanZ) * 100;
      return {
        pctX,
        pctY,
        isInside: pctX >= -6 && pctX <= 106 && pctY >= -6 && pctY <= 106,
      };
    },
    [minX, maxX, minZ, maxZ, spanX, spanZ]
  );

  const playerPct = toPctCoords(playerPosition.x, playerPosition.z);
  const playerDeg = ((-playerYaw * 180) / Math.PI + 360) % 360;

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoomLevel((prev) => Math.max(0.5, Math.min(4.5, Number((prev * zoomFactor).toFixed(2)))));
  };

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // primary click only
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startPanX: panOffset.x,
      startPanZ: panOffset.z,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !mapViewportRef.current) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;

    const rect = mapViewportRef.current.getBoundingClientRect();
    const metersPerPixel = (spanX / rect.width);

    // Dragging right moves view left (panOffset.x decreases)
    setPanOffset({
      x: dragStartRef.current.startPanX - dx * metersPerPixel,
      z: dragStartRef.current.startPanZ - dy * metersPerPixel,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      clientX: t.clientX,
      clientY: t.clientY,
      startPanX: panOffset.x,
      startPanZ: panOffset.z,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !mapViewportRef.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - dragStartRef.current.clientX;
    const dy = t.clientY - dragStartRef.current.clientY;
    const rect = mapViewportRef.current.getBoundingClientRect();
    const metersPerPixel = (spanX / rect.width);

    setPanOffset({
      x: dragStartRef.current.startPanX - dx * metersPerPixel,
      z: dragStartRef.current.startPanZ - dy * metersPerPixel,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Quick recenter actions
  const handleRecenterPlayer = () => {
    setPanOffset({
      x: playerPosition.x - baseCenterX,
      z: playerPosition.z - baseCenterZ,
    });
  };

  const handleRecenterNeedle = () => {
    setPanOffset({
      x: 80 - baseCenterX,
      z: 15 - baseCenterZ,
    });
    setSelectedPinId('weavers_needle');
  };

  const handleResetOverview = () => {
    setPanOffset({ x: 0, z: 0 });
    setZoomLevel(1.0);
  };

  // Dynamically calculated dual scale bar:
  // In 1:1 mode, accurately maps to real USGS 7.5' survey meters/kilometers (1:17.4 simulation ratio)
  const scaleBarInfo = useMemo(() => {
    const isOneToOne = worldScaleMode === '1:1';
    const effectiveSpan = isOneToOne ? spanX * USGS_1TO1_HORIZONTAL_SCALE : spanX;

    let barMeters = 100;
    if (isOneToOne) {
      if (effectiveSpan > 10000) barMeters = 2000;
      else if (effectiveSpan > 5000) barMeters = 1000;
      else if (effectiveSpan > 2000) barMeters = 500;
      else barMeters = 250;
    } else {
      if (spanX > 800) barMeters = 250;
      else if (spanX > 450) barMeters = 100;
      else if (spanX > 220) barMeters = 50;
      else barMeters = 25;
    }

    // Width of scale bar in SVG coordinate units (out of 1000)
    const barSvgWidth = Math.min(300, (barMeters / effectiveSpan) * 1000);
    const barYards = Math.round(barMeters * 1.09361);
    const barFeet = Math.round(barMeters * 3.28084);

    const metricLabel = barMeters >= 1000 ? `${(barMeters / 1000).toFixed(0)} km` : `${barMeters} m`;
    const midMetricLabel = barMeters >= 1000 ? `${(barMeters / 2000).toFixed(1)} km` : `${barMeters / 2} m`;
    const imperialLabel = barMeters >= 1000
      ? `${(barMeters * 0.000621371).toFixed(1)} mi (${barFeet.toLocaleString()} ft)`
      : `${barYards} yd (${barFeet} ft)`;

    return { barMeters, barSvgWidth, barYards, barFeet, metricLabel, midMetricLabel, imperialLabel };
  }, [spanX, worldScaleMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full ${
          isExpanded ? 'max-w-[98vw] h-[96vh]' : 'max-w-5xl h-[92vh]'
        } bg-[#e8dbbe] text-stone-900 rounded-xl shadow-2xl border-4 ${
          mapArchetype === 'peralta_stone' ? 'border-[#6c4826]' : 'border-[#8c6239]'
        } p-3 sm:p-5 overflow-hidden flex flex-col transition-all duration-300`}
      >
        {/* ================= HEADER CONTROLS & ARCHETYPE TOGGLES ================= */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-[#8c6239]/40 pb-2.5 mb-2.5 gap-2 select-none">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border shadow-inner ${
                mapArchetype === 'peralta_stone'
                  ? 'bg-[#5c3e21] text-amber-200 border-[#8c6239]'
                  : 'bg-[#8c6239]/20 text-[#5c3a21] border-[#8c6239]/60'
              }`}
            >
              {mapArchetype === 'peralta_stone' ? (
                <Scroll className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
              ) : (
                <Mountain className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-serif font-bold tracking-wide text-[#3a2211]">
                  {mapArchetype === 'peralta_stone'
                    ? 'Peralta Stone Map of 1847'
                    : 'USGS 7.5′ Topographical Quadrangle'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#8c6239]/20 text-[#4a2e18] border border-[#8c6239]/40">
                  {worldScaleMode === '1:1'
                    ? `Scale: ${(spanX * USGS_1TO1_HORIZONTAL_SCALE / 1000).toFixed(1)} km Span • 1:24,000 USGS 7.5′ Quad`
                    : `Scale: ${Math.round(spanX)}m Span • ${zoomLevel.toFixed(1)}x Zoom`}
                </span>
              </div>
              <p className="text-[11px] font-serif italic text-stone-600 hidden sm:block">
                {mapArchetype === 'peralta_stone'
                  ? 'Engraved Spanish Trail & Heart Stone Ciphers • Superstition Mountains, Arizona Territory'
                  : 'Weaver’s Needle & Tortilla Flat 7.5-Minute Survey • 33°25′N, 111°20′W • Contour Int. 20ft'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
            {/* 1:1 USGS vs Compact Scale Mode Switcher */}
            {onToggleWorldScaleMode && (
              <button
                type="button"
                onClick={onToggleWorldScaleMode}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer border shadow-sm ${
                  worldScaleMode === '1:1'
                    ? 'bg-[#5c3e21] text-amber-200 border-[#6c4826]'
                    : 'bg-[#dfceab] text-stone-800 border-[#8c6239]/70 hover:bg-[#d4c19a]'
                }`}
                title={`Active: ${worldScaleMode === '1:1' ? '1:1 True USGS Quadrangle Scale (Real Kilometers)' : 'Compact Exploration Scale'}. Click to toggle scale.`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{worldScaleMode === '1:1' ? '1:1 USGS Scale' : 'Compact Scale'}</span>
              </button>
            )}

            {/* Map Archetype Mode Switcher */}
            <div className="flex rounded-lg border border-[#8c6239]/70 bg-[#dfceab] p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setMapArchetype('peralta_stone')}
                className={`px-2.5 py-1 rounded text-xs font-serif font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  mapArchetype === 'peralta_stone'
                    ? 'bg-[#5c3e21] text-amber-100 shadow'
                    : 'text-stone-800 hover:text-stone-950'
                }`}
                title="View authentic hand-carved Peralta Stone Map with Spanish trail ciphers and heart stone symbols"
              >
                <Scroll className="w-3.5 h-3.5" />
                <span>Peralta Stone Map</span>
              </button>
              <button
                type="button"
                onClick={() => setMapArchetype('usgs_quadrangle')}
                className={`px-2.5 py-1 rounded text-xs font-serif font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  mapArchetype === 'usgs_quadrangle'
                    ? 'bg-[#6e4624] text-[#f4ebd0] shadow'
                    : 'text-stone-800 hover:text-stone-950'
                }`}
                title="View official USGS 7.5-minute topographic survey quadrangle with elevation contours and survey neatlines"
              >
                <Mountain className="w-3.5 h-3.5" />
                <span>USGS Quadrangle</span>
              </button>
            </div>

            {/* Quick Scale Multiplier Presets */}
            <div className="hidden md:flex rounded-lg border border-[#8c6239]/70 bg-[#dfceab] p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setZoomLevel(0.6)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                  zoomLevel <= 0.7 ? 'bg-[#5c3e21] text-amber-100' : 'text-stone-700 hover:text-stone-950'
                }`}
                title="Zoom to Full Wilderness Range (1,000m span)"
              >
                0.6x Range
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1.0)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                  zoomLevel > 0.7 && zoomLevel <= 1.4 ? 'bg-[#5c3e21] text-amber-100' : 'text-stone-700 hover:text-stone-950'
                }`}
                title="Zoom to Standard Quadrangle (520m span)"
              >
                1.0x Basin
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(2.0)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                  zoomLevel > 1.4 && zoomLevel <= 2.8 ? 'bg-[#5c3e21] text-amber-100' : 'text-stone-700 hover:text-stone-950'
                }`}
                title="Zoom to Detailed Sector (260m span - generous landmark spacing)"
              >
                2.0x Sector
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(3.5)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                  zoomLevel > 2.8 ? 'bg-[#5c3e21] text-amber-100' : 'text-stone-700 hover:text-stone-950'
                }`}
                title="Zoom to Close-Up Claim Detail (150m span - ultra large scale)"
              >
                3.5x Detail
              </button>
            </div>

            {/* Zoom In & Zoom Out Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(4.5, Number((z + 0.35).toFixed(2))))}
                className="p-1.5 rounded-lg border border-[#8c6239]/70 bg-[#ede1c2] hover:bg-[#dfceab] text-stone-800 transition shadow-sm cursor-pointer"
                title="Zoom In (Make Scale Bigger)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.35).toFixed(2))))}
                className="p-1.5 rounded-lg border border-[#8c6239]/70 bg-[#ede1c2] hover:bg-[#dfceab] text-stone-800 transition shadow-sm cursor-pointer"
                title="Zoom Out (Make Scale Smaller)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetOverview}
                className="p-1.5 rounded-lg border border-[#8c6239]/70 bg-[#ede1c2] hover:bg-[#dfceab] text-stone-800 transition shadow-sm cursor-pointer"
                title="Reset View to Territory Overview"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg border border-[#8c6239]/70 bg-[#ede1c2] hover:bg-[#dfceab] text-stone-800 transition shadow-sm cursor-pointer"
                title={isExpanded ? 'Standard Window' : 'Expand to Full Screen'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg border border-[#8c6239]/70 bg-[#ede1c2] hover:bg-stone-300 text-stone-800 transition shadow-sm cursor-pointer"
                title="Close map"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= SECONDARY TOOLBAR: RECENTER & LAYER TOGGLES ================= */}
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 bg-[#dfceab]/80 border border-[#b8976b] rounded-lg mb-2 text-xs font-serif select-none flex-wrap">
          {/* Recenter Navigation Shortcuts */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-[#5c3e21] flex items-center gap-1">
              <Move className="w-3.5 h-3.5 text-amber-800" /> Pan / Center:
            </span>
            <button
              type="button"
              onClick={handleRecenterPlayer}
              className="px-2 py-0.5 bg-[#5c3e21] hover:bg-[#432a13] text-amber-100 rounded text-[11px] font-sans font-semibold flex items-center gap-1 shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <Navigation className="w-3 h-3 text-red-400 fill-red-400" />
              <span>Center on You</span>
            </button>
            <button
              type="button"
              onClick={handleRecenterNeedle}
              className="px-2 py-0.5 bg-[#8c6239] hover:bg-[#6e4e30] text-amber-100 rounded text-[11px] font-sans font-semibold flex items-center gap-1 shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <Compass className="w-3 h-3 text-amber-300" />
              <span>Weaver’s Needle</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPanOffset({ x: 0 - baseCenterX, z: -252 - baseCenterZ });
              }}
              className="px-2 py-0.5 bg-[#8c6239] hover:bg-[#6e4e30] text-amber-100 rounded text-[11px] font-sans font-semibold flex items-center gap-1 shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <Store className="w-3 h-3 text-amber-300" />
              <span>Tortilla Flat</span>
            </button>
          </div>

          {/* Declutter Layer Filters */}
          <div className="flex items-center gap-2 flex-wrap text-stone-800">
            <span className="text-[11px] font-bold text-[#5c3e21] flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-800" /> Layers:
            </span>
            <label className="flex items-center gap-1 text-[11px] cursor-pointer hover:text-stone-950">
              <input
                type="checkbox"
                checked={showLandmarks}
                onChange={(e) => setShowLandmarks(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-800 accent-amber-800 cursor-pointer"
              />
              <span>Landmarks ({landmarks.length})</span>
            </label>
            <label className="flex items-center gap-1 text-[11px] cursor-pointer hover:text-stone-950">
              <input
                type="checkbox"
                checked={showClaims}
                onChange={(e) => setShowClaims(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-800 accent-amber-800 cursor-pointer"
              />
              <span>Claims ({displayClaims.length})</span>
            </label>
            <label className="flex items-center gap-1 text-[11px] cursor-pointer hover:text-stone-950">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-800 accent-amber-800 cursor-pointer"
              />
              <span>Pin Labels</span>
            </label>
            <label className="flex items-center gap-1 text-[11px] cursor-pointer hover:text-stone-950">
              <input
                type="checkbox"
                checked={showContourTrails}
                onChange={(e) => setShowContourTrails(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-800 accent-amber-800 cursor-pointer"
              />
              <span>Trails & Ciphers</span>
            </label>
          </div>
        </div>

        {/* ================= INTERACTIVE MAP VIEWPORT (SVG + RESPONSIVE OVERLAY) ================= */}
        <div
          ref={mapViewportRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`relative flex-1 w-full rounded-lg overflow-hidden border-2 shadow-inner select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          } ${
            mapArchetype === 'peralta_stone'
              ? 'bg-[#c9a77c] border-[#7d5635]'
              : 'bg-[#f3ebd3] border-[#a67c52]'
          }`}
        >
          {/* Vector Cartography & Geological Backdrop (SVG viewBox 0 0 1000 1000) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Stone texture grain filter */}
              <filter id="stoneChisel" x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
                <feDiffuseLighting in="noise" lightingColor="#f5deb3" surfaceScale="1.2" result="light">
                  <feDistantLight azimuth="45" elevation="60" />
                </feDiffuseLighting>
                <feBlend mode="multiply" in="SourceGraphic" in2="light" />
              </filter>

              {/* Peak Gradients */}
              <radialGradient id="needleGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#854d0e" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#a16207" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#78350f" stopOpacity="0.0" />
              </radialGradient>
              <radialGradient id="highMountainGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#451a03" stopOpacity="0.38" />
                <stop offset="60%" stopColor="#78350f" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#78350f" stopOpacity="0.0" />
              </radialGradient>
              <radialGradient id="riverWashGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </radialGradient>

              {/* Survey Coordinates Grid Pattern */}
              <pattern id="surveyGrid" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#78350f" strokeWidth="0.5" strokeOpacity="0.16" />
              </pattern>
            </defs>

            {/* Base Background Texture */}
            {mapArchetype === 'peralta_stone' ? (
              /* Ancient Red Sandstone Slab */
              <g>
                <rect width="1000" height="1000" fill="#c39d73" />
                {/* Hand-chiselled stone cracks & fractures */}
                <path
                  d="M 60 120 Q 240 180 320 340 T 480 620 Q 620 740 760 920"
                  fill="none"
                  stroke="#5c3818"
                  strokeWidth="2.2"
                  strokeOpacity="0.25"
                />
                <path
                  d="M 940 180 Q 720 280 640 450 T 420 780"
                  fill="none"
                  stroke="#5c3818"
                  strokeWidth="1.8"
                  strokeOpacity="0.22"
                />
                <path
                  d="M 180 840 Q 320 680 440 640 T 820 480"
                  fill="none"
                  stroke="#5c3818"
                  strokeWidth="1.5"
                  strokeOpacity="0.2"
                />
                {/* Chisel border indentation notches */}
                <rect x="24" y="24" width="952" height="952" fill="none" stroke="#5c3818" strokeWidth="4" strokeOpacity="0.45" />
                <rect x="32" y="32" width="936" height="936" fill="none" stroke="#8c5828" strokeWidth="1.5" strokeDasharray="16 8" strokeOpacity="0.6" />
              </g>
            ) : (
              /* USGS Aged Linen Survey Sheet */
              <g>
                <rect width="1000" height="1000" fill="#f4ebd0" />
                <rect width="1000" height="1000" fill="url(#surveyGrid)" />
                {/* Outer Neatline Survey Collar */}
                <rect x="20" y="20" width="960" height="960" fill="none" stroke="#4a2e18" strokeWidth="3" />
                <rect x="26" y="26" width="948" height="948" fill="none" stroke="#4a2e18" strokeWidth="1" strokeDasharray="8 4" />
              </g>
            )}

            {/* ================= DYNAMIC GEOGRAPHICAL FEATURES (TRANSFORMED IN REAL METERS) ================= */}
            {/* 1. Salt River Gorge & Canyon Lake (Real world z = -320 to -340) */}
            {(() => {
              const riverY = toSvgY(-325);
              return (
                <g>
                  <path
                    d={`M -50 ${riverY} Q 300 ${riverY + 25} 600 ${riverY - 15} T 1050 ${riverY + 10}`}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={Math.max(12, toSvgDist(32))}
                    strokeOpacity="0.65"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M -50 ${riverY} Q 300 ${riverY + 25} 600 ${riverY - 15} T 1050 ${riverY + 10}`}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={Math.max(4, toSvgDist(12))}
                    strokeOpacity="0.9"
                  />
                  <text
                    x={toSvgX(40)}
                    y={riverY - 12}
                    fill={mapArchetype === 'peralta_stone' ? '#075985' : '#0369a1'}
                    fontSize={Math.max(11, Math.min(18, toSvgDist(16)))}
                    fontFamily="serif"
                    fontWeight="bold"
                    textAnchor="middle"
                    letterSpacing="2"
                  >
                    {mapArchetype === 'peralta_stone' ? '✦ RIO SALADO (SALT RIVER GORGE) ✦' : '~ SALT RIVER GORGE & CANYON LAKE (ELEV. 1,660 FT) ~'}
                  </text>
                </g>
              );
            })()}

            {/* 2. Weaver's Needle Volcanic Dacite Core (Real world x = 0, z = 15 • USGS Elev. 4,553 ft • Due South Transit) */}
            {(() => {
              const wx = toSvgX(0);
              const wy = toSvgY(15);
              const rBase = toSvgDist(45);
              const rCore = toSvgDist(24);
              const rInnerSpire = toSvgDist(12);

              // Target alignment to Eye of the Needle Bluff (x = 130, z = -40)
              const eyeX = toSvgX(130);
              const eyeY = toSvgY(-40);

              if (mapArchetype === 'peralta_stone') {
                return (
                  <g id="peraltaWeaversNeedle">
                    {/* Concentric volcanic pedestal base and apron */}
                    <circle
                      cx={wx}
                      cy={wy}
                      r={Math.max(22, rBase)}
                      fill="url(#needleGlow)"
                      stroke="#8c441b"
                      strokeWidth="2.5"
                      strokeDasharray="6 3"
                    />
                    <circle
                      cx={wx}
                      cy={wy}
                      r={Math.max(14, rCore)}
                      fill="#78350f"
                      fillOpacity="0.4"
                      stroke="#5c2b0e"
                      strokeWidth="2"
                    />

                    {/* Iconic carved Sombrero / Needle Spire profile */}
                    <polygon
                      points={`${wx},${wy - Math.max(16, rCore + 4)} ${wx - Math.max(10, rInnerSpire)},${wy + Math.max(8, rInnerSpire * 0.8)} ${wx + Math.max(10, rInnerSpire)},${wy + Math.max(8, rInnerSpire * 0.8)}`}
                      fill="#5c2b0e"
                      stroke="#3a1a05"
                      strokeWidth="1.5"
                    />
                    {/* Spanish cross carved at apex */}
                    <line x1={wx} y1={wy - Math.max(22, rCore + 10)} x2={wx} y2={wy - Math.max(14, rCore + 2)} stroke="#3a1a05" strokeWidth="2.5" />
                    <line x1={wx - 4} y1={wy - Math.max(19, rCore + 7)} x2={wx + 4} y2={wy - Math.max(19, rCore + 7)} stroke="#3a1a05" strokeWidth="2.5" />

                    {/* Legendary 4 PM Shadow Dagger alignment pointing towards Eye of the Mountain (130, -40) */}
                    <line
                      x1={wx}
                      y1={wy}
                      x2={eyeX}
                      y2={eyeY}
                      stroke="#4a2107"
                      strokeWidth="2.5"
                      strokeDasharray="5 3"
                    />
                    {/* Stone chisel distance notches along the shadow line */}
                    {[0.25, 0.5, 0.75].map((t, idx) => {
                      const nx = wx + (eyeX - wx) * t;
                      const ny = wy + (eyeY - wy) * t;
                      return (
                        <line
                          key={idx}
                          x1={nx - 3}
                          y1={ny - 3}
                          x2={nx + 3}
                          y2={ny + 3}
                          stroke="#78350f"
                          strokeWidth="2"
                        />
                      );
                    })}

                    {/* Spanish Inscription */}
                    <text
                      x={wx}
                      y={wy + Math.max(28, rBase + 16)}
                      fill="#3a1a05"
                      fontSize={Math.max(10, Math.min(15, toSvgDist(13)))}
                      fontFamily="serif"
                      fontWeight="bold"
                      textAnchor="middle"
                      letterSpacing="1"
                    >
                      ✝ EL SOMBRERO • LA AGUJA (4,553 FT) ✝
                    </text>
                    <text
                      x={wx}
                      y={wy + Math.max(40, rBase + 28)}
                      fill="#5c2b0e"
                      fontSize={Math.max(8.5, Math.min(12, toSvgDist(10)))}
                      fontFamily="serif"
                      fontStyle="italic"
                      textAnchor="middle"
                    >
                      ~ Eje de la Sombra / 4 PM Shadow Sightline ~
                    </text>
                  </g>
                );
              }

              // USGS 7.5-Minute Topographic Quadrangle Mode:
              return (
                <g id="usgsWeaversNeedle">
                  {/* Concentric 20-ft elevation contour rings showing steep 1,000-ft neck */}
                  {[rBase, rBase * 0.78, rCore, rCore * 0.7, rInnerSpire].map((r, i) => (
                    <ellipse
                      key={i}
                      cx={wx}
                      cy={wy}
                      rx={Math.max(8 + i * 4, r)}
                      ry={Math.max(6 + i * 3, r * 0.82)}
                      fill={i === 4 ? '#b45309' : 'none'}
                      fillOpacity={i === 4 ? 0.25 : 0}
                      stroke="#854d0e"
                      strokeWidth={i % 2 === 0 ? 1.6 : 0.9}
                      strokeDasharray={i % 2 === 0 ? 'none' : '4 2'}
                    />
                  ))}

                  {/* Official USGS Peak Triangulation Benchmark Symbol (Black triangle + central dot) */}
                  <polygon
                    points={`${wx},${wy - 10} ${wx - 9},${wy + 6} ${wx + 9},${wy + 6}`}
                    fill="#1c1917"
                    stroke="#0c0a09"
                    strokeWidth="1.2"
                  />
                  <circle cx={wx} cy={wy + 1} r="2" fill="#ffffff" />

                  {/* USGS Benchmark Text */}
                  <text
                    x={wx + 13}
                    y={wy + 4}
                    fill="#1c1917"
                    fontSize={Math.max(9, Math.min(13, toSvgDist(11)))}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    BM 4553
                  </text>

                  {/* Official GNIS Title */}
                  <text
                    x={wx}
                    y={wy - Math.max(16, rCore + 8)}
                    fill="#0f172a"
                    fontSize={Math.max(10, Math.min(15, toSvgDist(13)))}
                    fontFamily="serif"
                    fontWeight="bold"
                    letterSpacing="1.5"
                    textAnchor="middle"
                  >
                    WEAVERS NEEDLE
                  </text>

                  {/* Geographic Quadrangle Coordinates */}
                  <text
                    x={wx}
                    y={wy + Math.max(28, rBase + 16)}
                    fill="#475569"
                    fontSize={Math.max(8, Math.min(11, toSvgDist(9.5)))}
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    33°25′47″N 111°22′18″W • Quad Keystone
                  </text>
                </g>
              );
            })()}

            {/* 3. Tortilla Flat Settlement Limits (Real world x = 0, z = -252) */}
            {(() => {
              const tx = toSvgX(0);
              const ty = toSvgY(-252);
              const tr = toSvgDist(35);
              return (
                <g>
                  <circle cx={tx} cy={ty} r={Math.max(18, tr)} fill="#854d0e" fillOpacity="0.15" stroke="#78350f" strokeWidth="1.8" strokeDasharray="5 3" />
                  <text
                    x={tx}
                    y={ty + Math.max(26, tr + 12)}
                    fill="#4a2810"
                    fontSize={Math.max(9, Math.min(14, toSvgDist(12)))}
                    fontFamily="serif"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    TORTILLA FLAT (ON TORTILLA CREEK • 1,780 FT)
                  </text>
                </g>
              );
            })()}

            {/* 4. Malapais Mountain Massif & Ancillary Humps (Real world x = 95, z = -205) */}
            {(() => {
              const mx = toSvgX(95);
              const my = toSvgY(-205);
              const northX = toSvgX(96);
              const northY = toSvgY(-242);
              const westHX = toSvgX(64);
              const westHY = toSvgY(-188);
              const swHX = toSvgX(74);
              const swHY = toSvgY(-228);
              const canyonHeadX = toSvgX(82);
              const canyonHeadY = toSvgY(-206);
              const canyonMouthX = toSvgX(24);
              const canyonMouthY = toSvgY(-206);
              const mrx = toSvgDist(58);
              const mry = toSvgDist(42);
              return (
                <g>
                  {/* Massif Base Tableland */}
                  <ellipse cx={toSvgX(78)} cy={toSvgY(-216)} rx={Math.max(28, mrx)} ry={Math.max(22, mry)} fill="url(#highMountainGrad)" stroke="#5c3818" strokeWidth="1.6" />

                  {/* Ancillary Volcanic Humps */}
                  <circle cx={westHX} cy={westHY} r={Math.max(6, toSvgDist(11))} fill="#6b3f1f" fillOpacity="0.6" stroke="#4a260c" strokeWidth="1.0" strokeDasharray="2,2" />
                  <circle cx={swHX} cy={swHY} r={Math.max(6, toSvgDist(11))} fill="#6b3f1f" fillOpacity="0.6" stroke="#4a260c" strokeWidth="1.0" strokeDasharray="2,2" />

                  {/* West Side Canyon Chasm Cleft */}
                  <path
                    d={`M ${canyonMouthX} ${canyonMouthY - toSvgDist(3.5)} Q ${toSvgX(55)} ${toSvgY(-208)} ${canyonHeadX} ${canyonHeadY} Q ${toSvgX(55)} ${toSvgY(-204)} ${canyonMouthX} ${canyonMouthY + toSvgDist(3.5)} Z`}
                    fill="#3b2010"
                    fillOpacity="0.75"
                    stroke="#1c0f07"
                    strokeWidth="1.2"
                  />
                  <line x1={canyonMouthX} y1={canyonMouthY} x2={canyonHeadX} y2={canyonHeadY} stroke="#172554" strokeWidth="1.4" strokeDasharray="2,1" />

                  {/* North Peak (4,159 ft) */}
                  <circle cx={northX} cy={northY} r={Math.max(8, toSvgDist(14))} fill="#5c3818" fillOpacity="0.7" stroke="#3b1d0c" strokeWidth="1.2" />
                  <text x={northX} y={northY - toSvgDist(16)} fill="#4a260c" fontSize={Math.max(7, Math.min(10, toSvgDist(8)))} fontFamily="serif" fontWeight="bold" textAnchor="middle">
                    NORTH PK (4,159 FT)
                  </text>

                  {/* Main South Peak (4,229 ft) */}
                  <circle cx={mx} cy={my} r={Math.max(10, toSvgDist(16))} fill="#4a260c" fillOpacity="0.8" stroke="#2c1406" strokeWidth="1.4" />
                  <text
                    x={mx}
                    y={my + Math.max(18, toSvgDist(20))}
                    fill="#3b1a04"
                    fontSize={Math.max(8.5, Math.min(12, toSvgDist(10.5)))}
                    fontFamily="serif"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    MALAPAIS MT (4,229 FT)
                  </text>
                  <text
                    x={toSvgX(54)}
                    y={toSvgY(-206) - toSvgDist(6)}
                    fill="#1e293b"
                    fontSize={Math.max(6.5, Math.min(9, toSvgDist(7.5)))}
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    fontStyle="italic"
                    textAnchor="middle"
                  >
                    West Side Canyon
                  </text>
                </g>
              );
            })()}

            {/* 5. Battleship Mountain Ridge (Real world x = -85, z = -80) */}
            {(() => {
              const bx = toSvgX(-85);
              const by = toSvgY(-80);
              const br = toSvgDist(32);
              return (
                <g>
                  <path
                    d={`M ${bx - Math.max(18, br)} ${by - Math.max(10, br * 0.5)} L ${bx + Math.max(18, br)} ${by} L ${bx - Math.max(18, br)} ${by + Math.max(10, br * 0.5)} Z`}
                    fill="#78350f"
                    fillOpacity="0.2"
                    stroke="#5c3a21"
                    strokeWidth="1.5"
                  />
                  <text
                    x={bx}
                    y={by + Math.max(18, br + 8)}
                    fill="#4a2810"
                    fontSize={Math.max(8, Math.min(12, toSvgDist(10)))}
                    fontFamily="serif"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    BATTLESHIP MT (3,240 FT)
                  </text>
                </g>
              );
            })()}

            {/* 6. Black Top Mesa & Spanish Arrastra (Real world x = 25, z = -45) */}
            {(() => {
              const btx = toSvgX(25);
              const bty = toSvgY(-45);
              const bw = toSvgDist(45);
              const bh = toSvgDist(30);
              return (
                <g>
                  <rect
                    x={btx - Math.max(18, bw / 2)}
                    y={bty - Math.max(12, bh / 2)}
                    width={Math.max(36, bw)}
                    height={Math.max(24, bh)}
                    rx="4"
                    fill="#5c4028"
                    fillOpacity="0.22"
                    stroke="#5c3a21"
                    strokeWidth="1.5"
                  />
                  <text
                    x={btx}
                    y={bty + Math.max(20, bh / 2 + 10)}
                    fill="#3a1e08"
                    fontSize={Math.max(8.5, Math.min(12, toSvgDist(10)))}
                    fontFamily="serif"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    BLACK TOP MESA (3,650 FT ARRASTRA)
                  </text>
                </g>
              );
            })()}

            {/* 7. Miners Needle Spire (Real world x = 140, z = 120) */}
            {(() => {
              const nx = toSvgX(140);
              const ny = toSvgY(120);
              const nr = toSvgDist(28);
              return (
                <g>
                  <circle cx={nx} cy={ny} r={Math.max(14, nr)} fill="#78350f" fillOpacity="0.18" stroke="#78350f" strokeWidth="1.4" />
                  <text
                    x={nx}
                    y={ny + Math.max(18, nr + 8)}
                    fill="#5c3a21"
                    fontSize={Math.max(8, Math.min(12, toSvgDist(10)))}
                    fontFamily="serif"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    MINERS NEEDLE (3,680 FT)
                  </text>
                </g>
              );
            })()}

            {/* 7b. Peters Mesa Tableland (Real world x = 135, z = -125 • USGS Elev. 3,500 ft) */}
            {(() => {
              const pmx = toSvgX(135);
              const pmy = toSvgY(-125);
              const pmw = toSvgDist(46);
              const pmh = toSvgDist(36);
              return (
                <g>
                  <rect
                    x={pmx - Math.max(18, pmw / 2)}
                    y={pmy - Math.max(14, pmh / 2)}
                    width={Math.max(36, pmw)}
                    height={Math.max(28, pmh)}
                    rx="6"
                    fill="#6d4c33"
                    fillOpacity="0.20"
                    stroke="#5c3818"
                    strokeWidth="1.5"
                  />
                  <text
                    x={pmx}
                    y={pmy + Math.max(20, pmh / 2 + 10)}
                    fill="#3a1e08"
                    fontSize={Math.max(8.5, Math.min(12, toSvgDist(10)))}
                    fontFamily="serif"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    PETERS MESA (3,500 FT TABLELAND)
                  </text>
                </g>
              );
            })()}

            {/* 7c. La Barge Canyon Primary Waterway & Upper Box (Real world x: 80 -> -65, z: 40 -> -295) */}
            {(() => {
              return (
                <g>
                  <path
                    d={`M ${toSvgX(80)} ${toSvgY(40)} Q ${toSvgX(65)} ${toSvgY(-75)} ${toSvgX(60)} ${toSvgY(-135)} T ${toSvgX(35)} ${toSvgY(-180)} T ${toSvgX(-20)} ${toSvgY(-250)} T ${toSvgX(-65)} ${toSvgY(-295)}`}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2.6"
                    strokeDasharray="5 2"
                    opacity="0.85"
                  />
                  <text
                    x={toSvgX(45)}
                    y={toSvgY(-160)}
                    fill="#0369a1"
                    fontSize={Math.max(8, Math.min(11, toSvgDist(9.5)))}
                    fontFamily="serif"
                    fontStyle="italic"
                    fontWeight="bold"
                    textAnchor="middle"
                    transform={`rotate(-70 ${toSvgX(45)} ${toSvgY(-160)})`}
                  >
                    La Barge Canyon & Upper Box
                  </text>
                </g>
              );
            })()}

            {/* 7d. Squaw Canyon (Squaw Box Canyon - x: 60 -> 125, z: -135 -> -131) */}
            {(() => {
              return (
                <g>
                  <path
                    d={`M ${toSvgX(60)} ${toSvgY(-135)} Q ${toSvgX(92)} ${toSvgY(-132)} ${toSvgX(125)} ${toSvgY(-131)}`}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2.0"
                    strokeDasharray="4 2"
                    opacity="0.8"
                  />
                  <text
                    x={toSvgX(92)}
                    y={toSvgY(-137)}
                    fill="#0369a1"
                    fontSize={Math.max(7.5, Math.min(10.5, toSvgDist(9)))}
                    fontFamily="serif"
                    fontStyle="italic"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    Squaw Box Canyon
                  </text>
                </g>
              );
            })()}

            {/* 7e. Peters Canyon (Pete's Canyon - centered at x = 243, z = -267) */}
            {(() => {
              return (
                <g>
                  <path
                    d={`M ${toSvgX(212)} ${toSvgY(-175)} Q ${toSvgX(228)} ${toSvgY(-221)} ${toSvgX(243)} ${toSvgY(-267)} T ${toSvgX(265)} ${toSvgY(-330)}`}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2.4"
                    strokeDasharray="4 2"
                    opacity="0.85"
                  />
                  <text
                    x={toSvgX(243) + 10}
                    y={toSvgY(-267)}
                    fill="#0369a1"
                    fontSize={Math.max(7.5, Math.min(10.5, toSvgDist(9)))}
                    fontFamily="serif"
                    fontStyle="italic"
                    fontWeight="bold"
                    textAnchor="start"
                    transform={`rotate(-68 ${toSvgX(243) + 10} ${toSvgY(-267)})`}
                  >
                    Peters Canyon (Pete's Canyon • 243X, -267Z)
                  </text>
                </g>
              );
            })()}

            {/* 7e2. Pistol Canyon (Historic tributary canyon to Peters Canyon running up into Peters Mesa) */}
            {(() => {
              return (
                <g>
                  {/* Tributary wash carving from Peters Canyon into Peters Mesa */}
                  <path
                    d={`M ${toSvgX(218)} ${toSvgY(-200)} Q ${toSvgX(180)} ${toSvgY(-163)} ${toSvgX(135)} ${toSvgY(-128)}`}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="1.8"
                    strokeDasharray="4 2"
                    opacity="0.85"
                  />
                  <text
                    x={toSvgX(180)}
                    y={toSvgY(-163) - 7}
                    fill="#0369a1"
                    fontSize={Math.max(7.5, Math.min(10, toSvgDist(8.5)))}
                    fontFamily="serif"
                    fontStyle="italic"
                    fontWeight="bold"
                    textAnchor="middle"
                    transform={`rotate(-24 ${toSvgX(180)} ${toSvgY(-163) - 7})`}
                  >
                    Pistol Canyon (Tributary)
                  </text>
                  {/* Colt Revolver & Bedrock Tinaja Landmark Marker */}
                  <circle
                    cx={toSvgX(180)}
                    cy={toSvgY(-163)}
                    r={Math.max(3.0, toSvgDist(2.4))}
                    fill="#b45309"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                  <text
                    x={toSvgX(180) + 6}
                    y={toSvgY(-163) + 3.5}
                    fill="#78350f"
                    fontSize={Math.max(6.5, Math.min(8.5, toSvgDist(7)))}
                    fontFamily="serif"
                    fontWeight="bold"
                    textAnchor="start"
                  >
                    Colt Tinaja
                  </text>
                </g>
              );
            })()}

            {/* 7e3. Malapais Loop Descent Route (Jacob Emerick 2016 Route: Rose Quartz Slope & Lost Horseshoe) */}
            {(() => {
              return (
                <g>
                  {/* Steep 1,000-ft descent route from Malapais Mountain to Peters Canyon */}
                  <path
                    d={`M ${toSvgX(95)} ${toSvgY(-205)} Q ${toSvgX(135)} ${toSvgY(-228)} ${toSvgX(210)} ${toSvgY(-255)}`}
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="1.6"
                    strokeDasharray="3 3"
                    opacity="0.8"
                  />
                  {/* Rose Quartz Slope & Old Horseshoe marker */}
                  <circle
                    cx={toSvgX(135)}
                    cy={toSvgY(-228)}
                    r={Math.max(2.8, toSvgDist(2.2))}
                    fill="#ec4899"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                  <text
                    x={toSvgX(135) + 5}
                    y={toSvgY(-228) + 3}
                    fill="#9d174d"
                    fontSize={Math.max(6.0, Math.min(8.0, toSvgDist(6.5)))}
                    fontFamily="serif"
                    fontWeight="bold"
                    textAnchor="start"
                  >
                    Rose Quartz Slope
                  </text>

                  {/* 7e4. The Pinch of Peter's Canyon (Dry Fall, Two-Foot Ladder & Bighorn Sheep Crags) */}
                  <circle
                    cx={toSvgX(238)}
                    cy={toSvgY(-288)}
                    r={Math.max(3.2, toSvgDist(2.6))}
                    fill="#059669"
                    stroke="#ffffff"
                    strokeWidth="1.4"
                  />
                  <text
                    x={toSvgX(238) + 6}
                    y={toSvgY(-288) - 2}
                    fill="#065f46"
                    fontSize={Math.max(6.5, Math.min(8.5, toSvgDist(7)))}
                    fontFamily="serif"
                    fontWeight="bold"
                    textAnchor="start"
                  >
                    The Pinch (Dry Fall & Ladder)
                  </text>

                  {/* 7e5. Jacob Emerick's 2016 Bivouac Lean-To & SAR Extraction Site */}
                  <circle
                    cx={toSvgX(220)}
                    cy={toSvgY(-305)}
                    r={Math.max(3.2, toSvgDist(2.6))}
                    fill="#dc2626"
                    stroke="#ffffff"
                    strokeWidth="1.4"
                  />
                  <text
                    x={toSvgX(220) + 6}
                    y={toSvgY(-305) + 4}
                    fill="#991b1b"
                    fontSize={Math.max(6.5, Math.min(8.5, toSvgDist(7)))}
                    fontFamily="serif"
                    fontWeight="bold"
                    textAnchor="start"
                  >
                    Jacob's Bivouac (2016 SAR)
                  </text>
                </g>
              );
            })()}

            {/* 7f. Tortilla Creek (flows through Tortilla Canyon & Tortilla Flat at x = 0, z = -252) */}
            {(() => {
              return (
                <g>
                  <path
                    d={`M ${toSvgX(95)} ${toSvgY(-220)} Q ${toSvgX(40)} ${toSvgY(-245)} ${toSvgX(0)} ${toSvgY(-252)} T ${toSvgX(-45)} ${toSvgY(-275)} T ${toSvgX(-85)} ${toSvgY(-305)}`}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2.8"
                    strokeDasharray="5 2"
                    opacity="0.85"
                  />
                  <text
                    x={toSvgX(-18)}
                    y={toSvgY(-258)}
                    fill="#0369a1"
                    fontSize={Math.max(8, Math.min(11, toSvgDist(9.5)))}
                    fontFamily="serif"
                    fontStyle="italic"
                    fontWeight="bold"
                    textAnchor="middle"
                    transform={`rotate(-20 ${toSvgX(-18)} ${toSvgY(-258)})`}
                  >
                    ~ Tortilla Creek ~
                  </text>
                </g>
              );
            })()}

            {/* 8. Historic Trails & Peralta Spanish Ciphers */}
            {showContourTrails && (
              <g>
                {/* Peralta Trail #102 connecting Peralta Trailhead (-120, -120) -> Needle Overlook Saddle (55, 18) -> Black Top Mesa (25, -45) -> Charlebois Spring (65, -75) */}
                <path
                  d={`M ${toSvgX(-120)} ${toSvgY(-120)} Q ${toSvgX(-30)} ${toSvgY(-50)} ${toSvgX(55)} ${toSvgY(18)} T ${toSvgX(25)} ${toSvgY(-45)} T ${toSvgX(65)} ${toSvgY(-75)}`}
                  fill="none"
                  stroke={mapArchetype === 'peralta_stone' ? '#92400e' : '#b45309'}
                  strokeWidth="2.5"
                  strokeDasharray="6 3"
                />
                <text
                  x={toSvgX(-20)}
                  y={toSvgY(-40)}
                  fill="#78350f"
                  fontSize="9.5"
                  fontFamily="serif"
                  fontStyle="italic"
                  transform={`rotate(25 ${toSvgX(-20)} ${toSvgY(-40)})`}
                >
                  Peralta Pack Trail #102
                </text>

                {/* Peters Trail #105 connecting Charlebois Spring (65, -75) -> Squaw Box (60, -135) -> Peters Mesa (135, -125) -> Peters Canyon / Cave (243, -267) */}
                <path
                  d={`M ${toSvgX(65)} ${toSvgY(-75)} L ${toSvgX(60)} ${toSvgY(-135)} Q ${toSvgX(100)} ${toSvgY(-130)} ${toSvgX(135)} ${toSvgY(-125)} T ${toSvgX(243)} ${toSvgY(-267)}`}
                  fill="none"
                  stroke="#7c2d12"
                  strokeWidth="2.2"
                  strokeDasharray="5 3"
                />
                <text
                  x={toSvgX(185)}
                  y={toSvgY(-195)}
                  fill="#7c2d12"
                  fontSize="8.5"
                  fontFamily="serif"
                  fontStyle="italic"
                >
                  Peters Trail #105
                </text>

                {/* Apache Trail Highway connecting Tortilla Flat (0, -252) south through the canyon */}
                <path
                  d={`M ${toSvgX(0)} ${toSvgY(-320)} L ${toSvgX(0)} ${toSvgY(-252)} Q ${toSvgX(10)} ${toSvgY(-180)} ${toSvgX(-20)} ${toSvgY(-100)} T ${toSvgX(-80)} ${toSvgY(60)}`}
                  fill="none"
                  stroke="#854d0e"
                  strokeWidth="3"
                  strokeDasharray="7 4"
                />

                {/* Fort McDowell Military Cavalry Supply Trail */}
                <path
                  d={`M ${toSvgX(-180)} ${toSvgY(-290)} L ${toSvgX(-160)} ${toSvgY(-285)} Q ${toSvgX(-90)} ${toSvgY(-265)} ${toSvgX(-25)} ${toSvgY(-255)} L ${toSvgX(0)} ${toSvgY(-252)}`}
                  fill="none"
                  stroke="#1e3a8a"
                  strokeWidth="2.2"
                  strokeDasharray="6 3"
                />
                <text
                  x={toSvgX(-105)}
                  y={toSvgY(-272)}
                  fill="#1e3a8a"
                  fontSize="8.5"
                  fontFamily="serif"
                  fontStyle="italic"
                >
                  Fort McDowell Cavalry Trail
                </text>

                {/* Jacob Waltz Lost Dutchman Four Peaks Transit Sightline */}
                {/* True bearing = 0.0° Due North passing straight to Four Peaks */}
                <line
                  x1={toSvgX(0)}
                  y1={toSvgY(-610)}
                  x2={toSvgX(0)}
                  y2={toSvgY(250)}
                  stroke="#d97706"
                  strokeWidth="2.2"
                  strokeDasharray="6 4"
                  strokeOpacity="0.85"
                />
                <text
                  x={toSvgX(0) + 6}
                  y={toSvgY(-120)}
                  fill="#b45309"
                  fontSize="8"
                  fontFamily="serif"
                  fontStyle="italic"
                  transform={`rotate(-90 ${toSvgX(0) + 6} ${toSvgY(-120)})`}
                >
                  Dutchman Transit: Four Peaks Due North (0°)
                </text>

                {/* Peralta Stone Map Inscribed Ciphers & Spanish Glyphs */}
                {mapArchetype === 'peralta_stone' && (
                  <g>
                    {/* The Legendary Heart Stone of Pedro Peralta ("El Corazón de la Sierra") */}
                    <g transform={`translate(${toSvgX(15)}, ${toSvgY(-15)})`}>
                      <path
                        d="M 0 10 C -18 -12 -36 8 0 38 C 36 8 18 -12 0 10 Z"
                        fill="#854d0e"
                        fillOpacity="0.25"
                        stroke="#5c2b0e"
                        strokeWidth="2.2"
                      />
                      {/* Carved Cross inside heart */}
                      <line x1="0" y1="12" x2="0" y2="28" stroke="#5c2b0e" strokeWidth="2.5" />
                      <line x1="-7" y1="18" x2="7" y2="18" stroke="#5c2b0e" strokeWidth="2.5" />
                      <text x="0" y="-4" fill="#5c2b0e" fontSize="9" fontFamily="serif" fontWeight="bold" textAnchor="middle" letterSpacing="1">
                        EL CORAZÓN
                      </text>
                    </g>

                    {/* Spanish Carved Stone Inscriptions */}
                    <text x={toSvgX(-140)} y={toSvgY(-140)} fill="#5c2b0e" fontSize="11" fontFamily="serif" fontWeight="bold" letterSpacing="1.5">
                      DON PEDRO PERALTA • 1847
                    </text>
                    <text x={toSvgX(110)} y={toSvgY(-110)} fill="#5c2b0e" fontSize="10" fontFamily="serif" fontStyle="italic">
                      PASTERA • EL COBO • CANYON DEL ORO
                    </text>
                    <text x={toSvgX(-120)} y={toSvgY(65)} fill="#5c2b0e" fontSize="10" fontFamily="serif" fontStyle="italic">
                      CAMINO REAL DE LA SONORA
                    </text>
                    <text x={toSvgX(55)} y={toSvgY(105)} fill="#5c2b0e" fontSize="10" fontFamily="serif" fontWeight="bold">
                      ✝ MINA DE LOS PERALTAS
                    </text>

                    {/* Sunburst Rising over Weaver's Needle */}
                    <g transform={`translate(${toSvgX(80)}, ${toSvgY(-35)})`}>
                      <circle cx="0" cy="0" r="10" fill="none" stroke="#854d0e" strokeWidth="1.8" />
                      {Array.from({ length: 8 }).map((_, i) => {
                        const ang = (i * 45 * Math.PI) / 180;
                        return (
                          <line
                            key={i}
                            x1={Math.cos(ang) * 12}
                            y1={Math.sin(ang) * 12}
                            x2={Math.cos(ang) * 20}
                            y2={Math.sin(ang) * 20}
                            stroke="#854d0e"
                            strokeWidth="1.8"
                          />
                        );
                      })}
                    </g>
                  </g>
                )}
              </g>
            )}

            {/* ================= ACCURATE REAL-TIME CALIBRATED SCALE BAR ================= */}
            <g transform="translate(36, 915)">
              <rect
                x="0"
                y="0"
                width={Math.max(210, scaleBarInfo.barSvgWidth + 50)}
                height="48"
                fill={mapArchetype === 'peralta_stone' ? '#ddbe96' : '#fcf8ec'}
                fillOpacity="0.94"
                stroke="#6c4826"
                strokeWidth="1.4"
                rx="5"
              />
              {/* Metric Scale Bar */}
              <g transform="translate(16, 16)">
                <line x1="0" y1="0" x2={scaleBarInfo.barSvgWidth} y2="0" stroke="#3a1e08" strokeWidth="2.5" />
                <line x1="0" y1="-5" x2="0" y2="5" stroke="#3a1e08" strokeWidth="2.5" />
                <line x1={scaleBarInfo.barSvgWidth / 2} y1="-3.5" x2={scaleBarInfo.barSvgWidth / 2} y2="3.5" stroke="#3a1e08" strokeWidth="1.8" />
                <line x1={scaleBarInfo.barSvgWidth} y1="-5" x2={scaleBarInfo.barSvgWidth} y2="5" stroke="#3a1e08" strokeWidth="2.5" />
                <text x="0" y="12" fill="#3a1e08" fontSize="8.5" fontFamily="monospace" fontWeight="bold">0</text>
                <text x={scaleBarInfo.barSvgWidth / 2} y="12" fill="#3a1e08" fontSize="8.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  {scaleBarInfo.midMetricLabel}
                </text>
                <text x={scaleBarInfo.barSvgWidth} y="12" fill="#3a1e08" fontSize="8.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  {scaleBarInfo.metricLabel}
                </text>
              </g>
              {/* Imperial Scale Bar */}
              <g transform="translate(16, 36)">
                <line x1="0" y1="0" x2={scaleBarInfo.barSvgWidth} y2="0" stroke="#78350f" strokeWidth="2" />
                <line x1="0" y1="-4" x2="0" y2="4" stroke="#78350f" strokeWidth="2" />
                <line x1={scaleBarInfo.barSvgWidth} y1="-4" x2={scaleBarInfo.barSvgWidth} y2="4" stroke="#78350f" strokeWidth="2" />
                <text x="0" y="10" fill="#78350f" fontSize="8" fontFamily="monospace">0</text>
                <text x={scaleBarInfo.barSvgWidth} y="10" fill="#78350f" fontSize="8" fontFamily="monospace" textAnchor="end">
                  {scaleBarInfo.imperialLabel}
                </text>
              </g>
            </g>
          </svg>

          {/* Authentic Compass Rose Indicator */}
          <div className="absolute top-3 right-3 flex flex-col items-center opacity-85 pointer-events-none select-none">
            <Compass
              className={`w-11 h-11 sm:w-13 sm:h-13 ${
                mapArchetype === 'peralta_stone' ? 'text-[#5c3214]' : 'text-[#6e4624]'
              }`}
            />
            <span
              className={`text-[10px] font-serif font-bold tracking-widest mt-0.5 ${
                mapArchetype === 'peralta_stone' ? 'text-[#5c3214]' : 'text-[#6e4624]'
              }`}
            >
              {mapArchetype === 'peralta_stone' ? '✦ NORTE ✦' : 'NORTH'}
            </span>
          </div>

          {/* ================= RESPONSIVE DYNAMIC INTERACTIVE HTML OVERLAY (PERCENTAGE BASED) ================= */}
          <div className="absolute inset-0 pointer-events-none">
            {/* 1. Mining Claim Boundary Circles & Stakes */}
            {showClaims &&
              displayClaims.map((claim) => {
                const { pctX, pctY, isInside } = toPctCoords(claim.x, claim.z);
                if (!isInside) return null;

                // Visual radius in percentage of viewport
                const visualRadiusPct = (claim.radius / spanX) * 100;

                return (
                  <React.Fragment key={claim.id}>
                    {/* Real-World Territory Boundary Circle */}
                    <div
                      style={{
                        left: `${pctX}%`,
                        top: `${pctY}%`,
                        width: `${visualRadiusPct * 2}%`,
                        height: `${visualRadiusPct * 2}%`,
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed pointer-events-none transition-all ${
                        claim.isPlayer
                          ? 'border-amber-600 bg-amber-500/18 shadow-[0_0_20px_rgba(217,119,6,0.35)] z-10'
                          : 'border-stone-700/60 bg-stone-800/10 z-5'
                      }`}
                    />

                    {/* Staked Center Pin */}
                    <div
                      style={{ left: `${pctX}%`, top: `${pctY}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group z-25 ${
                        claim.isPlayer ? 'cursor-pointer' : 'cursor-default'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPinId(selectedPinId === claim.id ? null : claim.id);
                        if (onFastTravel && claim.isPlayer) {
                          onFastTravel({ x: claim.x, y: playerPosition.y, z: claim.z }, claim.name);
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

                      {/* Tooltip Card */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-stone-900/95 text-stone-100 text-[11px] font-serif px-3 py-2 rounded-lg shadow-2xl whitespace-nowrap z-50 border border-amber-600/50 pointer-events-none min-w-[190px]">
                        <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                          <Pickaxe className="w-3.5 h-3.5 text-amber-400" />
                          <span>{claim.name}</span>
                          {claim.isPlayer && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              YOUR CLAIM
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                          Owner: {claim.ownerName} • Yield: {claim.extractedGold?.toFixed(1) || '0.0'} oz
                        </div>
                        <div className="text-[9px] text-stone-400 font-mono">
                          Coords: {Math.round(claim.x)}E, {Math.round(claim.z)}S • Radius: {claim.radius}m
                        </div>
                        {claim.isPlayer && onFastTravel && (
                          <div className="text-[9px] text-amber-300 font-mono mt-1 font-semibold">
                            ⚡ Click to Travel to Claim
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

            {/* 2. Landmark Fast-Travel Expeditions Pins */}
            {showLandmarks &&
              landmarks.map((lm) => {
                const { pctX, pctY, isInside } = toPctCoords(lm.position.x, lm.position.z);
                if (!isInside) return null;

                const isDiscovered = lm.discovered;
                const distToPlayer = Math.round(
                  Math.hypot(playerPosition.x - lm.position.x, playerPosition.z - lm.position.z)
                );
                const isNeedle = lm.id === 'weavers_needle';
                const isSelected = selectedPinId === lm.id;

                return (
                  <div
                    key={lm.id}
                    style={{ left: `${pctX}%`, top: `${pctY}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group cursor-pointer z-30"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPinId(isSelected ? null : lm.id);
                      if (onFastTravel) {
                        onFastTravel(lm.position, lm.name);
                      }
                    }}
                    title={`Click to fast-travel to ${lm.name}`}
                  >
                    {/* Animated Golden Keystone Reticle for Weaver's Needle */}
                    {isNeedle && (
                      <div className="absolute -inset-2.5 rounded-full border-2 border-amber-400/80 border-dashed animate-spin-slow pointer-events-none" />
                    )}

                    {/* Pin Icon Badge */}
                    <div
                      className={`rounded-full flex items-center justify-center shadow-lg transition-all group-hover:scale-125 ${
                        isNeedle
                          ? 'w-8 h-8 bg-gradient-to-tr from-[#78350f] via-[#b45309] to-[#d97706] text-amber-100 ring-2 ring-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.65)]'
                          : isDiscovered
                          ? lm.type === 'mine'
                            ? 'w-7 h-7 bg-amber-600 text-amber-100 ring-2 ring-amber-300 animate-pulse'
                            : lm.type === 'town'
                            ? 'w-7 h-7 bg-amber-800 text-amber-200 ring-2 ring-amber-400'
                            : 'w-7 h-7 bg-[#5c3e21] text-amber-100 ring-1 ring-amber-200'
                          : 'w-7 h-7 bg-[#6e4624] text-amber-100 ring-1 ring-amber-400/60'
                      }`}
                    >
                      {isNeedle ? (
                        <Compass className="w-5 h-5 text-amber-200 animate-spin-slow" />
                      ) : lm.type === 'mine' ? (
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

                    {/* Permanent Clear Label Tag (Can be toggled in layers) */}
                    {showLabels && (
                      <div
                        className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 rounded text-[10px] font-serif font-bold whitespace-nowrap shadow-md pointer-events-none ${
                          isNeedle
                            ? 'bg-amber-950/95 text-amber-300 border border-amber-500/80 ring-1 ring-amber-400/40 text-[10.5px]'
                            : 'bg-stone-950/80 text-amber-100 border border-amber-900/60'
                        }`}
                      >
                        {isNeedle ? "✦ WEAVER'S NEEDLE (4,553 FT) ✦" : lm.name}
                      </div>
                    )}

                    {/* High-Fidelity Tooltip Card */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-stone-950 text-stone-100 text-[11px] font-serif px-3 py-2.5 rounded-lg shadow-2xl whitespace-nowrap z-50 border border-amber-700 pointer-events-none min-w-[210px]">
                      {isNeedle ? (
                        <>
                          <span className="font-bold text-amber-300 block text-xs">
                            ⛰️ Weaver&apos;s Needle (El Sombrero • 4,553 FT)
                          </span>
                          <span className="block text-[10px] text-amber-400 font-mono mt-0.5">
                            USGS Elev: 4,553 ft (1,388 m) • Coords: 0E, 15S (33°25′47″N, 111°22′18″W) • Due South Transit
                          </span>
                          <span className="block text-[10px] text-stone-300 font-mono">
                            Distance: {distToPlayer > 1000 ? `${(distToPlayer / 1000).toFixed(1)} km` : `${distToPlayer} m`}
                          </span>
                          <span className="block text-[9px] text-amber-200 max-w-[240px] whitespace-normal italic mt-1 leading-tight">
                            Arizona&apos;s iconic 1,000-foot volcanic neck. The legendary stone map keystone and Jacob Waltz&apos;s deathbed shadow landmark.
                          </span>
                          {onFastTravel && (
                            <span className="block text-[9px] text-amber-300 font-mono mt-1 font-semibold">
                              ⚡ Click to Travel to Scenic Needle Saddle Overlook
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-amber-300 block text-xs">
                            {lm.name}
                          </span>
                          {lm.elevationFt && (
                            <span className="block text-[10px] text-amber-400 font-mono mt-0.5">
                              USGS Elev: {lm.elevationFt.toLocaleString()} ft ({Math.round(lm.elevationFt * 0.3048).toLocaleString()} m)
                            </span>
                          )}
                          <span className="block text-[10px] text-stone-400 font-mono">
                            Distance: {distToPlayer > 1000 ? `${(distToPlayer / 1000).toFixed(1)} km` : `${distToPlayer} m`}
                          </span>
                          {lm.geology && (
                            <span className="block text-[9px] text-stone-300 max-w-[230px] whitespace-normal italic mt-1 leading-tight">
                              {lm.geology}
                            </span>
                          )}
                          {onFastTravel && (
                            <span className="block text-[9px] text-amber-300 font-mono mt-1 font-semibold">
                              ⚡ Click to Fast-Travel Here
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

            {/* 3. Player Position Arrow & "YOU" Indicator */}
            {playerPct.isInside && (
              <div
                style={{ left: `${playerPct.pctX}%`, top: `${playerPct.pctY}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40"
              >
                <div
                  className="w-9 h-9 flex items-center justify-center transition-transform duration-75"
                  style={{ transform: `rotate(${playerDeg}deg)` }}
                >
                  <Navigation className="w-7 h-7 text-red-700 fill-red-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
                </div>
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-red-950/95 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md border border-red-500/60 whitespace-nowrap">
                  YOU
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= BOTTOM BAR: FAST-TRAVEL SHORTCUTS & CLAIMS ================= */}
        <div className="mt-2.5 p-2 bg-[#dfceab] border border-[#bfa37b] rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs font-serif shadow-sm select-none">
          <div className="flex items-center gap-1.5 text-[#5c3a21] font-bold">
            <Compass className="w-4 h-4 text-amber-800" />
            <span>Landmark Expeditions ({landmarks.length}):</span>
          </div>
          <div className="flex items-center flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
            {landmarks.map((lm) => {
              const distToPlayer = Math.round(
                Math.hypot(playerPosition.x - lm.position.x, playerPosition.z - lm.position.z)
              );
              return (
                <button
                  key={lm.id}
                  onClick={() => {
                    if (onFastTravel) {
                      onFastTravel(lm.position, lm.name);
                    }
                  }}
                  className="px-2 py-0.5 bg-[#8c6239] hover:bg-[#6e4e30] text-[#fbf6ea] rounded font-sans text-[11px] font-medium flex items-center gap-1 shadow-sm transition-all hover:scale-105 cursor-pointer"
                  title={`Fast-travel directly to ${lm.name} (${lm.elevationFt || 0} ft)`}
                >
                  <MapPin className="w-3 h-3 text-amber-300" />
                  <span>{lm.name}</span>
                  <span className="text-[10px] text-amber-300/80 font-mono">
                    ({formatUsgsDistance(distToPlayer, worldScaleMode).formatted})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Travel to Your Owned Claims & Clear All Claims Testing Button */}
        {playerOwnedClaims.length > 0 && (
          <div className="mt-2 p-2 bg-[#dfceab] border border-[#bfa37b] rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs font-serif shadow-sm select-none">
            <div className="flex items-center gap-1.5 text-[#5c3a21] font-bold">
              <Pickaxe className="w-4 h-4 text-amber-700" />
              <span>Your Mining Claims ({playerOwnedClaims.length}):</span>
            </div>
            <div className="flex items-center flex-wrap gap-1.5">
              {playerOwnedClaims.map((c) => {
                const distToPlayer = Math.round(
                  Math.hypot(playerPosition.x - c.x, playerPosition.z - c.z)
                );
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (onFastTravel) {
                        onFastTravel({ x: c.x, y: playerPosition.y, z: c.z }, c.name);
                      }
                    }}
                    className="px-2.5 py-1 bg-[#8c6239] hover:bg-[#6e4e30] text-amber-100 rounded-md font-sans text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 cursor-pointer"
                    title={`Fast-travel directly to ${c.name}`}
                  >
                    <Navigation className="w-3 h-3 text-amber-300 fill-amber-300" />
                    <span>{c.name}</span>
                    <span className="text-[10px] text-amber-300/80 font-mono">
                      ({formatUsgsDistance(distToPlayer, worldScaleMode).formatted})
                    </span>
                  </button>
                );
              })}
              {onClearAllClaims && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear all claims from the territory for testing?')) {
                      onClearAllClaims();
                    }
                  }}
                  className="px-2 py-1 bg-red-900/15 hover:bg-red-900/25 text-red-900 border border-red-800/30 rounded-md font-sans text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Clear all claims for testing"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All Claims (Testing)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Legend & Real-Time Coordinates Status Bar */}
        <div className="mt-2 pt-2 border-t border-[#8c6239]/40 flex flex-wrap items-center justify-between gap-2 text-xs font-serif select-none">
          <div className="flex items-center flex-wrap gap-3 text-stone-800 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5c3e21]" /> Discovered Landmark
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600" /> Lost Mine Portal
            </span>
            <span className="flex items-center gap-1">
              <Pickaxe className="w-3.5 h-3.5 text-amber-700" /> Staked Claim
            </span>
            <span className="flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-red-600 fill-red-600" /> Current Position
            </span>
            <span className="text-stone-600 italic">
              💡 Drag to pan • Mouse wheel or +/- to zoom
            </span>
          </div>

          <div className="text-stone-800 font-mono text-[11px] flex items-center gap-2">
            <span>
              Coords: {worldScaleMode === '1:1'
                ? `${Math.round(playerPosition.x * USGS_1TO1_HORIZONTAL_SCALE)}m E, ${playerPosition.z < 0 ? Math.abs(Math.round(playerPosition.z * USGS_1TO1_HORIZONTAL_SCALE)) + 'm N' : Math.round(playerPosition.z * USGS_1TO1_HORIZONTAL_SCALE) + 'm S'}`
                : `${Math.round(playerPosition.x)}E, ${playerPosition.z < 0 ? Math.abs(Math.round(playerPosition.z)) + 'N' : Math.round(playerPosition.z) + 'S'}`}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-800/20 text-amber-900 border border-amber-800/40 text-[10px] font-sans font-semibold uppercase tracking-wider">
              Elevation: {Math.round(playerPosition.y * 3.28084 + 2000)} ft
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
