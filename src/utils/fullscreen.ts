/**
 * Comprehensive Fullscreen & Immersive Mode Management Utility
 * Provides instant fullscreen activation, vendor-prefix normalization,
 * mobile orientation management, and user-gesture fallback triggers.
 */

export function isCurrentlyFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  const docEl = (document.documentElement || document.body) as any;
  return !!(
    doc.fullscreenEnabled ||
    doc.webkitFullscreenEnabled ||
    doc.mozFullScreenEnabled ||
    doc.msFullscreenEnabled ||
    docEl.requestFullscreen ||
    docEl.webkitRequestFullscreen ||
    docEl.mozRequestFullScreen ||
    docEl.msRequestFullscreen
  );
}

/**
 * Attempts to request total edge-to-edge native fullscreen.
 * Returns true if granted or already active, false if blocked by browser policy.
 */
export async function enterFullscreen(element?: HTMLElement): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  if (isCurrentlyFullscreen()) return true;

  const target = (element || document.documentElement || document.body) as any;
  const options = { navigationUI: 'hide' } as FullscreenOptions;

  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen(options);
    } else if (target.webkitRequestFullscreen) {
      await target.webkitRequestFullscreen();
    } else if (target.mozRequestFullScreen) {
      await target.mozRequestFullScreen();
    } else if (target.msRequestFullscreen) {
      await target.msRequestFullscreen();
    }

    // Try locking mobile orientation to landscape for maximum field of view
    if (typeof screen !== 'undefined' && screen.orientation && typeof (screen.orientation as any).lock === 'function') {
      try {
        await (screen.orientation as any).lock('landscape').catch(() => {});
      } catch {
        // Ignored if unsupported on desktop/restricted
      }
    }
    return true;
  } catch (_err) {
    // Expected when browser requires a transient user activation gesture
    return false;
  }
}

/**
 * Exits fullscreen mode across all vendor implementations.
 */
export async function exitFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  if (!isCurrentlyFullscreen()) return true;

  const doc = document as any;
  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
    }

    if (typeof screen !== 'undefined' && screen.orientation && typeof (screen.orientation as any).unlock === 'function') {
      try {
        (screen.orientation as any).unlock();
      } catch {
        // Ignored
      }
    }
    return true;
  } catch (_err) {
    return false;
  }
}

/**
 * Toggles fullscreen mode on or off.
 */
export async function toggleFullscreen(element?: HTMLElement): Promise<boolean> {
  if (isCurrentlyFullscreen()) {
    return exitFullscreen();
  } else {
    return enterFullscreen(element);
  }
}

/**
 * Installs one-time global listeners so that the absolute first user gesture
 * (click, tap, keypress) immediately elevates the application into total fullscreen
 * if not already granted on page load.
 */
let hasArmGestureHook = false;

export function armImmediateFullscreenOnFirstGesture(): void {
  if (typeof window === 'undefined' || hasArmGestureHook) return;
  hasArmGestureHook = true;

  // 1. Immediate attempt right now on invocation (works in PWA, kiosk, or if already gestured)
  enterFullscreen().catch(() => {});

  // 2. Fallback on very first user gesture anywhere on window
  const onFirstInteraction = () => {
    enterFullscreen().catch(() => {});
    cleanup();
  };

  const cleanup = () => {
    window.removeEventListener('pointerdown', onFirstInteraction, true);
    window.removeEventListener('touchstart', onFirstInteraction, true);
    window.removeEventListener('mousedown', onFirstInteraction, true);
    window.removeEventListener('keydown', onFirstInteraction, true);
    window.removeEventListener('click', onFirstInteraction, true);
  };

  window.addEventListener('pointerdown', onFirstInteraction, { capture: true, once: true });
  window.addEventListener('touchstart', onFirstInteraction, { capture: true, once: true });
  window.addEventListener('mousedown', onFirstInteraction, { capture: true, once: true });
  window.addEventListener('keydown', onFirstInteraction, { capture: true, once: true });
  window.addEventListener('click', onFirstInteraction, { capture: true, once: true });
}
