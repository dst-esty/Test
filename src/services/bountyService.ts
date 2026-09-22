import { PlayerState } from '../types';
import { safeLocalStorage } from '../utils/storage';
import { INITIAL_LANDMARKS } from '../world/clues';
import { soundEngine } from '../audio/soundEffects';

export type BountyType =
  | 'bring_rations'
  | 'map_landmark'
  | 'bring_planks'
  | 'bring_gold'
  | 'excavate_blocks'
  | 'hunt_game';

export interface BountyReward {
  cashDollars: number;
  dynamite?: number;
  woodPlanks?: number;
  ammo?: number;
  rations?: number;
}

export interface BountyContract {
  id: string;
  title: string;
  issuer: string;
  category: 'Mercantile Supply' | 'USGS Cartography' | 'Mining Engineering' | 'Wilderness Hunting';
  description: string;
  flavorQuote: string;
  type: BountyType;
  requiredAmount: number;
  currentAmount: number;
  targetLandmarkId?: string;
  targetLandmarkName?: string;
  status: 'available' | 'active' | 'completed' | 'claimed';
  reward: BountyReward;
  dateKey: string; // e.g. '2026-09-22'
  acceptedAt?: number;
  completedAt?: number;
}

const STORAGE_KEY = 'superstition_daily_bounties_v1';
const REFRESH_DATE_KEY = 'superstition_bounty_date_v1';

