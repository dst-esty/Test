export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Landmark {
  id: string;
  name: string;
  shortDesc: string;
  position: Vector3D;
  radius: number;
  clueId?: string;
  discovered: boolean;
  type: 'camp' | 'needle' | 'ruins' | 'spring' | 'petroglyph' | 'massacre' | 'mine';
}

export interface ClueItem {
  id: string;
  title: string;
  lore: string;
  hint: string;
  discovered: boolean;
  landmarkId: string;
  iconName: string;
  foundAt?: string;
}

export interface PlayerState {
  position: Vector3D;
  rotation: { yaw: number; pitch: number };
  hydration: number; // 0 - 100
  isSprinting: boolean;
  isInsideMine: boolean;
  equippedTool: 'compass' | 'lantern' | 'binoculars' | 'detector' | 'pickaxe';
  goldFound: number; // ounces
  discoveredLandmarks: string[];
  collectedClues: string[];
}

export interface GameSettings {
  timeOfDay: number; // 0 to 24 (hours)
  autoCycleTime: boolean;
  soundEnabled: boolean;
  viewMode: 'first' | 'third';
}
