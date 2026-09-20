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
import { TerritoryClaim, ClaimInfringement, ClaimTradeOffer, Vector3D } from '../types';
import { safeLocalStorage } from '../utils/storage';
import { isTortillaFlatTownLimits } from '../world/townBoundaries';

export type { TerritoryClaim, ClaimInfringement, ClaimTradeOffer };

export class TerritoryClaimService {
  private static instance: TerritoryClaimService;
  private static STORAGE_KEY = 'superstition_cached_claims';
  private claimsCache: Map<string, TerritoryClaim> = new Map();
  private subscribers = new Set<(claims: TerritoryClaim[]) => void>();
  private infringementSubscribers = new Set<(infringements: ClaimInfringement[]) => void>();
  private tradeOfferSubscribers = new Set<(offers: ClaimTradeOffer[]) => void>();
  private activeInfringements: ClaimInfringement[] = [];
  private activeTradeOffers: ClaimTradeOffer[] = [];
  private unsubscribeClaims: (() => void) | null = null;
  private unsubscribeInfringements: (() => void) | null = null;
  private unsubscribeTradeOffers: (() => void) | null = null;

  public static getInstance(): TerritoryClaimService {
    if (!TerritoryClaimService.instance) {
      TerritoryClaimService.instance = new TerritoryClaimService();
    }
    return TerritoryClaimService.instance;
  }

  private static STARTER_CLAIMS: TerritoryClaim[] = [
    {
      id: 'claim_historic_weavers_placer',
      name: "Weaver's Needle Gold Placer",
      ownerId: 'syndicate_land_office',
      ownerName: 'Arizona Territorial Mining Syndicate',
      x: 82.0,
      z: -64.0,
      radius: 38,
      stakedAt: Date.now() - 86400000 * 12,
      extractedGold: 14.5,
      blocksDug: 28,
      isWildcatOrigin: false,
      forSale: true,
      priceDollars: 320,
      priceGoldOunces: 15.5,
      description: 'Rich placer sand wash bordering the volcanic basalt needle. Proven heavy nugget yield.',
      listedAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'claim_historic_black_rock_gulch',
      name: 'Black Rock Quartz Lode #2',
      ownerId: 'npc_old_pete',
      ownerName: 'Dusty Pete',
      x: -115.0,
      z: 145.0,
      radius: 42,
      stakedAt: Date.now() - 86400000 * 25,
      extractedGold: 22.0,
      blocksDug: 54,
      isWildcatOrigin: true,
      forSale: true,
      priceDollars: 450,
      priceGoldOunces: 21.8,
      description: 'Exposed milky quartz seam with visible electrum wire veins. Timbered entry collar included.',
      listedAt: Date.now() - 86400000 * 1,
    },
    {
      id: 'claim_historic_palo_verde_wash',
      name: 'Palo Verde Wash Claim #4',
      ownerId: 'npc_silas_thorne',
      ownerName: 'Silas Thorne',
      x: -45.0,
      z: -160.0,
      radius: 35,
      stakedAt: Date.now() - 86400000 * 7,
      extractedGold: 5.0,
      blocksDug: 16,
      isWildcatOrigin: false,
      forSale: true,
      priceDollars: 120,
      priceGoldOunces: 5.8,
      description: 'Shallow placer gravel bench near dry wash. Affordable starter claim for newly arrived prospectors.',
      listedAt: Date.now() - 86400000 * 1,
    },
    {
      id: 'claim_historic_peralta_arrastra',
      name: 'Peralta Arrastra Lode #1',
      ownerId: 'syndicate_land_office',
      ownerName: 'Arizona Territorial Mining Syndicate',
      x: 120.0,
      z: 85.0,
      radius: 40,
      stakedAt: Date.now() - 86400000 * 40,
      extractedGold: 18.0,
      blocksDug: 36,
      isWildcatOrigin: false,
      forSale: true,
      priceDollars: 260,
      priceGoldOunces: 12.6,
      description: 'Historic Spanish arrastra site with exposed crushed quartz tailings and rich ore veins in canyon wall.',
      listedAt: Date.now() - 86400000 * 3,
    },
  ];