class BountyService {
  private contracts: BountyContract[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadState();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.saveState();
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error in bountyService listener:', err);
      }
    });
  }

  private getTodayDateKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  private loadState(): void {
    const today = this.getTodayDateKey();
    const storedDate = safeLocalStorage.getItem(REFRESH_DATE_KEY);
    const storedData = safeLocalStorage.getItem(STORAGE_KEY);

    if (storedData) {
      try {
        const parsed: BountyContract[] = JSON.parse(storedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If stored date matches today, keep all contracts
          if (storedDate === today) {
            this.contracts = parsed;
            return;
          } else {
            // Keep active and unclaimed completed contracts from previous days, regenerate available contracts for today
            const carriedOver = parsed.filter(
              (b) => b.status === 'active' || b.status === 'completed'
            );
            const freshToday = this.generateProceduralBounties(today, carriedOver.map((c) => c.id));
            this.contracts = [...carriedOver, ...freshToday];
            safeLocalStorage.setItem(REFRESH_DATE_KEY, today);
            this.saveState();
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to parse stored bounties, regenerating:', e);
      }
    }

    // Default first generation
    this.contracts = this.generateProceduralBounties(today);
    safeLocalStorage.setItem(REFRESH_DATE_KEY, today);
    this.saveState();
  }

  private saveState(): void {
    try {
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(this.contracts));
    } catch (e) {
      console.warn('Failed to persist bounties:', e);
    }
  }

  /**
   * Procedurally generates authentic 1880s daily bounties tailored to the player's
   * current wilderness progression, landmarks, and available materials.
   */
  public generateProceduralBounties(dateKey: string, excludeIds: string[] = []): BountyContract[] {
    const bounties: BountyContract[] = [];

    // 1. Mandatory Supply Contract: Bring 2 Rations (Mercantile Pantry)
    bounties.push({
      id: `bounty-rations-${dateKey}`,
      title: 'Emergency Mercantile Rations Consignment',
      issuer: 'Tortilla Flat Mercantile Trading Post',
      category: 'Mercantile Supply',
      description:
        'The Phoenix-to-Globe stagecoach was delayed crossing the Salt River at Mormon Flat. The trading post pantry is low on preserved food for arriving travelers. Bring 2 Trail Rations or harvested wild game meats to restock the cellar.',
      flavorQuote:
        '"Hungry prospectors make for short tempers. Bring us two good rations of salt pork or jerked meat and the company will reward you handsomely in coin and blasting powder." — Mercantile Storekeeper',
      type: 'bring_rations',
      requiredAmount: 2,
      currentAmount: 0,
      status: 'available',
      reward: {
        cashDollars: 18.0,
        dynamite: 2,
        woodPlanks: 4,
      },
      dateKey,
    });

    // 2. Mandatory Landmark Survey: Map a New Landmark
    // Select from known iconic Superstition landmarks (excluding Tortilla Flat itself)
    const mappableLandmarks = INITIAL_LANDMARKS.filter(
      (l) => l.id !== 'tortilla_flat' && l.id !== 'lost_dutchman_mine'
    );
    // Deterministic selection based on date string hash so it's stable throughout the day
    let hash = 0;
    for (let i = 0; i < dateKey.length; i++) {
      hash = (hash << 5) - hash + dateKey.charCodeAt(i);
      hash |= 0;
    }
    const selectedLandmark =
      mappableLandmarks[Math.abs(hash) % mappableLandmarks.length] || mappableLandmarks[0];

    bounties.push({
      id: `bounty-map-${selectedLandmark.id}-${dateKey}`,
      title: `USGS Frontier Survey: Map ${selectedLandmark.name}`,
      issuer: 'Pinal County Surveyor & Territorial Assayer',
      category: 'USGS Cartography',
      description: `The Territorial Surveyor requires precise field coordinates and geological triangulation for ${selectedLandmark.name}. Trek out to the landmark sector in the Superstitions and survey the terrain.`,
      flavorQuote:
        `"Much of the interior range remains blank on territorial quadrangle charts. Hike out to ${selectedLandmark.name}, chart its elevation and bearings, and deliver your cartographic field notes back to the mercantile." — Territorial Cartographer`,
      type: 'map_landmark',
      requiredAmount: 1,
      currentAmount: 0,
      targetLandmarkId: selectedLandmark.id,
      targetLandmarkName: selectedLandmark.name,
      status: 'available',
      reward: {
        cashDollars: 35.0,
        dynamite: 3,
        ammo: 10,
        woodPlanks: 5,
      },
      dateKey,
    });

    // 3. Mining Engineering: Bring 4 Timber Planks for Trench Shoring
    bounties.push({
      id: `bounty-planks-${dateKey}`,
      title: 'Boardwalk & Drift Timber Consignment',
      issuer: 'Tortilla Creek Mining Syndicate',
      category: 'Mining Engineering',
      description:
        'Spring flash flooding weakened the support timbers beneath the elevated town boardwalk and the nearby test adit. Deliver 4 Timber Planks to the mercantile carpenters.',
      flavorQuote:
        '"Unshored ground is a death sentence in caliche sand. We need four heavy fir shoring timbers right away." — Head Carpenter',
      type: 'bring_planks',
      requiredAmount: 4,
      currentAmount: 0,
      status: 'available',
      reward: {
        cashDollars: 24.0,
        dynamite: 2,
        ammo: 6,
      },
      dateKey,
    });

    // 4. Excavation & Road Clearing: Excavate 15 Strata Blocks
    bounties.push({
      id: `bounty-excavate-${dateKey}`,
      title: 'Needle Canyon Pack-Trail Rock Clearance',
      issuer: 'Stagecoach Express Co.',
      category: 'Mining Engineering',
      description:
        'Recent seismic tremors and loose scree caused a rockfall along the pack trail. Dig out at least 15 blocks of sandstone, granite, or caliche overburden with pickaxe or shovel.',
      flavorQuote:
        '"Our pack mules cannot pass the rock slides. Swing your pick and clear 15 blocks of solid mountain strata to earn your pay." — Stage Driver',
      type: 'excavate_blocks',
      requiredAmount: 15,
      currentAmount: 0,
      status: 'available',
      reward: {
        cashDollars: 28.0,
        dynamite: 3,
        woodPlanks: 4,
        rations: 1,
      },
      dateKey,
    });

    // 5. Wilderness Hunting & Hide Consignment: Harvest Game Meat
    bounties.push({
      id: `bounty-hunt-${dateKey}`,
      title: 'Desert Jackrabbit & Wild Game Consignment',
      issuer: 'Superstition Saloon & Kitchen',
      category: 'Wilderness Hunting',
      description:
        'The saloon cook is preparing a hearty mountain stew for visiting prospectors. Hunt and harvest at least 2 wild game meats (jackrabbit, mule deer, or bighorn sheep) out in the canyon wilderness.',
      flavorQuote:
        '"Salt pork gets old real fast out here. Bring me two fresh game cuts and you can pocket solid silver and fresh rifle cartridges." — Saloon Cook',
      type: 'hunt_game',
      requiredAmount: 2,
      currentAmount: 0,
      status: 'available',
      reward: {
        cashDollars: 30.0,
        ammo: 12,
        dynamite: 1,
      },
      dateKey,
    });

    return bounties.filter((b) => !excludeIds.includes(b.id));
  }

  public getContracts(): BountyContract[] {
    return this.contracts;
  }

  public getActiveBounties(): BountyContract[] {
    return this.contracts.filter((b) => b.status === 'active' || b.status === 'completed');
  }

  public getAvailableBounties(): BountyContract[] {
    return this.contracts.filter((b) => b.status === 'available');
  }

  public getClaimedCount(): number {
    return this.contracts.filter((b) => b.status === 'claimed').length;
  }

  public acceptBounty(bountyId: string): boolean {
    const bounty = this.contracts.find((b) => b.id === bountyId);
    if (!bounty || bounty.status !== 'available') return false;

    bounty.status = 'active';
    bounty.acceptedAt = Date.now();
    soundEngine.playPaperRustle?.();
    this.notify();
    return true;
  }

  public abandonBounty(bountyId: string): boolean {
    const bounty = this.contracts.find((b) => b.id === bountyId);
    if (!bounty || bounty.status !== 'active') return false;

    bounty.status = 'available';
    bounty.currentAmount = 0;
    this.notify();
    return true;
  }

  /**
   * Evaluates player's real-time inventory and stats against active contracts.
   */
  public updateProgressFromPlayerState(playerState: PlayerState): void {
    let changed = false;

    for (const b of this.contracts) {
      if (b.status !== 'active') continue;

      if (b.type === 'bring_rations') {
        const totalRations =
          (playerState.provisionsRations || 0) +
          (playerState.rabbitMeat || 0) +
          (playerState.venisonMeat || 0) +
          (playerState.bighornMutton || 0);
        const count = Math.min(b.requiredAmount, totalRations);
        if (b.currentAmount !== count) {
          b.currentAmount = count;
          changed = true;
        }
        if (count >= b.requiredAmount && b.status === 'active') {
          b.status = 'completed';
          changed = true;
        }
      } else if (b.type === 'bring_planks') {
        const planks = playerState.woodPlanks || 0;
        const count = Math.min(b.requiredAmount, planks);
        if (b.currentAmount !== count) {
          b.currentAmount = count;
          changed = true;
        }
        if (count >= b.requiredAmount && b.status === 'active') {
          b.status = 'completed';
          changed = true;
        }
      } else if (b.type === 'bring_gold') {
        const gold = playerState.goldFound || 0;
        const count = Math.min(b.requiredAmount, gold);
        if (b.currentAmount !== count) {
          b.currentAmount = count;
          changed = true;
        }
        if (count >= b.requiredAmount && b.status === 'active') {
          b.status = 'completed';
          changed = true;
        }
      } else if (b.type === 'map_landmark') {
        if (
          b.targetLandmarkId &&
          playerState.discoveredLandmarks?.includes(b.targetLandmarkId)
        ) {
          b.currentAmount = 1;
          b.status = 'completed';
          changed = true;
        }
      } else if (b.type === 'hunt_game') {
        const harvestedMeat =
          (playerState.rabbitMeat || 0) +
          (playerState.venisonMeat || 0) +
          (playerState.bighornMutton || 0);
        const count = Math.min(b.requiredAmount, harvestedMeat);
        if (b.currentAmount !== count) {
          b.currentAmount = count;
          changed = true;
        }
        if (count >= b.requiredAmount && b.status === 'active') {
          b.status = 'completed';
          changed = true;
        }
      }
    }

    if (changed) {
      this.notify();
    }
  }

  /**
   * Called when the player mines a voxel block in the wilderness.
   */
  public onBlockExcavated(count: number = 1): void {
    let changed = false;
    for (const b of this.contracts) {
      if (b.status === 'active' && b.type === 'excavate_blocks') {
        b.currentAmount = Math.min(b.requiredAmount, b.currentAmount + count);
        if (b.currentAmount >= b.requiredAmount) {
          b.status = 'completed';
        }
        changed = true;
      }
    }
    if (changed) {
      this.notify();
    }
  }

  /**
   * Called when the player discovers or maps a landmark.
   */
  public onLandmarkDiscovered(landmarkId: string): { completedBounty?: BountyContract } {
    let completedBounty: BountyContract | undefined;

    for (const b of this.contracts) {
      if (b.status === 'active' && b.type === 'map_landmark') {
        if (b.targetLandmarkId === landmarkId) {
          b.currentAmount = 1;
          b.status = 'completed';
          completedBounty = b;
          this.notify();
          break;
        }
      }
    }

    return { completedBounty };
  }

  /**
   * Checks whether an active bounty can be claimed/turned in right now.
   */
  public canClaim(bountyId: string, playerState: PlayerState): { eligible: boolean; reason?: string } {
    const bounty = this.contracts.find((b) => b.id === bountyId);
    if (!bounty) return { eligible: false, reason: 'Contract not found' };
    if (bounty.status === 'claimed') return { eligible: false, reason: 'Already claimed' };
    if (bounty.status === 'available') return { eligible: false, reason: 'Accept contract first' };

    if (bounty.type === 'bring_rations') {
      const totalRations =
        (playerState.provisionsRations || 0) +
        (playerState.rabbitMeat || 0) +
        (playerState.venisonMeat || 0) +
        (playerState.bighornMutton || 0);
      if (totalRations < bounty.requiredAmount) {
        return {
          eligible: false,
          reason: `Need ${bounty.requiredAmount} rations in inventory (Currently have ${totalRations})`,
        };
      }
    } else if (bounty.type === 'bring_planks') {
      const planks = playerState.woodPlanks || 0;
      if (planks < bounty.requiredAmount) {
        return {
          eligible: false,
          reason: `Need ${bounty.requiredAmount} timber planks in inventory (Currently have ${planks})`,
        };
      }
    } else if (bounty.type === 'bring_gold') {
      const gold = playerState.goldFound || 0;
      if (gold < bounty.requiredAmount) {
        return {
          eligible: false,
          reason: `Need ${bounty.requiredAmount.toFixed(1)} oz gold in inventory (Currently have ${gold.toFixed(1)} oz)`,
        };
      }
    } else if (bounty.type === 'map_landmark') {
      if (!playerState.discoveredLandmarks?.includes(bounty.targetLandmarkId || '')) {
        return {
          eligible: false,
          reason: `Must travel out and survey ${bounty.targetLandmarkName || 'the landmark'} first`,
        };
      }
    } else if (bounty.type === 'excavate_blocks') {
      if (bounty.currentAmount < bounty.requiredAmount) {
        return {
          eligible: false,
          reason: `Need to excavate ${bounty.requiredAmount - bounty.currentAmount} more strata blocks with pickaxe`,
        };
      }
    } else if (bounty.type === 'hunt_game') {
      const harvestedMeat =
        (playerState.rabbitMeat || 0) +
        (playerState.venisonMeat || 0) +
        (playerState.bighornMutton || 0);
      if (harvestedMeat < bounty.requiredAmount) {
        return {
          eligible: false,
          reason: `Need ${bounty.requiredAmount} harvested game cuts (Currently have ${harvestedMeat})`,
        };
      }
    }

    return { eligible: true };
  }

  /**
   * Turns in the completed contract at the Tortilla Flat Mercantile, deducting
   * any submitted items and granting Cash and Mining Supplies!
   */
  public claimBounty(
    bountyId: string,
    playerState: PlayerState,
    onUpdatePlayerState: (fn: (prev: PlayerState) => PlayerState) => void
  ): { success: boolean; message: string } {
    const bounty = this.contracts.find((b) => b.id === bountyId);
    if (!bounty) return { success: false, message: 'Bounty contract not found.' };

    const check = this.canClaim(bountyId, playerState);
    if (!check.eligible) {
      return { success: false, message: check.reason || 'Contract requirements not met.' };
    }

    // Apply inventory item deduction if it's a delivery contract
    onUpdatePlayerState((prev) => {
      let nextRations = prev.provisionsRations || 0;
      let nextRabbit = prev.rabbitMeat || 0;
      let nextVenison = prev.venisonMeat || 0;
      let nextMutton = prev.bighornMutton || 0;
      let nextPlanks = prev.woodPlanks || 0;
      let nextGold = prev.goldFound || 0;

      if (bounty.type === 'bring_rations') {
        let remainingToDeduct = bounty.requiredAmount;
        // Deduct standard trail rations first
        const fromRations = Math.min(nextRations, remainingToDeduct);
        nextRations -= fromRations;
        remainingToDeduct -= fromRations;

        // Then game meats
        if (remainingToDeduct > 0) {
          const fromRabbit = Math.min(nextRabbit, remainingToDeduct);
          nextRabbit -= fromRabbit;
          remainingToDeduct -= fromRabbit;
        }
        if (remainingToDeduct > 0) {
          const fromVenison = Math.min(nextVenison, remainingToDeduct);
          nextVenison -= fromVenison;
          remainingToDeduct -= fromVenison;
        }
        if (remainingToDeduct > 0) {
          const fromMutton = Math.min(nextMutton, remainingToDeduct);
          nextMutton -= fromMutton;
          remainingToDeduct -= fromMutton;
        }
      } else if (bounty.type === 'bring_planks') {
        nextPlanks = Math.max(0, nextPlanks - bounty.requiredAmount);
      } else if (bounty.type === 'bring_gold') {
        nextGold = Math.max(0, nextGold - bounty.requiredAmount);
      } else if (bounty.type === 'hunt_game') {
        let remainingToDeduct = bounty.requiredAmount;
        const fromRabbit = Math.min(nextRabbit, remainingToDeduct);
        nextRabbit -= fromRabbit;
        remainingToDeduct -= fromRabbit;
        if (remainingToDeduct > 0) {
          const fromVenison = Math.min(nextVenison, remainingToDeduct);
          nextVenison -= fromVenison;
          remainingToDeduct -= fromVenison;
        }
        if (remainingToDeduct > 0) {
          const fromMutton = Math.min(nextMutton, remainingToDeduct);
          nextMutton -= fromMutton;
          remainingToDeduct -= fromMutton;
        }
      }

      // Add Cash & Mining Supplies Rewards
      const nextCash = (prev.cashDollars || 0) + bounty.reward.cashDollars;
      const nextDynamite = (prev.dynamite || 0) + (bounty.reward.dynamite || 0);
      const nextSuppliedPlanks = nextPlanks + (bounty.reward.woodPlanks || 0);
      const nextAmmo = (prev.ammo || 0) + (bounty.reward.ammo || 0);
      const nextAwardedRations = nextRations + (bounty.reward.rations || 0);

      return {
        ...prev,
        cashDollars: nextCash,
        dynamite: nextDynamite,
        woodPlanks: nextSuppliedPlanks,
        ammo: nextAmmo,
        provisionsRations: nextAwardedRations,
        rabbitMeat: nextRabbit,
        venisonMeat: nextVenison,
        bighornMutton: nextMutton,
        goldFound: nextGold,
      };
    });

    bounty.status = 'claimed';
    bounty.completedAt = Date.now();
    soundEngine.playCoins();
    soundEngine.playOreChime?.();
    this.notify();

    // Craft celebratory reward summary string
    const rewardParts = [`+$${bounty.reward.cashDollars.toFixed(2)} Cash`];
    if (bounty.reward.dynamite) rewardParts.push(`+${bounty.reward.dynamite} Dynamite`);
    if (bounty.reward.woodPlanks) rewardParts.push(`+${bounty.reward.woodPlanks} Timber Planks`);
    if (bounty.reward.ammo) rewardParts.push(`+${bounty.reward.ammo} Winchester Cartridges`);
    if (bounty.reward.rations) rewardParts.push(`+${bounty.reward.rations} Trail Rations`);

    return {
      success: true,
      message: `📜 Bounty Claimed! Received ${rewardParts.join(', ')}!`,
    };
  }

  /**
   * Allows the player to refresh available postings (e.g. new shift at the Mercantile).
   */
  public refreshDailyBoard(): void {
    const today = this.getTodayDateKey();
    const activeContracts = this.contracts.filter(
      (b) => b.status === 'active' || b.status === 'completed'
    );
    const freshOnes = this.generateProceduralBounties(today + '-' + Date.now(), activeContracts.map((c) => c.id));
    this.contracts = [...activeContracts, ...freshOnes];
    soundEngine.playPaperRustle?.();
    this.notify();
  }
}

export const bountyService = new BountyService();
