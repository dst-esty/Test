import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  deleteDoc,
  where,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { TerritoryClaim, ClaimInfringement, Vector3D } from '../types';
import { safeLocalStorage } from '../utils/storage';

export class TerritoryClaimService {
  private static instance: TerritoryClaimService;
  private claimsCache: Map<string, TerritoryClaim> = new Map();
  private subscribers = new Set<(claims: TerritoryClaim[]) => void>();
  private infringementSubscribers = new Set<(infringements: ClaimInfringement[]) => void>();
  private activeInfringements: ClaimInfringement[] = [];
  private unsubscribeClaims: (() => void) | null = null;
  private unsubscribeInfringements: (() => void) | null = null;

  public static getInstance(): TerritoryClaimService {
    if (!TerritoryClaimService.instance) {
      TerritoryClaimService.instance = new TerritoryClaimService();
    }
    return TerritoryClaimService.instance;
  }

  constructor() {
    this.initRealtimeListeners();
  }

  // Get or persist a steady local prospector UUID for claim deeds
  public getOrCreateProspectorId(): string {
    let id = safeLocalStorage.getItem('superstition_prospector_id');
    if (!id) {
      id = 'prospector_' + Math.random().toString(36).substring(2, 10);
      safeLocalStorage.setItem('superstition_prospector_id', id);
    }
    return id;
  }

  public getProspectorName(): string {
    return safeLocalStorage.getItem('prospector_name') || 'Canyon Jack';
  }

