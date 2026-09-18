/**
 * Robust Device Detection Utility for Lost Dutchman
 * Accurately determines if the current client is in fact a mobile device (phone or tablet)
 * vs a desktop/laptop computer with mouse and keyboard.
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Mobile User Agent check (phones, tablets, mobile browsers)
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isMobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|Silk|Kindle/i.test(
      ua
    );

  // 2. iPadOS / iOS touch device detection (modern iPads report as MacIntel in userAgent)
  const isIPad =
    (navigator.platform === 'MacIntel' || navigator.userAgent.includes('Macintosh')) &&
    navigator.maxTouchPoints > 1;

  // 3. Touch screen capabilities
  const hasTouchScreen =
    Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
    'ontouchstart' in window ||
    Boolean((navigator as any).msMaxTouchPoints && (navigator as any).msMaxTouchPoints > 0);

  const hasCoarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

  const hasNoHover =
    typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches;

  const isTouchPrimary = hasCoarsePointer && hasNoHover;

  // Screen size check for mobile/tablet dimensions
  const isMobileScreen =
    typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) <= 768;
  const isTabletScreen =
    typeof window !== 'undefined' && Math.max(window.innerWidth, window.innerHeight) <= 1024;

  // A device is considered truly mobile if it matches mobile UA, iPadOS, primary coarse touch, or has touch on a mobile/tablet screen
  return (
    isMobileUA ||
    isIPad ||
    isTouchPrimary ||
    (hasTouchScreen && (isMobileScreen || isTabletScreen))
  );
}

export function isPortraitMobileDevice(): boolean {
  if (!isMobileDevice()) return false;
  return typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
}
