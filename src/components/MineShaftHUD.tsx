import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  Pickaxe,
  Unlock,
  Lock,
  Sparkles,
  Sun,
  Layers,
  Droplets,
  Shield,
  Wind,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { MineLayerData, RoomDirection, WaterTableState } from '../types';

interface MineShaftHUDProps {
  isInsideMine: boolean;
  currentLevel: number; // 0 = surface, 1+ = subterranean layers
  maxUnlockedLevel: number;
  layers: MineLayerData[];
  onAscend: () => void;
  onDescend: () => void;
  onExitToSurface: () => void;
  onSelectLevel?: (level: number) => void;
  onDigDown?: () => void;
  isNearExcavationPit?: boolean;
  // Room Excavation
  onExcavateRoom?: (direction: RoomDirection) => void;
  onTimberRoom?: (direction: RoomDirection) => void;
  // Water table & Cornish pump
  waterTable?: WaterTableState;
  onTogglePump?: () => void;
  // Player hydration / oxygen
  oxygenPercent?: number;
  isSubmerged?: boolean;
}

export const MineShaftHUD: React.FC<MineShaftHUDProps> = ({
  isInsideMine,
  currentLevel,
  maxUnlockedLevel,
  layers,
  onAscend,
  onDescend,
  onExitToSurface,
  onSelectLevel,
  onDigDown,
  onExcavateRoom,
  onTimberRoom,
  waterTable,
  onTogglePump,
  oxygenPercent = 100,
  isSubmerged = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'shaft' | 'rooms' | 'water'>('shaft');

  if (!isInsideMine && currentLevel === 0) {
    return null;
  }

  const activeLayer = layers.find((l) => l.level === currentLevel);
  const nextLayer = layers.find((l) => l.level === currentLevel + 1);
  const rooms = activeLayer?.excavatedRooms || [];
  const currentWaterLevel = waterTable?.waterLevelInLevel[currentLevel] || activeLayer?.waterLevel || 0;
  const isLayerFlooding = (waterTable?.isFlooding && activeLayer && activeLayer.depthMeters >= (waterTable?.waterTableDepth || 90)) || activeLayer?.isFlooding;

  return (
    <div
      id="mine-shaft-hud"
      className="pointer-events-auto absolute left-3 sm:left-5 top-20 sm:top-24 z-30 flex flex-col gap-2 w-72 sm:w-80 font-mono select-none"
    >
      {/* Submerged Oxygen Warning Bar */}
      {isSubmerged && (
        <div
          id="oxygen-warning-bar"
          className="bg-blue-950/95 border-2 border-cyan-400/80 rounded-xl p-2.5 shadow-2xl flex flex-col gap-1.5 animate-pulse"
        >
          <div className="flex items-center justify-between text-cyan-200 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-cyan-400" />
              <span>SUBMERGED LUNG CAPACITY:</span>
            </span>
            <span className={oxygenPercent <= 25 ? 'text-rose-400 font-bold' : 'text-cyan-300'}>
              {Math.round(oxygenPercent)}%
            </span>
          </div>
          <div className="w-full bg-blue-950 rounded-full h-2.5 overflow-hidden border border-cyan-500/50">
            <div
              className={`h-full transition-all duration-200 ${
                oxygenPercent <= 25
                  ? 'bg-rose-500'
                  : oxygenPercent <= 50
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-cyan-400 to-blue-500'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, oxygenPercent))}%` }}
            />
          </div>
          {oxygenPercent <= 25 && (
            <span className="text-[10px] text-rose-300 font-sans font-semibold text-center">
              ⚠️ DROWNING! Surface immediately or start the Cornish Pump!
            </span>
          )}
        </div>
      )}

      {/* Main Depth & Stratum Card */}
      <div className="bg-stone-950/92 backdrop-blur-md text-amber-100 border-2 border-amber-700/70 rounded-2xl shadow-[0_0_24px_rgba(0,0,0,0.85)] p-3.5 flex flex-col gap-2.5">
        {/* Header: Current Geological Layer */}
        <div className="flex items-center justify-between border-b border-amber-900/60 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-600/50 text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">
                Subterranean Mine
              </span>
              <span className="text-xs font-bold text-amber-200">
                {activeLayer ? activeLayer.name : 'Desert Surface Collar'}
              </span>
            </div>
          </div>
          <button
            id="btn-toggle-shaft-hud"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 text-stone-400 hover:text-amber-300 rounded hover:bg-stone-800 transition cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Tab Switcher: Shaft | Rooms | Hydrology */}
        <div className="grid grid-cols-3 gap-1 bg-stone-900/80 p-1 rounded-xl border border-stone-800 text-[10px] font-sans font-bold">
          <button
            id="tab-shaft"
            onClick={() => setActiveTab('shaft')}
            className={`py-1 px-1 rounded-lg transition text-center cursor-pointer ${
              activeTab === 'shaft'
                ? 'bg-amber-600 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-amber-200 hover:bg-stone-800'
            }`}
          >
            Shaft
          </button>
          <button
            id="tab-rooms"
            onClick={() => setActiveTab('rooms')}
            className={`py-1 px-1 rounded-lg transition text-center flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'rooms'
                ? 'bg-amber-600 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-amber-200 hover:bg-stone-800'
            }`}
          >
            <span>Drifts ({rooms.filter((r) => r.isComplete).length}/4)</span>
          </button>
          <button
            id="tab-water"
            onClick={() => setActiveTab('water')}
            className={`py-1 px-1 rounded-lg transition text-center flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'water'
                ? 'bg-blue-600 text-white shadow-sm'
                : currentWaterLevel > 0.1
                ? 'text-cyan-400 hover:bg-stone-800'
                : 'text-stone-400 hover:text-amber-200 hover:bg-stone-800'
            }`}
          >
            <Droplets className="w-3 h-3" />
            <span>Water {currentWaterLevel > 0.1 ? `(${currentWaterLevel.toFixed(1)}m)` : ''}</span>
          </button>
        </div>

        {/* TAB 1: SHAFT OVERVIEW & SINKING */}
        {activeTab === 'shaft' && (
          <div className="flex flex-col gap-2">
            {/* Current Depth & Strata Details */}
            {activeLayer && (
              <div className="flex flex-col gap-1 bg-stone-900/90 p-2.5 rounded-xl border border-stone-800 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Depth:</span>
                  <span className="font-bold text-amber-300">-{activeLayer.depthMeters.toFixed(1)}m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Strata:</span>
                  <span
                    className="text-right text-stone-200 font-sans font-medium text-[10px] max-w-[170px] truncate"
                    title={activeLayer.strata}
                  >
                    {activeLayer.strata}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Primary Ore:</span>
                  <span className="text-amber-400 text-[10px] font-semibold">{activeLayer.primaryMineral}</span>
                </div>
                {currentWaterLevel > 0.05 && (
                  <div className="flex justify-between items-center pt-1 border-t border-stone-800 text-cyan-300">
                    <span className="flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-cyan-400" /> Sump Water:
                    </span>
                    <span className="font-bold">{currentWaterLevel.toFixed(2)}m Deep</span>
                  </div>
                )}
              </div>
            )}

            {/* Dig Down Progress towards next layer (Endless!) */}
            {currentLevel > 0 && (
              <div className="flex flex-col gap-1 bg-amber-950/40 p-2.5 rounded-xl border border-amber-700/40 text-[11px]">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    <Pickaxe className="w-3.5 h-3.5 text-amber-400" /> Sink Shaft to Level {currentLevel + 1}:
                  </span>
                  <span className="font-mono text-amber-400">
                    {activeLayer?.currentHits || 0}/{activeLayer?.hitsNeeded || 6} ({activeLayer?.digProgress || 0}%)
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-stone-900 rounded-full h-2.5 overflow-hidden border border-amber-800/50">
                  <div
                    className="bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 h-full transition-all duration-300"
                    style={{ width: `${activeLayer?.digProgress || 0}%` }}
                  />
                </div>

                {/* Dig Action Button */}
                {onDigDown && (
                  <button
                    id="btn-dig-bedrock-down"
                    onClick={onDigDown}
                    className="mt-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs shadow-md transition transform active:scale-95 cursor-pointer"
                  >
                    <Pickaxe className="w-3.5 h-3.5" />
                    <span>SINK SHAFT DEEPER</span>
                    <span className="text-[9px] bg-stone-950/70 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                      PICKAXE / E
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Expanded Layer Navigation Map (Scrollable endless list) */}
            {isExpanded && (
              <div className="flex flex-col gap-1.5 pt-1 border-t border-stone-800/80">
                <span className="text-[9px] text-stone-400 uppercase tracking-wider font-bold">
                  Sunk Shaft Levels ({layers.length} Discovered):
                </span>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                  {layers.map((layer) => {
                    const isCurrent = layer.level === currentLevel;
                    const isUnlocked = layer.level <= maxUnlockedLevel;
                    const hasWater = (waterTable?.waterLevelInLevel[layer.level] || 0) > 0.2;

                    return (
                      <button
                        key={layer.id}
                        id={`btn-layer-nav-${layer.level}`}
                        disabled={!isUnlocked}
                        onClick={() => onSelectLevel && isUnlocked && onSelectLevel(layer.level)}
                        className={`flex items-center justify-between p-2 rounded-xl text-left text-xs transition border cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-500/25 text-amber-200 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] font-bold'
                            : isUnlocked
                            ? 'bg-stone-900/60 text-stone-300 hover:bg-stone-800/80 border-stone-800'
                            : 'bg-stone-950/40 text-stone-600 border-transparent cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isUnlocked ? (
                            <Unlock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="block truncate font-serif">
                              L{layer.level}: {layer.name}
                            </span>
                            <span className="text-[9px] text-stone-400 font-mono">
                              -{layer.depthMeters.toFixed(0)}m • {layer.primaryMineral}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {hasWater && <Droplets className="w-3 h-3 text-cyan-400 shrink-0" />}
                          {isCurrent && (
                            <span className="text-[9px] bg-amber-400 text-stone-950 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                              YOU
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LATERAL DRIFT ROOMS EXCAVATION */}
        {activeTab === 'rooms' && (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            <span className="text-[9px] text-stone-400 uppercase tracking-wider font-bold">
              Cardinal Drift Stoping ({activeLayer?.name || 'Chamber'}):
            </span>

            {rooms.length === 0 ? (
              <div className="p-3 bg-stone-900/80 rounded-xl text-center text-xs text-stone-400">
                No rooms charted for this layer.
              </div>
            ) : (
              rooms.map((room) => {
                return (
                  <div
                    key={room.id}
                    id={`drift-card-${room.direction}`}
                    className={`p-2.5 rounded-xl border flex flex-col gap-1.5 text-xs ${
                      room.isComplete
                        ? 'bg-stone-900/90 border-amber-800/60'
                        : 'bg-stone-950/80 border-stone-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-bold text-amber-200 capitalize font-serif">{room.name}</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          room.isTimbered
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : room.isComplete
                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                            : 'bg-stone-900 text-stone-400 border border-stone-700'
                        }`}
                      >
                        {room.isTimbered ? 'TIMBERED' : room.isComplete ? 'CARVED' : `${room.excavationProgress}%`}
                      </span>
                    </div>

                    <div className="text-[10px] text-stone-400 flex justify-between">
                      <span>Vein: <strong className="text-amber-300">{room.oreVeinType}</strong></span>
                      <span>Yield: <strong className="text-amber-400">+{room.oreYieldOunces} oz</strong></span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-stone-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          room.isComplete
                            ? 'bg-gradient-to-r from-emerald-500 to-amber-400'
                            : 'bg-gradient-to-r from-amber-600 to-amber-400'
                        }`}
                        style={{ width: `${room.excavationProgress}%` }}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {!room.isComplete ? (
                        <button
                          id={`btn-excavate-drift-${room.direction}`}
                          onClick={() => onExcavateRoom && onExcavateRoom(room.direction)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-[10px] flex items-center justify-center gap-1 shadow transition cursor-pointer"
                        >
                          <Pickaxe className="w-3 h-3" />
                          <span>EXCAVATE DRIFT</span>
                        </button>
                      ) : !room.isTimbered ? (
                        <button
                          id={`btn-timber-drift-${room.direction}`}
                          onClick={() => onTimberRoom && onTimberRoom(room.direction)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow transition cursor-pointer"
                        >
                          <Shield className="w-3 h-3" />
                          <span>TIMBER SQUARE-SET</span>
                        </button>
                      ) : (
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          <span>Reinforced with Comstock pine timbering</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: HYDROLOGY & CORNISH STEAM PUMP */}
        {activeTab === 'water' && (
          <div className="flex flex-col gap-2">
            <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800 text-[11px] flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-cyan-200">
                <span className="text-stone-400">Regional Water Table:</span>
                <span className="font-bold font-mono">-{waterTable?.waterTableDepth.toFixed(1) || '92.0'}m</span>
              </div>
              <div className="flex justify-between items-center text-cyan-200">
                <span className="text-stone-400">Current Sump Water:</span>
                <span className="font-bold text-cyan-400 font-mono">{currentWaterLevel.toFixed(2)}m Deep</span>
              </div>
              <div className="flex justify-between items-center text-cyan-200">
                <span className="text-stone-400">Aquifer Fault:</span>
                <span className={waterTable?.aquiferBreached ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {waterTable?.aquiferBreached ? 'BREACHED & INFLOWING' : 'Dry Caprock'}
                </span>
              </div>
            </div>

            {isLayerFlooding && (
              <div className="bg-rose-950/70 border border-rose-600/70 p-2.5 rounded-xl text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                <span>
                  <strong>AQUIFER FAULT FLOODING!</strong> Groundwater is rising in the shaft drifts. Dewatering required to excavate bedrock!
                </span>
              </div>
            )}

            {/* Cornish Steam Dewatering Pump Control */}
            <div className="bg-blue-950/50 p-2.5 rounded-xl border border-blue-700/60 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  <span>Cornish Steam Pump</span>
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    waterTable?.pumpActive
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600 animate-pulse'
                      : 'bg-stone-900 text-stone-400 border border-stone-700'
                  }`}
                >
                  {waterTable?.pumpActive ? 'CHUGGING (ACTIVE)' : 'IDLE'}
                </span>
              </div>

              <div className="text-[10px] text-cyan-200/80 space-y-0.5 font-sans">
                <div>• Steam Discharge Rate: <strong>0.30 m/sec</strong></div>
                <div>• Recovers flooded stopes & prevents prospector drowning</div>
              </div>

              {onTogglePump && (
                <button
                  id="btn-toggle-cornish-pump"
                  onClick={onTogglePump}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer ${
                    waterTable?.pumpActive
                      ? 'bg-rose-700 hover:bg-rose-600 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-stone-950'
                  }`}
                >
                  <Droplets className="w-3.5 h-3.5" />
                  <span>{waterTable?.pumpActive ? 'STOP CORNISH PUMP' : 'START CORNISH STEAM PUMP'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick Shaft Elevator Controls */}
        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-stone-800">
          <button
            id="btn-shaft-ascend"
            onClick={onAscend}
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-amber-200 rounded-xl border border-stone-700 text-[10px] transition cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentLevel <= 1 ? 'Surface' : `Layer ${currentLevel - 1}`}</span>
          </button>

          <button
            id="btn-shaft-descend"
            onClick={onDescend}
            disabled={currentLevel >= maxUnlockedLevel}
            className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border text-[10px] transition ${
              currentLevel < maxUnlockedLevel
                ? 'bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-amber-200 border-stone-700 cursor-pointer'
                : 'bg-stone-950/50 text-stone-600 border-stone-800/40 cursor-not-allowed'
            }`}
          >
            <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentLevel >= maxUnlockedLevel ? 'Dig To Sink' : `Layer ${currentLevel + 1}`}</span>
          </button>
        </div>

        {/* Exit to Desert Surface Button */}
        <button
          id="btn-exit-to-surface"
          onClick={onExitToSurface}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-stone-900/60 hover:bg-amber-950/60 text-stone-400 hover:text-amber-200 rounded-lg text-[10px] transition border border-stone-800 cursor-pointer"
        >
          <Sun className="w-3 h-3 text-amber-400" />
          <span>Exit to Desert Surface</span>
        </button>
      </div>
    </div>
  );
};