  private initRealtimeListeners() {
    const claimsPath = 'territory_claims';
    try {
      this.unsubscribeClaims = onSnapshot(
        collection(db, claimsPath),
        (snapshot) => {
          this.claimsCache.clear();
          snapshot.forEach((d) => {
            const data = d.data() as TerritoryClaim;
            this.claimsCache.set(data.id, data);
          });
          const list = Array.from(this.claimsCache.values());
          this.subscribers.forEach((cb) => cb(list));
        },
        (error) => {
          console.warn('[TerritoryClaimService] Realtime listener notice:', error.message);
          try {
            handleFirestoreError(error, OperationType.LIST, claimsPath);
          } catch (e) {
            console.warn('[TerritoryClaimService] Handled firestore claims error non-fatally:', e);
          }
        }
      );
    } catch (err) {
      console.warn('[TerritoryClaimService] Failed to bind territory claims listener:', err);
    }

    const infringementsPath = 'claim_infringements';
    try {
      this.unsubscribeInfringements = onSnapshot(
        collection(db, infringementsPath),
        (snapshot) => {
          const list: ClaimInfringement[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as ClaimInfringement;
            if (!data.resolved) {
              list.push(data);
            }
          });
          this.activeInfringements = list;
          this.infringementSubscribers.forEach((cb) => cb(list));
        },
        (error) => {
          console.warn('[TerritoryClaimService] Realtime infringement notice:', error.message);
          try {
            handleFirestoreError(error, OperationType.LIST, infringementsPath);
          } catch (e) {
            console.warn('[TerritoryClaimService] Handled firestore infringement error non-fatally:', e);
          }
        }
      );
    } catch (err) {
      console.warn('[TerritoryClaimService] Failed to bind infringement listener:', err);
    }
  }

  public subscribe(cb: (claims: TerritoryClaim[]) => void): () => void {
    this.subscribers.add(cb);
    cb(Array.from(this.claimsCache.values()));
    return () => this.subscribers.delete(cb);
  }

  public subscribeInfringements(cb: (infringements: ClaimInfringement[]) => void): () => void {
    this.infringementSubscribers.add(cb);
    cb(this.activeInfringements);
    return () => this.infringementSubscribers.delete(cb);
  }

  public getAllClaims(): TerritoryClaim[] {
    return Array.from(this.claimsCache.values());
  }

  // Check if coordinates overlap any existing registered claim (radius 40m)
  public checkOverlap(
    pos: { x: number; z: number },
    radius = 40,
    ignoreClaimId?: string
  ): TerritoryClaim | null {
    for (const claim of this.claimsCache.values()) {
      if (ignoreClaimId && claim.id === ignoreClaimId) continue;
      const dx = claim.x - pos.x;
      const dz = claim.z - pos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      // If distance is less than sum of both claims' radii, it overlaps
      if (distance < (claim.radius || 40) + radius - 2) {
        return claim;
      }
    }
    return null;
  }

  // Check if position is within a specific claim
  public findClaimAt(pos: { x: number; z: number }): TerritoryClaim | null {
    for (const claim of this.claimsCache.values()) {
      const dx = claim.x - pos.x;
      const dz = claim.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= (claim.radius || 40)) {
        return claim;
      }
    }
    return null;
  }

  // Stake a claim in Firestore
  public async stakeClaim(params: {
    name: string;
    position: Vector3D;
    radius?: number;
    ownerId?: string;
    ownerName?: string;
    isWildcatOrigin?: boolean;
  }): Promise<{ success: boolean; claim?: TerritoryClaim; conflict?: TerritoryClaim; message?: string }> {
    const ownerId = params.ownerId || this.getOrCreateProspectorId();
    const ownerName = params.ownerName || this.getProspectorName();
    const radius = params.radius || 40;

    // Check overlap with existing claims
    const existingConflict = this.checkOverlap({ x: params.position.x, z: params.position.z }, radius);
    if (existingConflict) {
      if (existingConflict.ownerId === ownerId) {
        return {
          success: true,
          claim: existingConflict,
          message: `Already registered as your claim "${existingConflict.name}".`,
        };
      }
      return {
        success: false,
        conflict: existingConflict,
        message: `Ground overlaps registered claim "${existingConflict.name}" owned by ${existingConflict.ownerName}! Staking blocked by mining recorder.`,
      };
    }

    const claimId = `claim_${Math.round(params.position.x)}_${Math.round(params.position.z)}_${Date.now().toString(36)}`;
    const newClaim: TerritoryClaim = {
      id: claimId,
      name: params.name.trim().substring(0, 64) || "Peralta's Vein",
      ownerId,
      ownerName,
      x: Math.round(params.position.x * 10) / 10,
      z: Math.round(params.position.z * 10) / 10,
      radius,
      stakedAt: Date.now(),
      extractedGold: 0,
      blocksDug: 0,
      isWildcatOrigin: !!params.isWildcatOrigin,
    };

    const path = `territory_claims/${claimId}`;
    try {
      await setDoc(doc(db, 'territory_claims', claimId), newClaim);
      this.claimsCache.set(claimId, newClaim);
      return { success: true, claim: newClaim };
    } catch (err) {
      console.error('[TerritoryClaimService] Failed to write claim:', err);
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }

  // Record an infringement (wildcatting on someone else's land or mining their ore)
  public async reportInfringement(params: {
    claim: TerritoryClaim;
    jumperId: string;
    jumperName: string;
    action: 'wildcat_shaft' | 'claim_jump_ore' | 'boundary_dig';
    position: Vector3D;
  }): Promise<void> {
    // Don't report if you own the claim
    if (params.claim.ownerId === params.jumperId) return;

    const infringementId = `infr_${params.claim.id}_${Date.now()}`;
    const payload: ClaimInfringement = {
      id: infringementId,
      claimId: params.claim.id,
      claimName: params.claim.name,
      claimOwnerId: params.claim.ownerId,
      claimOwnerName: params.claim.ownerName,
      jumperId: params.jumperId,
      jumperName: params.jumperName,
      action: params.action,
      x: Math.round(params.position.x),
      y: Math.round(params.position.y),
      z: Math.round(params.position.z),
      timestamp: Date.now(),
      resolved: false,
    };

    const path = `claim_infringements/${infringementId}`;
    try {
      await setDoc(doc(db, 'claim_infringements', infringementId), payload);
    } catch (err) {
      console.warn('[TerritoryClaimService] Failed to report infringement:', err);
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }

  // Dismiss / resolve an infringement
  public async resolveInfringement(infringementId: string): Promise<void> {
    const path = `claim_infringements/${infringementId}`;
    try {
      await updateDoc(doc(db, 'claim_infringements', infringementId), { resolved: true });
    } catch (err) {
      console.warn('[TerritoryClaimService] Failed to resolve infringement:', err);
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  public cleanup() {
    if (this.unsubscribeClaims) this.unsubscribeClaims();
    if (this.unsubscribeInfringements) this.unsubscribeInfringements();
  }
}

export const territoryClaims = TerritoryClaimService.getInstance();
