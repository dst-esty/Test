/**
 * Historic Town of Tortilla Flat settlement boundary and municipal jurisdiction definitions.
 * Staking mining claims, patent surveys, shaft sinking, and mine structures are prohibited
 * within the settlement limits and its riverfront commercial terrace under frontier municipal law.
 */

export const TORTILLA_FLAT_BOUNDS = {
  minX: -48,
  maxX: 48,
  minZ: -315, // North boundary at Salt River boat landing and freight depot
  maxZ: -220, // South boundary at trailhead entrance
  centerX: 0,
  centerZ: -252,
  sanctuaryRadius: 65, // Radial coverage from town plaza
};

/**
 * Returns true if coordinate (x, z) falls within the Tortilla Flat settlement limits or
 * within an optional buffer distance (e.g. claim perimeter margin).
 */
export function isTortillaFlatTownLimits(x: number, z: number, buffer: number = 0): boolean {
  // 1. Check rectangular municipal commercial strip
  const clampedX = Math.max(TORTILLA_FLAT_BOUNDS.minX, Math.min(TORTILLA_FLAT_BOUNDS.maxX, x));
  const clampedZ = Math.max(TORTILLA_FLAT_BOUNDS.minZ, Math.min(TORTILLA_FLAT_BOUNDS.maxZ, z));
  const dx = x - clampedX;
  const dz = z - clampedZ;
  if ((dx * dx + dz * dz) <= (buffer * buffer)) {
    return true;
  }

  // 2. Check radial plaza sanctuary zone
  const distToPlaza = Math.hypot(x - TORTILLA_FLAT_BOUNDS.centerX, z - TORTILLA_FLAT_BOUNDS.centerZ);
  if (distToPlaza <= (TORTILLA_FLAT_BOUNDS.sanctuaryRadius + buffer)) {
    return true;
  }

  return false;
}
