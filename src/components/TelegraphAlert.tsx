import React from 'react';
import { AlertOctagon, Skull, Radio, Crosshair, X } from 'lucide-react';
import { ClaimInfringement } from '../types';

interface TelegraphAlertProps {
  infringements: ClaimInfringement[];
  currentProspectorId: string;
  onDismiss: (id: string) => void;
  onTrackLocation?: (x: number, z: number) => void;
}

export const TelegraphAlert: React.FC<TelegraphAlertProps> = ({
  infringements,
  currentProspectorId,
  onDismiss,
  onTrackLocation,
}) => {
  // Filter alerts where the current prospector is the owner of the violated claim
  const ownerAlerts = infringements.filter(
    (inf) => inf.claimOwnerId === currentProspectorId && !inf.resolved
  );

  if (ownerAlerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-auto animate-bounce-short">
      {ownerAlerts.map((alert) => (
        <div
          key={alert.id}
          className="p-4 bg-gradient-to-r from-red-950 via-stone-900 to-red-950 border-2 border-red-600 rounded-2xl shadow-2xl text-stone-100 flex flex-col gap-2 relative overflow-hidden"
        >
          {/* Telegraph pulse light */}
          <div className="flex items-center justify-between gap-2 border-b border-red-800/60 pb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider text-red-400 uppercase">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Telegraph Emergency Wire</span>
              </div>
            </div>

            <button
              onClick={() => onDismiss(alert.id)}
              className="p-1 text-stone-400 hover:text-stone-200 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1 text-xs">
            <div className="font-bold text-sm text-red-300 flex items-center gap-1.5">
              <Skull className="w-4 h-4 text-red-400" />
              <span>CLAIM JUMPER ON YOUR DEED!</span>
            </div>
            <p className="text-stone-300">
              Prospector <strong className="text-amber-300 underline">{alert.jumperName}</strong> is trespassing and{' '}
              {alert.action === 'wildcat_shaft' ? 'sinking an illegal shaft' : 'extracting your gold'} on claim{' '}
              <strong className="text-yellow-300">"{alert.claimName}"</strong>!
            </p>
            <div className="text-[11px] font-mono text-stone-400">
              Coordinates: [X: {alert.x}, Z: {alert.z}]
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-2">
            {onTrackLocation && (
              <button
                onClick={() => onTrackLocation(alert.x, alert.z)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-stone-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Track & Defend Vein</span>
              </button>
            )}
            <button
              onClick={() => onDismiss(alert.id)}
              className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-lg transition ml-auto"
            >
              Dismiss Wire
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
