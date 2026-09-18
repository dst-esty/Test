import React, { useRef, useState, useEffect, useCallback } from 'react';

interface VirtualJoystickProps {
  onMove: (move: { forward: number; right: number }) => void;
  className?: string;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  const originRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const maxRadius = 46; // Maximum joystick displacement in pixels

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      originRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

    setActive(true);
    updatePosition(touch.clientX, touch.clientY);
  };

  const updatePosition = useCallback(
    (clientX: number, clientY: number) => {
      const dx = clientX - originRef.current.x;
      const dy = clientY - originRef.current.y;
      const dist = Math.hypot(dx, dy);

      let clampedX = dx;
      let clampedY = dy;
      if (dist > maxRadius) {
        clampedX = (dx / dist) * maxRadius;
        clampedY = (dy / dist) * maxRadius;
      }

      setKnobPos({ x: clampedX, y: clampedY });

      // Calculate normalized directional values (-1 to +1)
      // Note: In 3D space: forward is -dy, right is +dx
      const forwardNorm = -clampedY / maxRadius;
      const rightNorm = clampedX / maxRadius;

      // Apply a slight deadzone for crisp stationary feel
      const deadzone = 0.12;
      const fVal = Math.abs(forwardNorm) > deadzone ? forwardNorm : 0;
      const rVal = Math.abs(rightNorm) > deadzone ? rightNorm : 0;

      onMove({ forward: fVal, right: rVal });
    },
    [maxRadius, onMove]
  );

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updatePosition(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setActive(false);
        setKnobPos({ x: 0, y: 0 });
        onMove({ forward: 0, right: 0 });
        break;
      }
    }
  };

  // Global cancel safety
  useEffect(() => {
    const handleGlobalEnd = () => {
      if (touchIdRef.current !== null) {
        touchIdRef.current = null;
        setActive(false);
        setKnobPos({ x: 0, y: 0 });
        onMove({ forward: 0, right: 0 });
      }
    };
    window.addEventListener('touchend', handleGlobalEnd);
    window.addEventListener('touchcancel', handleGlobalEnd);
    return () => {
      window.removeEventListener('touchend', handleGlobalEnd);
      window.removeEventListener('touchcancel', handleGlobalEnd);
    };
  }, [onMove]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`relative select-none touch-none flex items-center justify-center ${className}`}
      style={{ width: '130px', height: '130px' }}
    >
      {/* Outer boundary ring */}
      <div
        className={`absolute inset-0 rounded-full border-2 transition-colors duration-200 pointer-events-none ${
          active
            ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.5)]'
            : 'bg-stone-900/60 border-amber-600/40 backdrop-blur-md shadow-lg shadow-black/60'
        }`}
      >
        {/* Subtle cardinal crosshairs for vintage transit compass aesthetic */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-amber-400/50" />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-amber-400/50" />
        <div className="absolute left-2 top-1/2 -translate-y-1/2 h-0.5 w-2 bg-amber-400/50" />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 h-0.5 w-2 bg-amber-400/50" />
      </div>

      {/* Central Stick / Thumb Knob */}
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-2 pointer-events-none transition-transform ${
          active
            ? 'bg-gradient-to-b from-amber-500 to-amber-700 border-amber-200 shadow-amber-900/80 scale-105'
            : 'bg-gradient-to-b from-stone-800 to-stone-950 border-amber-600/60 shadow-black/80'
        }`}
        style={{
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          transition: active ? 'none' : 'transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        <div className="w-5 h-5 rounded-full border border-amber-400/40 bg-amber-400/20 flex items-center justify-center">
          <div className={`w-2 h-2 rounded-full ${active ? 'bg-amber-100 animate-ping' : 'bg-amber-400/80'}`} />
        </div>
      </div>
    </div>
  );
};