  constructor() {
    // 1. Attempt to load locally cached claims first for instantaneous reload restoration
    try {
      const cachedRaw = safeLocalStorage.getItem(TerritoryClaimService.STORAGE_KEY);
      if (cachedRaw) {
        const parsed: TerritoryClaim[] = JSON.parse(cachedRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach((c) => {
            if (c && c.id) this.claimsCache.set(c.id, c);
          });
        }
      }
    } catch (e) {
      console.warn('[TerritoryClaimService] Failed to parse local cached claims:', e);
    }

    // 2. Pre-populate cache with initial starter patents if missing
    for (const c of TerritoryClaimService.STARTER_CLAIMS) {
      if (!this.claimsCache.has(c.id)) {
        this.claimsCache.set(c.id, c);
      }
    }
    this.initRealtimeListeners();
  }

  private saveToLocalStorage(list: TerritoryClaim[]): void {
    try {
      safeLocalStorage.setItem(TerritoryClaimService.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[TerritoryClaimService] Failed to cache claims locally:', e);
    }
  }

  private notifyClaimsSubscribers(): void {
    const list = Array.from(this.claimsCache.values());
    this.saveToLocalStorage(list);
    this.subscribers.forEach((cb) => cb(list));
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
          const remoteMap = new Map<string, TerritoryClaim>();
          snapshot.forEach((d) => {
            const data = d.data() as TerritoryClaim;
            remoteMap.set(data.id, data);
          });

          // Retain local player claims if Firestore has not synced them yet
          const localOwnerId = this.getOrCreateProspectorId();
          this.claimsCache.forEach((localClaim, id) => {
            if (localClaim.ownerId === localOwnerId && !remoteMap.has(id)) {
              remoteMap.set(id, localClaim);
            }
          });

          this.claimsCache = remoteMap;

          // If no claims exist in database, seed historic frontier claims so market is lively
          if (this.claimsCache.size === 0) {
            this.seedHistoricMarketClaims();
          }

          this.notifyClaimsSubscribers();
        },
        (error) => {
          console.warn('[TerritoryClaimService] Realtime listener notice (operating with local cache):', error.message);
          // Non-fatal fallback: notify subscribers with cached items
          this.notifyClaimsSubscribers();
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

    const tradeOffersPath = 'claim_trade_offers';
    try {
      this.unsubscribeTradeOffers = onSnapshot(
        collection(db, tradeOffersPath),
        (snapshot) => {
          const list: ClaimTradeOffer[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as ClaimTradeOffer);
          });
          this.activeTradeOffers = list;
          this.tradeOfferSubscribers.forEach((cb) => cb(list));
        },
        (error) => {
          console.warn('[TerritoryClaimService] Trade offers listener note:', error.message);
          try {
            handleFirestoreError(error, OperationType.LIST, tradeOffersPath);
          } catch (e) {
            console.warn('[TerritoryClaimService] Handled trade offers error non-fatally:', e);
          }
        }
      );
    } catch (err) {
      console.warn('[TerritoryClaimService] Failed to bind trade offers listener:', err);
    }
  }

  // Seed historic territorial patents on market if database is fresh
  private async seedHistoricMarketClaims() {
    for (const c of TerritoryClaimService.STARTER_CLAIMS) {
      try {
        await setDoc(doc(db, 'territory_claims', c.id), c);
        this.claimsCache.set(c.id, c);
      } catch (e) {
        console.warn('Could not seed claim', c.id, e);
      }
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

  public subscribeTradeOffers(cb: (offers: ClaimTradeOffer[]) => void): () => void {
    this.tradeOfferSubscribers.add(cb);
    cb(this.activeTradeOffers);
    return () => this.tradeOfferSubscribers.delete(cb);
  }

  public getAllClaims(): TerritoryClaim[] {
    return Array.from(this.claimsCache.values());
  }

  public getClaimById(id: string): TerritoryClaim | undefined {
    return this.claimsCache.get(id);
  }

  // Get active claim owned by the local prospector
  public getPlayerClaim(prospectorId?: string): TerritoryClaim | undefined {
    const pId = prospectorId || this.getOrCreateProspectorId();
    return Array.from(this.claimsCache.values()).find((c) => c.ownerId === pId);
  }

  // Get all claims owned by the local or specified prospector
  public getPlayerClaims(prospectorId?: string): TerritoryClaim[] {
    const pId = prospectorId || this.getOrCreateProspectorId();
    return Array.from(this.claimsCache.values()).filter((c) => c.ownerId === pId);
  }

  // Delete/abandon a claim
  public async deleteClaim(claimId: string): Promise<boolean> {
    this.claimsCache.delete(claimId);
    this.notifyClaimsSubscribers();
    try {
      await deleteDoc(doc(db, 'territory_claims', claimId));
      return true;
    } catch (err) {
      console.warn('[TerritoryClaimService] Non-fatal delete claim notice:', err);
      return false;
    }
  }

  // Calculate official territorial appraisal value for a claim
  public calculateAppraisedValue(claim: {
    extractedGold?: number;
    blocksDug?: number;
    radius?: number;
    isWildcatOrigin?: boolean;
  }): { dollars: number; goldOunces: number } {
    const baseValue = 90; // Standard 40-acre filing fee & survey baseline
    const goldBonus = (claim.extractedGold || 0) * 16.5; // Proven ore multiplier
    const excavationBonus = Math.min(200, (claim.blocksDug || 0) * 0.45); // Value of shaft development
    const wildcatFactor = claim.isWildcatOrigin ? 35 : 0; // High-risk strike premium
    const totalDollars = Math.round(baseValue + goldBonus + excavationBonus + wildcatFactor);
    const goldOunces = Math.round((totalDollars / 20.67) * 10) / 10;
    return { dollars: totalDollars, goldOunces };
  }

  // List a claim on the territorial public market
  public async listClaimForSale(params: {
    claimId: string;
    priceDollars: number;
    priceGoldOunces: number;
    description?: string;
  }): Promise<{ success: boolean; message?: string }> {
    const claim = this.claimsCache.get(params.claimId);
    if (!claim) return { success: false, message: 'Claim deed not found.' };

    const updateData = {
      forSale: true,
      priceDollars: Math.max(10, Math.round(params.priceDollars)),
      priceGoldOunces: Math.max(0.5, Math.round(params.priceGoldOunces * 10) / 10),
      listedAt: Date.now(),
      description: (params.description || claim.description || '').substring(0, 256),
    };
    const updated = { ...claim, ...updateData };
    this.claimsCache.set(params.claimId, updated);
    this.notifyClaimsSubscribers();

    const path = `territory_claims/${params.claimId}`;
    try {
      await updateDoc(doc(db, 'territory_claims', params.claimId), updateData);
      return { success: true };
    } catch (err) {
      console.warn('[TerritoryClaimService] Non-fatal notice listing claim on Firestore:', err);
      return { success: true };
    }
  }

  // Cancel market listing
  public async cancelSaleListing(claimId: string): Promise<{ success: boolean }> {
    const claim = this.claimsCache.get(claimId);
    if (!claim) return { success: false };

    const updated = { ...claim, forSale: false };
    this.claimsCache.set(claimId, updated);
    this.notifyClaimsSubscribers();

    const path = `territory_claims/${claimId}`;
    try {
      await updateDoc(doc(db, 'territory_claims', claimId), {
        forSale: false,
      });
      return { success: true };
    } catch (err) {
      console.warn('[TerritoryClaimService] Non-fatal notice delisting claim on Firestore:', err);
      return { success: true };
    }
  }

  // Buy a claim outright (transfers deed and records transfer history)
  public async buyClaim(params: {
    claimId: string;
    buyerId: string;
    buyerName: string;
    paidDollars?: number;
    paidGoldOunces?: number;
  }): Promise<{ success: boolean; claim?: TerritoryClaim; message?: string }> {
    const claim = this.claimsCache.get(params.claimId);
    if (!claim) return { success: false, message: 'Claim record not found in district archives.' };

    const path = `territory_claims/${params.claimId}`;
    const previousOwner = claim.ownerName;
    const finalPrice = params.paidDollars ?? claim.priceDollars ?? 150;

    const updateData = {
      ownerId: params.buyerId,
      ownerName: params.buyerName,
      forSale: false,
      lastTransferPrice: finalPrice,
      lastTransferAt: Date.now(),
      previousOwnerName: previousOwner,
    };

    const updated: TerritoryClaim = { ...claim, ...updateData };
    this.claimsCache.set(params.claimId, updated);
    this.notifyClaimsSubscribers();

    try {
      await updateDoc(doc(db, 'territory_claims', params.claimId), updateData);
      return { success: true, claim: updated };
    } catch (err) {
      console.warn('[TerritoryClaimService] Non-fatal notice writing claim transfer to Firestore:', err);
      return { success: true, claim: updated };
    }
  }

  // Sell deed directly to the Territorial Mining Bureau / Syndicate for instant cash payout
  public async sellClaimToSyndicate(params: {
    claimId: string;
    payoutDollars: number;
    sellerName: string;
  }): Promise<{ success: boolean; message?: string }> {
    const claim = this.claimsCache.get(params.claimId);
    if (!claim) return { success: false, message: 'Claim deed not found.' };

    const path = `territory_claims/${params.claimId}`;
    try {
      const updateData = {
        ownerId: 'syndicate_land_office',
        ownerName: 'Arizona Territorial Mining Syndicate',
        forSale: true,
        priceDollars: Math.round(params.payoutDollars * 1.3),
        priceGoldOunces: Math.round(((params.payoutDollars * 1.3) / 20.67) * 10) / 10,
        previousOwnerName: params.sellerName,
        lastTransferPrice: params.payoutDollars,
        lastTransferAt: Date.now(),
        description: `Formerly registered by ${params.sellerName}. Appraised and released by Land Recorder Horace Miller.`,
      };

      await updateDoc(doc(db, 'territory_claims', params.claimId), updateData);
      const updated: TerritoryClaim = { ...claim, ...updateData };
      this.claimsCache.set(params.claimId, updated);
      return { success: true };
    } catch (err) {
      console.error('[TerritoryClaimService] Failed to sell claim to syndicate:', err);
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  // Submit a formal trade offer / tender to another prospector or syndicate
  public async submitTradeOffer(params: {
    claimId: string;
    claimName: string;
    targetOwnerId: string;
    buyerId: string;
    buyerName: string;
    cashOffered: number;
    goldOffered: number;
    offeredClaimId?: string;
    offeredClaimName?: string;
  }): Promise<{ success: boolean; offer?: ClaimTradeOffer; message?: string }> {
    const offerId = `offer_${params.claimId}_${Date.now()}`;
    const offer: ClaimTradeOffer = {
      id: offerId,
      claimId: params.claimId,
      claimName: params.claimName,
      targetOwnerId: params.targetOwnerId,
      buyerId: params.buyerId,
      buyerName: params.buyerName,
      cashOffered: params.cashOffered,
      goldOffered: params.goldOffered,
      offeredClaimId: params.offeredClaimId,
      offeredClaimName: params.offeredClaimName,
      status: 'pending',
      createdAt: Date.now(),
    };

    const path = `claim_trade_offers/${offerId}`;
    try {
      await setDoc(doc(db, 'claim_trade_offers', offerId), offer);
      return { success: true, offer };
    } catch (err) {
      console.error('[TerritoryClaimService] Failed to post trade offer:', err);
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }

  // Accept or decline a trade offer
  public async respondToTradeOffer(offerId: string, accept: boolean): Promise<{ success: boolean; message?: string }> {
    const offer = this.activeTradeOffers.find((o) => o.id === offerId);
    if (!offer) return { success: false, message: 'Trade tender no longer active.' };

    const path = `claim_trade_offers/${offerId}`;
    try {
      const nextStatus = accept ? 'accepted' : 'declined';
      await updateDoc(doc(db, 'claim_trade_offers', offerId), { status: nextStatus });

      if (accept) {
        // Transfer primary target claim to the bidder
        await this.buyClaim({
          claimId: offer.claimId,
          buyerId: offer.buyerId,
          buyerName: offer.buyerName,
          paidDollars: offer.cashOffered,
          paidGoldOunces: offer.goldOffered,
        });

        // If barter claim was offered, transfer barter claim to the original owner
        if (offer.offeredClaimId) {
          const originalOwner = this.claimsCache.get(offer.claimId);
          if (originalOwner) {
            await this.buyClaim({
              claimId: offer.offeredClaimId,
              buyerId: offer.targetOwnerId,
              buyerName: originalOwner.ownerName,
              paidDollars: 0,
            });
          }
        }
      }

      return { success: true };
    } catch (err) {
      console.error('[TerritoryClaimService] Failed to respond to trade tender:', err);
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  // Cancel an offer made by local prospector
  public async cancelTradeOffer(offerId: string): Promise<void> {
    const path = `claim_trade_offers/${offerId}`;
    try {
      await updateDoc(doc(db, 'claim_trade_offers', offerId), { status: 'cancelled' });
    } catch (err) {
      console.warn('[TerritoryClaimService] Failed to cancel trade tender:', err);
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
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

    // Check Tortilla Flat settlement limits
    if (isTortillaFlatTownLimits(params.position.x, params.position.z, 20)) {
      return {
        success: false,
        message: 'Cannot stake mining claim within Tortilla Flat settlement limits! Frontier municipal law prohibits mining claims in town territory.',
      };
    }

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
      forSale: false,
    };

    // Immediately cache in memory and localStorage and notify all subscribers
    this.claimsCache.set(claimId, newClaim);
    this.notifyClaimsSubscribers();

    const path = `territory_claims/${claimId}`;
    try {
      await setDoc(doc(db, 'territory_claims', claimId), newClaim);
    } catch (err) {
      console.warn('[TerritoryClaimService] Non-fatal note: local claim preserved, Firestore write note:', err);
    }
    return { success: true, claim: newClaim };
  }

  // Update yield and excavation statistics for an active claim
  public async updateClaimYield(
    claimId: string,
    goldDelta: number,
    blocksDelta: number
  ): Promise<void> {
    const claim = this.claimsCache.get(claimId);
    if (!claim) return;
    const nextGold = Math.round(((claim.extractedGold || 0) + goldDelta) * 10) / 10;
    const nextBlocks = (claim.blocksDug || 0) + blocksDelta;
    const updated = { ...claim, extractedGold: nextGold, blocksDug: nextBlocks };
    this.claimsCache.set(claimId, updated);
    this.notifyClaimsSubscribers();

    const path = `territory_claims/${claimId}`;
    try {
      await updateDoc(doc(db, 'territory_claims', claimId), {
        extractedGold: nextGold,
        blocksDug: nextBlocks,
      });
    } catch (e) {
      console.warn('[TerritoryClaimService] Non-fatal yield update notice:', e);
    }
  }

  // Rename a registered claim and persist to memory, localStorage, and Firestore
  public async renameClaim(claimId: string, newName: string): Promise<boolean> {
    const claim = this.claimsCache.get(claimId);
    if (!claim) return false;
    const sanitized = newName.trim().substring(0, 64) || 'Prospector Claim';
    claim.name = sanitized;
    this.claimsCache.set(claimId, claim);
    this.saveToLocalStorage(Array.from(this.claimsCache.values()));
    this.notifyClaimsSubscribers();

    try {
      await updateDoc(doc(db, 'territory_claims', claimId), {
        name: sanitized,
      });
    } catch (err) {
      console.warn('[TerritoryClaimService] Non-fatal rename notice:', err);
    }
    return true;
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
    if (this.unsubscribeTradeOffers) this.unsubscribeTradeOffers();
  }
}

export const territoryClaims = TerritoryClaimService.getInstance();
